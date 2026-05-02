const stats = [
  {
    label: "Primary mode",
    value: "Desktop-first"
  },
  {
    label: "Next build area",
    value: "Payment review flow"
  },
  {
    label: "Local engine",
    value: "QVAC shell ready"
  }
] as const;

export function QuickStats() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <article
          key={stat.label}
          className="rounded-[24px] border border-white/8 bg-slate-900/60 px-5 py-5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            {stat.label}
          </p>
          <p className="mt-3 text-xl font-semibold tracking-tight text-white">
            {stat.value}
          </p>
        </article>
      ))}
    </div>
  );
}
