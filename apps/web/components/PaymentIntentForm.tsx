import type { PaymentIntent } from "@payguard/shared";
import type { CSSProperties, ReactNode } from "react";

type PaymentIntentFormProps = {
  intent: PaymentIntent;
  onChange: (intent: PaymentIntent) => void;
  validationErrors: Partial<Record<"recipientAddress" | "amount" | "tokenSymbol" | "sourceType", string>>;
};

export function PaymentIntentForm({
  intent,
  onChange,
  validationErrors,
}: PaymentIntentFormProps) {
  const setField = <K extends keyof PaymentIntent>(field: K, value: PaymentIntent[K]) => {
    onChange({
      ...intent,
      [field]: value,
    });
  };

  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Payment intent</h2>
      <div style={gridStyle}>
        <Field label="Recipient name">
          <input
            onChange={(event) => setField("recipientName", event.target.value)}
            style={inputStyle}
            value={intent.recipientName ?? ""}
          />
        </Field>

        <Field error={validationErrors.recipientAddress} label="Recipient address">
          <input
            onChange={(event) => setField("recipientAddress", event.target.value)}
            style={inputStyle}
            value={intent.recipientAddress ?? ""}
          />
        </Field>

        <Field error={validationErrors.tokenSymbol} label="Token">
          <select
            onChange={(event) => setField("tokenSymbol", event.target.value)}
            style={inputStyle}
            value={intent.tokenSymbol}
          >
            <option value="USDT">USDT</option>
            <option value="USDC">USDC</option>
          </select>
        </Field>

        <Field error={validationErrors.amount} label="Amount">
          <input
            onChange={(event) => setField("amount", event.target.value)}
            style={inputStyle}
            value={intent.amount}
          />
        </Field>

        <Field error={validationErrors.sourceType} label="Input source">
          <select
            onChange={(event) =>
              setField("sourceType", event.target.value as PaymentIntent["sourceType"])
            }
            style={inputStyle}
            value={intent.sourceType}
          >
            <option value="manual">Manual</option>
            <option value="document">Document</option>
          </select>
        </Field>

        <Field label="Reason">
          <textarea
            onChange={(event) => setField("reason", event.target.value)}
            style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }}
            value={intent.reason ?? ""}
          />
        </Field>
      </div>
    </section>
  );
}

function Field({
  children,
  error,
  label,
}: {
  children: ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      {children}
      {error ? <span style={errorStyle}>{error}</span> : null}
    </label>
  );
}

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #d0d5dd",
  borderRadius: "20px",
  padding: "24px",
};

const titleStyle: CSSProperties = {
  margin: "0 0 18px",
  fontSize: "22px",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "16px",
};

const fieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const labelStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#344054",
};

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #d0d5dd",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "14px",
  color: "#101828",
  background: "#ffffff",
};

const errorStyle: CSSProperties = {
  color: "#b42318",
  fontSize: "13px",
};
