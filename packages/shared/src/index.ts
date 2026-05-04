export const sourceKinds = ["manual", "invoice", "screenshot"] as const;
export const verdicts = ["Safe", "Review", "Block"] as const;
export const paymentRoutes = ["direct-send", "guarded-payment"] as const;
export const receiptStatuses = ["mocked", "pending", "completed", "blocked"] as const;
export const reviewStatuses = ["draft", "prepared", "analyzed", "completed"] as const;

export type SourceKind = (typeof sourceKinds)[number];
export type Verdict = (typeof verdicts)[number];
export type PaymentRoute = (typeof paymentRoutes)[number];
export type ReceiptStatus = (typeof receiptStatuses)[number];
export type ReviewStatus = (typeof reviewStatuses)[number];

export type PaymentToken = "USDT" | "USDC";

export interface PaymentRequest {
  recipientName: string;
  walletAddress: string;
  amount: string;
  token: PaymentToken;
  note: string;
}

export interface DocumentSource {
  id: string;
  kind: Exclude<SourceKind, "manual">;
  fileName: string;
  addedAt: string;
  status: "queued" | "prepared";
  previewText: string;
}

export interface ExtractedPaymentDetails {
  sourceKind: SourceKind;
  sourceLabel: string;
  normalizedRecipient: string;
  normalizedWalletAddress: string;
  normalizedAmount: string;
  normalizedToken: PaymentToken;
  summary: string;
}

export interface RiskReason {
  code: string;
  label: string;
  detail: string;
  severity: "info" | "warning" | "critical";
}

export interface RiskVerdict {
  verdict: Verdict;
  reasons: RiskReason[];
  recommendedRoute: PaymentRoute;
  analystNote: string;
}

export interface TrustedRecipient {
  id: string;
  name: string;
  walletAddress: string;
  category: string;
  lastPaidAt: string;
  note: string;
}

export interface ReceiptRecord {
  id: string;
  createdAt: string;
  recipientName: string;
  walletAddress: string;
  amount: string;
  token: PaymentToken;
  route: PaymentRoute;
  verdict: Verdict;
  status: ReceiptStatus;
  summary: string;
}

export interface ReviewSession {
  id: string;
  status: ReviewStatus;
  sourceKind: SourceKind;
  paymentRequest: PaymentRequest;
  documents: DocumentSource[];
  extractedDetails: ExtractedPaymentDetails | null;
  verdict: RiskVerdict | null;
  selectedRoute: PaymentRoute | null;
}
