"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
import type { PaymentIntent, Receipt, RiskVerdict } from "@payguard/shared";
import { DocumentUploadPanel } from "../components/DocumentUploadPanel";
import { PaymentIntentForm } from "../components/PaymentIntentForm";
import { ReceiptCard } from "../components/ReceiptCard";
import { ReviewPanel } from "../components/ReviewPanel";
import { VerdictCard } from "../components/VerdictCard";
import { WalletConnectCard } from "../components/WalletConnectCard";
import {
  createInitialPaymentIntent,
  type FlowStep,
  type UploadedDocument,
} from "../lib/flow";
import { validatePaymentIntent } from "../lib/validators";

export default function HomePage() {
  const [step, setStep] = useState<FlowStep>("connect");
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent>(createInitialPaymentIntent());
  const [uploadedDocument, setUploadedDocument] = useState<UploadedDocument | null>(null);
  const [receipt] = useState<Receipt | null>(null);
  const [verdict] = useState<RiskVerdict | null>(null);
  const [formAttempted, setFormAttempted] = useState(false);

  const validation = useMemo(
    () => validatePaymentIntent(paymentIntent, uploadedDocument),
    [paymentIntent, uploadedDocument],
  );

  const canContinueFromIntent = validation.isValid;

  const handleWalletConnect = () => {
    setIsWalletConnected(true);
    setStep("intent");
  };

  const handleIntentChange = (nextIntent: PaymentIntent) => {
    setPaymentIntent(nextIntent);
  };

  const handleDocumentChange = (document: UploadedDocument | null) => {
    setUploadedDocument(document);
  };

  const handleContinueToReview = () => {
    setFormAttempted(true);
    if (!canContinueFromIntent) {
      return;
    }
    setStep("review");
  };

  const handleBackToIntent = () => {
    setStep("intent");
  };

  const handleReset = () => {
    setStep(isWalletConnected ? "intent" : "connect");
    setPaymentIntent(createInitialPaymentIntent());
    setUploadedDocument(null);
    setFormAttempted(false);
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>QVAC PayGuard</p>
            <h1 style={styles.title}>Review a payment before you sign it.</h1>
            <p style={styles.subtitle}>
              Clean shell first. OCR, risk analysis, wallet signing, and guarded payment plug in next.
            </p>
          </div>
          <StepBadge step={step} />
        </header>

        <section style={styles.progressRow}>
          <ProgressPill active={step === "connect"} label="Connect" />
          <ProgressPill active={step === "intent"} label="Payment" />
          <ProgressPill active={step === "review"} label="Review" />
          <ProgressPill active={step === "receipt"} label="Receipt" />
        </section>

        <section style={styles.mainColumn}>
          {step === "connect" ? (
            <WalletConnectCard
              isConnected={isWalletConnected}
              onConnect={handleWalletConnect}
            />
          ) : null}

          {step === "intent" ? (
            <div style={styles.stack}>
              <PaymentIntentForm
                intent={paymentIntent}
                onChange={handleIntentChange}
                validationErrors={formAttempted ? validation.errors : {}}
              />
              <DocumentUploadPanel
                onChange={handleDocumentChange}
                sourceType={paymentIntent.sourceType}
                uploadedDocument={uploadedDocument}
              />
              <div style={styles.actions}>
                <button onClick={handleReset} style={styles.secondaryButton} type="button">
                  Reset
                </button>
                <button
                  onClick={handleContinueToReview}
                  style={styles.primaryButton}
                  type="button"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {step === "review" ? (
            <div style={styles.stack}>
              <ReviewPanel
                intent={paymentIntent}
                uploadedDocument={uploadedDocument}
                onBack={handleBackToIntent}
              />
              <VerdictCard verdict={verdict} />
            </div>
          ) : null}

          {step === "receipt" ? <ReceiptCard receipt={receipt} /> : null}
        </section>
      </div>
    </main>
  );
}

function StepBadge({ step }: { step: FlowStep }) {
  return <div style={styles.stepBadge}>Step: {step}</div>;
}

function ProgressPill({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      style={{
        ...styles.progressPill,
        ...(active ? styles.progressPillActive : {}),
      }}
    >
      {label}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #f5f1e8 0%, #ece8de 100%)",
    color: "#101828",
    fontFamily: "system-ui, sans-serif",
    padding: "32px 20px",
  },
  container: {
    maxWidth: "760px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
    marginBottom: "28px",
  },
  eyebrow: {
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#667085",
    fontSize: "12px",
    fontWeight: 700,
  },
  title: {
    margin: "8px 0 10px",
    fontSize: "36px",
    lineHeight: 1.15,
  },
  subtitle: {
    margin: 0,
    maxWidth: "620px",
    color: "#475467",
    fontSize: "15px",
    lineHeight: 1.6,
  },
  stepBadge: {
    padding: "8px 12px",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#344054",
    border: "1px solid #d0d5dd",
    fontSize: "13px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  progressRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },
  mainColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  primaryButton: {
    border: 0,
    borderRadius: "12px",
    padding: "12px 18px",
    background: "#101828",
    color: "#fcfcfd",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #d0d5dd",
    borderRadius: "12px",
    padding: "12px 18px",
    background: "#ffffff",
    color: "#344054",
    fontWeight: 700,
    cursor: "pointer",
  },
  progressPill: {
    padding: "8px 12px",
    borderRadius: "999px",
    background: "#ffffff",
    border: "1px solid #d0d5dd",
    color: "#667085",
    fontSize: "13px",
    fontWeight: 600,
  },
  progressPillActive: {
    background: "#101828",
    border: "1px solid #101828",
    color: "#fcfcfd",
  },
};
