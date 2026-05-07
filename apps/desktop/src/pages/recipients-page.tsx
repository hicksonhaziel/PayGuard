import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { ConnectedWallet, PrefilledRecipient, SolanaNetwork } from "../App";

interface RecipientsPageProps {
  network: SolanaNetwork;
  wallet: ConnectedWallet | null;
  onStartPayment: (recipient?: PrefilledRecipient) => void;
}

type RecipientSummary = Awaited<
  ReturnType<NonNullable<Window["payguardDesktop"]>["store"]["listRecipients"]>
>[number];

export function RecipientsPage({
  network,
  wallet,
  onStartPayment
}: RecipientsPageProps) {
  const [recipients, setRecipients] = useState<RecipientSummary[]>([]);
  const [isAddingRecipient, setIsAddingRecipient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRecipients() {
    if (!wallet) {
      setRecipients([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setRecipients(
        await window.payguardDesktop!.store.listRecipients({
          network,
          ownerWallet: wallet.address
        })
      );
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load recipients.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRecipients();
  }, [wallet?.address, network]);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#f7fafc] px-8 py-5 dark:bg-[#0f172a] max-lg:px-5">
      <div className="mx-auto w-full max-w-[1200px]">
        <section className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="m-0 font-['Manrope'] text-[26px] font-bold leading-tight text-[#181c1e] dark:text-white">
              Trusted Recipients
            </h1>
            <p className="mt-1 text-sm leading-5 text-[#45474c] dark:text-slate-400">
              Manage and execute payments to verified addresses.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
            <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#76777c]">
                search
              </span>
              <input
                className="w-full rounded-lg border border-[#c6c6cc] bg-white py-1.5 pl-10 pr-4 text-sm text-[#181c1e] outline-none transition-all placeholder:text-[#76777c] focus:border-[#1a202c] focus:ring-2 focus:ring-[#6cf8bb]/40 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-[#6ffbbe]"
                placeholder="Search recipients..."
                type="text"
              />
            </label>
            <button
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#1a202c] px-3.5 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#6ffbbe] dark:text-[#002113]"
              disabled={!wallet}
              onClick={() => setIsAddingRecipient(true)}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add New Recipient
            </button>
          </div>
        </section>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-[#9f1239] dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {!wallet ? (
          <div className="rounded-2xl border border-dashed border-[#c6c6cc] bg-white p-8 text-center shadow-[0_4px_20px_rgba(26,32,44,0.04)] dark:border-white/10 dark:bg-[#111827]">
            <span className="material-symbols-outlined mb-2 text-4xl text-[#76777c] dark:text-slate-400">
              lock
            </span>
            <h2 className="mb-1 font-['Manrope'] text-lg font-bold text-[#030813] dark:text-white">
              Connect wallet to view recipients
            </h2>
            <p className="mx-auto max-w-md text-sm leading-6 text-[#45474c] dark:text-slate-400">
              Recipients are stored locally per connected wallet.
            </p>
          </div>
        ) : isLoading ? (
          <p className="text-sm text-[#45474c] dark:text-slate-400">
            Loading local recipients...
          </p>
        ) : recipients.length ? (
          <section className="grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-md:grid-cols-1">
            {recipients.map((recipient) => (
              <RecipientCard
                key={recipient.walletAddress}
                onStartPayment={onStartPayment}
                {...recipient}
              />
            ))}
          </section>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#c6c6cc] bg-white p-8 text-center shadow-[0_4px_20px_rgba(26,32,44,0.04)] dark:border-white/10 dark:bg-[#111827]">
            <span className="material-symbols-outlined mb-2 text-4xl text-[#76777c] dark:text-slate-400">
              group
            </span>
            <h2 className="mb-1 font-['Manrope'] text-lg font-bold text-[#030813] dark:text-white">
              No recipients yet
            </h2>
            <p className="mx-auto mb-4 max-w-md text-sm leading-6 text-[#45474c] dark:text-slate-400">
              Add a recipient wallet to start building trusted local payment history.
            </p>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a202c] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-[#6ffbbe] dark:text-[#002113]"
              onClick={() => setIsAddingRecipient(true)}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Recipient
            </button>
          </div>
        )}
      </div>

      {isAddingRecipient ? (
        <AddRecipientModal
          ownerWallet={wallet?.address ?? ""}
          network={network}
          onClose={() => setIsAddingRecipient(false)}
          onRecipientAdded={async () => {
            setIsAddingRecipient(false);
            await loadRecipients();
          }}
          onError={setError}
        />
      ) : null}
    </main>
  );
}

function AddRecipientModal({
  network,
  onClose,
  onError,
  onRecipientAdded,
  ownerWallet
}: {
  network: SolanaNetwork;
  onClose: () => void;
  onError: (error: string | null) => void;
  onRecipientAdded: () => Promise<void>;
  ownerWallet: string;
}) {
  const [name, setName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submitRecipient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!walletAddress.trim()) {
      setFormError("Wallet address is required.");
      return;
    }

    if (!ownerWallet) {
      setFormError("Connect wallet before saving a recipient.");
      return;
    }

    try {
      setIsSaving(true);
      await window.payguardDesktop!.store.addRecipient({
        name: name.trim() || undefined,
        network,
        ownerWallet,
        walletAddress: walletAddress.trim()
      });
      onError(null);
      await onRecipientAdded();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not add recipient.";
      setFormError(message);
      onError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030813]/45 px-4 backdrop-blur-sm">
      <form
        className="w-full max-w-md rounded-2xl border border-[#e5e9eb] bg-white p-5 shadow-[0_20px_70px_rgba(3,8,19,0.25)] dark:border-white/10 dark:bg-[#111827]"
        onSubmit={submitRecipient}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-['Manrope'] text-xl font-bold text-[#030813] dark:text-white">
              Add Recipient
            </h2>
            <p className="mt-1 text-sm leading-5 text-[#45474c] dark:text-slate-400">
              Save a trusted wallet locally for future payment checks.
            </p>
          </div>
          <button
            className="pg-icon-button"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="pg-field-label">Name optional</span>
            <input
              className="pg-input"
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Acme Store"
              type="text"
              value={name}
            />
          </label>

          <label className="grid gap-2">
            <span className="pg-field-label">Wallet Address</span>
            <input
              className="pg-input font-mono"
              onChange={(event) => setWalletAddress(event.target.value)}
              placeholder="Paste Solana wallet address"
              type="text"
              value={walletAddress}
            />
          </label>
        </div>

        {formError ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-[#9f1239] dark:bg-rose-500/10 dark:text-rose-200">
            {formError}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg border border-[#c6c6cc] px-4 py-2 text-sm font-semibold text-[#030813] transition-colors hover:bg-[#f1f4f6] dark:border-white/10 dark:text-white dark:hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-[#1a202c] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#6ffbbe] dark:text-[#002113]"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving..." : "Save Recipient"}
          </button>
        </div>
      </form>
    </div>
  );
}

type RecipientCardProps = RecipientSummary & {
  onStartPayment: (recipient?: PrefilledRecipient) => void;
};

function RecipientCard({
  averageAmount,
  lastPayment,
  name,
  onStartPayment,
  payments,
  walletAddress
}: RecipientCardProps) {
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <article className="flex min-h-[260px] flex-col justify-between rounded-2xl border border-[#e0e3e5] bg-white p-4 shadow-[0_4px_20px_rgba(26,32,44,0.05)] transition-shadow hover:shadow-[0_8px_30px_rgba(26,32,44,0.08)] dark:border-white/10 dark:bg-[#111827]">
      <div>
        <div className="mb-4 flex items-start justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full font-['Manrope'] text-lg font-semibold ${
              "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
            }`}
          >
            {initial}
          </div>
          <span className="flex items-center gap-1 rounded-full bg-[#006c49]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
            <span className="material-symbols-outlined text-[14px]">
              verified
            </span>
            Trusted
          </span>
        </div>

        <h3 className="mb-1 font-['Manrope'] text-base font-semibold text-[#181c1e] dark:text-white">
          {name}
        </h3>
        <p className="mb-4 inline-block rounded bg-[#f1f4f6] px-2 py-1 font-mono text-[11px] text-[#45474c] dark:bg-white/[0.04] dark:text-slate-400">
          {formatWallet(walletAddress)}
        </p>

        <div className="mb-4 space-y-0.5">
          <RecipientStat label="Total Payments" value={String(payments)} />
          <RecipientStat label="Last Payment" value={lastPayment} />
          <RecipientStat label="Avg Amount" value={averageAmount} />
        </div>
      </div>

      <button
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a202c] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-[#6ffbbe] dark:text-[#002113]"
        onClick={() => onStartPayment({ name, walletAddress })}
        type="button"
      >
        <span className="material-symbols-outlined text-[18px]">send</span>
        New Payment
      </button>
    </article>
  );
}

function formatWallet(walletAddress: string) {
  if (walletAddress.length <= 14) {
    return walletAddress;
  }

  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`;
}

interface RecipientStatProps {
  label: string;
  value: string;
}

function RecipientStat({ label, value }: RecipientStatProps) {
  return (
    <div className="flex items-center justify-between border-b border-[#e0e3e5]/60 py-2 dark:border-white/10">
      <span className="text-xs text-[#45474c] dark:text-slate-400">{label}</span>
      <span className="text-xs font-semibold text-[#181c1e] dark:text-white">
        {value}
      </span>
    </div>
  );
}
