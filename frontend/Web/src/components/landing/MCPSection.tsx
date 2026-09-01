import { Database, Key, Lock, Search, Terminal } from 'lucide-react';

const MCP_TOOLS = [
  {
    name: 'search_products',
    params: '{ query: string, category?: string, maxPrice?: number }',
    returns: 'Product[]',
    desc: 'Queries PostgreSQL catalog with vector/keyword matching and price ceiling.',
    icon: Search,
  },
  {
    name: 'get_product_details',
    params: '{ productId: UUID }',
    returns: 'ProductDetails & Inventory',
    desc: 'Fetches verified real-time stock count, sizes, and immutable minor-unit price.',
    icon: Database,
  },
  {
    name: 'create_order',
    params: '{ productId: UUID, quantity: number }',
    returns: 'Order (PENDING_CONFIRMATION)',
    desc: 'Drafts order row and locks catalog price on server. Requires user authorization before payment.',
    icon: Lock,
  },
  {
    name: 'generate_payment_link',
    params: '{ orderId: UUID }',
    returns: 'PaymentLink (Razorpay)',
    desc: 'Issues standard Razorpay checkout session only if human authorization signature exists.',
    icon: Key,
  },
  {
    name: 'check_order_status',
    params: '{ orderId: UUID }',
    returns: 'Order & VerificationState',
    desc: 'Reads cryptographic ledger status backed by validated HMAC webhook signatures.',
    icon: Terminal,
  },
];

export function MCPSection() {
  return (
    <section className="py-16 sm:py-20 md:py-28 bg-white dark:bg-[#090D16]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0F172A] dark:text-white leading-[1.08]">
            Model Context Protocol (MCP) Interface
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#475569] dark:text-[#94A3B8] max-w-[54ch]">
            The agent interacts with commerce capabilities strictly through bounded tools. It has zero direct access to raw payment APIs or arbitrary database mutations.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="mt-12 md:mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MCP_TOOLS.map((tool, idx) => {
            const Icon = tool.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 shadow-subtle dark:border-[#1E293B] dark:bg-[#0F172A] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-[#0A0F1D] border border-[#E2E8F0] dark:border-[#1E293B] text-[#0C66E4] dark:text-[#388BFF]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-[#0C66E4] dark:text-[#388BFF] bg-[#EBF3FF] dark:bg-[#0C2147] px-2 py-0.5 rounded">
                      MCP TOOL
                    </span>
                  </div>

                  <h3 className="font-mono text-sm font-bold text-[#0F172A] dark:text-white">
                    {tool.name}()
                  </h3>

                  <div className="mt-2 font-mono text-[11px] text-[#0C66E4] dark:text-[#388BFF] bg-white dark:bg-[#0A0F1D] p-2 rounded-md border border-[#E2E8F0] dark:border-[#1E293B] overflow-x-auto">
                    {tool.params}
                  </div>

                  <p className="mt-3 text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                    {tool.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
                  <span>Returns:</span>
                  <span className="text-[#16A34A] dark:text-[#4ADE80] font-semibold">{tool.returns}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
