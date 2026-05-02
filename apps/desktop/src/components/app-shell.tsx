import banner from "../../assets/payguardbanner.png";

const navItems = ["Overview", "Reviews", "Recipients", "Receipts", "Settings"] as const;
const workAreas = [
  "Payment request",
  "Document upload",
  "Risk verdict",
  "Payment action"
] as const;

export function AppShell() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(17,184,125,0.12),_transparent_24%),linear-gradient(180deg,_#f8fbfc_0%,_#f2f7f6_45%,_#edf4f2_100%)] p-5 text-[#181c1e]">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-[1450px] grid-cols-[240px_minmax(0,1fr)] gap-5">
        <aside className="rounded-[30px] border border-slate-200/70 bg-white/80 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.06)] backdrop-blur">
          <img src={banner} alt="PayGuard" className="h-auto w-[190px]" />
          <div className="mt-8 space-y-2">
            {navItems.map((item, index) => (
              <button
                key={item}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition-colors ${
                  index === 0
                    ? "bg-[#1a202c] text-white"
                    : "text-[#45556c] hover:bg-slate-100"
                }`}
              >
                <span>{item}</span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    index === 0 ? "bg-emerald-300" : "bg-slate-300"
                  }`}
                />
              </button>
            ))}
          </div>
        </aside>

        <section className="overflow-hidden rounded-[30px] border border-slate-200/70 bg-white/82 shadow-[0_18px_55px_rgba(15,23,42,0.06)] backdrop-blur">
          <header className="flex items-center justify-between border-b border-slate-200/80 px-6 py-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
                Desktop shell
              </p>
              <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[#030813]">
                PayGuard workspace
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#6ffbbe]/30 px-4 py-2 text-sm font-medium text-[#005236]">
                Local-first
              </span>
              <button className="rounded-full bg-[#1a202c] px-4 py-2 text-sm font-medium text-white">
                New review
              </button>
            </div>
          </header>

          <div className="grid gap-5 p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#f7fafc_100%)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
                  Core flow
                </p>
                <h2 className="mt-3 max-w-[16ch] text-[42px] leading-[1.05] font-semibold tracking-[-0.05em] text-[#030813]">
                  A clean shell for payment review.
                </h2>
                <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#45556c]">
                  Just the structure: navigation, a main review workspace, and
                  smaller side panels for recipients and receipts. No heavy fake
                  dashboard, no extra noise.
                </p>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
                      Main area
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#030813]">
                      Review workspace
                    </h2>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-[#45556c]">
                    Structure only
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {workAreas.map((area) => (
                    <div
                      key={area}
                      className="rounded-[22px] border border-slate-200 bg-[#f8fbfc] p-5"
                    >
                      <h3 className="text-base font-semibold text-[#030813]">
                        {area}
                      </h3>
                      <div className="mt-4 space-y-3">
                        <div className="h-11 rounded-2xl bg-white shadow-[inset_0_0_0_1px_rgba(226,232,240,0.9)]" />
                        <div className="h-11 rounded-2xl bg-white shadow-[inset_0_0_0_1px_rgba(226,232,240,0.9)]" />
                        <div className="h-20 rounded-2xl bg-white shadow-[inset_0_0_0_1px_rgba(226,232,240,0.9)]" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <SimplePanel
                eyebrow="Trusted recipients"
                title="Saved vendors"
                items={[
                  ["Apex Freight", "Known supplier"],
                  ["Northline", "Wallet change review"],
                  ["Add recipient", "Empty state placeholder"]
                ]}
              />

              <SimplePanel
                eyebrow="Receipts"
                title="Local history"
                items={[
                  ["Direct send", "No entries yet"],
                  ["Guarded payment", "No entries yet"],
                  ["Exports", "Reserved for later"]
                ]}
              />
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function SimplePanel({
  eyebrow,
  title,
  items
}: {
  eyebrow: string;
  title: string;
  items: [string, string][];
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#030813]">
        {title}
      </h2>
      <div className="mt-5 space-y-3">
        {items.map(([label, meta]) => (
          <div
            key={label}
            className="rounded-[22px] border border-slate-200 bg-[#f8fbfc] px-4 py-4"
          >
            <h3 className="text-sm font-semibold text-[#030813]">{label}</h3>
            <p className="mt-1 text-xs leading-5 text-[#45556c]">{meta}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
