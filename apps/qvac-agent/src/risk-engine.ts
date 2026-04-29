import type { PaymentIntent, RiskVerdict, TrustedRecipient } from "@payguard/shared";

export type RiskEngineInput = {
  intent: PaymentIntent;
  trustedRecipients?: TrustedRecipient[];
};

export function evaluateRisk(_input: RiskEngineInput): RiskVerdict {
  throw new Error("Risk engine not implemented yet.");
}

