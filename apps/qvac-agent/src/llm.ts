import {
  close,
  completion,
  loadModel,
  type ModelProgressUpdate,
  unloadModel
} from "@qvac/sdk";
import type { PaymentRagInput, RecipientRagResult } from "./rag.js";

export type RiskVerdict = {
  verdict: "Safe" | "Review" | "Block";
  riskScore: number;
  recommendedRoute: "Direct Send" | "Guarded Payment" | "Block";
  reasons: string[];
  summary: string;
};

export type RiskAnalysisInput = {
  payment: PaymentRagInput;
  ocrText?: string;
  recipientMatch?: RecipientRagResult | null;
};

const riskVerdictSchema = {
  type: "object",
  properties: {
    verdict: {
      type: "string",
      enum: ["Safe", "Review", "Block"]
    },
    riskScore: {
      type: "integer"
    },
    recommendedRoute: {
      type: "string",
      enum: ["Direct Send", "Guarded Payment", "Block"]
    },
    reasons: {
      type: "array",
      items: {
        type: "string"
      }
    },
    summary: {
      type: "string"
    }
  },
  required: ["verdict", "riskScore", "recommendedRoute", "reasons", "summary"],
  additionalProperties: false
} as const;

export async function analyzePaymentRiskWithLlm(
  input: RiskAnalysisInput
): Promise<RiskVerdict> {
  let modelId: string | undefined;

  try {
    const { QWEN3_600M_INST_Q4: qwen3Small } = await importQvacSdk();

    if (!qwen3Small) {
      throw new Error("Could not find QWEN3_600M_INST_Q4 in the QVAC SDK.");
    }

    modelId = await loadModel({
      modelSrc: qwen3Small,
      modelType: "llamacpp-completion",
      onProgress: (_progress: ModelProgressUpdate) => {}
    });

    const run = completion({
      modelId,
      stream: true,
      history: [
        {
          role: "system",
          content:
            "You are PayGuard's local Solana stablecoin payment risk analyst. Reply only with JSON matching the requested schema. /no_think"
        },
        {
          role: "user",
          content: buildRiskPrompt(input)
        }
      ],
      generationParams: {
        temp: 0,
        predict: 256
      },
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "payguard_risk_verdict",
          schema: riskVerdictSchema
        }
      }
    });

    for await (const event of run.events) {
      if (event.type === "error") {
        throw event.error;
      }
    }

    const final = await run.final;
    return normalizeVerdict(JSON.parse(final.contentText.trim()) as RiskVerdict);
  } finally {
    if (modelId) {
      await unloadModel({ modelId, clearStorage: false });
    }

    await close();
  }
}

function buildRiskPrompt(input: RiskAnalysisInput) {
  const bestMatch = input.recipientMatch?.bestMatch;

  return [
    "Analyze this Solana stablecoin payment before signature.",
    "",
    "Payment fields:",
    `- recipientWallet: ${input.payment.recipientWallet || "unknown"}`,
    `- amount: ${input.payment.amount || "unknown"}`,
    `- token: ${input.payment.token || "unknown"}`,
    `- memo: ${input.payment.memo || "none"}`,
    "",
    "OCR text:",
    input.ocrText || "No OCR text available.",
    "",
    "Local trusted recipient RAG result:",
    `- recommendation: ${input.recipientMatch?.recommendation ?? "no-match"}`,
    `- bestMatchName: ${bestMatch?.recipientName ?? "none"}`,
    `- bestMatchScore: ${bestMatch?.score.toFixed(4) ?? "none"}`,
    `- trustedRecord: ${bestMatch?.content ?? "none"}`,
    `- ragReasons: ${(input.recipientMatch?.reasons ?? []).join(" | ") || "none"}`,
    "",
    "Return a risk verdict. Consider exact wallet mismatch, amount deviation from history, missing recipient history, invoice consistency, and whether a guarded payment is safer.",
    "riskScore must be 0 to 100 where 0 is no risk and 100 is maximum risk."
  ].join("\n");
}

function normalizeVerdict(verdict: RiskVerdict): RiskVerdict {
  const riskScore = normalizeRiskScore(verdict);

  return {
    verdict: verdict.verdict,
    riskScore,
    recommendedRoute: verdict.recommendedRoute,
    reasons: verdict.reasons.slice(0, 5),
    summary: verdict.summary
  };
}

function normalizeRiskScore(verdict: RiskVerdict) {
  const modelScore = Math.max(0, Math.min(100, Math.round(verdict.riskScore)));

  if (verdict.verdict === "Block") {
    return Math.max(modelScore, 80);
  }

  if (verdict.recommendedRoute === "Guarded Payment" || verdict.verdict === "Review") {
    return Math.max(modelScore, 45);
  }

  return modelScore;
}

async function importQvacSdk() {
  return (await import("@qvac/sdk")) as typeof import("@qvac/sdk") & {
    QWEN3_600M_INST_Q4: Parameters<typeof loadModel>[0] extends { modelSrc: infer ModelSrc }
      ? ModelSrc
      : unknown;
  };
}
