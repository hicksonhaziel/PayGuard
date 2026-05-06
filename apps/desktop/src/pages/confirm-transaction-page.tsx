import type { PaymentDecision } from "../App";

interface ConfirmTransactionPageProps {
  decision: PaymentDecision | null;
  onBack: () => void;
  onSign: () => void;
}

export function ConfirmTransactionPage({
  decision,
  onBack,
  onSign
}: ConfirmTransactionPageProps) {
  const displayDecision = decision ?? createFallbackDecision();
  const routeLabel =
    displayDecision.selectedRoute === "Direct Send"
      ? "Direct Send"
      : "Guarded Payment";
  const routeIcon = displayDecision.selectedRoute === "Direct Send" ? "send" : "shield";
  const routeNotice =
    displayDecision.selectedRoute === "Direct Send"
      ? "This payment will be sent immediately after wallet signature."
      : "Funds will be held in smart contract escrow for 24 hours before final settlement.";

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
              <span>{formatWallet(displayDecision.walletAddress)}</span>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#45474c] dark:text-slate-400">
              Amount
            </p>
            <div className="flex items-baseline justify-center gap-2 font-['Manrope'] text-[34px] font-bold leading-tight text-[#1a202c] dark:text-white">
              {displayDecision.amount}
              <span className="text-xl font-normal text-[#45474c] dark:text-slate-400">
                {displayDecision.token}
              </span>
            </div>
          </div>

          <hr className="mb-5 border-[#e0e3e5] dark:border-white/10" />

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e0e3e5] bg-[#f7fafc] p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#4edea3] [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">
                  {routeIcon}
                </span>
                <span className="text-sm font-semibold text-[#1a202c] dark:text-white">
                  {routeLabel}
                </span>
              </div>
              <span className="flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:border-red-300/15 dark:bg-red-300/10 dark:text-red-300">
                <span className="material-symbols-outlined text-[14px]">
                  warning
                </span>
                {displayDecision.verdict.verdict}
              </span>
            </div>

            <div className="px-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#45474c] dark:text-slate-400">
                Risk Factors Identified
              </p>
              <ul className="space-y-2">
                {displayDecision.verdict.reasons.map((reason) => (
                  <li className="flex items-start gap-3" key={reason}>
                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-red-600 dark:text-red-300">
                      warning
                    </span>
                    <span className="text-sm leading-5 text-[#181c1e] dark:text-slate-200">
                      {reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200">
              <span className="material-symbols-outlined">hourglass_empty</span>
              <p className="text-sm leading-5">
                <strong>Notice:</strong> {routeNotice}
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

function createFallbackDecision(): PaymentDecision {
  return {
    amount: "0.00",
    token: "USDC",
    walletAddress: "Unknown wallet",
    recipientName: "Unknown recipient",
    memo: "",
    selectedRoute: "Guarded Payment",
    verdict: {
      verdict: "Review",
      riskScore: 50,
      recommendedRoute: "Guarded Payment",
      reasons: ["No local QVAC verdict is available for this payment."],
      summary: "Run local analysis before signing this payment."
    }
  };
}

function formatWallet(wallet: string) {
  if (wallet.length <= 14) {
    return wallet;
  }

  return `${wallet.slice(0, 6)}...${wallet.slice(-6)}`;
}
