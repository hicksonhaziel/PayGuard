import { useEffect, useRef, useState } from "react";
import { TrustedSupplier } from "../components/home/trusted-supplier";
import type {
  ConnectedWallet,
  PrefilledRecipient,
  StablecoinConfig,
  SolanaNetwork
} from "../App";
import solanaLogo from "../../assets/solana.png";
import usdcLogo from "../../assets/usdc.png";
import usdtLogo from "../../assets/usdt.png";

type RecipientSummary = Awaited<
  ReturnType<NonNullable<Window["payguardDesktop"]>["store"]["listRecipients"]>
>[number];
type WalletBalances = Awaited<
  ReturnType<NonNullable<Window["payguardDesktop"]>["getWalletBalances"]>
>;
type StoredPaymentHistory = Awaited<
  ReturnType<NonNullable<Window["payguardDesktop"]>["store"]["listPaymentHistory"]>
>[number];

interface HomePageProps {
  wallet: ConnectedWallet | null;
  network: SolanaNetwork;
  stablecoinConfig: StablecoinConfig;
  walletError: string | null;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onNetworkChange: (network: SolanaNetwork) => void;
  onStartPayment: (recipient?: PrefilledRecipient) => void;
  onViewHistory: () => void;
  onViewRecipients: () => void;
}

export function HomePage({
  network,
  stablecoinConfig,
  wallet,
  walletError,
  onConnectWallet,
  onDisconnectWallet,
  onNetworkChange,
  onStartPayment,
  onViewHistory,
  onViewRecipients
}: HomePageProps) {
  const [trustedRecipients, setTrustedRecipients] = useState<RecipientSummary[]>([]);
  const [recentPayments, setRecentPayments] = useState<StoredPaymentHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const balancesRef = useRef<WalletBalances | null>(null);
  const totalRecipientPayments = trustedRecipients.reduce(
    (total, recipient) => total + recipient.payments,
    0
  );

  useEffect(() => {
    async function loadRecipients() {
      if (!wallet) {
        setTrustedRecipients([]);
        setIsLoadingRecipients(false);
        return;
      }

      try {
        setIsLoadingRecipients(true);
        setTrustedRecipients(
          await window.payguardDesktop!.store.listRecipients({
            network,
            ownerWallet: wallet.address
          })
        );
      } finally {
        setIsLoadingRecipients(false);
      }
    }

    void loadRecipients();
  }, [wallet, network]);

  useEffect(() => {
    async function loadRecentPayments() {
      if (!wallet) {
        setRecentPayments([]);
        setIsLoadingHistory(false);
        return;
      }

      try {
        setIsLoadingHistory(true);
        const history = await window.payguardDesktop!.store.listPaymentHistory(
          { network, ownerWallet: wallet.address }
        );

        setRecentPayments(history.slice(0, 3));
      } finally {
        setIsLoadingHistory(false);
      }
    }

    void loadRecentPayments();
  }, [wallet?.address, network]);

  useEffect(() => {
    let refreshTimeout: number | null = null;

    async function loadBalances() {
      if (!wallet) {
        balancesRef.current = null;
        setBalances(null);
        setBalanceError(null);
        setIsLoadingBalances(false);
        return;
      }

      try {
        setIsLoadingBalances(!balancesRef.current);
        setBalanceError(null);
        const nextBalances = await window.payguardDesktop!.getWalletBalances({
          network,
          walletAddress: wallet.address
        });
        const refreshDelay = Math.max(
          new Date(nextBalances.expiresAt).getTime() - Date.now() + 500,
          1000
        );

        balancesRef.current = nextBalances;
        setBalances(nextBalances);
        refreshTimeout = window.setTimeout(() => {
          void loadBalances();
        }, refreshDelay);
      } catch (error) {
        setBalanceError(
          error instanceof Error ? error.message : "Could not fetch wallet balances."
        );
      } finally {
        setIsLoadingBalances(false);
      }
    }

    void loadBalances();

    return () => {
      if (refreshTimeout) {
        window.clearTimeout(refreshTimeout);
      }
    };
  }, [wallet?.address, network]);

  return (
    <>
      <main className="min-h-[calc(100vh-64px)] bg-[radial-gradient(at_0%_0%,rgba(16,185,129,0.05)_0,transparent_50%),radial-gradient(at_100%_0%,rgba(26,32,44,0.03)_0,transparent_50%),#f7fafc] dark:bg-[radial-gradient(at_0%_0%,rgba(111,251,190,0.08)_0,transparent_45%),radial-gradient(at_100%_0%,rgba(148,163,184,0.08)_0,transparent_45%),#0f172a]">
        <div className="mx-auto max-w-[1200px] px-8 pb-20 pt-9 max-lg:px-5">
          <section className="mb-12 flex items-center justify-between gap-6 max-md:flex-col max-md:items-start">
            <div>
              <h1 className="m-0 font-['Manrope'] text-[32px] font-bold leading-[1.3] text-[#030813] dark:text-white">
                Welcome back
              </h1>
              <p className="mt-1 text-sm leading-normal text-[#45474c] dark:text-slate-400">
                Local AI checks every payment before it reaches your wallet.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 max-md:w-full max-md:justify-start">
              <NetworkSelector
                network={network}
                onNetworkChange={onNetworkChange}
              />
              {wallet ? (
                <WalletMenu
                  wallet={wallet}
                  onChangeWallet={onConnectWallet}
                  onDisconnectWallet={onDisconnectWallet}
                />
              ) : (
                <button
                  className="pg-button border border-[#c6c6cc] bg-white text-[#181c1e] hover:bg-[#f1f4f6] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  onClick={onConnectWallet}
                  type="button"
                >
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                  Connect Wallet
                </button>
              )}
              <button
                className="pg-button bg-[#030813] text-white hover:bg-[#1a202c] dark:bg-[#6ffbbe] dark:text-[#002113] dark:hover:bg-[#4edea3]"
                onClick={onStartPayment}
                type="button"
              >
                <span className="material-symbols-outlined">add</span>
                New Payment
              </button>
            </div>
          </section>

          {walletError ? (
            <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200">
              {walletError}
            </div>
          ) : null}

          <section className="mb-12">
            <div className="grid grid-cols-12 gap-3">
              <BalanceCard
                amount={balances?.USDT ?? null}
                error={balanceError ?? balances?.errors.USDT ?? null}
                isLoading={isLoadingBalances}
                logo={usdtLogo}
                name={
                  network === "devnet" && stablecoinConfig.devnetUsdtConfigured
                    ? "Demo USDT"
                    : "Tether USD"
                }
                note={
                  network === "devnet"
                    ? stablecoinConfig.devnetUsdtConfigured
                      ? "Configured demo mint"
                      : "Demo mint not configured"
                    : undefined
                }
                symbol="USDT"
                wallet={wallet}
              />
              <BalanceCard
                amount={balances?.USDC ?? null}
                error={balanceError ?? balances?.errors.USDC ?? null}
                isLoading={isLoadingBalances}
                logo={usdcLogo}
                name="USD Coin"
                symbol="USDC"
                wallet={wallet}
              />
              <WalletMetricCard
                error={balanceError ?? balances?.errors.SOL ?? null}
                label="SOL balance"
                logo={solanaLogo}
                value={
                  wallet
                    ? balances?.SOL !== null && balances?.SOL !== undefined
                        ? formatTokenAmount(balances.SOL, "SOL")
                        : isLoadingBalances
                          ? "Loading"
                        : "--"
                    : "--"
                }
              />
              <WalletMetricCard
                icon="group"
                label="Trusted recipients"
                value={wallet ? String(trustedRecipients.length) : "--"}
              />
              <WalletMetricCard
                icon="receipt_long"
                label="Total payments"
                value={wallet ? String(totalRecipientPayments) : "--"}
              />
            </div>
          </section>

          <section className="mb-12">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="m-0 text-lg font-extrabold text-[#030813] dark:text-white">
                Recent Payments
              </h2>
              <button
                className="pg-text-button text-xs"
                onClick={onViewHistory}
                type="button"
              >
                View all
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#e0e3e5] bg-white shadow-[0_4px_20px_rgba(26,32,44,0.04)] dark:border-white/10 dark:bg-[#111827]">
              {!wallet ? (
                <p className="px-4 py-4 text-sm text-[#45474c] dark:text-slate-400">
                  Connect wallet to view recent payments.
                </p>
              ) : isLoadingHistory ? (
                <p className="px-4 py-4 text-sm text-[#45474c] dark:text-slate-400">
                  Loading recent payments...
                </p>
              ) : recentPayments.length ? (
                <div className="divide-y divide-[#e0e3e5] dark:divide-white/10">
                  {recentPayments.map((payment) => (
                    <RecentPaymentRow key={payment.id} payment={payment} />
                  ))}
                </div>
              ) : (
                <p className="px-4 py-4 text-sm text-[#45474c] dark:text-slate-400">
                  No payments yet.
                </p>
              )}
            </div>
          </section>

          <section>
            <div>
              <h2 className="mb-4 text-lg font-extrabold text-[#030813] dark:text-white">
                Trusted Recipients
              </h2>
              <div className="grid grid-cols-4 gap-2 max-lg:grid-cols-2 max-md:grid-cols-1">
                {isLoadingRecipients ? (
                  <p className="col-span-full text-sm text-[#45474c] dark:text-slate-400">
                    Loading trusted recipients...
                  </p>
                ) : trustedRecipients.length ? (
                  trustedRecipients.slice(0, 4).map((recipient) => (
                    <TrustedSupplier
                      icon="account_balance_wallet"
                      key={recipient.walletAddress}
                      lastActivity={recipient.lastPayment}
                      name={recipient.name}
                      walletAddress={recipient.walletAddress}
                      onStartPayment={() =>
                        onStartPayment({
                          name: recipient.name,
                          walletAddress: recipient.walletAddress
                        })
                      }
                      onViewDetails={onViewRecipients}
                    />
                  ))
                ) : (
                  <div className="col-span-full rounded-xl border border-dashed border-[#c6c6cc] bg-white/70 px-4 py-5 text-sm text-[#45474c] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                    {wallet
                      ? "No recipients yet. Add a recipient from the Recipients page to build trusted history."
                      : "Connect wallet to view trusted recipients."}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function RecentPaymentRow({ payment }: { payment: StoredPaymentHistory }) {
  const isBlocked = payment.verdict === "Block";

  return (
    <article className="flex items-center justify-between gap-4 px-4 py-3 max-sm:flex-col max-sm:items-start">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isBlocked
              ? "bg-red-50 text-red-700 dark:bg-red-300/10 dark:text-red-300"
              : "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">
            {isBlocked ? "block" : "arrow_upward"}
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-[#181c1e] dark:text-white">
            {payment.recipientName}
          </h3>
          <p className="mt-0.5 text-xs text-[#45474c] dark:text-slate-400">
            {formatHistoryDate(payment.paidAt)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 max-sm:w-full max-sm:justify-between">
        <span className="font-['Manrope'] text-sm font-bold text-[#181c1e] dark:text-white">
          {payment.amount} {payment.token}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] ${
            isBlocked
              ? "bg-red-50 text-red-700 dark:bg-red-300/10 dark:text-red-300"
              : "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
          }`}
        >
          {payment.verdict}
        </span>
      </div>
    </article>
  );
}

function NetworkSelector({
  network,
  onNetworkChange
}: {
  network: SolanaNetwork;
  onNetworkChange: (network: SolanaNetwork) => void;
}) {
  return (
    <label className="relative">
      <span className="sr-only">Solana network</span>
      <select
        className="h-[42px] appearance-none rounded-lg border border-[#c6c6cc] bg-white py-2 pl-3 pr-9 text-sm font-bold text-[#181c1e] outline-none transition-colors hover:bg-[#f1f4f6] focus:border-[#1a202c] focus:ring-2 focus:ring-[#6cf8bb]/40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        onChange={(event) => onNetworkChange(event.target.value as SolanaNetwork)}
        value={network}
      >
        <option value="mainnet-beta">Mainnet</option>
        <option value="devnet">Devnet</option>
      </select>
      <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#76777c]">
        expand_more
      </span>
    </label>
  );
}

function BalanceCard({
  amount,
  error,
  isLoading,
  logo,
  name,
  note,
  symbol,
  wallet
}: {
  amount: number | null;
  error: string | null;
  isLoading: boolean;
  logo: string;
  name: string;
  note?: string;
  symbol: "USDC" | "USDT";
  wallet: ConnectedWallet | null;
}) {
  return (
    <article className="col-span-3 rounded-xl border border-[#e0e3e5] bg-white p-4 shadow-[0_4px_20px_rgba(26,32,44,0.05)] dark:border-white/10 dark:bg-[#111827] max-lg:col-span-6 max-sm:col-span-12">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            alt={`${symbol} logo`}
            className="h-9 w-9 rounded-full"
            src={logo}
          />
          <div>
            <h3 className="m-0 text-sm font-bold text-[#030813] dark:text-white">
              {symbol}
            </h3>
            <p className="text-xs text-[#45474c] dark:text-slate-400">{name}</p>
          </div>
        </div>
        <span className="rounded-md bg-[#f1f4f6] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-[#45474c] dark:bg-white/10 dark:text-slate-300">
          SPL
        </span>
      </div>

      <p className="font-['Manrope'] text-2xl font-bold leading-tight text-[#030813] dark:text-white">
        {wallet
          ? amount !== null
              ? formatTokenAmount(amount, symbol)
              : isLoading
                ? "Loading"
              : "--"
          : "Connect wallet"}
      </p>
      <p className="mt-2 text-xs leading-5 text-[#45474c] dark:text-slate-400">
        {note ??
        (error && amount === null
          ? "Balance sync failed. Retrying from cache window."
          : wallet
            ? ""
            : "Connect Solflare or Phantom to load this wallet's balance.")}
      </p>
    </article>
  );
}

function formatTokenAmount(amount: number, symbol: "SOL" | "USDC" | "USDT") {
  const maximumFractionDigits = symbol === "SOL" ? 4 : 2;

  return `${amount.toLocaleString(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: amount > 0 && amount < 1 ? 2 : 0
  })} ${symbol}`;
}

function formatHistoryDate(date: string) {
  return new Date(date).toLocaleString(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  });
}

function WalletMetricCard({
  error,
  icon,
  label,
  logo,
  value
}: {
  error?: string | null;
  icon?: string;
  label: string;
  logo?: string;
  value: string;
}) {
  return (
    <article className="col-span-2 rounded-xl border border-[#e0e3e5] bg-white p-4 shadow-[0_4px_20px_rgba(26,32,44,0.04)] dark:border-white/10 dark:bg-[#111827] max-lg:col-span-4 max-sm:col-span-12">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
        {logo ? (
          <img alt="" className="h-6 w-8 rounded-full object-contain" src={logo} />
        ) : (
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        )}
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#45474c] dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-['Manrope'] text-xl font-bold text-[#030813] dark:text-white">
        {value}
      </p>
      {error ? (
        <p className="mt-1 text-[11px] leading-4 text-[#9f1239] dark:text-rose-300">
          Retrying sync
        </p>
      ) : null}
    </article>
  );
}

function WalletMenu({
  wallet,
  onChangeWallet,
  onDisconnectWallet
}: {
  wallet: ConnectedWallet;
  onChangeWallet: () => void;
  onDisconnectWallet: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  async function copyWallet() {
    await navigator.clipboard.writeText(wallet.address);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  function changeWallet() {
    setIsOpen(false);
    onChangeWallet();
  }

  function disconnectWallet() {
    setIsOpen(false);
    onDisconnectWallet();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center gap-2 rounded-xl border border-[#6cf8bb]/40 bg-white px-4 py-2 text-sm font-semibold text-[#030813] shadow-sm transition-colors hover:bg-[#f7fafc] dark:border-[#6ffbbe]/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="material-symbols-outlined text-[#006c49] dark:text-[#6ffbbe]">
          account_balance_wallet
        </span>
        <span>{wallet.label}</span>
        <span className="font-mono text-xs text-[#45474c] dark:text-slate-400">
          {formatWallet(wallet.address)}
        </span>
        <span className="material-symbols-outlined text-[18px] text-[#76777c]">
          expand_more
        </span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-56 overflow-hidden rounded-xl border border-[#e5e9eb] bg-white p-1.5 shadow-[0_16px_45px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#111827]">
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#030813] transition-colors hover:bg-[#f1f4f6] dark:text-white dark:hover:bg-white/10"
            onClick={copyWallet}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#006c49] dark:text-[#6ffbbe]">
              {copyState === "copied" ? "check" : "content_copy"}
            </span>
            {copyState === "copied" ? "Copied" : "Copy wallet"}
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#030813] transition-colors hover:bg-[#f1f4f6] dark:text-white dark:hover:bg-white/10"
            onClick={changeWallet}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#006c49] dark:text-[#6ffbbe]">
              swap_horiz
            </span>
            Change wallet
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#9f1239] transition-colors hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
            onClick={disconnectWallet}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}

function formatWallet(address: string) {
  if (address.length <= 14) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}
