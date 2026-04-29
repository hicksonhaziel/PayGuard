import type { PaymentIntent } from "@payguard/shared";

export type DirectSendRequest = {
  intent: PaymentIntent;
};

export async function buildDirectSend(_request: DirectSendRequest) {
  throw new Error("Direct send builder not implemented yet.");
}

