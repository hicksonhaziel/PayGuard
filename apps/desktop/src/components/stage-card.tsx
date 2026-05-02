export function StageCard({
  eyebrow,
  title,
  body,
  accent
}: {
  eyebrow: string;
  title: string;
  body: string;
  accent: "emerald" | "cyan" | "slate";
}) {
  const accentClass = {
    emerald:
      "border-emerald-400/18 bg-emerald-400/8 text-emerald-200",
    cyan: "border-cyan-400/18 bg-cyan-400/8 text-cyan-200",
    slate: "border-slate-400/18 bg-slate-400/8 text-slate-200"
  }[accent];

  return (
    <article className="rounded-[28px] border border-white/8 bg-slate-900/65 p-5">
      <span
        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${accentClass}`}
      >
        {eyebrow}
      </span>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-white">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
    </article>
  );
}
