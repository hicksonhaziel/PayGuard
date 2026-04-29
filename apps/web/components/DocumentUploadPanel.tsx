import type { CSSProperties } from "react";
import type { UploadedDocument } from "../lib/flow";

type DocumentUploadPanelProps = {
  sourceType: "manual" | "document" | "voice" | "qr";
  uploadedDocument: UploadedDocument | null;
  onChange: (document: UploadedDocument | null) => void;
};

export function DocumentUploadPanel({
  onChange,
  sourceType,
  uploadedDocument,
}: DocumentUploadPanelProps) {
  const isDocumentMode = sourceType === "document";

  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Document input</h2>
      <p style={descriptionStyle}>
        Switch to document mode if you want to attach an invoice or screenshot.
      </p>

      <input
        disabled={!isDocumentMode}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) {
            onChange(null);
            return;
          }

          onChange({
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            uploadedAt: new Date().toISOString(),
          });
        }}
        style={inputStyle}
        type="file"
      />

      <div style={metaBoxStyle}>
        <div style={metaRowStyle}>
          <span style={metaLabelStyle}>Selected file</span>
          <span style={metaValueStyle}>{uploadedDocument?.fileName ?? "None"}</span>
        </div>
        <div style={metaRowStyle}>
          <span style={metaLabelStyle}>Mime type</span>
          <span style={metaValueStyle}>{uploadedDocument?.mimeType ?? "N/A"}</span>
        </div>
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

const descriptionStyle: CSSProperties = {
  margin: "0 0 16px",
  color: "#475467",
  lineHeight: 1.6,
};

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #d0d5dd",
  borderRadius: "12px",
  padding: "12px 14px",
  background: "#ffffff",
};

const metaBoxStyle: CSSProperties = {
  marginTop: "16px",
  padding: "14px 16px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #eaecf0",
};

const metaRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  padding: "6px 0",
};

const metaLabelStyle: CSSProperties = {
  color: "#667085",
  fontSize: "14px",
};

const metaValueStyle: CSSProperties = {
  color: "#101828",
  fontWeight: 600,
  fontSize: "14px",
};
