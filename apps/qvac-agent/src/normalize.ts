import type { OcrExtraction, PaymentIntent } from "@payguard/shared";

export function normalizeOcrToPaymentIntent(_extraction: OcrExtraction): PaymentIntent {
  throw new Error("OCR normalization not implemented yet.");
}

