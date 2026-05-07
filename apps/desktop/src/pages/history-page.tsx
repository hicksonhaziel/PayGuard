import { useEffect, useState } from "react";
import type { ConnectedWallet, SolanaNetwork } from "../App";

const historyTabs = ["All Payments", "Direct", "Guarded", "Blocked"];

type StoredPaymentHistory = Awaited<
  ReturnType<NonNullable<Window["payguardDesktop"]>["store"]["listPaymentHistory"]>
>[number];

export function HistoryPage({
  network,
  wallet
}: {
  network: SolanaNetwork;
  wallet: ConnectedWallet | null;
}) {
  const [transactions, setTransactions] = useState<StoredPaymentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      if (!wallet) {
        setTransactions([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setTransactions(
          await window.payguardDesktop!.store.listPaymentHistory({
            network,
            ownerWallet: wallet.address
          })
        );
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load history.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadHistory();
  }, [wallet?.address, network]);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#f7fafc] px-8 py-6 dark:bg-[#0f172a] max-lg:px-5">
      <div className="mx-auto w-full max-w-[1200px]">
        <section className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="m-0 font-['Manrope'] text-[28px] font-bold leading-tight text-[#181c1e] dark:text-white">
              Payment History
            </h1>
            <p className="mt-1 text-sm leading-6 text-[#45474c] dark:text-slate-400">
              Review and manage your recent transactions.
            </p>
          </div>

          <div className="flex w-full items-center gap-3 md:w-auto">
            <label className="relative min-w-0 flex-1 md:w-64 md:flex-none">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#76777c]">
                search
              </span>
              <input
                className="w-full rounded-lg border border-[#c6c6cc] bg-white py-1.5 pl-10 pr-4 text-sm text-[#181c1e] outline-none transition-all placeholder:text-[#76777c] focus:border-[#1a202c] focus:ring-2 focus:ring-[#6cf8bb]/40 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-[#6ffbbe]"
                placeholder="Search transactions..."
                type="text"
              />
            </label>
            <button
              className="flex items-center gap-1.5 rounded-lg border border-[#1a202c] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#1a202c] transition-colors hover:bg-[#ebeef0] dark:border-white/80 dark:text-white dark:hover:bg-white/10"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">tune</span>
              Filter
            </button>
          </div>
        </section>

        <nav className="mb-4 flex overflow-x-auto border-b border-[#e0e3e5] dark:border-white/10">
          {historyTabs.map((tab) => (
            <button
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-colors ${
                tab === "All Payments"
                  ? "border-b-2 border-[#006c49] text-[#006c49] dark:border-[#6ffbbe] dark:text-[#6ffbbe]"
                  : "text-[#45474c] hover:text-[#181c1e] dark:text-slate-400 dark:hover:text-white"
              }`}
              key={tab}
              type="button"
            >
              {tab}
            </button>
          ))}
        </nav>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-[#9f1239] dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-200">
            {error}
          </div>
        ) : !wallet ? (
          <div className="rounded-2xl border border-[#e0e3e5] bg-white p-6 text-sm text-[#45474c] dark:border-white/10 dark:bg-[#111827] dark:text-slate-400">
            Connect wallet to view payment history.
          </div>
        ) : isLoading ? (
          <p className="text-sm text-[#45474c] dark:text-slate-400">
            Loading local payment history...
          </p>
        ) : transactions.length ? (
          <section className="grid gap-3">
            {transactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </section>
        ) : (
          <div className="rounded-2xl border border-[#e0e3e5] bg-white p-6 text-sm text-[#45474c] dark:border-white/10 dark:bg-[#111827] dark:text-slate-400">
            No PayGuard payment history yet.
          </div>
        )}
      </div>
    </main>
  );
}

interface TransactionCardProps {
  transaction: StoredPaymentHistory;
}

function TransactionCard({ transaction }: TransactionCardProps) {
  const isBlocked = transaction.verdict === "Block";
  const icon = isBlocked ? "block" : "arrow_upward";

  return (
    <article className="rounded-2xl border border-[#e0e3e5] bg-white p-4 shadow-[0_4px_20px_rgba(26,32,44,0.05)] transition-shadow hover:shadow-[0_8px_30px_rgba(26,32,44,0.08)] dark:border-white/10 dark:bg-[#111827]">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isBlocked
                ? "bg-red-100 text-red-700 dark:bg-red-300/10 dark:text-red-300"
                : "bg-[#d8e2ff] text-[#3e84f8] dark:bg-blue-300/10 dark:text-blue-300"
            }`}
          >
            <span className="material-symbols-outlined [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">
              {icon}
            </span>
          </div>
          <div>
            <h3 className="m-0 text-sm font-semibold text-[#181c1e] dark:text-white">
              {transaction.recipientName}
            </h3>
            <p className="mt-1 text-xs text-[#45474c] dark:text-slate-400">
              {formatDate(transaction.paidAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1 md:items-end">
          <span className="font-['Manrope'] text-[18px] font-semibold leading-tight text-[#181c1e] dark:text-white">
            {transaction.amount} {transaction.token}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] ${
                isBlocked
                  ? "bg-red-50 text-red-700 dark:bg-red-300/10 dark:text-red-300"
                  : "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
              }`}
            >
              {transaction.verdict}
            </span>
            <span className="text-xs text-[#76777c] dark:text-slate-400">
              {transaction.route}
            </span>
            <span className="text-xs text-[#c6c6cc]">
              # {formatSignature(transaction.txSignature)}
            </span>
          </div>
        </div>

        <button
          className="w-full whitespace-nowrap rounded-lg border border-[#1a202c] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#1a202c] transition-colors hover:bg-[#ebeef0] dark:border-white/80 dark:text-white dark:hover:bg-white/10 md:w-auto"
          type="button"
        >
          View Receipt
        </button>
      </div>
    </article>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleString(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatSignature(signature: string) {
  if (signature.length <= 14) {
    return signature;
  }

  return `${signature.slice(0, 6)}...${signature.slice(-6)}`;
}
