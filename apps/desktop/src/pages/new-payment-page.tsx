import { useEffect, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import type { PaymentEntryMode } from "../App";

interface NewPaymentPageProps {
  entryMode: PaymentEntryMode;
  onAnalyze: () => void;
  onBack: () => void;
}

const pastRecipients = [
  {
    label: "Alpha Solutions",
    wallet: "0xA17...82F9"
  },
  {
    label: "Cloud Services",
    wallet: "0x71C...3921"
  },
  {
    label: "Hardware Inc",
    wallet: "0xB28...10AC"
  }
] as const;

export function NewPaymentPage({
  entryMode,
  onAnalyze,
  onBack
}: NewPaymentPageProps) {
  const showVoiceCard = entryMode === "voice";
  const [uploadedDocument, setUploadedDocument] = useState<{
    name: string;
    previewUrl: string | null;
    type: string;
  } | null>(null);

  function handleDocumentFile(file: File | null) {
    if (!file) {
      return;
    }

    setUploadedDocument((currentDocument) => {
      if (currentDocument?.previewUrl) {
        URL.revokeObjectURL(currentDocument.previewUrl);
      }

      return {
        name: file.name,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
        type: file.type || "Unknown file"
      };
    });
  }

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
            {showVoiceCard ? <VoicePaymentCard /> : null}
            <ManualEntryCard />
          </div>

          <aside className="col-span-5 flex min-h-full flex-col gap-3 max-lg:col-span-1">
            <UploadCard onFileSelected={handleDocumentFile} />
            <DocumentPreviewCard document={uploadedDocument} />
            <AnalyzePanel onAnalyze={onAnalyze} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function VoicePaymentCard() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#e5e9eb] bg-white p-5 shadow-[0_4px_20px_rgba(26,32,44,0.05)] dark:border-white/10 dark:bg-[#111827]">
      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#6cf8bb] to-[#006c49]" />
      <h2 className="mb-4 flex items-center gap-2 font-['Manrope'] text-lg font-bold text-[#030813] dark:text-white">
        <span className="material-symbols-outlined text-[#006c49] dark:text-[#6ffbbe]">
          mic
        </span>
        Speak Payment Request
      </h2>

      <div className="flex flex-col items-center justify-center py-3">
        <button
          className="group relative mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1a202c] text-white shadow-lg transition-transform hover:scale-105 dark:bg-[#6ffbbe] dark:text-[#002113]"
          type="button"
          aria-label="Record payment request"
        >
          <span className="material-symbols-outlined text-3xl">mic</span>
          <span className="absolute inset-0 rounded-full border-2 border-[#6cf8bb] opacity-0 group-hover:animate-ping" />
        </button>
        <p className="max-w-md text-center text-sm leading-6 text-[#45474c] dark:text-slate-400">
          "Send 500 USDT to Alpha Solutions for Q3 Server Maintenance."
        </p>

        <div className="mt-6 flex h-8 items-center justify-center gap-1 opacity-60">
          {[8, 16, 24, 12, 32, 20, 8].map((height, index) => (
            <span
              className="w-1 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]"
              key={`${height}-${index}`}
              style={{ height }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ManualEntryCard() {
  const [selectedRecipientWallet, setSelectedRecipientWallet] = useState("");
  const [walletAddress, setWalletAddress] = useState("");

  function selectPastRecipient(wallet: string) {
    setSelectedRecipientWallet(wallet);
    setWalletAddress(wallet);
  }

  function updateWalletAddress(value: string) {
    setWalletAddress(value);

    if (value !== selectedRecipientWallet) {
      setSelectedRecipientWallet("");
    }
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
              value={selectedRecipientWallet}
            >
              <option value="">Choose a saved recipient</option>
              {pastRecipients.map((recipient) => (
                <option key={recipient.wallet} value={recipient.wallet}>
                  {recipient.label} - {recipient.wallet}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#76777c]">
              expand_more
            </span>
          </span>
          <span className="text-xs text-[#45474c] dark:text-slate-400">
            Select a known recipient or paste a new wallet below.
          </span>
        </label>

        <label className="grid gap-2">
          <span className="pg-field-label">Recipient Wallet Address</span>
          <span className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#76777c]">
              account_balance_wallet
            </span>
            <input
              className="pg-input pl-[60px]"
              onChange={(event) => updateWalletAddress(event.target.value)}
              placeholder="0x..."
              type="text"
              value={walletAddress}
            />
          </span>
        </label>

        <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
          <label className="col-span-2 grid gap-2 max-sm:col-span-1">
            <span className="pg-field-label">Amount</span>
            <span className="relative">
              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 font-['Manrope'] text-[#76777c]">
                $
              </span>
              <input className="pg-input pl-[56px]" placeholder="0.00" type="number" />
            </span>
          </label>

          <label className="grid gap-2">
            <span className="pg-field-label">Token</span>
            <span className="relative">
              <select className="pg-input appearance-none pr-10">
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
                <option value="DAI">DAI</option>
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#76777c]">
                expand_more
              </span>
            </span>
          </label>
        </div>

        <label className="grid gap-2">
          <span className="pg-field-label">Memo / Reason</span>
          <textarea
            className="pg-input min-h-[92px] resize-none p-4"
            placeholder="Enter transaction details..."
          />
        </label>
      </form>
    </section>
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
        accept="image/png,image/jpeg,image/jpg,application/pdf"
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
          . PNG, JPG, PDF up to 10MB.
        </p>
      </div>
    </label>
  );
}

interface DocumentPreviewCardProps {
  document: {
    name: string;
    previewUrl: string | null;
    type: string;
  } | null;
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

      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border border-[#e5e9eb] bg-[#f1f4f6] p-4 dark:border-white/10 dark:bg-white/[0.04]">
        {document?.previewUrl ? (
          <>
            <img
              alt={document.name}
              className="max-h-[320px] w-full rounded-lg object-contain"
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

interface AnalyzePanelProps {
  onAnalyze: () => void;
}

function AnalyzePanel({ onAnalyze }: AnalyzePanelProps) {
  return (
    <div className="mt-auto flex flex-col gap-2 pt-1">
      <button
        className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#1a202c] px-6 py-3 font-['Manrope'] text-base font-bold text-white shadow-lg shadow-[#1a202c]/20 transition-colors hover:bg-[#030813] dark:bg-[#6ffbbe] dark:text-[#002113] dark:shadow-[#6ffbbe]/10 dark:hover:bg-[#4edea3]"
        onClick={onAnalyze}
        type="button"
      >
        <span className="material-symbols-outlined transition-transform group-hover:rotate-12">
          analytics
        </span>
        Analyze with QVAC
      </button>
      <p className="flex items-center justify-center gap-2 text-center text-xs text-[#45474c] dark:text-slate-400">
        <span className="material-symbols-outlined text-[14px] text-[#006c49] dark:text-[#6ffbbe]">
          lock
        </span>
        All analysis runs locally with QVAC - privacy protected
      </p>
    </div>
  );
}
