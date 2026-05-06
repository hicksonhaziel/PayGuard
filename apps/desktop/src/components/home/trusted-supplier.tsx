import { useEffect, useRef, useState } from "react";

interface TrustedSupplierProps {
  icon: string;
  lastActivity: string;
  name: string;
  onStartPayment: () => void;
  onViewDetails: () => void;
  walletAddress: string;
}

export function TrustedSupplier({
  icon,
  lastActivity,
  name,
  onStartPayment,
  onViewDetails,
  walletAddress
}: TrustedSupplierProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  async function copyWallet() {
    await navigator.clipboard.writeText(walletAddress);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  function startPayment() {
    setIsOpen(false);
    onStartPayment();
  }

  function viewDetails() {
    setIsOpen(false);
    onViewDetails();
  }

  return (
    <div
      className="relative flex min-h-[68px] w-full min-w-0 items-center gap-3 rounded-lg border border-transparent bg-transparent px-3.5 py-3 text-left text-[#181c1e] transition-colors hover:border-[#c6c6cc]/30 hover:bg-[#f1f4f6] dark:text-white dark:hover:border-white/10 dark:hover:bg-white/5"
      ref={menuRef}
    >
      <button
        className="flex min-w-0 flex-1 items-center gap-3 border-0 bg-transparent p-0 text-left"
        onClick={startPayment}
        type="button"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ebeef0] text-[#006c49] dark:bg-white/10 dark:text-[#6ffbbe]">
          <span className="material-symbols-outlined text-[21px]">{icon}</span>
        </span>
        <span className="grid min-w-0 flex-1">
          <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-bold leading-5 text-[#181c1e] dark:text-white">
            {name}
          </strong>
          <small className="text-[11px] leading-4 text-[#45474c] dark:text-slate-400">
            Last activity: {lastActivity}
          </small>
        </span>
      </button>
      <button
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-[#76777c] transition-colors hover:bg-white hover:text-[#030813] dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
        aria-label={`Actions for ${name}`}
      >
        <span className="material-symbols-outlined text-[20px]">more_vert</span>
      </button>

      {isOpen ? (
        <div className="absolute right-2 top-[calc(100%+6px)] z-30 w-40 overflow-hidden rounded-lg border border-[#e5e9eb] bg-white p-1 shadow-[0_12px_34px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#111827]">
          <button
            className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-left text-[11px] font-semibold leading-4 text-[#030813] transition-colors hover:bg-[#f1f4f6] dark:text-white dark:hover:bg-white/10"
            onClick={startPayment}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px] text-[#006c49] dark:text-[#6ffbbe]">
              send
            </span>
            New Payment
          </button>
          <button
            className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-left text-[11px] font-semibold leading-4 text-[#030813] transition-colors hover:bg-[#f1f4f6] dark:text-white dark:hover:bg-white/10"
            onClick={copyWallet}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px] text-[#006c49] dark:text-[#6ffbbe]">
              {copyState === "copied" ? "check" : "content_copy"}
            </span>
            {copyState === "copied" ? "Copied" : "Copy Wallet"}
          </button>
          <button
            className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-left text-[11px] font-semibold leading-4 text-[#030813] transition-colors hover:bg-[#f1f4f6] dark:text-white dark:hover:bg-white/10"
            onClick={viewDetails}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px] text-[#006c49] dark:text-[#6ffbbe]">
              manage_search
            </span>
            View Details
          </button>
        </div>
      ) : null}
    </div>
  );
}
