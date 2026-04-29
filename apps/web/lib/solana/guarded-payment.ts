import type { PaymentIntent } from "@payguard/shared";

export type GuardedPaymentRequest = {
  intent: PaymentIntent;
  unlockTime: number;
};

export async function buildGuardedPayment(_request: GuardedPaymentRequest) {
  throw new Error("Guarded payment builder not implemented yet.");
}

