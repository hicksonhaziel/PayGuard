declare global {
  interface Window {
    payguardDesktop?: {
      starterMessage: string;
    };
  }
}

export default function App() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_30%),linear-gradient(180deg,_#07111f_0%,_#0f172a_100%)] px-6 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <section className="w-full rounded-[32px] border border-white/10 bg-slate-950/60 p-10 shadow-[0_30px_120px_rgba(2,6,23,0.5)] backdrop-blur">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
            QVACc PayGuard
          </p>
          <h1 className="mb-4 max-w-2xl text-5xl font-semibold tracking-tight text-white">
            Desktop starter
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-300">
            {window.payguardDesktop?.starterMessage ??
              "Desktop bridge is loading."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
              React renderer
            </span>
            <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              Tailwind styling
            </span>
            <span className="rounded-full border border-slate-400/25 bg-slate-400/10 px-4 py-2 text-sm text-slate-200">
              Electron shell
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
