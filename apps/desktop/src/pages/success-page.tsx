import { useEffect, useRef, useState } from "react";
import type { PaymentDecision } from "../App";
import type { ConnectedWallet, SolanaNetwork } from "../App";

interface SuccessPageProps {
  decision: PaymentDecision | null;
  network: SolanaNetwork;
  wallet: ConnectedWallet | null;
  onNewPayment: () => void;
}

export function SuccessPage({
  decision,
  network,
  wallet,
  onNewPayment
}: SuccessPageProps) {
  const displayDecision = decision ?? createFallbackDecision();
  const savedReceiptRef = useRef(false);
  const [guardedActionError, setGuardedActionError] = useState<string | null>(null);
  const [guardedActionSignature, setGuardedActionSignature] = useState<string | null>(null);
  const explorerUrl = displayDecision.txSignature
    ? `https://explorer.solana.com/tx/${displayDecision.txSignature}?cluster=${network === "devnet" ? "devnet" : "mainnet-beta"}`
    : null;

  useEffect(() => {
    if (!decision || !wallet || savedReceiptRef.current) {
      return;
    }

    savedReceiptRef.current = true;
    void window.payguardDesktop?.store.addPaymentHistory({
      amount: decision.amount,
      network,
      ownerWallet: wallet.address,
      recipientName: decision.recipientName,
      recipientWallet: decision.walletAddress,
      riskScore: decision.verdict.riskScore,
      route: decision.selectedRoute,
      senderWallet: wallet.address,
      source: "payguard",
      summary: decision.verdict.summary,
      token: decision.token,
      txSignature: decision.txSignature ?? `demo-${crypto.randomUUID()}`,
      verdict: decision.verdict.verdict
    });
  }, [decision, network, wallet?.address]);

  async function runGuardedAction(action: "cancel" | "claim") {
    if (
      !decision ||
      !wallet ||
      !decision.escrowAddress ||
      !decision.vaultAddress ||
      (decision.token !== "USDC" && decision.token !== "USDT")
    ) {
      setGuardedActionError("Guarded payment details are missing.");
      return;
    }

    try {
      setGuardedActionError(null);
      const input = {
        amount: decision.amount,
        escrowAddress: decision.escrowAddress,
        network,
        recipientWallet: decision.walletAddress,
        senderWallet: wallet.address,
        token: decision.token,
        vaultAddress: decision.vaultAddress,
        walletProvider: wallet.provider
      } as const;
      const result =
        action === "cancel"
          ? await window.payguardDesktop!.startGuardedCancel(input)
          : await window.payguardDesktop!.startGuardedClaim(input);

      setGuardedActionSignature(result.signature);
    } catch (error) {
      setGuardedActionError(
        error instanceof Error ? error.message : `Guarded ${action} failed.`
      );
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7fafc] px-6 py-5 dark:bg-[#0f172a]">
      <section className="flex w-full max-w-[560px] flex-col items-center gap-3">
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
                {formatSignature(displayDecision.txSignature ?? "pending")}
              </button>
            </p>
          </div>
        </header>

        <article className="w-full rounded-2xl border border-[#e0e3e5] bg-white p-5 shadow-[0_4px_20px_rgba(26,32,44,0.05)] dark:border-white/10 dark:bg-[#111827]">
          <section className="flex flex-col items-center gap-1.5 text-center">
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
          <dl className="mt-5 grid gap-2 rounded-xl bg-[#f1f4f6] p-3 text-sm dark:bg-white/[0.04]">
            <ReceiptRow label="Route" value={displayDecision.selectedRoute} />
            <ReceiptRow label="Verdict" value={`${displayDecision.verdict.verdict} (${displayDecision.verdict.riskScore}/100)`} />
            {displayDecision.selectedRoute === "Guarded Payment" ? (
              <ReceiptRow
                label="Claim Window"
                value={
                  displayDecision.unlockAt
                    ? formatUnlockDate(displayDecision.unlockAt)
                    : `${displayDecision.guardedHoldHours} hours`
                }
              />
            ) : null}
          </dl>
        </article>

        <section className="mt-1 flex w-full flex-wrap items-center justify-center gap-2.5">
          {displayDecision.selectedRoute === "Guarded Payment" &&
          displayDecision.escrowAddress &&
          displayDecision.vaultAddress ? (
            <GuardedReceiptActions
              actionError={guardedActionError}
              actionSignature={guardedActionSignature}
              decision={displayDecision}
              wallet={wallet}
              onCancel={() => runGuardedAction("cancel")}
              onClaim={() => runGuardedAction("claim")}
            />
          ) : null}
          <button
            className="flex items-center justify-center gap-2 rounded-xl bg-[#006c49] px-5 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#005236] dark:bg-[#6ffbbe] dark:text-[#002113] dark:hover:bg-[#4edea3]"
            onClick={onNewPayment}
            type="button"
          >
            Home
            <span className="material-symbols-outlined text-[20px]">
              home
            </span>
          </button>
        </section>

        <button
          className="text-xs font-semibold text-[#006c49] underline decoration-[#006c49]/30 underline-offset-4 transition-colors hover:text-[#005236] dark:text-[#6ffbbe]"
          disabled={!explorerUrl}
          onClick={() => {
            if (explorerUrl) {
              void window.payguardDesktop?.openExternalUrl(explorerUrl);
            }
          }}
          type="button"
        >
          View in Explorer
        </button>
      </section>
    </main>
  );
}

function GuardedReceiptActions({
  actionError,
  actionSignature,
  decision,
  wallet,
  onCancel,
  onClaim
}: {
  actionError: string | null;
  actionSignature: string | null;
  decision: PaymentDecision;
  wallet: ConnectedWallet | null;
  onCancel: () => void;
  onClaim: () => void;
}) {
  const unlockTime = decision.unlockAt ? new Date(decision.unlockAt).getTime() : 0;
  const isUnlocked = unlockTime > 0 && Date.now() >= unlockTime;
  const canCancel = Boolean(wallet) && !isUnlocked;
  const canClaim = isUnlocked;

  return (
    <div className="mb-1 grid w-full gap-2 rounded-2xl border border-[#e0e3e5] bg-white p-3 text-center dark:border-white/10 dark:bg-[#111827]">
      <p className="text-xs leading-5 text-[#45474c] dark:text-slate-400">
        Escrow: <span className="font-mono">{formatWallet(decision.escrowAddress ?? "")}</span>
      </p>
      <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
        <button
          className="rounded-xl border-2 border-[#030813] bg-transparent px-4 py-2 text-sm font-semibold text-[#030813] transition-colors hover:bg-[#ebeef0] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:text-white dark:hover:bg-white/10"
          disabled={!canCancel}
          onClick={onCancel}
          type="button"
        >
          Cancel hold
        </button>
        <button
          className="rounded-xl bg-[#030813] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#6ffbbe] dark:text-[#002113]"
          disabled={!canClaim}
          onClick={onClaim}
          type="button"
        >
          Claim funds
        </button>
      </div>
      {actionSignature ? (
        <p className="text-xs font-semibold text-[#006c49] dark:text-[#6ffbbe]">
          Action submitted: {formatSignature(actionSignature)}
        </p>
      ) : null}
      {actionError ? (
        <p className="text-xs font-semibold text-[#9f1239] dark:text-rose-300">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs font-semibold text-[#45474c] dark:text-slate-400">
        {label}
      </dt>
      <dd className="m-0 text-right text-xs font-semibold text-[#181c1e] dark:text-white">
        {value}
      </dd>
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
    guardedHoldHours: 24,
    selectedRoute: "Guarded Payment",
    escrowAddress: undefined,
    txSignature: undefined,
    unlockAt: undefined,
    vaultAddress: undefined,
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

function formatSignature(signature: string) {
  if (signature.length <= 14) {
    return signature;
  }

  return `${signature.slice(0, 6)}...${signature.slice(-6)}`;
}

function formatUnlockDate(date: string) {
  return new Date(date).toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short"
  });
}
