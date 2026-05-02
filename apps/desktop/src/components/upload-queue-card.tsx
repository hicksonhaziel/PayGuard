const uploads = [
  {
    title: "invoice-apex-freight.pdf",
    meta: "Reserved for OCR extraction panel"
  },
  {
    title: "telegram-wallet-change.png",
    meta: "Reserved for screenshot review panel"
  },
  {
    title: "manual-payment-request",
    meta: "Reserved for non-document entry flow"
  }
] as const;

export function UploadQueueCard() {
  return (
    <section className="rounded-[28px] border border-white/8 bg-slate-900/70 p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
        Document intake
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
        Upload queue and extraction rail
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        This side module will hold files, OCR output, and extracted payment
        fields. For now it gives the shell a realistic destination for the next
        implementation pass.
      </p>

      <div className="mt-6 rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] px-5 py-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/12 text-emerald-200">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 16V6m0 0-4 4m4-4 4 4M5 18h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-base font-semibold text-white">
          Drop invoice or screenshot files here
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          This is a shell placeholder. Real drag-and-drop wiring comes next.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {uploads.map((upload) => (
          <div
            key={upload.title}
            className="rounded-[22px] border border-white/8 bg-slate-950/65 px-4 py-4"
          >
            <h3 className="text-sm font-semibold text-white">{upload.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">{upload.meta}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
