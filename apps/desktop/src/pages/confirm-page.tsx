import { useState } from "react";
import type { PaymentDecision } from "../App";

interface ConfirmPageProps {
  decision: PaymentDecision | null;
  onCancel: () => void;
  onDirectSend: () => void;
  onGuardedPayment: (guardedHoldHours: number) => void;
}

export function ConfirmPage({
  decision,
  onCancel,
  onDirectSend,
  onGuardedPayment
}: ConfirmPageProps) {
  const displayDecision = decision ?? createFallbackDecision();
  const initialRoute =
    displayVerdictRoute(displayDecision.verdict.recommendedRoute) ??
    displayDecision.selectedRoute;
  const [selectedRoute, setSelectedRoute] = useState(initialRoute);
  const [guardedHoldHours, setGuardedHoldHours] = useState(
    displayDecision.guardedHoldHours
  );
  const displayVerdict = displayDecision.verdict;
  const showGuardedHoldSettings = selectedRoute === "Guarded Payment";
  const transactionRows = [
    ["Recipient", displayDecision.recipientName],
    ["Amount", `${displayDecision.amount} ${displayDecision.token}`],
    ["Selected Route", selectedRoute],
    ["Recipient Address", formatWallet(displayDecision.walletAddress)]
  ] as const;
  const tone = getVerdictTone(displayVerdict.verdict);
  const primaryAction = getPrimaryAction(
    selectedRoute,
    onDirectSend,
    onGuardedPayment,
    guardedHoldHours
  );
  const alternateAction = getAlternateAction(
    selectedRoute,
    onDirectSend,
    setSelectedRoute
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7fafc] px-6 py-6 dark:bg-[#0f172a]">
      <section className="flex w-full max-w-[730px] flex-col gap-4">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <div className={`mb-1 inline-flex h-11 w-11 items-center justify-center rounded-full ${tone.badgeClass}`}>
            <span className="material-symbols-outlined text-[28px] [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">
              {tone.icon}
            </span>
          </div>
          <h1 className="m-0 font-['Manrope'] text-[26px] font-bold leading-tight text-[#030813] dark:text-white max-md:text-[24px]">
            Verdict: {displayVerdict.verdict}
          </h1>
          <p className="max-w-lg text-[13px] leading-5 text-[#45474c] dark:text-slate-400">
            {displayVerdict.summary}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <TransactionSummaryCard rows={transactionRows} verdict={displayVerdict} />
          <RiskAnalysisCard verdict={displayVerdict} />
        </div>

        {showGuardedHoldSettings ? (
          <GuardedHoldSettings
            hours={guardedHoldHours}
            onHoursChange={setGuardedHoldHours}
          />
        ) : null}

        <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
          {primaryAction ? (
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#030813] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-[#6ffbbe] dark:text-[#002113]"
              onClick={primaryAction.onClick}
              type="button"
            >
              <span className="material-symbols-outlined">
                {primaryAction.icon}
              </span>
              {primaryAction.label}
            </button>
          ) : null}
          <div className={alternateAction ? "grid grid-cols-2 gap-2" : "grid"}>
            <button
              className="rounded-xl border-2 border-[#030813] bg-transparent px-4 py-2 text-sm font-semibold text-[#030813] transition-colors hover:bg-[#ebeef0] dark:border-white dark:text-white dark:hover:bg-white/10"
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
            {alternateAction ? (
              <button
                className="rounded-xl border-2 border-[#e0e3e5] bg-transparent px-4 py-2 text-sm font-semibold text-[#45474c] transition-colors hover:bg-[#ebeef0] dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/10"
                onClick={alternateAction.onClick}
                type="button"
              >
                {alternateAction.label}
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

type PayableRoute = "Direct Send" | "Guarded Payment";

function displayVerdictRoute(
  route: PaymentDecision["verdict"]["recommendedRoute"]
): PayableRoute | null {
  return route === "Direct Send" || route === "Guarded Payment" ? route : null;
}

function getPrimaryAction(
  route: PaymentDecision["selectedRoute"],
  onDirectSend: () => void,
  onGuardedPayment: (guardedHoldHours: number) => void,
  guardedHoldHours: number
) {
  if (route === "Direct Send") {
    return {
      icon: "send",
      label: "Direct Send",
      onClick: onDirectSend
    };
  }

  if (route === "Guarded Payment") {
    return {
      icon: "shield",
      label: "Guarded Payment",
      onClick: () => onGuardedPayment(guardedHoldHours)
    };
  }

  return null;
}

function getAlternateAction(
  route: PaymentDecision["selectedRoute"],
  onDirectSend: () => void,
  onSelectRoute: (route: PayableRoute) => void
) {
  if (route === "Direct Send") {
    return {
      label: "Guarded Payment",
      onClick: () => onSelectRoute("Guarded Payment")
    };
  }

  if (route === "Guarded Payment") {
    return {
      label: "Direct Send",
      onClick: onDirectSend
    };
  }

  if (route === "Block") {
    return {
      label: "Direct Send",
      onClick: onDirectSend
    };
  }

  return null;
}

function GuardedHoldSettings({
  hours,
  onHoursChange
}: {
  hours: number;
  onHoursChange: (hours: number) => void;
}) {
  const unlockDate = new Date(Date.now() + hours * 60 * 60 * 1000);

  function updateHours(value: string) {
    const nextHours = Math.max(1, Math.min(168, Math.round(Number(value) || 1)));
    onHoursChange(nextHours);
  }

  return (
    <article className="mx-auto grid w-full max-w-[730px] gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-300/20 dark:bg-amber-300/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-amber-800 dark:text-amber-200">
            hourglass_empty
          </span>
          <div>
            <h2 className="font-['Manrope'] text-base font-bold text-amber-950 dark:text-amber-100">
              Guarded payment hold
            </h2>
            <p className="text-xs leading-5 text-amber-900 dark:text-amber-200">
              Funds stay recoverable until the claim window opens.
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-white px-3 py-2 text-right text-xs font-semibold text-amber-950 shadow-sm dark:bg-[#0f172a]/60 dark:text-amber-100">
          Claimable {formatUnlockDate(unlockDate)}
        </div>
      </div>

      <label className="grid gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-amber-900 dark:text-amber-200">
          Hold duration
        </span>
        <div className="grid grid-cols-[1fr_96px] items-center gap-3 max-sm:grid-cols-1">
          <input
            className="h-2 w-full accent-[#006c49] dark:accent-[#6ffbbe]"
            max="168"
            min="1"
            onChange={(event) => updateHours(event.target.value)}
            type="range"
            value={hours}
          />
          <div className="relative">
            <input
              className="pg-input w-full !pr-12 text-right"
              max="168"
              min="1"
              onChange={(event) => updateHours(event.target.value)}
              type="number"
              value={hours}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#76777c]">
              hrs
            </span>
          </div>
        </div>
      </label>
    </article>
  );
}

function formatUnlockDate(date: Date) {
  return date.toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short"
  });
}

function TransactionSummaryCard({
  rows,
  verdict
}: {
  rows: readonly (readonly [string, string])[];
  verdict: PaymentDecision["verdict"];
}) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-[#e0e3e5]/70 bg-white p-[18px] shadow-[0_4px_20px_rgba(26,32,44,0.05)] dark:border-white/10 dark:bg-[#111827]">
      <h2 className="font-['Manrope'] text-[17px] font-bold text-[#030813] dark:text-white">
        Transaction Summary
      </h2>

      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-[#e0e3e5] py-2 dark:border-white/10">
          <span className="text-[13px] text-[#45474c] dark:text-slate-400">
            Risk Score
          </span>
          <span className="text-right text-[13px] font-semibold text-[#030813] dark:text-white">
            {verdict.riskScore}/100
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-[#e0e3e5] py-2 dark:border-white/10">
          <span className="text-[13px] text-[#45474c] dark:text-slate-400">
            Recommended Route
          </span>
          <span className="text-right text-[13px] font-semibold text-[#030813] dark:text-white">
            {verdict.recommendedRoute}
          </span>
        </div>
        {rows.map(([label, value], index) => (
          <div
            className={`flex items-center justify-between gap-3 py-2 ${
              index === rows.length - 1
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

function RiskAnalysisCard({ verdict }: { verdict: PaymentDecision["verdict"] }) {
  const tone = getVerdictTone(verdict.verdict);

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
        {verdict.reasons.map((reason) => (
          <li
            className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 ${tone.itemClass}`}
            key={reason}
          >
            <span
              className={`material-symbols-outlined mt-0.5 text-xl [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24] ${tone.iconClass}`}
            >
              {tone.reasonIcon}
            </span>
            <span className="text-[13px] leading-5 text-[#181c1e] dark:text-slate-200">
              {reason}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function getVerdictTone(verdict: PaymentDecision["verdict"]["verdict"]) {
  if (verdict === "Safe") {
    return {
      icon: "check_circle",
      reasonIcon: "check_circle",
      badgeClass: "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]",
      iconClass: "text-[#006c49] dark:text-[#6ffbbe]",
      itemClass: "bg-[#f7fafc] dark:bg-white/[0.04]"
    };
  }

  if (verdict === "Block") {
    return {
      icon: "dangerous",
      reasonIcon: "error",
      badgeClass: "bg-rose-100 text-[#9f1239] dark:bg-rose-500/15 dark:text-rose-300",
      iconClass: "text-[#9f1239] dark:text-rose-300",
      itemClass: "border border-rose-100 bg-rose-50 dark:border-rose-300/15 dark:bg-rose-300/10"
    };
  }

  return {
    icon: "warning",
    reasonIcon: "warning",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300",
    iconClass: "text-orange-800 dark:text-orange-300",
    itemClass: "border border-orange-100 bg-orange-50 dark:border-orange-300/15 dark:bg-orange-300/10"
  };
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
