/**
 * The checkout session - conversation state plus the approval gate.
 *
 * This is the one module that encodes the product principle, so it is worth being
 * explicit about the shape:
 *
 *   Conversation -> Recommendation -> Explicit authorisation -> Financial action
 *   -> Payment -> Verified webhook -> Completed order
 *
 * Three rules hold here and nowhere else has to enforce them:
 *
 *   1. `confirmPurchase` is the ONLY function in the app that calls
 *      `POST /api/orders`. It is invoked from a click handler on the confirmation
 *      card and from nothing else. Rendering a recommendation, rendering a
 *      confirmation card, re-rendering after a poll - none of them can create an
 *      order, because none of them can reach this function.
 *
 *   2. Amounts shown after confirmation come from the order row the backend
 *      returned, not from the quote the agent displayed. If the two ever disagree
 *      the backend wins, silently and by construction.
 *
 *   3. There is no code path here that sets a payment status. Status is read from
 *      the backend (usePaymentStatus) or, in mock mode, from the clearly-labelled
 *      overlay. `simulateSettlement` exists only in mock mode and the service
 *      throws if called otherwise.
 *
 * State lives in a provider rather than in the chat page because the right-hand
 * agent activity panel and the payment card need the same session, and threading it
 * through props would mean the chat page owning both.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { config } from '@/lib/config';
import { qk } from '@/lib/queryClient';
import {
  clearStoredConversationId,
  getStoredConversationId,
  getUserId,
  recordOrderId,
  setStoredConversationId,
} from '@/lib/session';
import { ApiError } from '@/services/api';
import { sendMessage } from '@/services/chatService';
import { appendUserMessage, createConversation } from '@/services/conversationService';
import { createOrder } from '@/services/orderService';
import { requestPaymentLink, simulateSettlement } from '@/services/paymentService';
import { mockApprovalActions, mockSettlementActions } from '@/services/mock/mockAgent';
import type { AgentAction, ChatTurn, Product } from '@/types';

/** Where a confirmation card is in its lifecycle. Absent = still awaiting a decision. */
export type ConfirmationState = 'confirming' | 'confirmed' | 'declined' | 'failed';

/**
 * What the app is actually doing right now, for the loading copy in spec section 33.
 *
 * Each value is set immediately before the await that performs that work and cleared
 * when it settles, so the label always names a request that is genuinely in flight.
 * None of them is driven by a timer or a scripted sequence - a progress message that
 * advances on a clock is telling the user about a process it is not watching, and on
 * a payment surface that is the same class of claim as a premature "successful".
 */
export type AgentPhase =
  | 'thinking'
  | 'searching-catalogue'
  | 'creating-order'
  | 'generating-link'
  | 'verifying-payment';

export const AGENT_PHASE_LABEL: Record<AgentPhase, string> = {
  thinking: 'Thinking',
  // Spec section 33 writes this "Searching catalog". Spelled the way every other
  // user-facing string in this app spells it, so one label does not read as a typo.
  'searching-catalogue': 'Searching the catalogue',
  'creating-order': 'Creating secure order',
  'generating-link': 'Generating payment link',
  'verifying-payment': 'Verifying payment',
};

export interface CheckoutSessionValue {
  /** Real conversation id from `POST /api/conversations`, or null if it failed. */
  conversationId: string | null;
  /** False when the backend rejected the conversation, so the UI can say so. */
  transcriptRecording: boolean;
  turns: ChatTurn[];
  /** Actions produced locally in mock mode, merged with the backend feed for display. */
  localActions: AgentAction[];
  /** The recommendation currently on the table, used to resolve "yes, buy it". */
  standingProduct: Product | null;
  /** The order the payment card is tracking, if one has been created. */
  activeOrderId: string | null;
  confirmations: Record<string, ConfirmationState>;

  isThinking: boolean;
  isConfirming: boolean;
  /** The work in flight, or null when nothing is. See AgentPhase. */
  phase: AgentPhase | null;
  sendError: unknown;

  send: (message: string) => void;
  /**
   * The user picked a recommendation. Sends the same user turn `send` would, and
   * additionally tells the adapter that the intent came from a control rather than
   * from text it has to interpret. Selecting still only asks for an authorisation
   * card - it creates no order.
   *
   * Separate from `send` rather than a second argument to it, because `send` is
   * handed to inputs as a bare callback and an extra positional parameter would then
   * be whatever those components happen to pass second.
   */
  selectProduct: (product: Product) => void;
  confirmPurchase: (turnId: string, args: { product: Product; quantity: number }) => void;
  declinePurchase: (turnId: string) => void;
  /** Mock-only. Drives the deliberate success / failure demo. */
  simulate: (orderId: string, outcome: 'success' | 'failure') => Promise<void>;
  reset: () => void;
}

const CheckoutSessionContext = createContext<CheckoutSessionValue | null>(null);

/**
 * What the send mutation is given. An object rather than a bare string so the
 * provenance of the intent can travel with the message - see `selectProduct`.
 */
interface SendVariables {
  message: string;
  declaredIntent?: 'buy';
}

let seq = 0;
const localId = (prefix: string): string => {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}`;
};

const uuid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return localId('idem');
};

const errorMessage = (error: unknown): string => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
};

/** Pick the product a turn is recommending, so the next "buy it" can resolve. */
function productFromTurn(turn: ChatTurn): Product | null {
  for (const block of turn.blocks ?? []) {
    if (block.kind === 'purchase-confirmation') return block.product;
    if (block.kind === 'product' && block.products.length > 0) return block.products[0] ?? null;
  }
  return null;
}

export function CheckoutSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [conversationId, setConversationId] = useState<string | null>(() =>
    getStoredConversationId(),
  );
  const [transcriptRecording, setTranscriptRecording] = useState(true);
  const [phase, setPhase] = useState<AgentPhase | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [localActions, setLocalActions] = useState<AgentAction[]>([]);
  const [standingProduct, setStandingProduct] = useState<Product | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState<Record<string, ConfirmationState>>({});

  /** In-flight conversation creation, so two fast messages don't create two rows. */
  const creating = useRef<Promise<string | null> | null>(null);
  /** One idempotency key per confirmation card, so a retried submit is not a second order. */
  const idempotencyKeys = useRef<Record<string, string>>({});
  const warnedAboutTranscript = useRef(false);

  const appendTurns = useCallback((incoming: ChatTurn[]) => {
    if (incoming.length === 0) return;
    setTurns((current) => [...current, ...incoming]);

    // The last product-bearing turn becomes the standing recommendation.
    for (let i = incoming.length - 1; i >= 0; i -= 1) {
      const product = productFromTurn(incoming[i]!);
      if (product) {
        setStandingProduct(product);
        break;
      }
    }
  }, []);

  const appendActions = useCallback((actions: AgentAction[] | undefined) => {
    if (!actions || actions.length === 0) return;
    setLocalActions((current) => [...actions, ...current]);
  }, []);

  /**
   * Get (or lazily create) the real conversation row.
   *
   * Best effort by design. If the backend cannot create it - which it currently
   * cannot until the schema migration is applied - the chat still works, but
   * `transcriptRecording` goes false and the UI states that the transcript is not
   * being persisted. A demo that silently stops recording the record of what the
   * user approved would be worse than one that admits it.
   */
  const ensureConversation = useCallback(async (): Promise<string | null> => {
    if (conversationId) return conversationId;
    if (creating.current) return creating.current;

    const attempt = (async () => {
      try {
        const conversation = await createConversation(getUserId());
        setStoredConversationId(conversation.id);
        setConversationId(conversation.id);
        setTranscriptRecording(true);
        return conversation.id;
      } catch {
        setTranscriptRecording(false);
        return null;
      } finally {
        creating.current = null;
      }
    })();

    creating.current = attempt;
    return attempt;
  }, [conversationId]);

  /** Warn once, in the transcript, that the backend is not persisting it. */
  const warnTranscript = useCallback(() => {
    if (warnedAboutTranscript.current) return;
    warnedAboutTranscript.current = true;
    setTurns((current) => [
      ...current,
      {
        id: localId('turn'),
        role: 'assistant',
        content:
          'Note: this conversation is not being saved. The backend could not create a ' +
          'conversation record, so the messages below exist only in this tab.',
        createdAt: new Date().toISOString(),
        failed: true,
        blocks: [
          {
            kind: 'error',
            code: 'TRANSCRIPT_NOT_PERSISTED',
            message: 'POST /api/conversations did not succeed.',
            hint: 'Usually means the Supabase schema migration has not been applied yet.',
          },
        ],
      },
    ]);
  }, []);

  // ---------------------------------------------------------------------------
  // Sending a message
  // ---------------------------------------------------------------------------

  const sendMutation = useMutation({
    mutationFn: async ({ message, declaredIntent }: SendVariables) => {
      const id = await ensureConversation();

      if (id) {
        // Record the user's turn on the backend. Failure here does not block the
        // agent reply, but it does mean the transcript is incomplete, so it is
        // surfaced rather than swallowed.
        try {
          await appendUserMessage(id, message);
        } catch {
          setTranscriptRecording(false);
        }
      }

      return sendMessage({
        conversationId: id ?? 'local',
        message,
        standingProduct,
        ...(declaredIntent ? { declaredIntent } : {}),
        onPhase: setPhase,
      });
    },
    onSuccess: (response) => {
      appendTurns(response.turns);
      appendActions(response.actions);
      if (conversationId) {
        void queryClient.invalidateQueries({ queryKey: qk.conversations.activity(conversationId) });
      }
    },
    onError: (error) => {
      appendTurns([
        {
          id: localId('turn'),
          role: 'assistant',
          content: 'I could not complete that turn.',
          createdAt: new Date().toISOString(),
          failed: true,
          blocks: [
            {
              kind: 'error',
              code: error instanceof ApiError ? error.code : 'CHAT_FAILED',
              message: errorMessage(error),
              hint:
                error instanceof ApiError && error.isNotImplemented
                  ? 'POST /api/chat is not implemented on the backend yet. Enable VITE_USE_MOCK to walk the flow with the labelled mock agent.'
                  : 'You can retype the message to try again.',
            },
          ],
        },
      ]);
    },
    // onSettled, not onSuccess: a failed turn is just as finished as a successful
    // one, and a label left saying "Searching the catalogue" after the search threw
    // would be describing work that had stopped.
    onSettled: () => setPhase(null),
  });

  const dispatch = useCallback(
    (message: string, declaredIntent?: 'buy') => {
      const trimmed = message.trim();
      if (trimmed === '' || sendMutation.isPending) return;

      appendTurns([
        {
          id: localId('turn'),
          role: 'user',
          content: trimmed,
          createdAt: new Date().toISOString(),
        },
      ]);

      if (!transcriptRecording) warnTranscript();
      setPhase('thinking');
      sendMutation.mutate({ message: trimmed, ...(declaredIntent ? { declaredIntent } : {}) });
    },
    [appendTurns, sendMutation, transcriptRecording, warnTranscript],
  );

  /** Free text the user typed. Intent is whatever the agent makes of it. */
  const send = useCallback((message: string) => dispatch(message), [dispatch]);

  /**
   * The user pressed the button on a recommendation. The transcript still records a
   * sentence in the user's voice, because that is what they asked for, but the
   * adapter is told the intent rather than left to infer it from the product name.
   */
  const selectProduct = useCallback(
    (product: Product) => dispatch(`I'd like to buy the ${product.name}`, 'buy'),
    [dispatch],
  );

  // ---------------------------------------------------------------------------
  // The approval gate
  // ---------------------------------------------------------------------------

  const confirmMutation = useMutation({
    mutationFn: async (args: { turnId: string; product: Product; quantity: number }) => {
      const key = `${args.turnId}:${args.product.id}:${args.quantity}`;
      // `??=` both stores and returns the key, so this local is the definite value
      // and no non-null assertion is needed to read it back out of the ref.
      const idempotencyKey = (idempotencyKeys.current[key] ??= uuid());

      // REAL endpoint. Writes PENDING_CONFIRMATION, moves no money, and computes
      // the amount server-side from the product row.
      setPhase('creating-order');
      const order = await createOrder({
        productId: args.product.id,
        quantity: args.quantity,
        conversationId,
        userId: getUserId(),
        idempotencyKey,
      });

      recordOrderId(order.id);

      // ---------------------------------------------------------------------
      // The payment instrument is NOT chosen here in real mode.
      //
      // The confirm click authorises the purchase. It does not answer the separate
      // question of how to pay, and this codebase does not let one click stand in for
      // two financial decisions. So the order rests at PENDING_CONFIRMATION and the
      // payment card offers both instruments, each with its own click, its own
      // approval reason and its own audited MONEY_ACTION.
      //
      // There is also a hard reason. The backend binds exactly ONE instrument per
      // order - `issuePaymentLink` refuses once a Razorpay order id exists, and
      // `createCheckoutSession` refuses once a payment link id does, first come wins.
      // Issuing a link automatically here would mean every order created through chat
      // had already spent its one slot, and Standard Checkout could never be reached
      // from the happy path.
      //
      // Mock mode keeps the automatic step, because the labelled overlay has no
      // in-page modal to offer and a walkthrough that reaches no payable state at all
      // would demonstrate nothing.
      // ---------------------------------------------------------------------
      let paymentUrl: string | null = null;
      let razorpayOrderId: string | null = order.razorpayOrderId;
      let paymentLinkId: string | null = order.razorpayPaymentLinkId;
      let paymentLinkError: string | null = null;
      let payable = order;

      if (config.useMock) {
        try {
          setPhase('generating-link');
          // The click that reached this function IS the approval, and this sentence is
          // the reason recorded against the MONEY_ACTION in the audit trail. It names
          // the product, the quantity and the amount the user was actually shown,
          // because a justification reading 'user approved' documents nothing a
          // reviewer could check. The amount is the order row's, not the quote's.
          const view = await requestPaymentLink(
            order.id,
            `Customer authorised purchase of ${args.quantity} x ${args.product.name} for ${order.amountFormatted}.`,
          );
          paymentUrl = view.paymentUrl;
          razorpayOrderId = view.razorpayOrderId;
          paymentLinkId = view.paymentLinkId;
          // The row moved to PAYMENT_PENDING server-side, so take the backend's fresher
          // copy rather than the PENDING_CONFIRMATION one createOrder returned. Without
          // this the card and the step tracker would report 'no payment link issued' for
          // an order that already has one.
          payable = view.order;
        } catch (error) {
          // The order above is real and already recorded in Postgres. Letting this
          // reject would route to onError, which tells the user the order was not
          // created - false, and an invitation to submit a second one. An order with no
          // payment link is a real, displayable state, so it is reported as that rather
          // than as a failure.
          paymentLinkError = errorMessage(error);
        }
      }

      return {
        order: payable,
        product: args.product,
        paymentUrl,
        razorpayOrderId,
        paymentLinkId,
        paymentLinkError,
      };
    },
    onMutate: (args) => {
      setConfirmations((current) => ({ ...current, [args.turnId]: 'confirming' }));
    },
    onSettled: () => setPhase(null),
    onSuccess: (result, args) => {
      setConfirmations((current) => ({ ...current, [args.turnId]: 'confirmed' }));
      setActiveOrderId(result.order.id);

      appendTurns([
        {
          id: localId('turn'),
          role: 'assistant',
          // Three sentences, because the three states are genuinely different and the
          // middle one used to be asserted for all of them. In real mode nothing has
          // been issued yet and the card below offers the choice, so claiming a link
          // exists would describe something the user cannot see.
          content:
            result.paymentLinkError !== null
              ? 'The order is recorded, but no payment link could be issued for it. Nothing has been charged.'
              : config.useMock
                ? 'Order recorded and a payment link issued. Complete the payment to continue - I will only report success once the payment is verified.'
                : 'Order recorded. Nothing has been charged yet - choose how to pay below, and I will only report success once Razorpay confirms the payment was captured.',
          createdAt: new Date().toISOString(),
          mock: config.useMock,
          blocks: [
            {
              kind: 'payment',
              // Amounts and status come from the order row the backend returned.
              order: result.order,
              product: result.product,
              paymentUrl: result.paymentUrl,
            },
          ],
        },
      ]);

      if (config.useMock) {
        // `paymentLinkId` is passed through as null when no link was issued, so the
        // trail records that step as failed instead of claiming a link that does not
        // exist. A stand-in string like 'not issued' would have read as a success.
        appendActions(
          mockApprovalActions({
            productName: result.product.name,
            orderId: result.order.id,
            razorpayOrderId: result.razorpayOrderId,
            paymentLinkId: result.paymentLinkId,
          }),
        );
      }

      void queryClient.invalidateQueries({ queryKey: qk.orders.all });
      if (conversationId) {
        void queryClient.invalidateQueries({ queryKey: qk.conversations.activity(conversationId) });
      }
    },
    onError: (error, args) => {
      setConfirmations((current) => ({ ...current, [args.turnId]: 'failed' }));
      appendTurns([
        {
          id: localId('turn'),
          role: 'assistant',
          content: 'The order was not created, so nothing has been charged.',
          createdAt: new Date().toISOString(),
          failed: true,
          blocks: [
            {
              kind: 'error',
              code: error instanceof ApiError ? error.code : 'ORDER_FAILED',
              message: errorMessage(error),
              hint: 'No payment was started. You can confirm again to retry - the same idempotency key is reused, so a retry cannot create a second order.',
            },
          ],
        },
      ]);
    },
  });

  const confirmPurchase = useCallback(
    (turnId: string, args: { product: Product; quantity: number }) => {
      // Guard against a double click producing two orders even before the
      // idempotency key reaches the backend.
      if (confirmations[turnId] === 'confirming' || confirmations[turnId] === 'confirmed') return;
      confirmMutation.mutate({ turnId, ...args });
    },
    [confirmMutation, confirmations],
  );

  const declinePurchase = useCallback(
    (turnId: string) => {
      setConfirmations((current) => ({ ...current, [turnId]: 'declined' }));
      appendTurns([
        {
          id: localId('turn'),
          role: 'assistant',
          content: 'Cancelled - no order was created and nothing was charged. Want a different option?',
          createdAt: new Date().toISOString(),
          mock: config.useMock,
        },
      ]);
    },
    [appendTurns],
  );

  // ---------------------------------------------------------------------------
  // Mock settlement (demo control)
  // ---------------------------------------------------------------------------

  const simulate = useCallback(
    async (orderId: string, outcome: 'success' | 'failure') => {
      // Cleared in a `finally`, not after the await: settlement now throws when no
      // payment was ever initiated for this order, and an early return would leave
      // "Verifying payment" on screen for a verification that had already stopped.
      setPhase('verifying-payment');

      try {
        const view = await simulateSettlement(orderId, outcome);

        // Derived from the settled row, never from which button was pressed. Passing
        // `outcome` straight through meant that when settlement silently did not take
        // effect, the trail still recorded 'payment_verified' and 'order_completed ->
        // PAID' - the interface asserting a verified webhook it had never observed.
        // The row reading PAID is the only thing that entitles it to claim verification.
        if (view.order.status === 'PAID') {
          appendActions(mockSettlementActions({ outcome: 'success', paymentId: view.paymentId }));
        } else if (
          view.order.status === 'PAYMENT_FAILED' ||
          view.order.status === 'PAYMENT_EXPIRED'
        ) {
          appendActions(mockSettlementActions({ outcome: 'failure', paymentId: null }));
        }
        // Any other status means the settlement did not land. Nothing is recorded, and
        // the invalidations below let the UI show whatever the row actually says.

        await queryClient.invalidateQueries({ queryKey: qk.orders.payment(orderId) });
        await queryClient.invalidateQueries({ queryKey: qk.orders.detail(orderId) });
        if (conversationId) {
          void queryClient.invalidateQueries({
            queryKey: qk.conversations.activity(conversationId),
          });
        }
      } finally {
        setPhase(null);
      }
    },
    [appendActions, conversationId, queryClient],
  );

  const reset = useCallback(() => {
    clearStoredConversationId();
    setConversationId(null);
    setTranscriptRecording(true);
    setTurns([]);
    setLocalActions([]);
    setStandingProduct(null);
    setActiveOrderId(null);
    setConfirmations({});
    idempotencyKeys.current = {};
    warnedAboutTranscript.current = false;
    creating.current = null;
  }, []);

  const value = useMemo<CheckoutSessionValue>(
    () => ({
      conversationId,
      transcriptRecording,
      turns,
      localActions,
      standingProduct,
      activeOrderId,
      confirmations,
      isThinking: sendMutation.isPending,
      isConfirming: confirmMutation.isPending,
      phase,
      sendError: sendMutation.error,
      send,
      selectProduct,
      confirmPurchase,
      declinePurchase,
      simulate,
      reset,
    }),
    [
      activeOrderId,
      confirmMutation.isPending,
      confirmPurchase,
      confirmations,
      conversationId,
      declinePurchase,
      localActions,
      phase,
      reset,
      selectProduct,
      send,
      sendMutation.error,
      sendMutation.isPending,
      simulate,
      standingProduct,
      transcriptRecording,
      turns,
    ],
  );

  return (
    <CheckoutSessionContext.Provider value={value}>{children}</CheckoutSessionContext.Provider>
  );
}

export function useCheckoutSession(): CheckoutSessionValue {
  const value = useContext(CheckoutSessionContext);
  if (!value) {
    throw new Error('useCheckoutSession must be used inside <CheckoutSessionProvider>.');
  }
  return value;
}
