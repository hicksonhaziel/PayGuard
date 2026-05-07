import { useEffect, useState } from "react";
import type { ConnectedWallet, SolanaNetwork } from "../App";

type GuardedPaymentRecord = Awaited<
  ReturnType<NonNullable<Window["payguardDesktop"]>["listGuardedPayments"]>
>[number];

export function GuardedPaymentsPage({
  network,
  wallet
}: {
  network: SolanaNetwork;
  wallet: ConnectedWallet | null;
}) {
  const [payments, setPayments] = useState<GuardedPaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSignature, setActionSignature] = useState<string | null>(null);

  async function loadPayments() {
    if (!wallet) {
      setPayments([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setPayments(
        await window.payguardDesktop!.listGuardedPayments({
          network,
          walletAddress: wallet.address
        })
      );
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load guarded payments."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPayments();
  }, [wallet?.address, network]);

  async function runAction(payment: GuardedPaymentRecord, action: "cancel" | "claim") {
    if (!wallet) {
      setActionError("Connect wallet before signing.");
      return;
    }

    try {
      setActionError(null);
      setActionSignature(null);
      const input = {
        amount: payment.amount,
        escrowAddress: payment.escrowAddress,
        network,
        recipientWallet: payment.recipientWallet,
        senderWallet: payment.senderWallet,
        token: payment.token,
        vaultAddress: payment.vaultAddress,
        walletProvider: wallet.provider
      } as const;
      const result =
        action === "cancel"
          ? await window.payguardDesktop!.startGuardedCancel(input)
          : await window.payguardDesktop!.startGuardedClaim(input);

      setActionSignature(result.signature);
      await loadPayments();
    } catch (actionFailure) {
      setActionError(
        actionFailure instanceof Error
          ? actionFailure.message
          : `Could not ${action} guarded payment.`
      );
    }
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#f7fafc] px-8 py-6 dark:bg-[#0f172a] max-lg:px-5">
      <div className="mx-auto w-full max-w-[1200px]">
        <section className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="m-0 font-['Manrope'] text-[28px] font-bold leading-tight text-[#181c1e] dark:text-white">
              Guarded Payments
            </h1>
            <p className="mt-1 text-sm leading-6 text-[#45474c] dark:text-slate-400">
              Funded holds discovered from the PayGuard escrow program.
            </p>
          </div>

          <button
            className="flex items-center gap-1.5 rounded-lg border border-[#1a202c] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#1a202c] transition-colors hover:bg-[#ebeef0] dark:border-white/80 dark:text-white dark:hover:bg-white/10"
            onClick={() => loadPayments()}
            type="button"
          >
            <span className="material-symbols-outlined text-[15px]">refresh</span>
            Refresh
          </button>
        </section>

        {actionError ? (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-[#9f1239] dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-200">
            {actionError}
          </div>
        ) : null}
        {actionSignature ? (
          <div className="mb-3 rounded-xl border border-[#006c49]/20 bg-[#e6fff3] px-4 py-3 text-sm font-semibold text-[#006c49] dark:border-[#6ffbbe]/20 dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
            Action submitted: {formatWallet(actionSignature)}
          </div>
        ) : null}

        {!wallet ? (
          <EmptyState message="Connect wallet to discover guarded payments." />
        ) : network !== "devnet" ? (
          <EmptyState message="Guarded payments are enabled on devnet USDC for this MVP." />
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-[#9f1239] dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-200">
            {error}
          </div>
        ) : isLoading ? (
          <p className="text-sm text-[#45474c] dark:text-slate-400">
            Scanning PayGuard escrow accounts...
          </p>
        ) : payments.length ? (
          <section className="grid gap-3">
            {payments.map((payment) => (
              <GuardedPaymentCard
                key={payment.escrowAddress}
                payment={payment}
                wallet={wallet}
                onCancel={() => runAction(payment, "cancel")}
                onClaim={() => runAction(payment, "claim")}
              />
            ))}
          </section>
        ) : (
          <EmptyState message="No guarded payments found for this wallet." />
        )}
      </div>
    </main>
  );
}

function GuardedPaymentCard({
  payment,
  wallet,
  onCancel,
  onClaim
}: {
  payment: GuardedPaymentRecord;
  wallet: ConnectedWallet;
  onCancel: () => void;
  onClaim: () => void;
}) {
  const isUnlocked = Date.now() >= new Date(payment.unlockAt).getTime();
  const canCancel = payment.role === "sender" && payment.status === "funded" && !isUnlocked;
  const canClaim = payment.role === "recipient" && payment.status === "funded" && isUnlocked;
  const counterparty =
    payment.role === "sender" ? payment.recipientWallet : payment.senderWallet;

  return (
    <article className="rounded-2xl border border-[#e0e3e5] bg-white p-4 shadow-[0_4px_20px_rgba(26,32,44,0.05)] dark:border-white/10 dark:bg-[#111827]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-300/10 dark:text-amber-200">
            <span className="material-symbols-outlined">shield_lock</span>
          </div>
          <div className="min-w-0">
            <h3 className="m-0 font-['Manrope'] text-base font-bold text-[#181c1e] dark:text-white">
              {payment.amount} {payment.token}
            </h3>
            <p className="mt-1 truncate text-xs text-[#45474c] dark:text-slate-400">
              {payment.role === "sender" ? "To" : "From"} {formatWallet(counterparty)}
            </p>
          </div>
        </div>

        <div className="grid gap-1 md:text-right">
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <StatusBadge status={payment.status} />
            <span className="rounded-full bg-[#f1f4f6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-[#45474c] dark:bg-white/10 dark:text-slate-300">
              {payment.role}
            </span>
          </div>
          <p className="text-xs text-[#45474c] dark:text-slate-400">
            {isUnlocked ? "Claim window open" : `Unlocks ${formatDate(payment.unlockAt)}`}
          </p>
          <p className="font-mono text-[11px] text-[#76777c] dark:text-slate-500">
            Escrow {formatWallet(payment.escrowAddress)}
          </p>
        </div>

        <div className="grid gap-2 md:w-36">
          <button
            className="rounded-xl border-2 border-[#030813] bg-transparent px-4 py-2 text-sm font-semibold text-[#030813] transition-colors hover:bg-[#ebeef0] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:text-white dark:hover:bg-white/10"
            disabled={!canCancel}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-[#030813] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#6ffbbe] dark:text-[#002113]"
            disabled={!canClaim}
            onClick={onClaim}
            type="button"
          >
            Claim
          </button>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-[#76777c] dark:text-slate-500">
        Connected wallet: {formatWallet(wallet.address)}
      </p>
    </article>
  );
}

function StatusBadge({ status }: { status: GuardedPaymentRecord["status"] }) {
  const className =
    status === "funded"
      ? "bg-amber-50 text-amber-800 dark:bg-amber-300/10 dark:text-amber-200"
      : status === "claimed"
        ? "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
        : "bg-red-50 text-red-700 dark:bg-red-300/10 dark:text-red-300";

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] ${className}`}>
      {status}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[#e0e3e5] bg-white p-6 text-sm text-[#45474c] dark:border-white/10 dark:bg-[#111827] dark:text-slate-400">
      {message}
    </div>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleString(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  });
}

function formatWallet(walletAddress: string) {
  if (walletAddress.length <= 14) {
    return walletAddress;
  }

  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`;
}
