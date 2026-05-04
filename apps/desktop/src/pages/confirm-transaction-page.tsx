interface ConfirmTransactionPageProps {
  onBack: () => void;
  onSign: () => void;
}

const riskFactors = [
  {
    icon: "trending_up",
    label: "Amount 35% above your average transaction"
  },
  {
    icon: "person_add",
    label: "New, unverified wallet address"
  }
] as const;

export function ConfirmTransactionPage({
  onBack,
  onSign
}: ConfirmTransactionPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7fafc] px-6 py-6 dark:bg-[#0f172a]">
      <section className="w-full max-w-[520px]">
        <div className="mb-5 flex items-center gap-3">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6c6cc]/60 text-[#45474c] transition-colors hover:bg-[#f1f4f6] hover:text-[#030813] dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={onBack}
            type="button"
            aria-label="Back to verdict"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="m-0 font-['Manrope'] text-[26px] font-bold text-[#1a202c] dark:text-white">
            Confirm Transaction
          </h1>
        </div>

        <article className="relative overflow-hidden rounded-2xl border border-[#e0e3e5] bg-white p-5 shadow-[0_4px_20px_rgba(26,32,44,0.05)] dark:border-white/10 dark:bg-[#111827]">
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#6ffbbe] to-[#4edea3] opacity-70" />

          <div className="mb-5 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#45474c] dark:text-slate-400">
              Recipient Wallet
            </p>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#f1f4f6] px-3 py-1.5 text-sm font-semibold text-[#1a202c] dark:bg-white/10 dark:text-white">
              <span className="material-symbols-outlined text-[16px]">
                account_balance_wallet
              </span>
              <span>0x71C...3921</span>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#45474c] dark:text-slate-400">
              Amount
            </p>
            <div className="flex items-baseline justify-center gap-2 font-['Manrope'] text-[34px] font-bold leading-tight text-[#1a202c] dark:text-white">
              2,450.00
              <span className="text-xl font-normal text-[#45474c] dark:text-slate-400">
                USDT
              </span>
            </div>
          </div>

          <hr className="mb-5 border-[#e0e3e5] dark:border-white/10" />

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e0e3e5] bg-[#f7fafc] p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#4edea3] [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">
                  shield
                </span>
                <span className="text-sm font-semibold text-[#1a202c] dark:text-white">
                  Guarded Payment
                </span>
              </div>
              <span className="flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:border-red-300/15 dark:bg-red-300/10 dark:text-red-300">
                <span className="material-symbols-outlined text-[14px]">
                  warning
                </span>
                Review Required
              </span>
            </div>

            <div className="px-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#45474c] dark:text-slate-400">
                Risk Factors Identified
              </p>
              <ul className="space-y-2">
                {riskFactors.map((factor) => (
                  <li className="flex items-start gap-3" key={factor.label}>
                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-red-600 dark:text-red-300">
                      {factor.icon}
                    </span>
                    <span className="text-sm leading-5 text-[#181c1e] dark:text-slate-200">
                      {factor.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200">
              <span className="material-symbols-outlined">hourglass_empty</span>
              <p className="text-sm leading-5">
                <strong>Notice:</strong> Funds will be held in smart contract
                escrow for 24 hours before final settlement.
              </p>
            </div>
          </div>
        </article>

        <div className="mt-5 space-y-3 text-center">
          <button
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#1a202c] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 dark:bg-[#6ffbbe] dark:text-[#002113]"
            onClick={onSign}
            type="button"
          >
            <span className="material-symbols-outlined [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">
              fingerprint
            </span>
            Sign with Phantom / Solflare
          </button>
          <p className="flex items-center justify-center gap-2 text-xs text-[#45474c] dark:text-slate-400">
            <span className="material-symbols-outlined text-[16px]">lock</span>
            You will be redirected to your wallet to sign. PayGuard never holds keys.
          </p>
        </div>
      </section>
    </main>
  );
}
