import { ActivityCard } from "../components/home/activity-card";
import { TrustedSupplier } from "../components/home/trusted-supplier";
import type { PaymentEntryMode } from "../App";

const recentActivity = [
  {
    amount: "2,500.00 USDC",
    date: "Oct 14, 2023",
    icon: "description",
    id: "#PG-9281",
    status: "Verified",
    title: "Acme Corp - Cloud Infrastructure",
    action: "Details"
  },
  {
    amount: "12,400.00 USDC",
    date: "Oct 12, 2023",
    icon: "shopping_bag",
    id: "#PG-9275",
    status: "Verified",
    title: "Hardware Inc - Workstations",
    action: "Details"
  },
  {
    amount: "850.00 USDC",
    date: "Oct 10, 2023",
    icon: "priority_high",
    id: "#PG-9269",
    status: "Needs Review",
    title: "Unknown Vendor - Miscellaneous",
    action: "Resolve"
  }
] as const;

const trustedRecipients = [
  { icon: "cloud", lastActivity: "Oct 05", name: "Cloud Services" },
  { icon: "memory", lastActivity: "Sep 28", name: "Hardware Inc" },
  { icon: "brush", lastActivity: "Sep 15", name: "Creative Studio" },
  { icon: "business", lastActivity: "Aug 30", name: "Office Rentals" }
] as const;

interface HomePageProps {
  onStartPayment: (mode: PaymentEntryMode) => void;
}

export function HomePage({ onStartPayment }: HomePageProps) {
  return (
    <>
      <main className="min-h-[calc(100vh-64px)] bg-[radial-gradient(at_0%_0%,rgba(16,185,129,0.05)_0,transparent_50%),radial-gradient(at_100%_0%,rgba(26,32,44,0.03)_0,transparent_50%),#f7fafc] dark:bg-[radial-gradient(at_0%_0%,rgba(111,251,190,0.08)_0,transparent_45%),radial-gradient(at_100%_0%,rgba(148,163,184,0.08)_0,transparent_45%),#0f172a]">
        <div className="mx-auto max-w-[1200px] px-8 pb-20 pt-9 max-lg:px-5">
          <section className="mb-12 flex items-center justify-between gap-6 max-md:flex-col max-md:items-start">
            <div>
              <h1 className="m-0 font-['Manrope'] text-[32px] font-bold leading-[1.3] text-[#030813] dark:text-white">
                Welcome back
              </h1>
              <p className="mt-1 text-sm leading-normal text-[#45474c] dark:text-slate-400">
                Financial integrity shielded by local-first encryption.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 max-md:w-full max-md:justify-start">
              <button
                className="pg-button bg-[#030813] text-white hover:bg-[#1a202c] dark:bg-[#6ffbbe] dark:text-[#002113] dark:hover:bg-[#4edea3]"
                onClick={() => onStartPayment("manual")}
                type="button"
              >
                <span className="material-symbols-outlined">add</span>
                New Payment
              </button>
              <button
                className="pg-button border border-[#c6c6cc] bg-white text-[#181c1e] hover:bg-[#f1f4f6] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                onClick={() => onStartPayment("voice")}
                type="button"
              >
                <span className="material-symbols-outlined">mic</span>
                Voice / Manual
              </button>
            </div>
          </section>

          <section className="mb-12">
            <div className="mb-6 flex items-center justify-between max-md:flex-col max-md:items-start max-md:gap-3">
              <h2 className="m-0 flex items-center gap-3 text-xl font-extrabold leading-tight text-[#030813] dark:text-white">
                Recent Activity
                <span className="rounded-md bg-[#6cf8bb] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.05em] text-[#00714d]">
                  3 Pending
                </span>
              </h2>
              <button className="pg-text-button" type="button">
                View more
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-1">
              {recentActivity.map((activity) => (
                <ActivityCard key={activity.id} {...activity} />
              ))}
            </div>
          </section>

          <section>
            <div>
              <h2 className="mb-4 text-lg font-extrabold text-[#030813] dark:text-white">
                Trusted Recipients
              </h2>
              <div className="grid grid-cols-4 gap-2 max-lg:grid-cols-2 max-md:grid-cols-1">
                {trustedRecipients.map((recipient) => (
                  <TrustedSupplier key={recipient.name} {...recipient} />
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
