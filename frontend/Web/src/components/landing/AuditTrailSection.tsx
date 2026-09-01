import { Check, ShieldCheck, Terminal } from 'lucide-react';

interface AuditEvent {
  timestamp: string;
  tool: string;
  detail: string;
  proof: string;
  status: 'SUCCESS' | 'VERIFIED';
}

const AUDIT_EVENTS: AuditEvent[] = [
  {
    timestamp: '19:02:11',
    tool: 'SEARCH_PRODUCTS',
    detail: 'Catalog search for "Black hoodie under ₹2,000"',
    proof: 'pg_query_idx: 2 records matched',
    status: 'SUCCESS',
  },
  {
    timestamp: '19:02:23',
    tool: 'PURCHASE_APPROVED',
    detail: 'User explicitly confirmed purchase of ₹1,499.00',
    proof: 'human_signature_gate_unlocked',
    status: 'SUCCESS',
  },
  {
    timestamp: '19:02:24',
    tool: 'CREATE_ORDER',
    detail: 'Drafted order #ord_NxK7Pq2d in PostgreSQL',
    proof: 'amount_minor: 149900 paise',
    status: 'SUCCESS',
  },
  {
    timestamp: '19:02:25',
    tool: 'PAYMENT_LINK',
    detail: 'Generated Razorpay Test Mode checkout link',
    proof: 'plink_id: plink_99812a0f',
    status: 'SUCCESS',
  },
  {
    timestamp: '19:04:02',
    tool: 'WEBHOOK_VERIFIED',
    detail: 'Razorpay webhook payment.captured received',
    proof: 'HMAC-SHA256 signature verified',
    status: 'VERIFIED',
  },
  {
    timestamp: '19:04:03',
    tool: 'ORDER_PAID',
    detail: 'Order state updated to PAID & inventory decremented',
    proof: 'ledger_entry_id: #tx_88192a',
    status: 'VERIFIED',
  },
];

export function AuditTrailSection() {
  return (
    <section id="audit" className="py-16 sm:py-20 md:py-28 bg-[#F8FAFC] dark:bg-[#090D16] border-y border-[#E2E8F0] dark:border-[#1E293B]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0F172A] dark:text-white leading-[1.08]">
            Every decision has an immutable audit trail.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#475569] dark:text-[#94A3B8] max-w-[54ch]">
            Agent actions are logged with millisecond timestamps, parameter signatures, and cryptographic proofs in PostgreSQL.
          </p>
        </div>

        {/* Timeline Table Container */}
        <div className="mt-12 md:mt-14 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-card dark:border-[#1E293B] dark:bg-[#0F172A]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 sm:px-5 py-3.5 dark:border-[#1E293B] dark:bg-[#0A0F1D] gap-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#0F172A] dark:text-white">
              <Terminal className="h-4 w-4 text-[#0C66E4] dark:text-[#388BFF]" aria-hidden="true" />
              <span>AGENT TRANSACTION AUDIT LOG</span>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-[#16A34A] dark:text-[#4ADE80] font-semibold">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>6 of 6 Events Cryptographically Verified</span>
            </span>
          </div>

          {/* Desktop Table view with horizontal scroll on mobile */}
          <div className="overflow-x-auto scrollbar-slim">
            <table className="w-full text-left font-mono text-xs min-w-[640px]">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]/60 text-[11px] text-[#475569] uppercase tracking-wider dark:border-[#1E293B] dark:bg-[#1E293B]/40 dark:text-[#94A3B8]">
                <tr>
                  <th scope="col" className="px-4 sm:px-5 py-3.5">Time</th>
                  <th scope="col" className="px-4 sm:px-5 py-3.5">Tool Action</th>
                  <th scope="col" className="px-4 sm:px-5 py-3.5 font-sans">Details</th>
                  <th scope="col" className="px-4 sm:px-5 py-3.5">Cryptographic Proof</th>
                  <th scope="col" className="px-4 sm:px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                {AUDIT_EVENTS.map((event, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40 transition-colors">
                    <td className="px-4 sm:px-5 py-4 text-[#475569] dark:text-[#94A3B8]">
                      {event.timestamp}
                    </td>
                    <td className="px-4 sm:px-5 py-4 font-bold text-[#0C66E4] dark:text-[#388BFF]">
                      {event.tool}
                    </td>
                    <td className="px-4 sm:px-5 py-4 font-sans text-[#0F172A] dark:text-white max-w-xs">
                      {event.detail}
                    </td>
                    <td className="px-4 sm:px-5 py-4 text-[#0047B3] dark:text-[#388BFF]">
                      {event.proof}
                    </td>
                    <td className="px-4 sm:px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FDF4] px-2.5 py-0.5 text-[10px] font-bold text-[#16A34A] border border-[#BBF7D0] dark:bg-[#052E16] dark:text-[#4ADE80] dark:border-[#14532D]">
                        <Check className="h-3 w-3" aria-hidden="true" />
                        {event.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
