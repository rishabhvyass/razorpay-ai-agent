import {
  Banknote,
  BadgeCheck,
  Brain,
  MessageSquare,
  ReceiptText,
  ShieldCheck,
  Terminal,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { AgentAction, Order } from '@/types';

/**
 * SCREEN 17 / spec section 40. The pipeline one purchase actually travels.
 *
 * USER INTENT -> AI DECISION -> TOOL -> POLICY -> YOUR APPROVAL -> ORDER ->
 * RAZORPAY -> WEBHOOK VERIFIED, as eight blocks rather than a sentence, because the
 * claim this product makes is about the SHAPE of the flow: the agent proposes, a
 * server-side policy gate stands between it and money, and the last word belongs to
 * a verified webhook.
 *
 * Every stage is derived from the audit trail the backend recorded, plus the order
 * rows this browser knows about. Nothing here is scripted: a stage that has not
 * happened stays grey and says so. That matters more here than anywhere else in the
 * app - a diagram that lights up on a timer would be a claim about a payment nobody
 * verified.
 *
 * One inference is worth naming, because it is the whole safety argument in reverse:
 * a SUCCESSFUL money action is treated as proof that approval existed. The backend
 * refuses every money action whose request does not carry explicit user approval and
 * writes a BLOCKED row instead (backend/src/policy/moneyActionPolicy.ts), so a
 * successful one cannot exist without it. The UI is reading the policy's guarantee,
 * not guessing at intent from prose.
 */
type StageState = 'done' | 'blocked' | 'pending';

const READ_TOOLS = new Set(['search_products', 'get_product', 'get_categories', 'get_order_status']);
const MONEY_TOOLS = new Set(['create_order', 'create_checkout_session']);
const PAYMENT_TOOLS = new Set(['create_checkout_session']);

const TONE: Record<StageState, { block: string; index: string; label: string; state: string }> = {
  done: {
    block: 'bg-success-bg',
    index: 'text-success',
    label: 'text-ink',
    state: 'text-success',
  },
  blocked: {
    block: 'bg-warning-bg',
    index: 'text-warning',
    label: 'text-ink',
    state: 'text-warning',
  },
  pending: {
    block: 'bg-surface-sunken',
    index: 'text-faint',
    label: 'text-muted',
    state: 'text-faint',
  },
};

const STATE_WORD: Record<StageState, string> = {
  done: 'Happened',
  blocked: 'Enforced',
  pending: 'Not yet',
};

/**
 * Read the trail once, into the handful of facts the eight stages need.
 *
 * A blocked money action is counted separately and deliberately: it is the strongest
 * evidence in the whole trail, and spec section 18 is explicit that it is a
 * successful safety action rather than an error.
 */
function readTrail(actions: AgentAction[], orders: Order[]) {
  let reads = 0;
  let anySuccess = false;
  let moneyBlocked = 0;
  let moneyAllowed = 0;
  let orderCreated = false;
  let paymentIssued = false;
  let webhookVerified = false;

  for (const action of actions) {
    const tool = action.toolName;
    const success = action.status === 'success';

    if (success) anySuccess = true;
    if (READ_TOOLS.has(tool) || action.actionType === 'READ_ACTION') {
      if (success) reads += 1;
    }
    if (MONEY_TOOLS.has(tool) || action.actionType === 'MONEY_ACTION') {
      if (action.status === 'blocked') moneyBlocked += 1;
      if (success) moneyAllowed += 1;
    }
    if (success && (tool === 'create_order' || action.actionType === 'CREATE_ORDER')) {
      orderCreated = true;
    }
    if (success && PAYMENT_TOOLS.has(tool)) paymentIssued = true;
    if (success && action.actionType === 'WEBHOOK_VERIFICATION') webhookVerified = true;
  }

  // An order row is evidence too, and a stronger kind: it outlives the trail this
  // browser can read. A PAID row can only have been written from a verified webhook.
  const paidOrders = orders.filter((order) => order.status === 'PAID').length;
  if (orders.length > 0) orderCreated = true;
  if (orders.some((order) => order.razorpayOrderId)) {
    paymentIssued = true;
  }

  return {
    reads,
    anySuccess,
    moneyBlocked,
    moneyAllowed,
    orderCreated,
    paymentIssued,
    webhookVerified,
    paidOrders,
    total: actions.length,
  };
}

function Stage({
  index,
  label,
  evidence,
  state,
  icon,
}: {
  index: number;
  label: string;
  evidence: string;
  state: StageState;
  icon: React.ReactNode;
}) {
  const tone = TONE[state];

  return (
    <li className={cn('rounded-card p-4', tone.block)}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('nums text-[10px] font-bold tracking-[0.1em]', tone.index)}>
          {String(index).padStart(2, '0')}
        </span>
        <span className={tone.index} aria-hidden>
          {icon}
        </span>
      </div>

      <p
        className={cn('mt-3 text-[13px] leading-tight font-bold tracking-[-0.01em]', tone.label)}
      >
        {label}
      </p>
      <p className="text-muted mt-1.5 text-[11px] leading-snug">{evidence}</p>
      {/* The state in words, not only in colour (spec section 27). */}
      <p className={cn('mt-2 text-[10px] font-bold tracking-[0.08em] uppercase', tone.state)}>
        {STATE_WORD[state]}
      </p>
    </li>
  );
}

export function ExecutionTrace({
  actions,
  orders,
}: {
  actions: AgentAction[];
  /** Order rows this browser knows about. Used as evidence, never as decoration. */
  orders: Order[];
}) {
  const t = readTrail(actions, orders);

  const stages: Array<{ label: string; evidence: string; state: StageState; icon: React.ReactNode }> =
    [
      {
        label: 'Your intent',
        evidence:
          t.total > 0
            ? 'You asked for something. Every stage below exists because of that message.'
            : 'Nothing has been asked yet.',
        state: t.total > 0 ? 'done' : 'pending',
        icon: <MessageSquare className="size-3.5" strokeWidth={2.5} aria-hidden />,
      },
      {
        label: 'Agent decision',
        evidence:
          t.reads > 0
            ? `The agent chose to read the catalogue: ${t.reads} ${t.reads === 1 ? 'lookup' : 'lookups'}.`
            : 'No catalogue lookup recorded.',
        state: t.reads > 0 ? 'done' : 'pending',
        icon: <Brain className="size-3.5" strokeWidth={2.5} aria-hidden />,
      },
      {
        label: 'Tool call',
        evidence: t.anySuccess
          ? 'Tools ran against the real backend, not a script. Inputs and outputs are below.'
          : 'No tool has completed yet.',
        state: t.anySuccess ? 'done' : 'pending',
        icon: <Terminal className="size-3.5" strokeWidth={2.5} aria-hidden />,
      },
      {
        label: 'Policy gate',
        evidence:
          t.moneyBlocked > 0
            ? `${t.moneyBlocked} money ${t.moneyBlocked === 1 ? 'action was' : 'actions were'} blocked for lacking your approval. The gate held.`
            : t.moneyAllowed > 0
              ? 'Every money action passed the server-side gate before it ran.'
              : 'No money action has been attempted, so the gate has nothing to judge.',
        state: t.moneyBlocked > 0 ? 'blocked' : t.moneyAllowed > 0 ? 'done' : 'pending',
        icon: <ShieldCheck className="size-3.5" strokeWidth={2.5} aria-hidden />,
      },
      {
        label: 'Your approval',
        evidence:
          t.moneyAllowed > 0
            ? 'A money action succeeded, which the backend permits only with your explicit approval.'
            : 'No money action has been authorised.',
        state: t.moneyAllowed > 0 ? 'done' : 'pending',
        icon: <UserCheck className="size-3.5" strokeWidth={2.5} aria-hidden />,
      },
      {
        label: 'Order created',
        evidence: t.orderCreated
          ? 'The order row was written with the amount recomputed server-side from the product.'
          : 'No order row exists yet.',
        state: t.orderCreated ? 'done' : 'pending',
        icon: <ReceiptText className="size-3.5" strokeWidth={2.5} aria-hidden />,
      },
      {
        label: 'Razorpay',
        evidence: t.paymentIssued
          ? 'Razorpay checkout is ready. Sensitive payment details stay inside Razorpay.'
          : 'No payment instrument has been issued.',
        state: t.paymentIssued ? 'done' : 'pending',
        icon: <Banknote className="size-3.5" strokeWidth={2.5} aria-hidden />,
      },
      {
        label: 'Webhook verified',
        evidence:
          t.paidOrders > 0
            ? `${t.paidOrders} ${t.paidOrders === 1 ? 'order is' : 'orders are'} PAID, written server-side from a signature-verified webhook.`
            : t.webhookVerified
              ? 'A webhook signature was verified. Paid status is written by the backend, never here.'
              : 'No verified webhook yet, so nothing is marked paid.',
        state: t.paidOrders > 0 || t.webhookVerified ? 'done' : 'pending',
        icon: <BadgeCheck className="size-3.5" strokeWidth={2.5} aria-hidden />,
      },
    ];

  return (
    <section aria-label="Execution trace">
      <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {stages.map((stage, index) => (
          <Stage
            key={stage.label}
            index={index + 1}
            label={stage.label}
            evidence={stage.evidence}
            state={stage.state}
            icon={stage.icon}
          />
        ))}
      </ol>
    </section>
  );
}
