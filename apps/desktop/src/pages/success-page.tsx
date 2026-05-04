interface SuccessPageProps {
  onNewPayment: () => void;
}

const receiptDetails = [
  {
    label: "Security Verdict",
    value: "Safe",
    meta: ["Known recipient match", "Verified invoice hash"]
  },
  {
    label: "Timestamp",
    value: "Oct 24, 2024 - 14:32:10 UTC"
  },
  {
    label: "Payment Mode",
    value: "Guarded Payment",
    tag: "Escrow"
  },
  {
    label: "Document Hash",
    value:
      "SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    mono: true
  }
] as const;

export function SuccessPage({ onNewPayment }: SuccessPageProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7fafc] px-6 py-5 dark:bg-[#0f172a]">
      <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-[#1a202c] via-[#6cf8bb] to-[#1a202c]" />

      <section className="flex w-full max-w-[620px] flex-col items-center gap-3">
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
                0x82f...a1b2
              </button>
            </p>
          </div>
        </header>

        <article className="relative w-full overflow-hidden rounded-2xl border border-[#e0e3e5] bg-white p-4 shadow-[0_4px_20px_rgba(26,32,44,0.05)] dark:border-white/10 dark:bg-[#111827]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#ebeef0] opacity-50 blur-3xl dark:bg-white/10" />

          <section className="relative z-10 flex flex-col items-center gap-1.5 border-b border-[#e0e3e5] pb-4 text-center dark:border-white/10">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#45474c] dark:text-slate-400">
              Amount Sent
            </span>
            <div className="flex items-baseline gap-2 font-['Manrope'] text-[28px] font-bold leading-tight text-[#181c1e] dark:text-white">
              2,450.00
              <span className="text-lg font-medium text-[#45474c] dark:text-slate-400">
                USDT
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className="text-[#45474c] dark:text-slate-400">To:</span>
              <span className="flex items-center gap-2 rounded-full bg-[#ebeef0] px-3 py-1.5 text-[#181c1e] dark:bg-white/10 dark:text-white">
                <strong>Alpha Cloud Services</strong>
                <span className="text-[#45474c] dark:text-slate-400">
                  (0x71C...3921)
                </span>
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#006c49] text-white">
                  <span className="material-symbols-outlined text-[12px] [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">
                    check
                  </span>
                </span>
              </span>
            </div>
          </section>

          <section className="relative z-10 grid grid-cols-2 gap-x-5 gap-y-3 pt-4 max-md:grid-cols-1">
            {receiptDetails.map((detail) => (
              <ReceiptDetail key={detail.label} {...detail} />
            ))}
          </section>
        </article>

        <section className="mt-1 flex w-full flex-wrap items-center justify-center gap-2.5">
          <button
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#1a202c] bg-transparent px-4 py-2 text-sm font-semibold text-[#1a202c] transition-colors hover:bg-[#ebeef0] dark:border-white dark:text-white dark:hover:bg-white/10"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">
              volume_up
            </span>
            Listen to Receipt Summary
          </button>
          <button
            className="flex items-center justify-center gap-2 rounded-xl bg-[#006c49] px-5 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#005236] dark:bg-[#6ffbbe] dark:text-[#002113] dark:hover:bg-[#4edea3]"
            onClick={onNewPayment}
            type="button"
          >
            New Payment
            <span className="material-symbols-outlined text-[20px]">
              arrow_forward
            </span>
          </button>
        </section>

        <button
          className="text-xs font-semibold text-[#006c49] underline decoration-[#006c49]/30 underline-offset-4 transition-colors hover:text-[#005236] dark:text-[#6ffbbe]"
          type="button"
        >
          View in Explorer
        </button>
      </section>
    </main>
  );
}

interface ReceiptDetailProps {
  label: string;
  meta?: readonly string[];
  mono?: boolean;
  tag?: string;
  value: string;
}

function ReceiptDetail({ label, meta, mono, tag, value }: ReceiptDetailProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#45474c] dark:text-slate-400">
        {label}
      </span>

      {label === "Security Verdict" ? (
        <div className="flex flex-wrap items-start gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6cf8bb]/40 bg-[#6cf8bb]/20 px-2.5 py-1 text-xs font-semibold text-[#00714d] dark:text-[#6ffbbe]">
            <span className="material-symbols-outlined text-[14px]">shield</span>
            {value}
          </span>
          <ul className="grid gap-0.5">
            {meta?.map((item) => (
              <li
                className="flex items-center gap-1 text-[11px] text-[#45474c] dark:text-slate-400"
                key={item}
              >
                <span className="material-symbols-outlined text-[14px] text-[#006c49] dark:text-[#6ffbbe]">
                  check
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : label === "Payment Mode" ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#181c1e] dark:text-white">{value}</span>
          {tag ? (
            <span className="rounded bg-[#ebeef0] px-2 py-0.5 text-[11px] text-[#45474c] dark:bg-white/10 dark:text-slate-400">
              {tag}
            </span>
          ) : null}
        </div>
      ) : (
        <span
          className={
            mono
              ? "truncate rounded border border-[#e0e3e5] bg-[#f1f4f6] p-1.5 font-mono text-[11px] text-[#76777c] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
              : "text-xs text-[#181c1e] dark:text-white"
          }
        >
          {value}
        </span>
      )}
    </div>
  );
}
