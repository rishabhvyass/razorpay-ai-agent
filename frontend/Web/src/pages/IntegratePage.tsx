import { useRef, useState } from 'react';
import { Blocks, Code2, Palette, ShieldCheck, Terminal } from 'lucide-react';
import { Page, Section } from '@/components/layout/PageContainer';
import { CodeBlock } from '@/components/integrate/CodeBlock';
import { Badge, Card, CardHeader } from '@/components/ui';
import { config } from '@/lib/config';
import { cn } from '@/lib/cn';

/**
 * How a merchant puts Mercora in front of their customers.
 *
 * Every snippet on this page is against something that exists in this repository. There
 * is no published embed bundle and no SDK package, so this page does not show a script
 * tag for one - a copyable snippet that 404s is worse than no snippet, and a page about
 * integration is exactly where a fabricated API would be believed.
 *
 * No snippet contains a secret. The key secret and the webhook secret are server-side
 * values; the two flows that need them are shown as calls to a server the merchant runs.
 */
type ModeId = 'drop-in' | 'themed' | 'headless';

const MODES = [
  {
    id: 'drop-in',
    label: 'Drop-in',
    icon: Blocks,
    blurb: 'Mount one element, or link out. Nothing to build.',
    effort: 'Minutes',
  },
  {
    id: 'themed',
    label: 'Themed',
    icon: Palette,
    blurb: 'Mount the same surface and restyle it with your own tokens.',
    effort: 'An afternoon',
  },
  {
    id: 'headless',
    label: 'Headless',
    icon: Terminal,
    blurb: 'Call the API directly and build your own interface on it.',
    effort: 'A sprint',
  },
] as const;

const ORIGIN = typeof window === 'undefined' ? 'https://your-mercora-host' : window.location.origin;
const API = config.apiUrl === '' ? 'https://your-mercora-api' : config.apiUrl;

const DOCK_SNIPPET = `// Mount it once in the shell and the assistant is on every route:
// launcher bottom-right, conversation, approval gate, payment step, audit trail.
import { AssistantDock } from '@/components/chat/AssistantDock';

export function AppShell() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Outlet />
      {/* It renders the same ChatWindow the AI Assistant page does, against the
          same session - one transcript, one conversation, one trail. */}
      <AssistantDock />
    </div>
  );
}`;

const DROP_IN_SNIPPET = `<!-- From another origin, the honest path is still a link: the approval
     gate, the payment step and the audit trail all live behind it. -->
<a
  href="${ORIGIN}/checkout"
  class="mercora-cta"
>
  Shop with AI
</a>`;

const THEMED_SNIPPET = `/* Loaded after Mercora's stylesheet. Every token the UI reads is a
   CSS custom property, so this is the whole theming surface. */
:root {
  --color-brand-blue: #4f46e5;  /* primary actions, active nav, focus ring */
  --color-ink: #0f172a;         /* body text and headings */
  --color-canvas: #ffffff;      /* page background */
  --color-surface-sunken: #f4f4f5;
  --color-success: #16a34a;     /* verified payments only */
  --color-danger: #dc2626;
  --radius-card: 4px;           /* blocks */
  --radius-control: 4px;        /* buttons, inputs, nav items */
}

/* Dark mode reads the same names under .dark - override both or neither. */`;

const HEADLESS_SNIPPET = `# 1. Open a conversation.
curl -X POST "${API}/api/conversations" \\
  -H 'content-type: application/json' \\
  -d '{"userId":"user_123"}'

# 2. Send a turn. The agent can search and propose. It cannot buy.
curl -X POST "${API}/api/chat" \\
  -H 'content-type: application/json' \\
  -d '{"conversationId":"'"$CONVERSATION_ID"'","message":"a hoodie under 3000"}'

# 3. YOUR UI GETS THE APPROVAL. Then record the intent. Nothing is charged
#    here: this writes PENDING_CONFIRMATION and computes the amount from the
#    product row, ignoring any amount you send.
curl -X POST "${API}/api/orders" \\
  -H 'content-type: application/json' \\
  -d '{"productId":"'"$PRODUCT_ID"'","quantity":1,"userId":"user_123","idempotencyKey":"'"$UUID"'"}'

# 4. Create the Razorpay order for Standard Checkout. The server reads the amount
#    from the existing order row; the browser opens Razorpay's modal with this data.
curl -X POST "${API}/api/create-order" \\
  -H 'content-type: application/json' \\
  -d '{"orderId":"'"$ORDER_ID"'","approved":true,"approvalReason":"Customer approved in checkout"}'

# 5. After Standard Checkout returns its signed result, verify it server-side.
curl -X POST "${API}/api/verify-payment" \\
  -H 'content-type: application/json' \\
  -d '{"orderId":"'"$ORDER_ID"'","razorpay_order_id":"'"$RAZORPAY_ORDER_ID"'","razorpay_payment_id":"'"$RAZORPAY_PAYMENT_ID"'","razorpay_signature":"'"$RAZORPAY_SIGNATURE"'"}'

# 6. Read the outcome back from the order. Never from the browser.
curl "${API}/api/orders/$ORDER_ID/payment"`;

export function IntegratePage() {
  const [mode, setMode] = useState<ModeId>('drop-in');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys move between tabs, which is what a tablist is expected to do; without
  // it the roving tabindex below would trap a keyboard user on whichever tab is active.
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = (index + delta + MODES.length) % MODES.length;
    setMode(MODES[next]!.id);
    tabs.current[next]?.focus();
  };

  return (
    <Page
      title="Integrate Mercora"
      description="Three ways to make a catalogue AI-transactable, in increasing order of control"
    >
      <div className="space-y-8">
        <div role="tablist" aria-label="Integration modes" className="grid gap-3 md:grid-cols-3">
          {MODES.map((item, index) => {
            const active = item.id === mode;
            return (
              <button
                key={item.id}
                ref={(node) => {
                  tabs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`mode-tab-${item.id}`}
                aria-selected={active}
                aria-controls={`mode-panel-${item.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setMode(item.id)}
                onKeyDown={(event) => onKeyDown(event, index)}
                className={cn(
                  'motion-micro rounded-card p-5 text-left transition-[background-color,color,transform]',
                  active
                    ? 'bg-brand-blue text-white'
                    : 'bg-surface-sunken text-ink hover:bg-line motion-safe:hover:scale-[1.01]',
                )}
              >
                <item.icon
                  className={cn('size-5', active ? 'text-white' : 'text-faint')}
                  strokeWidth={2.25}
                  aria-hidden
                />
                <p className="mt-3 text-[16px] font-bold tracking-[-0.01em]">{item.label}</p>
                <p className={cn('mt-1.5 text-[12px] leading-relaxed', active ? 'text-white/85' : 'text-muted')}>
                  {item.blurb}
                </p>
                <p
                  className={cn(
                    'mt-3 text-[10px] font-bold tracking-[0.1em] uppercase',
                    active ? 'text-white/70' : 'text-faint',
                  )}
                >
                  {item.effort}
                </p>
              </button>
            );
          })}
        </div>

        {mode === 'drop-in' ? (
          <div role="tabpanel" id="mode-panel-drop-in" aria-labelledby="mode-tab-drop-in" className="space-y-5">
            <Section
              title="Drop the assistant into the shell"
              description="One element, mounted once. It sits collapsed as a launcher in the bottom-right corner of every page and opens into the full conversation - the same conversation the AI Assistant page shows, not a copy of it. Try it: the launcher is on this page."
            >
              <CodeBlock label="AppShell.tsx" code={DOCK_SNIPPET} />
            </Section>

            <Section
              title="Or link to the assistant"
              description="For a storefront on another origin. Your checkout stays yours; conversational purchases happen on the Mercora surface, with the approval gate and the audit trail already in place."
            >
              <CodeBlock label="storefront.html" code={DROP_IN_SNIPPET} />
            </Section>

            <Card tone="warning">
              <CardHeader
                title="There is no cross-origin embed script yet"
                description="The component above is real and mounted in this app. What has not shipped is a hosted bundle, so a third-party site cannot add Mercora with a single <script> tag or an iframe - from another origin the link is still the honest option."
                icon={<Code2 className="size-4" aria-hidden />}
              />
            </Card>
          </div>
        ) : null}

        {mode === 'themed' ? (
          <div role="tabpanel" id="mode-panel-themed" aria-labelledby="mode-tab-themed" className="space-y-5">
            <Section
              title="Override the tokens"
              description="Colour, radius and type are CSS custom properties declared in one file. Nothing in the components hardcodes a hex value, so restyling is a stylesheet, not a fork."
            >
              <CodeBlock label="your-theme.css" code={THEMED_SNIPPET} />
            </Section>

            <Card tone="info">
              <CardHeader
                title="What theming cannot change"
                description="The authorisation card, the amount stated before the decision, and the rule that a payment reads PAID only after a verified webhook. They are structural, not cosmetic - there is no token, prop or flag that removes them."
                icon={<ShieldCheck className="size-4" aria-hidden />}
              />
              <p className="text-muted mt-3 text-[12px] leading-relaxed">
                Shadows are also fixed: <code className="font-mono">--shadow-*</code> resolves to{' '}
                <code className="font-mono">none</code> by design. Hierarchy here comes from size,
                colour and spacing.
              </p>
            </Card>
          </div>
        ) : null}

        {mode === 'headless' ? (
          <div role="tabpanel" id="mode-panel-headless" aria-labelledby="mode-tab-headless" className="space-y-5">
            <Section
              title="The gated sequence"
              description="Five calls, in this order. Step 3 is yours to earn: the API records intent, it does not decide that a customer agreed."
            >
              <CodeBlock label="bash" code={HEADLESS_SNIPPET} />
            </Section>

            <div className="grid gap-4 md:grid-cols-2">
              <Card tone="success">
                <CardHeader
                  title="PAID is not yours to write"
                  description="No endpoint sets an order's status. The only writer is POST /api/webhooks/razorpay, after the HMAC signature verifies and the captured amount is read back and compared against the order row."
                  icon={<ShieldCheck className="size-4" aria-hidden />}
                />
                <p className="text-muted mt-3 text-[12px] leading-relaxed">
                  Poll <code className="font-mono">GET /api/orders/:id/payment</code> and render what
                  it returns. A client that decides a payment succeeded is a client that can be told
                  to lie.
                </p>
              </Card>

              <Card tone="danger">
                <CardHeader
                  title="Keep the secrets server-side"
                  description="The key secret and the webhook secret belong to the server that runs these calls. Only the publishable key id ever reaches a browser, and it goes in the checkout modal, not in a request you sign."
                  icon={<Terminal className="size-4" aria-hidden />}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="danger">Never in a bundle</Badge>
                  <Badge tone="neutral">RAZORPAY_KEY_SECRET</Badge>
                  <Badge tone="neutral">RAZORPAY_WEBHOOK_SECRET</Badge>
                </div>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </Page>
  );
}
