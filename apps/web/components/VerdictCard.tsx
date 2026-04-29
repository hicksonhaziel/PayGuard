import type { CSSProperties } from "react";
import type { RiskVerdict } from "@payguard/shared";

type VerdictCardProps = {
  verdict: RiskVerdict | null;
};

export function VerdictCard({ verdict }: VerdictCardProps) {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Verdict</h2>
      {verdict ? (
        <div>
          <p style={valueStyle}>{verdict.verdict}</p>
          <ul style={listStyle}>
            {verdict.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p style={bodyStyle}>
          No verdict yet. The real risk engine plugs in here next.
        </p>
      )}
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
  margin: 0,
  color: "#475467",
  lineHeight: 1.6,
};

const valueStyle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: "18px",
  fontWeight: 700,
};

const listStyle: CSSProperties = {
  margin: 0,
  paddingLeft: "18px",
  color: "#475467",
};
