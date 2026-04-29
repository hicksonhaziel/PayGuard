import type { CSSProperties } from "react";

type WalletConnectCardProps = {
  isConnected: boolean;
  onConnect: () => void;
};

export function WalletConnectCard({
  isConnected,
  onConnect,
}: WalletConnectCardProps) {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Connect wallet</h2>
      <p style={bodyStyle}>
        Start with wallet connection, then move into payment entry and review.
      </p>
      <div style={rowStyle}>
        <span style={badgeStyle(isConnected)}>
          {isConnected ? "Connected" : "Awaiting connection"}
        </span>
        <button onClick={onConnect} style={buttonStyle} type="button">
          Continue
        </button>
      </div>
    </section>
  );
}

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #d0d5dd",
  borderRadius: "20px",
  padding: "24px",
};

const titleStyle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: "22px",
};

const bodyStyle: CSSProperties = {
  margin: "0 0 16px",
  color: "#475467",
  lineHeight: 1.6,
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
};

const buttonStyle: CSSProperties = {
  border: 0,
  borderRadius: "12px",
  padding: "12px 18px",
  background: "#101828",
  color: "#fcfcfd",
  fontWeight: 700,
  cursor: "pointer",
};

function badgeStyle(isConnected: boolean): CSSProperties {
  return {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: "999px",
    background: isConnected ? "#dcfae6" : "#f2f4f7",
    color: isConnected ? "#067647" : "#475467",
    fontWeight: 700,
    fontSize: "14px",
  };
}
