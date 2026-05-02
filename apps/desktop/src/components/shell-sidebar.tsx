const navSections = [
  {
    title: "Workspace",
    items: [
      { label: "Overview", active: true },
      { label: "Payment reviews" },
      { label: "Guarded payments" }
    ]
  },
  {
    title: "Local data",
    items: [
      { label: "Trusted recipients" },
      { label: "Receipts" },
      { label: "Settings" }
    ]
  }
] as const;

export function ShellSidebar({ logo }: { logo: string }) {
  return (
    <aside className="flex min-h-0 flex-col rounded-[34px] border border-white/8 bg-slate-950/70 p-5 shadow-[0_30px_120px_rgba(2,6,23,0.35)] backdrop-blur-xl">
      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
        <img src={logo} alt="PayGuard" className="h-auto w-[206px]" />
        <p className="mt-4 text-sm leading-6 text-slate-300">
          Local-first payment review for stablecoin transfers, invoices, and
          risky recipient changes.
        </p>
      </div>

      <div className="mt-6 flex-1 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              {section.title}
            </p>
            <div className="mt-3 space-y-2">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition-colors ${
                    item.active
                      ? "bg-emerald-400 text-slate-950"
                      : "bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      item.active ? "bg-slate-950" : "bg-slate-500"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-400/10 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
          Shell status
        </p>
        <h2 className="mt-3 text-lg font-semibold text-white">
          Ready for product wiring
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          The layout and module boundaries are in place so we can plug in OCR,
          risk review, trusted recipients, and Solana actions next.
        </p>
      </div>
    </aside>
  );
}
