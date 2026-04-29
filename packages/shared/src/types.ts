export type PaymentSourceType = "manual" | "document" | "voice" | "qr";

export type Verdict = "Safe" | "Review" | "Block";

export type PaymentIntent = {
  recipientName?: string;
  recipientAddress?: string;
  tokenSymbol: string;
  amount: string;
  reason?: string;
  sourceType: PaymentSourceType;
  sourceLabel?: string;
  rawText?: string;
};

export type OcrExtraction = {
  merchantName?: string;
  walletAddress?: string;
  amount?: string;
  tokenSymbol?: string;
  invoiceNumber?: string;
  dueDate?: string;
  paymentReason?: string;
  rawText: string;
};

export type RiskVerdict = {
  verdict: Verdict;
  score?: number;
  reasons: string[];
  signals: string[];
};

export type Receipt = {
  id: string;
  mode: "direct" | "guarded";
  recipientAddress: string;
  tokenSymbol: string;
  amount: string;
  verdict: Verdict;
  txSignature?: string;
  guardedPaymentAddress?: string;
  documentHash?: string;
  createdAt: string;
};

export type TrustedRecipient = {
  label: string;
  walletAddress: string;
  note?: string;
};

