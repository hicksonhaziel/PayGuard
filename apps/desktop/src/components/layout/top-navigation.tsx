import { useEffect, useState } from "react";
import type { AppScreen, ConnectedWallet, SolanaNetwork } from "../../App";
import banner from "../../../assets/payguardbanner.png";

const navigationItems: { label: string; screen: AppScreen | null }[] = [
  { label: "Dashboard", screen: "home" },
  { label: "History", screen: "history" },
  { label: "Guarded", screen: "guarded" },
  { label: "Recipients", screen: "recipients" }
];
const themeStorageKey = "payguard-theme";

type Theme = "light" | "dark";
type GuardedPaymentRecord = Awaited<
  ReturnType<NonNullable<Window["payguardDesktop"]>["listGuardedPayments"]>
>[number];

interface TopNavigationProps {
  activeScreen: AppScreen;
  network: SolanaNetwork;
  onNavigate: (screen: AppScreen) => void;
  wallet: ConnectedWallet | null;
}

export function TopNavigation({
  activeScreen,
  network,
  onNavigate,
  wallet
}: TopNavigationProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const storedTheme = window.localStorage.getItem(themeStorageKey);

    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [guardedAlerts, setGuardedAlerts] = useState<GuardedPaymentRecord[]>([]);
  const [guardedAlertError, setGuardedAlertError] = useState<string | null>(null);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    void loadGuardedAlerts();

    if (!wallet || network !== "devnet") {
      return;
    }

    const interval = window.setInterval(() => {
      void loadGuardedAlerts({ silent: true });
    }, 45000);

    return () => window.clearInterval(interval);
  }, [wallet?.address, network]);

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  async function loadGuardedAlerts(options?: { silent?: boolean }) {
    if (!wallet || network !== "devnet") {
      setGuardedAlerts([]);
      setGuardedAlertError(null);
      setIsLoadingAlerts(false);
      return;
    }

    try {
      if (!options?.silent) {
        setIsLoadingAlerts(true);
      }

      const payments = await window.payguardDesktop!.listGuardedPayments({
        network,
        walletAddress: wallet.address
      });

      setGuardedAlerts(
        payments.filter((payment) => payment.status === "funded")
      );
      setGuardedAlertError(null);
    } catch (error) {
      setGuardedAlertError(
        error instanceof Error
          ? error.message
          : "Could not load guarded payment alerts."
      );
    } finally {
      if (!options?.silent) {
        setIsLoadingAlerts(false);
      }
    }
  }

  function openGuardedPayments() {
    setIsNotificationsOpen(false);
    onNavigate("guarded");
  }

  const readyToClaimCount = guardedAlerts.filter(isReadyToClaim).length;
  const alertCount = guardedAlerts.length;
  const badgeClass =
    readyToClaimCount > 0
      ? "bg-[#006c49] text-white dark:bg-[#6ffbbe] dark:text-[#002113]"
      : "bg-amber-500 text-white";

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-center border-b border-[#c6c6cc]/30 bg-[#f7fafc] dark:border-white/10 dark:bg-[#0f172a]">
      <div className="flex w-full max-w-[1200px] items-center justify-between px-8 max-lg:px-5">
        <div className="flex min-w-0 items-center gap-10">
          <img
            alt="PayGuard"
            className="h-auto w-[150px] object-contain"
            src={banner}
          />

          <nav className="flex items-center gap-6 max-lg:hidden" aria-label="Primary navigation">
            {navigationItems.map((item) => (
              <button
                className={`relative h-16 border-0 bg-transparent p-0 font-['Manrope'] text-sm font-semibold transition-colors ${
                  item.screen === activeScreen
                    ? "text-[#030813] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#006c49] dark:text-white dark:after:bg-[#6ffbbe]"
                    : "text-[#45474c] hover:text-[#030813] dark:text-slate-400 dark:hover:text-white"
                }`}
                key={item.label}
                onClick={() => {
                  if (item.screen) {
                    onNavigate(item.screen);
                  }
                }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 max-md:gap-1.5">
          <button
            className="pg-icon-button"
            onClick={toggleTheme}
            type="button"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="material-symbols-outlined">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>
          <div className="relative">
            <button
              aria-label="Guarded payment notifications"
              className="pg-icon-button relative"
              onClick={() => {
                const nextOpen = !isNotificationsOpen;
                setIsNotificationsOpen(nextOpen);

                if (nextOpen) {
                  void loadGuardedAlerts();
                }
              }}
              title="Guarded payment notifications"
              type="button"
            >
              <span className="material-symbols-outlined">notifications</span>
              {alertCount > 0 ? (
                <span className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none ${badgeClass}`}>
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              ) : null}
            </button>

            {isNotificationsOpen ? (
              <div className="absolute right-0 top-12 z-30 w-[360px] max-w-[calc(100vw-24px)] rounded-2xl border border-[#e0e3e5] bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[#111827]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 font-['Manrope'] text-sm font-bold text-[#181c1e] dark:text-white">
                      Guarded Alerts
                    </h2>
                    <p className="mt-0.5 text-[11px] text-[#76777c] dark:text-slate-500">
                      {wallet ? "Escrow updates for this wallet" : "Connect wallet to scan"}
                    </p>
                  </div>
                  <button
                    className="rounded-lg border border-[#d9dee2] px-2 py-1 text-[11px] font-semibold text-[#45474c] hover:bg-[#f1f4f6] dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                    onClick={() => loadGuardedAlerts()}
                    type="button"
                  >
                    Refresh
                  </button>
                </div>

                {!wallet ? (
                  <NotificationEmptyState message="Connect wallet to see guarded payment alerts." />
                ) : network !== "devnet" ? (
                  <NotificationEmptyState message="Guarded alerts are currently devnet-only for this MVP." />
                ) : guardedAlertError ? (
                  <NotificationEmptyState message={guardedAlertError} tone="error" />
                ) : isLoadingAlerts ? (
                  <NotificationEmptyState message="Scanning guarded payments..." />
                ) : guardedAlerts.length ? (
                  <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1">
                    {guardedAlerts.slice(0, 6).map((payment) => (
                      <GuardedAlertItem
                        key={payment.escrowAddress}
                        onOpen={openGuardedPayments}
                        payment={payment}
                      />
                    ))}
                    {guardedAlerts.length > 6 ? (
                      <button
                        className="rounded-xl bg-[#f1f4f6] px-3 py-2 text-xs font-semibold text-[#030813] hover:bg-[#e5e9eb] dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                        onClick={openGuardedPayments}
                        type="button"
                      >
                        View all {guardedAlerts.length} guarded payments
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <NotificationEmptyState message="No guarded payment alerts." />
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function GuardedAlertItem({
  onOpen,
  payment
}: {
  onOpen: () => void;
  payment: GuardedPaymentRecord;
}) {
  const readyToClaim = isReadyToClaim(payment);
  const isSender = payment.role === "sender";
  const counterparty = isSender ? payment.recipientWallet : payment.senderWallet;
  const label = readyToClaim
    ? "Ready to claim"
    : isSender
      ? "Cancellable hold"
      : "Waiting period";

  return (
    <button
      className="grid w-full gap-2 rounded-xl border border-[#e5e9eb] bg-[#f7fafc] p-3 text-left transition-colors hover:border-[#006c49]/30 hover:bg-[#eefaf4] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[#6ffbbe]/30 dark:hover:bg-[#6ffbbe]/10"
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 truncate font-['Manrope'] text-sm font-bold text-[#181c1e] dark:text-white">
            {payment.amount} {payment.token}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-[#76777c] dark:text-slate-500">
            {isSender ? "To" : "From"} {formatWallet(counterparty)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] ${
          readyToClaim
            ? "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
            : "bg-amber-100 text-amber-800 dark:bg-amber-300/10 dark:text-amber-200"
        }`}>
          {label}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px] text-[#45474c] dark:text-slate-400">
        <span>{payment.role === "sender" ? "Sender" : "Receiver"}</span>
        <span>{readyToClaim ? "Ready now" : `Unlocks ${formatDate(payment.unlockAt)}`}</span>
      </div>
    </button>
  );
}

function NotificationEmptyState({
  message,
  tone = "default"
}: {
  message: string;
  tone?: "default" | "error";
}) {
  return (
    <div className={`rounded-xl border px-3 py-3 text-xs ${
      tone === "error"
        ? "border-rose-200 bg-rose-50 text-[#9f1239] dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-200"
        : "border-[#e5e9eb] bg-[#f7fafc] text-[#45474c] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400"
    }`}>
      {message}
    </div>
  );
}

function isReadyToClaim(payment: GuardedPaymentRecord) {
  return (
    payment.role === "recipient" &&
    payment.status === "funded" &&
    Date.now() >= new Date(payment.unlockAt).getTime()
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
