import type { CSSProperties } from "react";
import type { PaymentIntent } from "@payguard/shared";
import type { UploadedDocument } from "../lib/flow";

type ReviewPanelProps = {
  intent: PaymentIntent;
  uploadedDocument: UploadedDocument | null;
  onBack: () => void;
};

export function ReviewPanel({
  intent,
  onBack,
  uploadedDocument,
}: ReviewPanelProps) {
  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>Review</h2>
          <p style={subtitleStyle}>
            This is the data that will go into OCR normalization and risk analysis.
          </p>
        </div>
        <button onClick={onBack} style={buttonStyle} type="button">
          Back
        </button>
      </div>

      <div style={gridStyle}>
        <ReviewItem label="Recipient name" value={intent.recipientName ?? "Not provided"} />
        <ReviewItem label="Recipient address" value={intent.recipientAddress ?? "Not provided"} />
        <ReviewItem label="Token" value={intent.tokenSymbol} />
        <ReviewItem label="Amount" value={intent.amount} />
        <ReviewItem label="Reason" value={intent.reason ?? "Not provided"} />
        <ReviewItem label="Source type" value={intent.sourceType} />
        <ReviewItem label="Document" value={uploadedDocument?.fileName ?? "No file selected"} />
      </div>
    </section>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={itemStyle}>
      <span style={itemLabelStyle}>{label}</span>
      <span style={itemValueStyle}>{value}</span>
    </div>
  );
}

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #d0d5dd",
  borderRadius: "20px",
  padding: "24px",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "flex-start",
  marginBottom: "18px",
};

const titleStyle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "22px",
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: "#475467",
  lineHeight: 1.6,
};

const buttonStyle: CSSProperties = {
  border: "1px solid #d0d5dd",
  borderRadius: "12px",
  padding: "10px 14px",
  background: "#ffffff",
  color: "#344054",
  fontWeight: 700,
  cursor: "pointer",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "14px",
};

const itemStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  padding: "14px",
  border: "1px solid #eaecf0",
  borderRadius: "14px",
  background: "#fcfcfd",
};

const itemLabelStyle: CSSProperties = {
  fontSize: "13px",
  color: "#667085",
};

const itemValueStyle: CSSProperties = {
  fontSize: "14px",
  color: "#101828",
  fontWeight: 600,
  wordBreak: "break-word",
};
