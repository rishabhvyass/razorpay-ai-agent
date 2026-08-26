import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface AuditRow {
  id: string;
  timestamp: string;
  action: string;
  resourceId: string;
  actor: 'CUSTOMER' | 'AGENT' | 'RAZORPAY_WEBHOOK';
  status: 'VERIFIED' | 'AUTHORIZED' | 'PAID' | 'RESERVED';
  signature: string;
}

const AUDIT_ROWS: AuditRow[] = [
  {
    id: 'act-1',
    timestamp: '23:42:01.120',
    action: 'CATALOG_SEARCH',
    resourceId: 'cat_hoodies_320gsm',
    actor: 'AGENT',
    status: 'VERIFIED',
    signature: 'db_read_ok',
  },
  {
    id: 'act-2',
    timestamp: '23:42:08.450',
    action: 'DRAFT_ORDER_CREATED',
    resourceId: 'order_NxK7Pq2d',
    actor: 'AGENT',
    status: 'RESERVED',
    signature: 'pg_tx_88192a',
  },
  {
    id: 'act-3',
    timestamp: '23:42:15.900',
    action: 'PURCHASE_AUTHORIZED',
    resourceId: 'order_NxK7Pq2d',
    actor: 'CUSTOMER',
    status: 'AUTHORIZED',
    signature: 'user_auth_sig',
  },
  {
    id: 'act-4',
    timestamp: '23:42:18.230',
    action: 'PAYMENT_LINK_ISSUED',
    resourceId: 'plink_99812a0f',
    actor: 'AGENT',
    status: 'VERIFIED',
    signature: 'rzp_api_ok',
  },
  {
    id: 'act-5',
    timestamp: '23:42:30.680',
    action: 'WEBHOOK_PAYMENT_CAPTURED',
    resourceId: 'pay_QvR9mZ1x',
    actor: 'RAZORPAY_WEBHOOK',
    status: 'PAID',
    signature: 'hmac_sha256_valid',
  },
];

export function AuditLedgerSection() {
  const [filter, setFilter] = useState<'ALL' | 'AGENT' | 'CUSTOMER' | 'RAZORPAY_WEBHOOK'>('ALL');

  const filteredRows = AUDIT_ROWS.filter(
    (row) => filter === 'ALL' || row.actor === filter,
  );

  return (
    <section id="audit" className="py-20 bg-slate-50/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
            Immutable Ledger
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Every important decision has an audit trail.
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
            Every product lookup, order draft, human confirmation, and webhook event is recorded with cryptographic provenance in PostgreSQL.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {(['ALL', 'AGENT', 'CUSTOMER', 'RAZORPAY_WEBHOOK'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                filter === tab
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
              }`}
            >
              {tab === 'ALL' ? 'All Events' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Elevated Table */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-2xl dark:border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-900/60">
            <div className="flex items-center gap-2 font-mono text-xs text-purple-400 font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>POSTGRESQL AUDIT REPOSITORY</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              5 of 5 Signatures Verified
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/40 text-[11px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Action Event</th>
                  <th className="px-5 py-3">Resource Ref</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Signature Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-400">{row.timestamp}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-100">{row.action}</td>
                    <td className="px-5 py-3.5 text-purple-400">{row.resourceId}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                        {row.actor}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800/50">
                        ● {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-emerald-400 font-semibold">
                      {row.signature}
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
