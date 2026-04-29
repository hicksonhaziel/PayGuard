import type { PaymentIntent } from "@payguard/shared";

export type FlowStep = "connect" | "intent" | "review" | "receipt";

export type UploadedDocument = {
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

export function createInitialPaymentIntent(): PaymentIntent {
  return {
    recipientName: "",
    recipientAddress: "",
    tokenSymbol: "USDT",
    amount: "",
    reason: "",
    sourceType: "manual",
    sourceLabel: "",
    rawText: "",
  };
}

