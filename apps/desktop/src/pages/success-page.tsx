import { useEffect, useRef } from "react";
import type { PaymentDecision } from "../App";
import type { ConnectedWallet } from "../App";

interface SuccessPageProps {
  decision: PaymentDecision | null;
  wallet: ConnectedWallet | null;
  onNewPayment: () => void;
}

export function SuccessPage({ decision, wallet, onNewPayment }: SuccessPageProps) {
  const displayDecision = decision ?? createFallbackDecision();
  const savedReceiptRef = useRef(false);
  const receiptDetails = [
    {
      label: "Security Verdict",
      value: displayDecision.verdict.verdict,
      meta: displayDecision.verdict.reasons.slice(0, 2)
    },
    {
      label: "Timestamp",
      value: new Date().toLocaleString()
    },
    {
      label: "Payment Mode",
      value: displayDecision.selectedRoute,
      tag: displayDecision.selectedRoute === "Guarded Payment" ? "Escrow" : "Direct"
    },
    {
      label: "Risk Score",
      value: `${displayDecision.verdict.riskScore}/100`
    }
  ] as const;

  useEffect(() => {
    if (!decision || savedReceiptRef.current) {
      return;
    }

    savedReceiptRef.current = true;
    void window.payguardDesktop?.store.addPaymentHistory({
      amount: decision.amount,
      recipientName: decision.recipientName,
      recipientWallet: decision.walletAddress,
      riskScore: decision.verdict.riskScore,
      route: decision.selectedRoute,
      senderWallet: wallet?.address ?? "",
      source: "payguard",
      summary: decision.verdict.summary,
      token: decision.token,
      txSignature: `demo-${crypto.randomUUID()}`,
      verdict: decision.verdict.verdict
    });
  }, [decision, wallet?.address]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7fafc] px-6 py-5 dark:bg-[#0f172a]">
      <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-[#1a202c] via-[#6cf8bb] to-[#1a202c]" />

      <section className="flex w-full max-w-[620px] flex-col items-center gap-3">
        <header className="flex flex-col items-center gap-2 text-center">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#6cf8bb]/20 text-[#006c49] dark:text-[#6ffbbe]">
            <span className="material-symbols-outlined text-[30px] [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">
              check_circle
            </span>
            <span className="absolute inset-0 rounded-full ring-2 ring-[#006c49]/20 pg-soft-pulse dark:ring-[#6ffbbe]/25" />
          </div>
          <div>
            <h1 className="m-0 font-['Manrope'] text-[24px] font-bold leading-tight text-[#181c1e] dark:text-white max-md:text-[22px]">
              Payment Secured Successfully
            </h1>
            <p className="mt-1.5 text-xs text-[#45474c] dark:text-slate-400">
              Transaction signature:{" "}
              <button
                className="font-semibold text-[#006c49] hover:underline dark:text-[#6ffbbe]"
                type="button"
              >
                0x82f...a1b2
              </button>
            </p>
          </div>
        </header>

        <article className="relative w-full overflow-hidden rounded-2xl border border-[#e0e3e5] bg-white p-4 shadow-[0_4px_20px_rgba(26,32,44,0.05)] dark:border-white/10 dark:bg-[#111827]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#ebeef0] opacity-50 blur-3xl dark:bg-white/10" />

          <section className="relative z-10 flex flex-col items-center gap-1.5 border-b border-[#e0e3e5] pb-4 text-center dark:border-white/10">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#45474c] dark:text-slate-400">
              Amount Sent
            </span>
            <div className="flex items-baseline gap-2 font-['Manrope'] text-[28px] font-bold leading-tight text-[#181c1e] dark:text-white">
              {displayDecision.amount}
              <span className="text-lg font-medium text-[#45474c] dark:text-slate-400">
                {displayDecision.token}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className="text-[#45474c] dark:text-slate-400">To:</span>
              <span className="flex items-center gap-2 rounded-full bg-[#ebeef0] px-3 py-1.5 text-[#181c1e] dark:bg-white/10 dark:text-white">
                <strong>{displayDecision.recipientName}</strong>
                <span className="text-[#45474c] dark:text-slate-400">
                  ({formatWallet(displayDecision.walletAddress)})
                </span>
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#006c49] text-white">
                  <span className="material-symbols-outlined text-[12px] [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">
                    check
                  </span>
                </span>
              </span>
            </div>
          </section>

          <section className="relative z-10 grid grid-cols-2 gap-x-5 gap-y-3 pt-4 max-md:grid-cols-1">
            {receiptDetails.map((detail) => (
              <ReceiptDetail key={detail.label} {...detail} />
            ))}
          </section>
        </article>

        <section className="mt-1 flex w-full flex-wrap items-center justify-center gap-2.5">
          <button
            className="flex items-center justify-center gap-2 rounded-xl bg-[#006c49] px-5 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#005236] dark:bg-[#6ffbbe] dark:text-[#002113] dark:hover:bg-[#4edea3]"
            onClick={onNewPayment}
            type="button"
          >
            New Payment
            <span className="material-symbols-outlined text-[20px]">
              arrow_forward
            </span>
          </button>
        </section>

        <button
          className="text-xs font-semibold text-[#006c49] underline decoration-[#006c49]/30 underline-offset-4 transition-colors hover:text-[#005236] dark:text-[#6ffbbe]"
          type="button"
        >
          View in Explorer
        </button>
      </section>
    </main>
  );
}

interface ReceiptDetailProps {
  label: string;
  meta?: readonly string[];
  mono?: boolean;
  tag?: string;
  value: string;
}

function ReceiptDetail({ label, meta, mono, tag, value }: ReceiptDetailProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#45474c] dark:text-slate-400">
        {label}
      </span>

      {label === "Security Verdict" ? (
        <div className="flex flex-wrap items-start gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6cf8bb]/40 bg-[#6cf8bb]/20 px-2.5 py-1 text-xs font-semibold text-[#00714d] dark:text-[#6ffbbe]">
            <span className="material-symbols-outlined text-[14px]">shield</span>
            {value}
          </span>
          <ul className="grid gap-0.5">
            {meta?.map((item) => (
              <li
                className="flex items-center gap-1 text-[11px] text-[#45474c] dark:text-slate-400"
                key={item}
              >
                <span className="material-symbols-outlined text-[14px] text-[#006c49] dark:text-[#6ffbbe]">
                  check
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : label === "Payment Mode" ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#181c1e] dark:text-white">{value}</span>
          {tag ? (
            <span className="rounded bg-[#ebeef0] px-2 py-0.5 text-[11px] text-[#45474c] dark:bg-white/10 dark:text-slate-400">
              {tag}
            </span>
          ) : null}
        </div>
      ) : (
        <span
          className={
            mono
              ? "truncate rounded border border-[#e0e3e5] bg-[#f1f4f6] p-1.5 font-mono text-[11px] text-[#76777c] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
              : "text-xs text-[#181c1e] dark:text-white"
          }
        >
          {value}
        </span>
      )}
    </div>
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
