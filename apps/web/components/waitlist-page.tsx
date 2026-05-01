"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { FormEvent } from "react";
import banner from "../assets/payguardbanner.png";
import footerBanner from "../assets/payguardbanner2.png";
import { Reveal } from "./reveal";

const platforms = [
  { name: "Windows", state: null, icon: "desktop_windows" },
  { name: "macOS", state: null, icon: "laptop_mac" },
  { name: "Linux", state: null, icon: "terminal" },
  { name: "iOS", state: "Coming Soon", icon: "phone_iphone" },
  { name: "Android", state: "Coming Soon", icon: "android" }
] as const;

export function WaitlistPage() {
  const preventSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="min-h-screen bg-[#f7fafc] text-[#181c1e] antialiased selection:bg-[#6ffbbe] selection:text-[#002113]">
      <nav className="fixed top-0 z-50 w-full border-b border-slate-200/50 bg-white/90 text-slate-900 shadow-[0_4px_20px_rgba(26,32,44,0.05)] backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-6">
          <a href="#top" aria-label="PayGuard home">
            <Image
              src={banner}
              alt="PayGuard"
              priority
              className="h-15 w-auto"
            />
          </a>
          <a
            className="font-body inline-flex items-center justify-center rounded-[12px] bg-[#1a202c] px-4 py-2 text-[16px] !text-white no-underline transition-opacity hover:opacity-90"
            href="#waitlist"
          >
            Join waitlist
          </a>
        </div>
      </nav>

      <main className="flex-grow pt-20" id="top">
        <section className="relative mx-auto flex max-w-[1200px] flex-col items-center gap-12 px-6 py-16 lg:flex-row lg:py-[120px]">
          <div className="pointer-events-none absolute right-0 top-1/2 -z-10 h-[600px] w-1/2 -translate-y-1/2 rounded-full bg-[#6ffbbe] opacity-10 blur-[120px]" />

          <Reveal className="flex-1 space-y-8">
            <div>
              <h1 className="font-headline text-[40px] leading-[1.2] font-bold tracking-[-0.02em] text-[#030813] lg:text-[56px]">
                Secure your payments, locally.
              </h1>
              <p className="font-body mt-6 max-w-lg text-[16px] leading-[1.6] text-[#45474c]">
                Review risky payments before sending. PayGuard analyzes
                invoices and payment requests locally on your device, ensuring
                your financial data never leaves your control while protecting
                you from scams.
              </p>
              <form
                className="mt-8 flex max-w-md flex-col gap-4 sm:flex-row"
                onSubmit={preventSubmit}
              >
                <input
                  className="font-body flex-1 rounded-lg border border-[#c6c6cc] bg-white px-4 py-3 text-[16px] text-[#181c1e] outline-none transition-all placeholder:text-[#45474c]/50 focus:border-[#1a202c] focus:ring-2 focus:ring-[#6ffbbe]/50"
                  placeholder="Enter your email address"
                  required
                  type="email"
                />
                <button
                  className="font-body whitespace-nowrap rounded-[12px] bg-[#1a202c] px-6 py-3 text-[16px] text-white shadow-[0_4px_20px_rgba(26,32,44,0.15)] transition-opacity hover:opacity-90"
                  type="submit"
                >
                  Get Early Access
                </button>
              </form>
              <div className="font-body mt-4 flex items-center gap-2 text-[14px] text-[#45474c]/80">
                <span className="material-symbols-outlined text-[16px] text-[#006c49]">
                  verified_user
                </span>
                <span>No credit card required. Free during beta.</span>
              </div>
            </div>
          </Reveal>

          <Reveal className="relative flex-1 w-full max-w-2xl" delay={0.1}>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="relative z-10 overflow-hidden rounded-[24px] border border-[#e0e3e5] bg-white p-2 shadow-[0_8px_40px_rgba(26,32,44,0.12)]">
                <img
                  alt="PayGuard Dashboard Preview"
                  className="h-auto w-full rounded-xl"
                  src="https://lh3.googleusercontent.com/aida/ADBb0ui-FmQdyo1CVv9MvAcTdNtx9nr4q6AKVyVqL-_1b8mTP8JkvjggokeJUliKEtChY30xxAdE9fJT6NuXlvNVXFvSymHZE6UApTlHX1SF3bo9lLqVnKfKphy2G2EPwDgcXIzMGz0KG7p4G8fIp50-L7M6xqmsMr4cJKRHbLjpX3UyS28gzlSnH_2hTXvpIOdqEjv0Bn6cQk-xk3gw3dguRjbyLUm1EnHu4sLaFya5MFtvTd0-3Aoih5lVoQ9DWFzm3FTF7Z-cC5QywV4"
                />
              </div>
            </motion.div>
          </Reveal>
        </section>

        <section className="border-y border-[#e0e3e5] bg-[#f1f4f6] py-12">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 md:grid-cols-3">
            <TrustItem
              delay={0}
              icon="shield_lock"
              title="Local-first Privacy"
              copy="Data stays on your device."
            />
            <TrustItem
              delay={0.08}
              icon="fact_check"
              title="Payment Verification"
              copy="Verify vendor details instantly."
            />
            <TrustItem
              delay={0.16}
              icon="policy"
              title="Scam Detection"
              copy="AI-driven risk analysis."
            />
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 py-16">
          <Reveal className="mb-16 text-center">
            <h2 className="font-headline mb-4 text-[32px] font-semibold leading-[1.3] tracking-[-0.01em] text-[#030813]">
              How it Works
            </h2>
            <p className="font-body mx-auto max-w-2xl text-[16px] leading-[1.6] text-[#45474c]">
              Seamlessly integrate local-first security into your payment
              workflow.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StepCard
              delay={0}
              index="1"
              title="Upload Invoice"
              copy="Drag and drop or scan any invoice into the PayGuard app."
            />
            <StepCard
              delay={0.06}
              index="2"
              title="AI-Powered Review"
              copy="Local models analyze vendor history and detect anomalies instantly."
            />
            <StepCard
              delay={0.12}
              index="3"
              title="Choose Safer Flow"
              copy="Select the most secure routing based on the risk assessment."
            />
            <StepCard
              delay={0.18}
              index="4"
              title="Secure Receipt"
              copy="Transaction logged locally with cryptographically verified proof."
              highlighted
            />
          </div>
        </section>

        <section
          className="border-t border-[#e0e3e5] bg-[#f1f4f6] py-16"
          id="downloads"
        >
          <div className="mx-auto max-w-[1200px] px-6 text-center">
            <Reveal>
              <h2 className="font-headline mb-12 text-[32px] font-semibold leading-[1.3] tracking-[-0.01em] text-[#030813]">
                Available across every platform.
              </h2>
            </Reveal>
            <div className="flex flex-wrap justify-center gap-6">
              {platforms.map((platform, index) => (
                <Reveal key={platform.name} delay={index * 0.05}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.18 }}
                    className={`min-w-[160px] rounded-xl border border-[#e0e3e5] p-6 ${
                      platform.state
                        ? "bg-[#ebeef0] opacity-60"
                        : "bg-white shadow-[0_4px_20px_rgba(26,32,44,0.05)]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[32px] text-[#030813]">
                      {platform.icon}
                    </span>
                    <div
                      className={`${
                        platform.state ? "flex flex-col items-center" : ""
                      }`}
                    >
                      <span className="font-body mt-3 block text-[16px] font-medium text-[#030813]">
                        {platform.name}
                      </span>
                      {platform.state ? (
                        <span className="mt-1 rounded-full bg-[#006c49]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-[#006c49]">
                          {platform.state}
                        </span>
                      ) : null}
                    </div>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[800px] px-6 py-[100px] text-center" id="waitlist">
          <Reveal>
            <h2 className="font-headline mb-6 text-[32px] font-semibold leading-[1.3] tracking-[-0.01em] text-[#030813]">
              Take control of your financial security today.
            </h2>
            <p className="font-body mb-10 text-[16px] leading-[1.6] text-[#45474c]">
              Join 5,000+ early users who are already protecting their payments
              with local-first analysis.
            </p>
            <form
              className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row"
              onSubmit={preventSubmit}
            >
              <input
                className="font-body flex-1 rounded-lg border border-[#c6c6cc] bg-white px-4 py-3 text-[16px] text-[#181c1e] outline-none transition-all placeholder:text-[#45474c]/50 focus:border-[#1a202c] focus:ring-2 focus:ring-[#6ffbbe]/50"
                placeholder="Enter your email address"
                required
                type="email"
              />
              <button
                className="font-body whitespace-nowrap rounded-[12px] bg-[#1a202c] px-8 py-3 text-[16px] text-white shadow-[0_4px_20px_rgba(26,32,44,0.15)] transition-opacity hover:opacity-90"
                type="submit"
              >
                Sign Up
              </button>
            </form>
          </Reveal>
        </section>
      </main>

      <footer className="w-full border-t border-slate-200 bg-slate-50 py-16 text-slate-600 opacity-80 transition-opacity hover:opacity-100">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-8 px-6 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Image
              src={footerBanner}
              alt="PayGuard"
              width={188}
              height={66}
              className="h-auto w-[188px]"
            />
            <div className="font-headline text-xs uppercase tracking-[0.2em]">
              © 2026 PayGuard. Local-First Financial Security.
            </div>
          </div>
          <div className="flex flex-wrap gap-6 md:justify-end">
            {["Privacy", "Terms", "Security", "Contact"].map((item) => (
              <a
                key={item}
                className="font-headline text-xs uppercase tracking-[0.2em] text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
                href="#top"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

function TrustItem({
  icon,
  title,
  copy,
  delay
}: {
  icon: string;
  title: string;
  copy: string;
  delay: number;
}) {
  return (
    <Reveal delay={delay}>
      <motion.div
        whileHover={{ y: -3 }}
        transition={{ duration: 0.18 }}
        className="flex items-center gap-4"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#006c49]/10 text-[#006c49]">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>
        <div>
          <h3 className="font-headline text-[18px] font-semibold text-[#030813]">
            {title}
          </h3>
          <p className="font-body text-[14px] leading-[1.5] text-[#45474c]">
            {copy}
          </p>
        </div>
      </motion.div>
    </Reveal>
  );
}

function StepCard({
  index,
  title,
  copy,
  delay,
  highlighted = false
}: {
  index: string;
  title: string;
  copy: string;
  delay: number;
  highlighted?: boolean;
}) {
  return (
    <Reveal delay={delay}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className={`relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border p-8 ${
          highlighted
            ? "border-[#4edea3]/30 bg-white"
            : "border-[#e0e3e5] bg-white"
        } shadow-[0_4px_20px_rgba(26,32,44,0.05)]`}
      >
        {highlighted ? (
          <div className="absolute right-0 top-0 -z-0 h-24 w-24 rounded-bl-[100px] bg-[#006c49]/5" />
        ) : null}
        <div
          className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-semibold ${
            highlighted
              ? "bg-[#006c49]/10 text-[#006c49]"
              : "bg-[#ebeef0] text-[#030813]"
          }`}
        >
          {index}
        </div>
        <h3 className="font-headline relative z-10 mt-2 text-[20px] font-semibold text-[#030813]">
          {title}
        </h3>
        <p className="font-body relative z-10 text-[14px] leading-[1.5] text-[#45474c]">
          {copy}
        </p>
      </motion.div>
    </Reveal>
  );
}
