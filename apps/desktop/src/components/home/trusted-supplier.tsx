interface TrustedSupplierProps {
  icon: string;
  lastActivity: string;
  name: string;
}

export function TrustedSupplier({ icon, lastActivity, name }: TrustedSupplierProps) {
  return (
    <button className="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-transparent bg-transparent p-3 text-left text-[#181c1e] transition-colors hover:border-[#c6c6cc]/30 hover:bg-[#f1f4f6] dark:text-white dark:hover:border-white/10 dark:hover:bg-white/5" type="button">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ebeef0] text-[#006c49] dark:bg-white/10 dark:text-[#6ffbbe]">
        <span className="material-symbols-outlined text-lg">{icon}</span>
      </span>
      <span className="grid min-w-0 flex-1">
        <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-[#181c1e] dark:text-white">
          {name}
        </strong>
        <small className="text-[10px] text-[#45474c] dark:text-slate-400">
          Last activity: {lastActivity}
        </small>
      </span>
      <span className="material-symbols-outlined text-lg text-[#76777c] dark:text-slate-500">
        more_vert
      </span>
    </button>
  );
}
