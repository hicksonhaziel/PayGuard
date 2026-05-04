interface RecipientsPageProps {
  onStartPayment: () => void;
}

const recipients = [
  {
    averageAmount: "1,200.00 USDT",
    initial: "A",
    lastPayment: "Oct 12, 2023",
    name: "Alpha Cloud Services",
    payments: "24",
    verified: true,
    wallet: "0x7a...4f9e"
  },
  {
    averageAmount: "4,500.00 USDC",
    initial: "N",
    lastPayment: "Sep 28, 2023",
    name: "Nexus Data Group",
    payments: "8",
    verified: true,
    wallet: "0x3b...9d21"
  },
  {
    averageAmount: "150.00 ETH",
    initial: "U",
    lastPayment: "Jan 04, 2023",
    name: "Unnamed",
    payments: "1",
    verified: false,
    wallet: "0x1c...77ef"
  }
] as const;

export function RecipientsPage({ onStartPayment }: RecipientsPageProps) {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#f7fafc] px-8 py-5 dark:bg-[#0f172a] max-lg:px-5">
      <div className="mx-auto w-full max-w-[1200px]">
        <section className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="m-0 font-['Manrope'] text-[26px] font-bold leading-tight text-[#181c1e] dark:text-white">
              Trusted Recipients
            </h1>
            <p className="mt-1 text-sm leading-5 text-[#45474c] dark:text-slate-400">
              Manage and execute payments to verified addresses.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
            <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#76777c]">
                search
              </span>
              <input
                className="w-full rounded-lg border border-[#c6c6cc] bg-white py-1.5 pl-10 pr-4 text-sm text-[#181c1e] outline-none transition-all placeholder:text-[#76777c] focus:border-[#1a202c] focus:ring-2 focus:ring-[#6cf8bb]/40 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-[#6ffbbe]"
                placeholder="Search recipients..."
                type="text"
              />
            </label>
            <button
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#1a202c] px-3.5 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-[#6ffbbe] dark:text-[#002113]"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add New Recipient
            </button>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-md:grid-cols-1">
          {recipients.map((recipient) => (
            <RecipientCard
              key={recipient.wallet}
              onStartPayment={onStartPayment}
              {...recipient}
            />
          ))}
        </section>
      </div>
    </main>
  );
}

interface RecipientCardProps {
  averageAmount: string;
  initial: string;
  lastPayment: string;
  name: string;
  onStartPayment: () => void;
  payments: string;
  verified: boolean;
  wallet: string;
}

function RecipientCard({
  averageAmount,
  initial,
  lastPayment,
  name,
  onStartPayment,
  payments,
  verified,
  wallet
}: RecipientCardProps) {
  return (
    <article className="flex min-h-[260px] flex-col justify-between rounded-2xl border border-[#e0e3e5] bg-white p-4 shadow-[0_4px_20px_rgba(26,32,44,0.05)] transition-shadow hover:shadow-[0_8px_30px_rgba(26,32,44,0.08)] dark:border-white/10 dark:bg-[#111827]">
      <div>
        <div className="mb-4 flex items-start justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full font-['Manrope'] text-lg font-semibold ${
              verified
                ? "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
                : "bg-[#e0e3e5] text-[#45474c] dark:bg-white/10 dark:text-slate-400"
            }`}
          >
            {initial}
          </div>
          {verified ? (
            <span className="flex items-center gap-1 rounded-full bg-[#006c49]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
              <span className="material-symbols-outlined text-[14px]">
                verified
              </span>
              Verified
            </span>
          ) : null}
        </div>

        <h3 className="mb-1 font-['Manrope'] text-base font-semibold text-[#181c1e] dark:text-white">
          {name}
        </h3>
        <p className="mb-4 inline-block rounded bg-[#f1f4f6] px-2 py-1 font-mono text-[11px] text-[#45474c] dark:bg-white/[0.04] dark:text-slate-400">
          {wallet}
        </p>

        <div className="mb-4 space-y-0.5">
          <RecipientStat label="Total Payments" value={payments} />
          <RecipientStat label="Last Payment" value={lastPayment} />
          <RecipientStat label="Avg Amount" value={averageAmount} />
        </div>
      </div>

      <button
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a202c] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-[#6ffbbe] dark:text-[#002113]"
        onClick={onStartPayment}
        type="button"
      >
        <span className="material-symbols-outlined text-[18px]">send</span>
        New Payment
      </button>
    </article>
  );
}

interface RecipientStatProps {
  label: string;
  value: string;
}

function RecipientStat({ label, value }: RecipientStatProps) {
  return (
    <div className="flex items-center justify-between border-b border-[#e0e3e5]/60 py-2 dark:border-white/10">
      <span className="text-xs text-[#45474c] dark:text-slate-400">{label}</span>
      <span className="text-xs font-semibold text-[#181c1e] dark:text-white">
        {value}
      </span>
    </div>
  );
}
