import { useMemo } from "react";
import type { AnalysisStepKey } from "../App";

interface AnalyzeStatePageProps {
  activeStepKey: AnalysisStepKey;
  error: string | null;
  hasDocument: boolean;
  onBack: () => void;
}

const manualAnalysisSteps = [
  { key: "rag", label: "Loading local trusted recipient data..." },
  { key: "llm", label: "Performing risk analysis with local LLM..." },
  { key: "explanation", label: "Generating explanation..." }
] as const;
const documentAnalysisSteps = [
  { key: "ocr", label: "Running QVAC OCR on document..." },
  ...manualAnalysisSteps
] as const;

export function AnalyzeStatePage({
  activeStepKey,
  error,
  hasDocument,
  onBack
}: AnalyzeStatePageProps) {
  const analysisSteps = useMemo(
    () => (hasDocument ? documentAnalysisSteps : manualAnalysisSteps),
    [hasDocument]
  );
  const activeStepIndex = Math.max(
    analysisSteps.findIndex((step) => step.key === activeStepKey),
    0
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f7fafc] px-6 py-10 dark:bg-[#0f172a]">
      <section className="flex w-full max-w-xl flex-col items-center">
        <div className="relative mb-4 flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 scale-110 rounded-full border-4 border-[#006c49]/20 pg-pulse-ring" />
          <div className="absolute inset-0 rounded-full border-2 border-[#006c49]/40 pg-pulse-ring pg-pulse-ring--delay" />
          <div className="absolute inset-0 scale-90 rounded-full border border-[#006c49]/60 dark:border-[#6ffbbe]/60" />

          <div className="relative z-10 rounded-full bg-white p-4 shadow-[0_4px_20px_rgba(26,32,44,0.05)] dark:bg-[#111827]">
            <span className="material-symbols-outlined text-[36px] text-[#006c49] dark:text-[#6ffbbe] [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">
              shield
            </span>
          </div>
        </div>

        <h1 className="mb-7 text-center font-['Manrope'] text-[30px] font-bold leading-tight text-[#1a202c] dark:text-white max-md:text-[26px]">
          Analyzing Payment Securely
        </h1>

        <div className="w-full rounded-2xl border border-[#e0e3e5]/70 bg-white p-4 shadow-[0_4px_20px_rgba(26,32,44,0.05)] dark:border-white/10 dark:bg-[#111827]">
          <ul className="flex flex-col gap-2">
            {analysisSteps.map((step, index) => {
              const state =
                error && index === activeStepIndex
                  ? "error"
                  : index < activeStepIndex
                    ? "complete"
                    : index === activeStepIndex
                      ? "active"
                      : "pending";

              return (
              <li
                className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
                  state === "active"
                    ? "border border-[#e0e3e5] bg-[#f1f4f6] dark:border-white/10 dark:bg-white/[0.05]"
                    : state === "pending"
                      ? "opacity-55"
                      : "hover:bg-[#f1f4f6] dark:hover:bg-white/[0.04]"
                }`}
                key={step.key}
              >
                {state === "active" ? (
                  <span className="h-7 w-7 shrink-0 rounded-full border-2 border-[#006c49]/30 border-t-[#006c49] pg-spinner dark:border-[#6ffbbe]/30 dark:border-t-[#6ffbbe]" />
                ) : state === "error" ? (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/15">
                    <span className="material-symbols-outlined text-sm text-[#9f1239] dark:text-rose-300 [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">
                      error
                    </span>
                  </span>
                ) : state === "pending" ? (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#c6c6cc] dark:border-white/15">
                    <span className="h-2 w-2 rounded-full bg-[#76777c] dark:bg-slate-500" />
                  </span>
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#006c49]/10">
                    <span className="material-symbols-outlined text-sm text-[#006c49] dark:text-[#6ffbbe] [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">
                      check_circle
                    </span>
                  </span>
                )}

                <span
                  className={`text-sm leading-6 ${
                    state === "active"
                      ? "font-semibold text-[#1a202c] dark:text-white"
                      : state === "error"
                        ? "font-semibold text-[#9f1239] dark:text-rose-300"
                        : "text-[#181c1e] dark:text-slate-300"
                  }`}
                >
                  {step.label}
                </span>
              </li>
              );
            })}
          </ul>
        </div>
        {error ? (
          <div className="mt-4 w-full rounded-2xl border border-rose-100 bg-rose-50 p-4 text-center dark:border-rose-300/15 dark:bg-rose-300/10">
            <p className="text-sm font-semibold leading-6 text-[#9f1239] dark:text-rose-300">
              {error}
            </p>
            <button
              className="mt-3 rounded-xl border-2 border-[#030813] bg-transparent px-5 py-2 text-sm font-semibold text-[#030813] transition-colors hover:bg-[#ebeef0] dark:border-white dark:text-white dark:hover:bg-white/10"
              onClick={onBack}
              type="button"
            >
              Back to payment
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
