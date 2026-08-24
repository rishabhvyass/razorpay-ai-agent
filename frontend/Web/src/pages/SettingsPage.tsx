import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  CircleAlert,
  Database,
  FlaskConical,
  Link2Off,
  Lock,
  RotateCcw,
  ShieldCheck,
  Trash2,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Page, Section } from '@/components/layout/PageContainer';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  MockNotice,
  Modal,
} from '@/components/ui';
import { useHealth } from '@/hooks/useHealth';
import { useCheckoutSession } from '@/hooks/useCheckoutSession';
import { NOT_IMPLEMENTED_ENDPOINTS, config } from '@/lib/config';
import { truncateId } from '@/lib/format';
import {
  clearRecordedOrderIds,
  getRecordedOrderIds,
  getUserId,
  setUserId,
} from '@/lib/session';
import { hasMockPayments, resetMockPayments } from '@/services/mock/mockPayments';

/** Postgres `uuid` shape. A wrong-shaped id fails the profiles foreign key server-side. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Settings, and the honest disclosure surface.
 *
 * Two jobs. The first is the handful of things a reviewer genuinely needs to set:
 * the user id used for order history, and the local session reset.
 *
 * The second is telling the truth about what this build is. Which backend it is
 * talking to, which endpoints do not exist yet, which parts of the screen come from
 * the labelled mock adapter, and - explicitly - what is *not* in this bundle. Every
 * one of those is a fact a reviewer would otherwise have to read the source to learn.
 *
 * Nothing here can display a secret, because nothing here has access to one. The
 * names in the "never in this bundle" list are variable names, not values; this app
 * has no code path that reads them.
 */
export function SettingsPage() {
  const health = useHealth();
  const session = useCheckoutSession();

  const [userIdDraft, setUserIdDraft] = useState(() => getUserId() ?? '');
  const [savedUserId, setSavedUserId] = useState(() => getUserId());
  const [justSaved, setJustSaved] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const orderIds = getRecordedOrderIds();
  const trimmedDraft = userIdDraft.trim();
  const draftInvalid = trimmedDraft !== '' && !UUID.test(trimmedDraft);
  const draftChanged = trimmedDraft !== (savedUserId ?? '');

  // Why Save is unavailable, or null when it is available. The button is
  // aria-disabled rather than disabled so this explanation is reachable: a disabled
  // button is removed from the tab order, so a screen reader user never lands on it
  // and never hears that a malformed id is what stopped it from responding.
  const saveBlockedReason = draftInvalid
    ? 'Save is unavailable because the user id is not a UUID.'
    : !draftChanged
      ? 'Save is unavailable because the user id has not changed.'
      : null;

  const saveUserId = () => {
    if (draftInvalid || !draftChanged) return;
    setUserId(trimmedDraft === '' ? null : trimmedDraft);
    setSavedUserId(trimmedDraft === '' ? null : trimmedDraft);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2000);
  };

  /**
   * Clear everything this browser remembers. Deletes no backend data - the order
   * rows stay in Postgres, this only forgets their ids, which is why the copy says
   * so rather than implying a deletion it cannot perform.
   */
  const resetLocalState = () => {
    clearRecordedOrderIds();
    resetMockPayments();
    session.reset();
    setResetOpen(false);
  };

  const apiOrigin = config.apiUrl === '' ? window.location.origin : config.apiUrl;

  return (
    <Page title="Settings" description="Configuration, and what this build does and does not do">
      <div className="max-w-3xl space-y-6">
        {/* ------------------------------------------------------------------ */}
        <Section title="Backend" description="Where the data on every other page comes from">
          <Card padded={false}>
            <div className="border-line flex items-start justify-between gap-3 border-b px-4 py-3">
              <CardHeader
                title="Connection"
                description={
                  config.apiUrl === ''
                    ? 'Same origin — the Vite dev server proxies /api and /health to localhost:3000.'
                    : 'Set through VITE_API_URL.'
                }
                icon={<Database className="size-4" aria-hidden />}
              />
              <div className="shrink-0">
                {health.isSuccess ? (
                  <Badge tone="success" icon={<Wifi className="size-3" aria-hidden />}>
                    Reachable
                  </Badge>
                ) : health.isPending ? (
                  <Badge tone="neutral">Checking…</Badge>
                ) : (
                  <Badge tone="danger" icon={<WifiOff className="size-3" aria-hidden />}>
                    Unreachable
                  </Badge>
                )}
              </div>
            </div>

            <dl className="divide-line divide-y text-[13px]">
              <Row label="Origin">
                <code className="text-ink break-all">{apiOrigin}</code>
              </Row>
              <Row label="Health endpoint">
                <code className="text-ink">GET /health</code>
              </Row>
              <Row label="Reported status">
                {health.isSuccess ? (
                  <span className="text-ink">{health.data.status}</span>
                ) : health.isError ? (
                  <span className="text-danger">
                    {health.error instanceof Error ? health.error.message : 'No response'}
                  </span>
                ) : (
                  <span className="text-faint">—</span>
                )}
              </Row>
              {health.data?.service ? (
                <Row label="Service">
                  <span className="text-ink">{health.data.service}</span>
                </Row>
              ) : null}
              {health.data?.environment ? (
                <Row label="Environment">
                  <span className="text-ink">{health.data.environment}</span>
                </Row>
              ) : null}
            </dl>

            {health.isError ? (
              <div className="border-line border-t px-4 py-3">
                <p className="text-muted text-[12px] leading-relaxed">
                  Every product, order and activity surface reads from this backend, so they will
                  show their error states until it answers. Start it with{' '}
                  <code className="text-ink">npm run dev</code> in{' '}
                  <code className="text-ink">backend/</code>.
                </p>
              </div>
            ) : null}
          </Card>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section
          title="Not implemented on the backend"
          description="Quoted from the backend's own route index at GET /"
        >
          <Card padded={false}>
            <ul className="divide-line divide-y">
              {NOT_IMPLEMENTED_ENDPOINTS.map((endpoint) => (
                <li key={endpoint} className="flex items-start gap-2.5 px-4 py-3">
                  <Link2Off className="text-faint mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <code className="text-muted text-[12px] leading-relaxed">{endpoint}</code>
                </li>
              ))}
            </ul>
            <div className="border-line border-t px-4 py-3">
              <p className="text-muted text-[12px] leading-relaxed">
                This frontend does not implement either of them. It does not call Claude, Razorpay or
                Supabase directly, and it does not construct payment URLs. Where a route is missing,
                the affected surface either says so or is served by the clearly-labelled mock
                adapter below — never by silently invented data.
              </p>
            </div>
          </Card>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="Mock adapter" description="Which parts of the demo are simulated">
          <Card padded={false}>
            <div className="border-line flex items-start justify-between gap-3 border-b px-4 py-3">
              <CardHeader
                title={config.useMock ? 'Enabled' : 'Disabled'}
                description="Set with VITE_USE_MOCK in frontend/Web/.env.local"
                icon={<FlaskConical className="size-4" aria-hidden />}
              />
              <div className="shrink-0">
                <Badge tone={config.useMock ? 'warning' : 'neutral'}>
                  {config.useMock ? 'Simulating 2 layers' : 'Backend only'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 p-4">
              {config.useMock ? (
                <>
                  <p className="text-muted text-[13px] leading-relaxed">
                    The agent's replies and the payment states after order creation are produced
                    locally. Everything labelled{' '}
                    <Badge tone="warning" icon={<FlaskConical className="size-3" aria-hidden />}>
                      Simulated
                    </Badge>{' '}
                    came from <code className="text-ink">src/services/mock/</code>.
                  </p>
                  <dl className="divide-line divide-y text-[13px]">
                    <Row label="Real">
                      <span className="text-ink">
                        Products, conversations, messages, order creation, order reads, activity
                        trail — all Postgres rows through the backend.
                      </span>
                    </Row>
                    <Row label="Simulated">
                      <span className="text-ink">
                        Agent reasoning and replies; Razorpay order id, payment link and the
                        pending → paid/failed transition.
                      </span>
                    </Row>
                  </dl>
                  <MockNotice>
                    Mock mode is force-disabled in production builds regardless of this flag —
                    fabricated payment data reaching a real deployment is exactly what the product
                    principle forbids.
                  </MockNotice>
                </>
              ) : (
                <p className="text-muted text-[13px] leading-relaxed">
                  Nothing on screen is simulated. The chat and the payment states will show their
                  not-implemented states instead, because the endpoints behind them do not exist
                  yet. Set <code className="text-ink">VITE_USE_MOCK=true</code> to walk the full
                  flow with the labelled adapter.
                </p>
              )}
            </div>
          </Card>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section
          title="Identity"
          description="The backend has no auth layer, so the user id is set by hand"
        >
          <Card>
            <div className="space-y-4">
              <Field
                label="User id"
                htmlFor="settings-user-id"
                hint={
                  draftInvalid ? (
                    <span className="text-danger">
                      Not a UUID. The <code>orders.user_id</code> column is a foreign key to{' '}
                      <code>profiles.id</code>, so a made-up value would be rejected by the
                      database.
                    </span>
                  ) : (
                    <>
                      Optional, and empty is valid — <code>POST /api/orders</code> accepts a null
                      user id. Paste the UUID of a row that exists in <code>profiles</code> to send
                      it with new orders and to load a real history from{' '}
                      <code>GET /api/users/:userId/orders</code>.
                    </>
                  )
                }
              >
                <Input
                  id="settings-user-id"
                  value={userIdDraft}
                  onChange={(event) => setUserIdDraft(event.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  spellCheck={false}
                  autoComplete="off"
                  invalid={draftInvalid}
                  leading={<User className="size-4" aria-hidden />}
                  className="font-mono"
                />
              </Field>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={saveUserId}
                  aria-disabled={saveBlockedReason !== null || undefined}
                  aria-describedby={saveBlockedReason ? 'settings-save-reason' : undefined}
                  icon={justSaved ? <Check className="size-3.5" aria-hidden /> : undefined}
                >
                  {justSaved ? 'Saved' : 'Save'}
                </Button>
                {savedUserId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUserIdDraft('');
                      setUserId(null);
                      setSavedUserId(null);
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
                <span className="text-faint ml-auto text-[12px]">
                  {savedUserId ? (
                    <>
                      Orders page reads{' '}
                      <code className="text-muted">/api/users/{truncateId(savedUserId, 8, 4)}/orders</code>
                    </>
                  ) : (
                    'Orders page shows orders created in this browser'
                  )}
                </span>
              </div>

              {/* The button's own description, and a polite live region so the reason
                  is spoken when it changes rather than only when the button is read. */}
              {saveBlockedReason ? (
                <p
                  id="settings-save-reason"
                  role="status"
                  aria-live="polite"
                  className="text-faint text-[12px]"
                >
                  {saveBlockedReason}
                </p>
              ) : null}
            </div>
          </Card>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section
          title="This browser's session"
          description="Identifiers only — never prices, amounts or statuses"
        >
          <Card padded={false}>
            <dl className="divide-line divide-y text-[13px]">
              <Row label="Conversation id">
                {session.conversationId ? (
                  <code className="text-ink" title={session.conversationId}>
                    {truncateId(session.conversationId, 18, 6)}
                  </code>
                ) : (
                  <span className="text-faint">None yet</span>
                )}
              </Row>
              <Row label="Transcript">
                {session.conversationId ? (
                  session.transcriptRecording ? (
                    <span className="text-success">Being recorded by the backend</span>
                  ) : (
                    <span className="text-warning">
                      Not persisted — the backend could not record it
                    </span>
                  )
                ) : (
                  <span className="text-faint">—</span>
                )}
              </Row>
              <Row label="Recorded order ids">
                <span className="text-ink">
                  {orderIds.length} {orderIds.length === 1 ? 'order' : 'orders'}
                  {orderIds.length > 0 ? (
                    <>
                      {' — '}
                      <Link to="/orders" className="text-accent font-medium">
                        view them
                      </Link>
                    </>
                  ) : null}
                </span>
              </Row>
              {config.useMock ? (
                <Row label="Simulated payment overlay">
                  <span className="text-ink">
                    {hasMockPayments() ? 'Present for this session' : 'Empty'}
                  </span>
                </Row>
              ) : null}
              <Row label="Stored where">
                <span className="text-muted">
                  <code className="text-ink">sessionStorage</code> for the conversation id,{' '}
                  <code className="text-ink">localStorage</code> for the order ids and user id.
                </span>
              </Row>
            </dl>

            <div className="border-line flex flex-wrap items-center gap-2 border-t px-4 py-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setResetOpen(true)}
                icon={<RotateCcw className="size-3.5" aria-hidden />}
              >
                Reset local session
              </Button>
              <p className="text-faint text-[12px]">
                Forgets the ids. Deletes nothing from the database.
              </p>
            </div>
          </Card>
        </Section>

        {/* ------------------------------------------------------------------ */}
        <Section title="Security" description="What this bundle contains, and what it never can">
          <Card tone="accent">
            <div className="flex items-start gap-3">
              <Lock className="text-accent mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0 space-y-3">
                <p className="text-ink text-[13px] leading-relaxed font-medium">
                  No credential of any kind is present in this frontend.
                </p>
                <p className="text-muted text-[13px] leading-relaxed">
                  Vite inlines every <code className="text-ink">VITE_</code> variable into the
                  bundle, so the browser can read anything declared that way. This app declares
                  exactly two — the API origin and the mock flag — and both are public by design.
                  These stay server-side and have no reader in this codebase:
                </p>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {[
                    'AGENTROUTER_API_KEY',
                    'ANTHROPIC_API_KEY',
                    'RAZORPAY_KEY_SECRET',
                    'RAZORPAY_WEBHOOK_SECRET',
                    'SUPABASE_SERVICE_ROLE_KEY',
                  ].map((name) => (
                    <li key={name} className="text-muted flex items-center gap-1.5 text-[12px]">
                      <ShieldCheck className="text-accent size-3.5 shrink-0" aria-hidden />
                      <code>{name}</code>
                    </li>
                  ))}
                </ul>
                <p className="text-muted text-[13px] leading-relaxed">
                  Nor does this app trust its own values for anything financial. Amounts, order
                  status and payment status are only ever displayed as the backend returned them —
                  there is no client-side code that computes a price or sets a payment state. JSON
                  payloads in the activity trail are passed through a redaction step before they
                  reach the DOM.
                </p>
              </div>
            </div>
          </Card>
        </Section>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset local session?"
        description="This clears what the browser remembers."
        labelledBy="reset-title"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="md" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={resetLocalState}
              icon={<Trash2 className="size-4" aria-hidden />}
            >
              Reset
            </Button>
          </div>
        }
      >
        <div className="space-y-3 px-5 py-4">
          <p className="text-muted text-[13px] leading-relaxed">
            Clears the current conversation, the {orderIds.length}{' '}
            {orderIds.length === 1 ? 'recorded order id' : 'recorded order ids'} and the simulated
            payment overlay.
          </p>
          <div className="rounded-control border-info-line bg-info-bg flex items-start gap-2.5 border px-3 py-2.5">
            <CircleAlert className="text-info mt-0.5 size-3.5 shrink-0" aria-hidden />
            <p className="text-muted text-xs leading-relaxed">
              Nothing is deleted from the database. The order and conversation rows remain; this
              browser simply stops listing them, and there is no backend endpoint that could delete
              them anyway.
            </p>
          </div>
        </div>
      </Modal>
    </Page>
  );
}

/** One label/value line in the settings tables. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-muted text-[12px] sm:text-[13px]">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
