import type { CSSProperties } from "react";
import type { Receipt } from "@payguard/shared";

type ReceiptCardProps = {
  receipt: Receipt | null;
};

export function ReceiptCard({ receipt }: ReceiptCardProps) {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Receipt</h2>
      {receipt ? (
        <div style={gridStyle}>
          <ReceiptRow label="Mode" value={receipt.mode} />
          <ReceiptRow label="Amount" value={receipt.amount} />
          <ReceiptRow label="Token" value={receipt.tokenSymbol} />
          <ReceiptRow label="Verdict" value={receipt.verdict} />
          <ReceiptRow label="Recipient" value={receipt.recipientAddress} />
        </div>
      ) : (
        <p style={bodyStyle}>
          No receipt yet. It will appear after direct send or guarded payment is connected.
        </p>
      )}
    </section>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value}</span>
    </div>
  );
}

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #d0d5dd",
  borderRadius: "20px",
  padding: "24px",
};

const titleStyle: CSSProperties = {
  margin: "0 0 12px",
  fontSize: "22px",
};

const bodyStyle: CSSProperties = {
  margin: 0,
  color: "#475467",
  lineHeight: 1.6,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  padding: "10px 0",
  borderBottom: "1px solid #eaecf0",
};

const labelStyle: CSSProperties = {
  color: "#667085",
};

const valueStyle: CSSProperties = {
  color: "#101828",
  fontWeight: 600,
};
