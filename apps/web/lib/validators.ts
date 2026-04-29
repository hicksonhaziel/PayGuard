import type { PaymentIntent } from "@payguard/shared";
import type { UploadedDocument } from "./flow";

type ValidationErrors = Partial<
  Record<"recipientAddress" | "amount" | "tokenSymbol" | "sourceType", string>
>;

export function validatePaymentIntent(
  intent: PaymentIntent,
  uploadedDocument: UploadedDocument | null,
): {
  isValid: boolean;
  errors: ValidationErrors;
} {
  const errors: ValidationErrors = {};

  if (!intent.recipientAddress?.trim()) {
    errors.recipientAddress = "Recipient address is required.";
  }

  if (!intent.amount?.trim()) {
    errors.amount = "Amount is required.";
  }

  if (!intent.tokenSymbol?.trim()) {
    errors.tokenSymbol = "Token symbol is required.";
  }

  if (intent.sourceType === "document" && !uploadedDocument) {
    errors.sourceType = "Select a file when using document mode.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
