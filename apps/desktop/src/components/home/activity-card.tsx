interface ActivityCardProps {
  amount: string;
  action: string;
  date: string;
  icon: string;
  id: string;
  status: "Verified" | "Needs Review";
  title: string;
}

export function ActivityCard({
  amount,
  action,
  date,
  icon,
  id,
  status,
  title
}: ActivityCardProps) {
  const needsReview = status === "Needs Review";

  return (
    <article className="rounded-xl border border-[#c6c6cc]/30 bg-white p-6 transition duration-150 hover:-translate-y-px hover:shadow-[0_10px_30px_rgba(26,32,44,0.08)] dark:border-white/10 dark:bg-[#111827] dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
      <div className="mb-[18px] flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            needsReview
              ? "bg-amber-50 text-amber-600"
              : "bg-[#ebeef0] text-[#006c49] dark:bg-white/10 dark:text-[#6ffbbe]"
          }`}
        >
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.05em] ${
            needsReview
              ? "bg-amber-100 text-amber-700"
              : "bg-[#006c49]/10 text-[#006c49]"
          }`}
        >
          {status}
        </span>
      </div>

      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.05em] text-[#45474c] dark:text-slate-400">
        {date}
      </p>
      <h3 className="m-0 text-xl font-extrabold leading-tight text-[#030813] dark:text-white">
        {amount}
      </h3>
      <p className="mt-1 text-xs leading-normal text-[#45474c] dark:text-slate-400">
        {title}
      </p>

      <div className="mt-[18px] flex items-center justify-between border-t border-[#c6c6cc]/20 pt-4 text-[10px] text-[#45474c] dark:border-white/10 dark:text-slate-400">
        <span>ID: {id}</span>
        <button className={needsReview ? "pg-text-button text-amber-600" : "pg-text-button"} type="button">
          {action}
        </button>
      </div>
    </article>
  );
}
