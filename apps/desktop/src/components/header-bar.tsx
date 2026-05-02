export function HeaderBar() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
          Desktop shell
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          PayGuard workspace
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/[0.08]">
          Demo mode
        </button>
        <button className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-300">
          New review
        </button>
      </div>
    </header>
  );
}
