export function WaitlistNotice() {
  return (
    <section className="rounded-[28px] border border-emerald-400/14 bg-[linear-gradient(135deg,rgba(17,184,125,0.12),rgba(13,22,38,0.38))] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Phase one
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Desktop shell first, product systems next.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
            This shell is intentionally focused on structure: navigation,
            workspace modules, and clear placeholders for the real PayGuard
            flows. It gives us a solid surface to plan and implement against
            without locking us into rushed UI decisions later.
          </p>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-slate-950/50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Current focus
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            App shell and module boundaries
          </p>
        </div>
      </div>
    </section>
  );
}
