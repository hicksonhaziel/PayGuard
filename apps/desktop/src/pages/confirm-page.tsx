interface ConfirmPageProps {
  onCancel: () => void;
  onDirectSend: () => void;
  onGuardedPayment: () => void;
}

const transactionRows = [
  ["Merchant", "Alpha Cloud Services"],
  ["Amount", "2,450.00 USDT"],
  ["Invoice #", "INV-99281"],
  ["Recipient Address", "0x71C...3921"]
] as const;

const riskItems = [
  {
    icon: "check_circle",
    label: "Known recipient match",
    tone: "safe"
  },
  {
    icon: "warning",
    label: "Amount 35% above average",
    tone: "warning"
  },
  {
    icon: "warning",
    label: "New wallet address",
    tone: "warning"
  },
  {
    icon: "warning",
    label: "Urgency language detected in memo",
    tone: "warning"
  }
] as const;

export function ConfirmPage({
  onCancel,
  onDirectSend,
  onGuardedPayment
}: ConfirmPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7fafc] px-6 py-6 dark:bg-[#0f172a]">
      <section className="flex w-full max-w-[730px] flex-col gap-4">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <div className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300">
            <span className="material-symbols-outlined text-[28px] [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">
              warning
            </span>
          </div>
          <h1 className="m-0 font-['Manrope'] text-[26px] font-bold leading-tight text-[#030813] dark:text-white max-md:text-[24px]">
            Verdict: Review Required
          </h1>
          <p className="max-w-lg text-[13px] leading-5 text-[#45474c] dark:text-slate-400">
            PayGuard identified potential risks with this transaction. Review
            the details carefully before proceeding.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <TransactionSummaryCard />
          <RiskAnalysisCard />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#030813] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-[#6ffbbe] dark:text-[#002113]"
            onClick={onGuardedPayment}
            type="button"
          >
            <span className="material-symbols-outlined">shield</span>
            Guarded Payment
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="rounded-xl border-2 border-[#030813] bg-transparent px-4 py-2 text-sm font-semibold text-[#030813] transition-colors hover:bg-[#ebeef0] dark:border-white dark:text-white dark:hover:bg-white/10"
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-xl border-2 border-[#e0e3e5] bg-transparent px-4 py-2 text-sm font-semibold text-[#45474c] transition-colors hover:bg-[#ebeef0] dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/10"
              onClick={onDirectSend}
              type="button"
            >
              Direct Send
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function TransactionSummaryCard() {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-[#e0e3e5]/70 bg-white p-[18px] shadow-[0_4px_20px_rgba(26,32,44,0.05)] dark:border-white/10 dark:bg-[#111827]">
      <h2 className="font-['Manrope'] text-[17px] font-bold text-[#030813] dark:text-white">
        Transaction Summary
      </h2>

      <div className="flex flex-col">
        {transactionRows.map(([label, value], index) => (
          <div
            className={`flex items-center justify-between gap-3 py-2 ${
              index === transactionRows.length - 1
                ? ""
                : "border-b border-[#e0e3e5] dark:border-white/10"
            }`}
            key={label}
          >
            <span className="text-[13px] text-[#45474c] dark:text-slate-400">
              {label}
            </span>
            <span
              className={`text-right text-[13px] font-semibold text-[#030813] dark:text-white ${
                label === "Recipient Address" ? "font-mono" : ""
              }`}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function RiskAnalysisCard() {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-[#e0e3e5]/70 bg-white p-[18px] shadow-[0_4px_20px_rgba(26,32,44,0.05)] dark:border-white/10 dark:bg-[#111827]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-['Manrope'] text-[17px] font-bold text-[#030813] dark:text-white">
          Risk Analysis
        </h2>
        <span className="rounded-full bg-[#ebeef0] px-2.5 py-1 text-[11px] font-semibold text-[#45474c] dark:bg-white/10 dark:text-slate-300">
          AI Insights
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {riskItems.map((item) => (
          <li
            className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 ${
              item.tone === "safe"
                ? "bg-[#f7fafc] dark:bg-white/[0.04]"
                : "border border-orange-100 bg-orange-50 dark:border-orange-300/15 dark:bg-orange-300/10"
            }`}
            key={item.label}
          >
            <span
              className={`material-symbols-outlined mt-0.5 text-xl [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24] ${
                item.tone === "safe"
                  ? "text-[#006c49] dark:text-[#6ffbbe]"
                  : "text-orange-800 dark:text-orange-300"
              }`}
            >
              {item.icon}
            </span>
            <span className="text-[13px] leading-5 text-[#181c1e] dark:text-slate-200">
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <button
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-[#ebeef0] px-4 py-2 text-sm font-semibold text-[#030813] transition-colors hover:bg-[#e0e3e5] dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
        type="button"
      >
        <span className="material-symbols-outlined">volume_up</span>
        Speak Explanation
      </button>
    </article>
  );
}
