import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  CircleCheck,
  CreditCard,
  Github,
  LockKeyhole,
  Menu,
  Package,
  ShieldCheck,
  Sparkles,
  Webhook,
  X,
} from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui';
import { ThemeToggle } from '@/hooks/useTheme';

const NAV_LINKS = [
  { href: '#problem', label: 'The problem' },
  { href: '#how-it-works', label: 'Process' },
  { href: '#safety', label: 'Safety' },
  { href: '#audit', label: 'Audit trail' },
  { href: '#architecture', label: 'Architecture' },
] as const;

function Brand() {
  return (
    <Link
      to="/"
      className="flex min-h-12 items-center gap-3 rounded-control px-1 focus-visible:outline-offset-4"
      aria-label="Checkout Concierge home"
    >
      <span className="bg-ink text-canvas grid size-10 place-items-center rounded-control font-display text-sm font-bold tracking-tight">
        CC
      </span>
      <span className="min-w-0">
        <span className="text-ink block truncate font-display text-base font-bold tracking-tight">
          Checkout Concierge
        </span>
        <span className="text-muted block truncate text-[10px] font-medium uppercase tracking-[0.18em]">
          Razorpay agentic commerce
        </span>
      </span>
    </Link>
  );
}

function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-canvas sticky top-0 z-20 border-b border-line">
      <div className="mx-auto flex min-h-20 max-w-[1600px] items-center justify-between gap-5 px-4 sm:px-8 lg:px-16">
        <Brand />

        <nav aria-label="Main navigation" className="hidden items-center gap-6 xl:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted hover:text-accent text-[11px] font-semibold uppercase tracking-[0.16em] motion-fast transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="https://github.com/rishabhvyass/razorpay-ai-agent"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View project repository on GitHub"
            className="text-muted hover:text-ink hidden size-12 place-items-center rounded-control border border-line bg-transparent motion-fast transition-colors sm:grid"
          >
            <Github className="size-4" aria-hidden />
          </a>
          <Link
            to="/dashboard"
            className="text-ink hover:bg-ink hover:text-canvas hidden min-h-12 items-center rounded-control px-5 text-[11px] font-semibold uppercase tracking-[0.16em] motion-fast transition-colors md:inline-flex"
          >
            Workspace
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            className="text-muted hover:text-ink grid size-12 place-items-center rounded-control border border-line bg-transparent motion-fast transition-colors xl:hidden"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        /* Spec section 33: the menu fades in and rises 8px rather than appearing. There
           is no reverse on close - the strip is unmounted, and holding it mounted for an
           exit is a change to how the header works rather than to how it looks. */
        <nav
          aria-label="Mobile navigation"
          className="animate-fade-up border-t border-line px-4 py-3 sm:px-8 xl:hidden"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-muted hover:text-accent flex min-h-12 items-center justify-between border-b border-line text-[11px] font-semibold uppercase tracking-[0.16em] motion-fast transition-colors last:border-b-0"
            >
              {link.label}
              <ChevronRight className="size-4" aria-hidden />
            </a>
          ))}
          <Link
            to="/dashboard"
            onClick={() => setOpen(false)}
            className="text-canvas mt-3 flex min-h-12 items-center justify-between rounded-control bg-ink px-4 text-[11px] font-semibold uppercase tracking-[0.16em]"
          >
            Open workspace
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </nav>
      ) : null}
    </header>
  );
}

function CheckoutPreview() {
  return (
    <div
      aria-label="Example Checkout Concierge interaction"
      className="border-line-strong bg-surface relative w-full overflow-hidden rounded-card border p-5 shadow-card sm:p-8"
    >
      <div className="border-line flex items-start justify-between gap-4 border-b pb-5">
        <div>
          <p className="text-muted text-[10px] font-semibold uppercase tracking-[0.22em]">
            Example interaction
          </p>
          <p className="text-ink mt-2 font-display text-2xl font-bold">Concierge session</p>
        </div>
        <Badge tone="success" icon={<CircleCheck className="size-3" aria-hidden />}>
          Test mode
        </Badge>
      </div>

      <div className="space-y-6 py-6">
        <div className="flex justify-end">
          <div className="bg-ink text-canvas max-w-[84%] px-4 py-3 text-sm leading-relaxed">
            Find running shoes under ₹3,500
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="border-line-strong bg-canvas text-accent grid size-10 shrink-0 place-items-center rounded-control border">
            <Sparkles className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-ink text-sm leading-relaxed">
              I found a pair that fits the request and is in stock.
            </p>
            <div className="border-line mt-5 border-t py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-ink font-display text-xl font-bold">Stride Knit Runner</p>
                  <p className="text-muted mt-1 text-xs">Black / size 9</p>
                </div>
                <p className="text-ink nums font-display text-lg font-bold">₹2,899</p>
              </div>
              <div className="mt-5 flex items-center justify-between gap-4">
                <Badge tone="success" icon={<Check className="size-3" aria-hidden />}>
                  In stock
                </Badge>
                <span className="text-muted text-[10px] uppercase tracking-[0.12em]">
                  No payment started
                </span>
              </div>
            </div>
            <div className="border-accent-300 bg-accent-50 flex items-start gap-3 border-l-2 px-4 py-3">
              <LockKeyhole className="text-accent-700 mt-0.5 size-4 shrink-0" aria-hidden />
              <p className="text-muted text-xs leading-relaxed">
                The agent asks before creating an order or opening checkout.
              </p>
            </div>
            <Button variant="primary" size="md" fullWidth className="mt-5">
              Review purchase
              <ArrowRight className="size-3.5" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
      <div className="text-muted flex items-center justify-between border-t border-line pt-4 text-[10px] uppercase tracking-[0.14em]">
        <span>Activity visible</span>
        <span>Approval required</span>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px bg-line lg:block" aria-hidden />
      <div className="mx-auto grid min-h-0 grid-cols-1 max-w-[1600px] items-center gap-12 px-4 py-12 sm:px-8 md:min-h-[calc(100dvh-5rem)] md:grid-cols-[5fr_7fr] md:py-16 lg:gap-20 lg:px-16">
        <div className="max-w-2xl">
          <p className="text-accent-700 mb-7 text-[10px] font-semibold uppercase tracking-[0.28em]">
            Conversational commerce, with a human handoff
          </p>
          <h1 className="text-ink max-w-[9ch] font-display text-6xl leading-[0.92] font-normal tracking-[-0.045em] sm:text-7xl lg:text-8xl">
            Commerce with a human handoff.
          </h1>
          <p className="text-muted mt-8 max-w-lg text-base leading-relaxed sm:text-lg">
            Let the agent find the right product. You stay in control of the money step.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/checkout">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                Try a checkout
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                See the process
              </Button>
            </a>
          </div>
          <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-5 text-[10px] font-semibold uppercase tracking-[0.14em]">
            <span className="text-muted inline-flex items-center gap-2">
              <CircleCheck className="text-success size-4" aria-hidden />
              Server-side totals
            </span>
            <span className="text-muted inline-flex items-center gap-2">
              <CircleCheck className="text-success size-4" aria-hidden />
              Verified outcome
            </span>
          </div>
        </div>

        <div className="relative md:pl-4 lg:pl-10">
          <div className="border-line-strong pointer-events-none absolute -right-6 -top-7 hidden h-32 w-32 border lg:block" aria-hidden />
          <div className="bg-accent pointer-events-none absolute -bottom-4 -left-2 hidden h-2 w-24 lg:block" aria-hidden />
          <CheckoutPreview />
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section id="problem" className="bg-ink text-canvas">
      <div className="mx-auto grid grid-cols-1 max-w-[1600px] gap-12 px-4 py-16 sm:px-8 md:grid-cols-[4fr_8fr] md:py-28 lg:px-16">
        <div>
          <p className="text-canvas/60 max-w-xs text-sm leading-relaxed">
            A shopping assistant can be helpful without becoming an invisible payment actor.
          </p>
          <ArrowDownRight className="text-accent mt-16 size-8" aria-hidden />
        </div>
        <div className="max-w-4xl">
          <h2 className="text-canvas font-display text-4xl leading-[0.98] font-normal tracking-[-0.04em] sm:text-6xl">
            The recommendation is conversational. The payment boundary is unmistakable.
          </h2>
          <div className="mt-12 grid gap-8 border-t border-white/20 pt-8 sm:grid-cols-2">
            <div>
              <p className="text-accent text-[10px] font-semibold uppercase tracking-[0.22em]">The agent</p>
              <p className="text-canvas/70 mt-4 max-w-sm text-sm leading-relaxed">
                Searches the live catalogue and explains why a product fits the request.
              </p>
            </div>
            <div>
              <p className="text-accent text-[10px] font-semibold uppercase tracking-[0.22em]">The user</p>
              <p className="text-canvas/70 mt-4 max-w-sm text-sm leading-relaxed">
                Reviews the product, quantity, and total before any order or checkout exists.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  const steps = [
    { label: 'Describe', detail: 'Tell the agent what you need in plain language.', icon: Bot },
    { label: 'Match', detail: 'The agent searches structured catalogue data.', icon: Package },
    { label: 'Confirm', detail: 'Review the item, quantity, and exact total.', icon: LockKeyhole },
    { label: 'Verify', detail: 'Razorpay confirms the captured payment server-side.', icon: Webhook },
  ] as const;

  return (
    <section id="how-it-works" className="mx-auto max-w-[1600px] px-4 py-20 sm:px-8 md:py-28 lg:px-16">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[5fr_7fr] md:gap-20">
        <div className="max-w-xl">
          <h2 className="text-ink font-display text-4xl leading-[0.98] font-normal tracking-[-0.04em] sm:text-6xl">
            A visible sequence from intent to verified order.
          </h2>
          <p className="text-muted mt-6 max-w-md text-base leading-relaxed">
            Every transition has a place in the interface, so the user never has to infer what happened.
          </p>
          <Link to="/checkout" className="text-ink hover:text-accent mt-10 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] motion-fast transition-colors">
            Open the agent
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <ol className="border-t border-line">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.label} className="group border-b border-line py-5 sm:py-6">
                <div className="flex items-start gap-5">
                  <span className="text-muted nums w-8 shrink-0 pt-1 font-mono text-[10px]">0{index + 1}</span>
                  <span className="border-line bg-surface-subtle text-accent grid size-10 shrink-0 place-items-center border motion-fast transition-colors group-hover:bg-accent group-hover:text-[#1A1A1A]">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-ink font-display text-2xl font-bold">{step.label}</h3>
                      <ChevronRight className="text-accent motion-fast size-4 transition-transform motion-safe:group-hover:translate-x-1" aria-hidden />
                    </div>
                    <p className="text-muted mt-2 max-w-md text-sm leading-relaxed">{step.detail}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function SafetySection() {
  return (
    <section id="safety" className="border-y border-line bg-surface-subtle">
      <div className="mx-auto grid grid-cols-1 max-w-[1600px] gap-12 px-4 py-16 sm:px-8 md:grid-cols-[7fr_5fr] md:items-center md:py-28 lg:px-16">
        <div className="max-w-3xl">
          <h2 className="text-ink font-display text-4xl leading-[0.98] font-normal tracking-[-0.04em] sm:text-6xl">
            The safety rule is simple enough to inspect.
          </h2>
          <p className="text-muted mt-6 max-w-xl text-base leading-relaxed">
            Browsing and recommendation are reversible. Creating an order is a deliberate user action.
          </p>
        </div>
        <div className="border-line-strong bg-canvas rounded-card border-t p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-5">
            <span className="text-ink text-sm font-semibold">Money action policy</span>
            <ShieldCheck className="text-accent-700 size-5" aria-hidden />
          </div>
          <ul className="divide-line divide-y text-sm">
            {[
              'Totals are recomputed from the catalogue on the server.',
              'The payment provider collects sensitive details outside this app.',
              'Paid appears only after the backend validates a webhook.',
            ].map((item) => (
              <li key={item} className="text-muted flex items-start gap-3 py-4 leading-relaxed">
                <Check className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function AuditSection() {
  return (
    <section id="audit" className="mx-auto max-w-[1600px] px-4 py-20 sm:px-8 md:py-28 lg:px-16">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[4fr_8fr] md:items-start md:gap-20">
        <div className="max-w-md">
          <h2 className="text-ink font-display text-4xl leading-[0.98] font-normal tracking-[-0.04em] sm:text-6xl">
            The handoff leaves a record.
          </h2>
          <p className="text-muted mt-6 text-base leading-relaxed">
            Tool calls, approvals, order creation, and payment verification stay legible to the merchant.
          </p>
          <Link to="/activity" className="text-ink hover:text-accent mt-10 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] motion-fast transition-colors">
            Open audit ledger
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <Card className="border-line border p-0 shadow-card" interactive>
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <Activity className="text-accent-700 size-5" aria-hidden />
              <div>
                <p className="text-ink text-sm font-semibold">Session activity</p>
                <p className="text-muted mt-1 text-xs">One conversation, one accountable trail</p>
              </div>
            </div>
            <Badge tone="success" pulse>Verified</Badge>
          </div>
          <div className="px-5 py-2 sm:px-8">
            {[
              ['Catalogue search', 'Found matching products', 'Completed'],
              ['Purchase authorisation', 'User confirmed the displayed total', 'Approved'],
              ['Razorpay webhook', 'Signature and captured amount checked', 'Verified'],
            ].map(([title, detail, state], index) => (
              <div key={title} className="flex gap-4 border-b border-line py-5 last:border-b-0">
                <div className="flex flex-col items-center">
                  <span className="bg-success grid size-7 place-items-center text-white">
                    <Check className="size-3.5" aria-hidden />
                  </span>
                  {index < 2 ? <span className="bg-success/35 mt-1 h-7 w-px" aria-hidden /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap justify-between gap-3">
                    <p className="text-ink text-sm font-semibold">{title}</p>
                    <span className="text-success text-[10px] font-semibold uppercase tracking-[0.16em]">{state}</span>
                  </div>
                  <p className="text-muted mt-2 text-xs leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

function ArchitectureSection() {
  const pillars = [
    { title: 'Structured catalogue', detail: 'One source for browsing and agent recommendations.', icon: Package },
    { title: 'Protected payment', detail: 'Sensitive payment collection stays with the provider.', icon: CreditCard },
    { title: 'Verified outcome', detail: 'The backend validates the provider callback before paid.', icon: Webhook },
  ] as const;

  return (
    <section id="architecture" className="bg-ink text-canvas">
      <div className="mx-auto max-w-[1600px] px-4 py-20 sm:px-8 md:py-28 lg:px-16">
        <div className="max-w-3xl">
          <h2 className="text-canvas font-display text-4xl leading-[0.98] font-normal tracking-[-0.04em] sm:text-6xl">
            Built around clear boundaries.
          </h2>
          <p className="text-canvas/65 mt-6 max-w-xl text-base leading-relaxed">
            The interface mirrors the system architecture, so confidence is grounded in concrete transitions.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 border-t border-white/20 pt-8 md:grid-cols-3 md:gap-12">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="border-b border-white/20 pb-8 md:border-b-0">
                <Icon className="text-accent size-5" aria-hidden />
                <h3 className="text-canvas mt-7 font-display text-2xl font-bold">{pillar.title}</h3>
                <p className="text-canvas/65 mt-3 max-w-xs text-sm leading-relaxed">{pillar.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/20 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-canvas/60 text-[10px] font-semibold uppercase tracking-[0.2em]">Razorpay Test Mode</span>
          <Link to="/checkout">
            <Button variant="secondary" size="md" className="border-white/50 text-canvas hover:bg-canvas hover:text-ink">
              Open checkout
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="bg-canvas border-t border-line">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-4 py-10 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-16">
        <div className="flex items-center gap-3">
          <span className="bg-ink text-canvas grid size-10 place-items-center rounded-control font-display text-sm font-bold">CC</span>
          <div>
            <p className="text-ink font-display text-base font-bold">Checkout Concierge</p>
            <p className="text-muted mt-1 text-xs">A safer path from conversation to payment.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-[10px] font-semibold uppercase tracking-[0.16em]">
          <Link to="/products" className="text-muted hover:text-accent motion-fast transition-colors">Catalog</Link>
          <Link to="/orders" className="text-muted hover:text-accent motion-fast transition-colors">Orders</Link>
          <Link to="/checkout" className="text-muted hover:text-accent motion-fast transition-colors">Start a checkout</Link>
        </div>
      </div>
      <div className="text-muted mx-auto flex max-w-[1600px] flex-col gap-2 border-t border-line px-4 py-5 text-[10px] uppercase tracking-[0.14em] sm:flex-row sm:justify-between sm:px-8 lg:px-16">
        <span>No live payments. Test mode only.</span>
        <span>© {new Date().getFullYear()} Checkout Concierge</span>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="bg-canvas text-ink min-h-dvh">
      <LandingNavbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <ProcessSection />
        <SafetySection />
        <AuditSection />
        <ArchitectureSection />
      </main>
      <LandingFooter />
    </div>
  );
}
