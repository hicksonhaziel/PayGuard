import { useEffect, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import type {
  PaymentRagInput,
  TrustedRecipientRecord
} from "@payguard/qvac-agent";
import type {
  ConnectedWallet,
  PaymentAnalysisRequest,
  PrefilledRecipient,
  SolanaNetwork
} from "../App";

type RiskStatus = "idle" | "running" | "error";

type UploadedDocument = {
  name: string;
  path: string;
  previewUrl: string | null;
  type: string;
};

type PaymentDraft = {
  selectedRecipientWallet: string;
  walletAddress: string;
  amount: string;
  token: string;
  memo: string;
};

type PaymentValidationErrors = {
  amount?: string;
  walletAddress?: string;
};

type RecipientSummary = Awaited<
  ReturnType<NonNullable<Window["payguardDesktop"]>["store"]["listRecipients"]>
>[number];

interface NewPaymentPageProps {
  network: SolanaNetwork;
  wallet: ConnectedWallet | null;
  prefilledRecipient: PrefilledRecipient | null;
  onAnalyze: (request: PaymentAnalysisRequest) => void;
  onBack: () => void;
}

export function NewPaymentPage({
  network,
  wallet,
  prefilledRecipient,
  onAnalyze,
  onBack
}: NewPaymentPageProps) {
  const [uploadedDocument, setUploadedDocument] = useState<UploadedDocument | null>(null);
  const [recipients, setRecipients] = useState<RecipientSummary[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>({
    selectedRecipientWallet: "",
    walletAddress: "",
    amount: "",
    token: "USDC",
    memo: ""
  });
  const [riskState, setRiskState] = useState<{
    status: RiskStatus;
    error: string | null;
  }>({
    status: "idle",
    error: null
  });
  const [hasAttemptedAnalyze, setHasAttemptedAnalyze] = useState(false);
  const validationErrors = validatePaymentInput(buildPaymentRagInput());

  function buildPaymentRagInput(draft = paymentDraft): PaymentRagInput {
    return {
      recipientWallet: draft.walletAddress,
      amount: draft.amount,
      token: draft.token,
      memo: draft.memo
    };
  }

  async function handleAnalyzePayment() {
    setHasAttemptedAnalyze(true);

    const currentValidationErrors = validatePaymentInput(buildPaymentRagInput());

    if (Object.keys(currentValidationErrors).length) {
      setRiskState({
        status: "error",
        error: "Fix the highlighted payment details before running QVAC analysis."
      });
      return;
    }

    if (!window.payguardDesktop?.matchRecipientWithRag || !window.payguardDesktop?.analyzePaymentRisk) {
      setRiskState({
        status: "error",
        error: "Desktop QVAC analysis bridge is not available."
      });
      return;
    }

    const ragInput = buildPaymentRagInput();
    const savedRecipient = findSavedRecipientByWallet(ragInput.recipientWallet, recipients);

    setRiskState({
      status: "idle",
      error: null
    });
    onAnalyze({
      documentPath: uploadedDocument?.path,
      hasDocument: Boolean(uploadedDocument),
      ocrRecipientName: null,
      payment: ragInput,
      savedRecipientName: savedRecipient?.name ?? null,
      trustedRecipients: buildTrustedRecipientRecords(recipients)
    });
  }

  function updatePaymentDraft(draft: PaymentDraft) {
    setPaymentDraft(draft);

    if (riskState.status === "error") {
      setRiskState({
        status: "idle",
        error: null
      });
    }
  }

  async function handleDocumentFile(file: File | null) {
    if (!file) {
      return;
    }

    const filePath = window.payguardDesktop?.getPathForFile(file) ?? "";

    setUploadedDocument((currentDocument) => {
      if (currentDocument?.previewUrl) {
        URL.revokeObjectURL(currentDocument.previewUrl);
      }

      return {
        name: file.name,
        path: filePath,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
        type: file.type || "Unknown file"
      };
    });

  }

  useEffect(() => {
    async function loadRecipients() {
      try {
        setIsLoadingRecipients(true);
        const savedRecipients = wallet
          ? await window.payguardDesktop!.store.listRecipients({
              network,
              ownerWallet: wallet.address
            })
          : [];
        setRecipients(savedRecipients);

        if (prefilledRecipient) {
          setPaymentDraft((currentDraft) => ({
            ...currentDraft,
            selectedRecipientWallet: prefilledRecipient.walletAddress,
            walletAddress: prefilledRecipient.walletAddress
          }));
        }
      } finally {
        setIsLoadingRecipients(false);
      }
    }

    void loadRecipients();
  }, [prefilledRecipient, wallet?.address, network]);

  useEffect(() => {
    if (network === "devnet" && paymentDraft.token === "USDT") {
      updatePaymentDraft({
        ...paymentDraft,
        token: "USDC"
      });
    }
  }, [network, paymentDraft]);

  useEffect(() => {
    return () => {
      if (uploadedDocument?.previewUrl) {
        URL.revokeObjectURL(uploadedDocument.previewUrl);
      }
    };
  }, [uploadedDocument?.previewUrl]);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#f7fafc] dark:bg-[#0f172a]">
      <div className="mx-auto max-w-[1200px] px-7 py-5 max-lg:px-5">
        <header className="mb-5 flex items-center gap-3">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6c6cc]/60 text-[#45474c] transition-colors hover:bg-[#f1f4f6] hover:text-[#030813] dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={onBack}
            type="button"
            aria-label="Back to dashboard"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="m-0 font-['Manrope'] text-[28px] font-bold leading-tight text-[#030813] dark:text-white max-md:text-[26px]">
              Create New Payment
            </h1>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-5 max-lg:grid-cols-1">
          <div className="col-span-7 flex flex-col gap-3 max-lg:col-span-1">
            <ManualEntryCard
              draft={paymentDraft}
              errors={hasAttemptedAnalyze ? validationErrors : {}}
              isLoadingRecipients={isLoadingRecipients}
              network={network}
              wallet={wallet}
              onDraftChange={updatePaymentDraft}
              recipients={recipients}
            />
            {!uploadedDocument ? (
              <PaymentActionPanel
                buttonLabel="Continue"
                error={riskState.error}
                icon="arrow_forward"
                isRunning={riskState.status === "running"}
                runningLabel="Checking Payment"
                validationErrors={hasAttemptedAnalyze ? validationErrors : {}}
                onSubmit={handleAnalyzePayment}
              />
            ) : null}
          </div>

          <aside className="col-span-5 flex min-h-full flex-col gap-3 max-lg:col-span-1">
            <UploadCard onFileSelected={handleDocumentFile} />
            <DocumentPreviewCard document={uploadedDocument} />
            {uploadedDocument ? (
              <PaymentActionPanel
                buttonLabel="Analyze with QVAC"
                error={riskState.error}
                icon="analytics"
                isRunning={riskState.status === "running"}
                runningLabel="Running Local LLM"
                validationErrors={hasAttemptedAnalyze ? validationErrors : {}}
                onSubmit={handleAnalyzePayment}
              />
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}

function validatePaymentInput(input: PaymentRagInput): PaymentValidationErrors {
  const errors: PaymentValidationErrors = {};
  const walletAddress = input.recipientWallet?.trim() ?? "";
  const amount = input.amount?.trim() ?? "";
  const numericAmount = Number(amount);

  if (!walletAddress) {
    errors.walletAddress = "Enter a recipient Solana wallet address.";
  } else if (!isValidSolanaPublicKey(walletAddress)) {
    errors.walletAddress = "Enter a valid Solana wallet address.";
  }

  if (!amount) {
    errors.amount = "Enter an amount to pay.";
  } else if (!Number.isFinite(numericAmount)) {
    errors.amount = "Enter a valid numeric amount.";
  } else if (numericAmount <= 0) {
    errors.amount = "Amount must be greater than zero.";
  }

  return errors;
}

function isValidSolanaPublicKey(value: string) {
  const decoded = decodeBase58(value);

  return decoded !== null && decoded.length === 32;
}

function decodeBase58(value: string) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = [0];

  for (const character of value) {
    const valueIndex = alphabet.indexOf(character);

    if (valueIndex < 0) {
      return null;
    }

    let carry = valueIndex;

    for (let index = 0; index < bytes.length; index += 1) {
      const nextValue = bytes[index] * 58 + carry;
      bytes[index] = nextValue & 0xff;
      carry = nextValue >> 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (const character of value) {
    if (character !== "1") {
      break;
    }

    bytes.push(0);
  }

  return bytes.reverse();
}

function buildTrustedRecipientRecords(
  recipients: RecipientSummary[]
): TrustedRecipientRecord[] {
  return recipients.map((recipient) => ({
    name: recipient.name || formatWallet(recipient.walletAddress),
    wallet: recipient.walletAddress,
    normalToken: extractTokenFromAverage(recipient.averageAmount) || "USDC",
    normalAmountRange: buildNormalAmountRange(recipient),
    invoicePattern: recipient.notes || "Manual trusted recipient record",
    paymentHistory:
      recipient.payments > 0
        ? `${recipient.payments} completed PayGuard payment(s); last payment ${recipient.lastPayment}.`
        : `Saved trusted recipient since ${formatShortDate(recipient.trustedSince)}.`
  }));
}

function findSavedRecipientByWallet(
  walletAddress: string | undefined,
  recipients: RecipientSummary[]
) {
  const wallet = walletAddress?.trim();

  if (!wallet) {
    return null;
  }

  return recipients.find((recipient) => recipient.walletAddress === wallet) ?? null;
}

function buildNormalAmountRange(recipient: RecipientSummary) {
  const averageAmount = Number.parseFloat(recipient.averageAmount.replace(/,/g, ""));
  const token = extractTokenFromAverage(recipient.averageAmount) || "USDC";

  if (!Number.isFinite(averageAmount) || averageAmount <= 0) {
    return `No completed payment history yet; token preference ${token}`;
  }

  const lower = Math.max(0, averageAmount * 0.5);
  const upper = averageAmount * 1.5;

  return `${lower.toFixed(2)} to ${upper.toFixed(2)} ${token}`;
}

function extractTokenFromAverage(averageAmount: string) {
  return averageAmount.match(/\b(USDC|USDT)\b/)?.[1] ?? null;
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

interface ManualEntryCardProps {
  draft: PaymentDraft;
  errors: PaymentValidationErrors;
  isLoadingRecipients: boolean;
  network: SolanaNetwork;
  wallet: ConnectedWallet | null;
  onDraftChange: (draft: PaymentDraft) => void;
  recipients: RecipientSummary[];
}

function ManualEntryCard({
  draft,
  errors,
  isLoadingRecipients,
  network,
  wallet,
  onDraftChange,
  recipients
}: ManualEntryCardProps) {
  const isDevnet = network === "devnet";

  function selectPastRecipient(wallet: string) {
    onDraftChange({
      ...draft,
      selectedRecipientWallet: wallet,
      walletAddress: wallet
    });
  }

  function updateWalletAddress(value: string) {
    onDraftChange({
      ...draft,
      selectedRecipientWallet:
        value === draft.selectedRecipientWallet ? draft.selectedRecipientWallet : "",
      walletAddress: value
    });
  }

  return (
    <section className="rounded-2xl border border-[#e5e9eb] bg-white p-5 shadow-[0_4px_20px_rgba(26,32,44,0.05)] dark:border-white/10 dark:bg-[#111827]">
      <h2 className="mb-4 font-['Manrope'] text-lg font-bold text-[#030813] dark:text-white">
        Manual Entry
      </h2>

      <form className="flex flex-col gap-4">
        <label className="grid gap-2">
          <span className="pg-field-label">Past Recipients</span>
          <span className="relative">
            <select
              className="pg-input appearance-none pr-10"
              onChange={(event) => selectPastRecipient(event.target.value)}
              value={draft.selectedRecipientWallet}
            >
              <option value="">
                {isLoadingRecipients
                  ? "Loading recipients..."
                  : !wallet
                    ? "Connect wallet to load recipients"
                    : recipients.length
                    ? "Choose a saved recipient"
                    : "No recipients yet"}
              </option>
              {recipients.map((recipient) => (
                <option key={recipient.walletAddress} value={recipient.walletAddress}>
                  {recipient.name} - {formatWallet(recipient.walletAddress)}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#76777c]">
              expand_more
            </span>
          </span>
          <span className="text-xs text-[#45474c] dark:text-slate-400">
            {recipients.length
              ? "Select a known recipient or paste a new wallet below."
              : !wallet
                ? "Connect wallet to load saved recipients, or paste a wallet below."
              : "No recipients yet. You can still paste a wallet below."}
          </span>
        </label>

        <label className="grid gap-2">
          <span className="pg-field-label">Recipient Wallet Address</span>
          <span className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#76777c]">
              account_balance_wallet
            </span>
            <input
              aria-invalid={Boolean(errors.walletAddress)}
              className={`pg-input w-full !pl-14 !pr-4 ${
                errors.walletAddress ? "border-rose-300 dark:border-rose-300/50" : ""
              }`}
              onChange={(event) => updateWalletAddress(event.target.value)}
              placeholder="Solana wallet address"
              type="text"
              value={draft.walletAddress}
            />
          </span>
          {errors.walletAddress ? (
            <FieldError>{errors.walletAddress}</FieldError>
          ) : null}
        </label>

        <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
          <label className="col-span-2 grid gap-2 max-sm:col-span-1">
            <span className="pg-field-label">Amount</span>
            <span className="relative">
              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 font-['Manrope'] text-[#76777c]">
                $
              </span>
              <input
                aria-invalid={Boolean(errors.amount)}
                className={`pg-input w-full !pl-10 !pr-4 ${
                  errors.amount ? "border-rose-300 dark:border-rose-300/50" : ""
                }`}
                min="0"
                onChange={(event) =>
                  onDraftChange({ ...draft, amount: event.target.value })
                }
                placeholder="0.00"
                step="any"
                type="number"
                value={draft.amount}
              />
            </span>
            {errors.amount ? <FieldError>{errors.amount}</FieldError> : null}
          </label>

          <label className="grid gap-2">
            <span className="pg-field-label">Token</span>
            <span className="relative">
              <select
                className="pg-input appearance-none pr-10"
                onChange={(event) =>
                  onDraftChange({ ...draft, token: event.target.value })
                }
                value={draft.token}
              >
                <option value="USDC">USDC</option>
                <option disabled={isDevnet} value="USDT">
                  {isDevnet ? "USDT unavailable on devnet" : "USDT"}
                </option>
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#76777c]">
                expand_more
              </span>
            </span>
            {isDevnet ? (
              <span className="text-xs leading-5 text-[#45474c] dark:text-slate-400">
                Devnet uses USDC for test transfers.
              </span>
            ) : null}
          </label>
        </div>

        <label className="grid gap-2">
          <span className="pg-field-label">Memo / Reason</span>
          <textarea
            className="pg-input min-h-[92px] resize-none p-4"
            onChange={(event) => onDraftChange({ ...draft, memo: event.target.value })}
            placeholder="Enter transaction details..."
            value={draft.memo}
          />
        </label>
      </form>
    </section>
  );
}

function formatWallet(walletAddress: string) {
  if (walletAddress.length <= 14) {
    return walletAddress;
  }

  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`;
}

function FieldError({ children }: { children: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold leading-5 text-[#9f1239] dark:text-rose-300">
      <span className="material-symbols-outlined text-sm">error</span>
      {children}
    </span>
  );
}

interface UploadCardProps {
  onFileSelected: (file: File | null) => void;
}

function UploadCard({ onFileSelected }: UploadCardProps) {
  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    onFileSelected(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    onFileSelected(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <label
      className="group flex min-h-[118px] cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed border-[#c6c6cc] bg-[#f1f4f6] p-4 transition-colors hover:border-[#006c49] dark:border-white/15 dark:bg-white/[0.04] dark:hover:border-[#6ffbbe]"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        accept="image/png,image/jpeg,image/jpg"
        className="sr-only"
        onChange={handleInputChange}
        type="file"
      />
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#76777c] transition-colors group-hover:bg-[#6cf8bb]/20 group-hover:text-[#006c49] dark:bg-white/10 dark:text-slate-400 dark:group-hover:text-[#6ffbbe]">
        <span className="material-symbols-outlined text-2xl">cloud_upload</span>
      </div>
      <div>
        <h3 className="mb-1 font-['Manrope'] text-base font-bold text-[#030813] dark:text-white">
          Upload Invoice or Screenshot
        </h3>
        <p className="text-sm leading-5 text-[#45474c] dark:text-slate-400">
          Drag and drop files here, or{" "}
          <span className="font-semibold text-[#030813] underline dark:text-white">
            browse
          </span>
          . PNG or JPG up to 10MB.
        </p>
      </div>
    </label>
  );
}

interface DocumentPreviewCardProps {
  document: UploadedDocument | null;
}

function DocumentPreviewCard({ document }: DocumentPreviewCardProps) {
  return (
    <section className="flex min-h-[360px] flex-1 flex-col rounded-2xl border border-[#e5e9eb] bg-white p-4 shadow-[0_4px_20px_rgba(26,32,44,0.05)] dark:border-white/10 dark:bg-[#111827]">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="font-['Manrope'] text-base font-bold text-[#030813] dark:text-white">
          Document Preview
        </h2>
        <span className="flex items-center gap-1 rounded-full bg-[#f1f4f6] px-3 py-1 text-xs font-semibold text-[#45474c] dark:bg-white/10 dark:text-slate-300">
          <span className="material-symbols-outlined text-sm">visibility_off</span>
          Local Only
        </span>
      </div>

      <div className="relative flex min-h-[300px] flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border border-[#e5e9eb] bg-[#f1f4f6] p-4 dark:border-white/10 dark:bg-white/[0.04]">
        {document?.previewUrl ? (
          <>
            <img
              alt={document.name}
              className="max-h-[260px] w-full rounded-lg object-contain"
              src={document.previewUrl}
            />
            <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-white/70 bg-white/85 px-3 py-2 text-xs text-[#45474c] shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#0f172a]/85 dark:text-slate-300">
              {document.name}
            </div>
          </>
        ) : document ? (
          <div className="flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined mb-2 text-4xl text-[#76777c] dark:text-slate-400">
              description
            </span>
            <p className="max-w-[320px] text-sm font-semibold text-[#030813] dark:text-white">
              {document.name}
            </p>
            <p className="mt-1 max-w-[320px] text-xs text-[#45474c] dark:text-slate-400">
              Preview is available for images. This file is ready for local QVAC intake.
            </p>
          </div>
        ) : (
          <>
            <div className="absolute inset-5 rounded-xl border border-[#c6c6cc]/50 bg-white/50 dark:border-white/10 dark:bg-white/[0.03]" />
            <div className="absolute left-12 right-12 top-16 h-2 rounded-full bg-[#c6c6cc]/60 dark:bg-white/10" />
            <div className="absolute left-12 right-24 top-24 h-2 rounded-full bg-[#c6c6cc]/40 dark:bg-white/10" />
            <div className="absolute left-12 right-16 top-40 grid grid-cols-3 gap-3">
              <span className="h-16 rounded-lg bg-[#e5e9eb] dark:bg-white/10" />
              <span className="h-16 rounded-lg bg-[#e5e9eb] dark:bg-white/10" />
              <span className="h-16 rounded-lg bg-[#e5e9eb] dark:bg-white/10" />
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-[2px] dark:bg-[#111827]/60">
              <span className="material-symbols-outlined mb-2 text-4xl text-[#76777c] dark:text-slate-400">
                find_in_page
              </span>
              <p className="max-w-[320px] px-6 text-center text-sm leading-6 text-[#45474c] dark:text-slate-400">
                Upload a document to preview and analyze it automatically.
              </p>
            </div>
          </>
        )}
      </div>

    </section>
  );
}

interface PaymentActionPanelProps {
  buttonLabel: string;
  error: string | null;
  icon: string;
  isRunning: boolean;
  onSubmit: () => void;
  runningLabel: string;
  validationErrors: PaymentValidationErrors;
}

function PaymentActionPanel({
  buttonLabel,
  error,
  icon,
  isRunning,
  onSubmit,
  runningLabel,
  validationErrors
}: PaymentActionPanelProps) {
  const validationMessages = Object.values(validationErrors);

  return (
    <div className="mt-auto flex flex-col gap-2 pt-1">
      <button
        className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#1a202c] px-6 py-3 font-['Manrope'] text-base font-bold text-white shadow-lg shadow-[#1a202c]/20 transition-colors hover:bg-[#030813] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[#6ffbbe] dark:text-[#002113] dark:shadow-[#6ffbbe]/10 dark:hover:bg-[#4edea3]"
        disabled={isRunning}
        onClick={onSubmit}
        type="button"
      >
        <span
          className={`material-symbols-outlined ${
            isRunning ? "pg-spinner" : "transition-transform group-hover:rotate-12"
          }`}
        >
          {isRunning ? "progress_activity" : icon}
        </span>
        {isRunning ? runningLabel : buttonLabel}
      </button>
      {error ? (
        <p className="text-center text-xs leading-5 text-[#9f1239] dark:text-rose-300">
          {error}
        </p>
      ) : null}
      {validationMessages.length ? (
        <ul className="m-0 grid gap-1 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs leading-5 text-[#9f1239] dark:border-rose-300/15 dark:bg-rose-300/10 dark:text-rose-300">
          {validationMessages.map((message) => (
            <li className="flex items-start gap-2" key={message}>
              <span className="material-symbols-outlined mt-0.5 text-sm">error</span>
              <span>{message}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="flex items-center justify-center gap-2 text-center text-xs text-[#45474c] dark:text-slate-400">
        <span className="material-symbols-outlined text-[14px] text-[#006c49] dark:text-[#6ffbbe]">
          lock
        </span>
        All analysis runs locally with QVAC - privacy protected
      </p>
    </div>
  );
}
