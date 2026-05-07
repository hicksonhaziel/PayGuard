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
    return normalizeVerdict(parseRiskVerdict(final.contentText, input), input);
  } finally {
    if (modelId) {
      await unloadModel({ modelId, clearStorage: false });
    }

    await close();
  }
}

function parseRiskVerdict(content: string, input: RiskAnalysisInput): RiskVerdict {
  const parsed = parseJsonObject(content);

  if (parsed && isRiskVerdictShape(parsed)) {
    return parsed;
  }

  return createRuleBasedFallbackVerdict(input);
}

function parseJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const candidates = [
    trimmed,
    extractFirstJsonObject(trimmed),
    closeLikelyTruncatedJson(extractFirstJsonObject(trimmed) ?? trimmed)
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next recovery candidate.
    }
  }

  return null;
}

function extractFirstJsonObject(content: string) {
  const startIndex = content.indexOf("{");

  if (startIndex < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < content.length; index += 1) {
    const character = content[index];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (character === "\\") {
      isEscaped = true;
      continue;
    }

    if (character === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return content.slice(startIndex, index + 1);
      }
    }
  }

  return content.slice(startIndex);
}

function closeLikelyTruncatedJson(content: string) {
  let repaired = content.trim();
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (const character of repaired) {
    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (character === "\\") {
      isEscaped = true;
      continue;
    }

    if (character === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
    }
  }

  if (inString) {
    repaired = `${repaired.replace(/\\?$/, "")}"`;
  }

  while (depth > 0) {
    repaired += "}";
    depth -= 1;
  }

  return repaired;
}

function isRiskVerdictShape(value: unknown): value is RiskVerdict {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    (candidate.verdict === "Safe" ||
      candidate.verdict === "Review" ||
      candidate.verdict === "Block") &&
    typeof candidate.riskScore === "number" &&
    (candidate.recommendedRoute === "Direct Send" ||
      candidate.recommendedRoute === "Guarded Payment" ||
      candidate.recommendedRoute === "Block") &&
    Array.isArray(candidate.reasons) &&
    candidate.reasons.every((reason) => typeof reason === "string") &&
    typeof candidate.summary === "string"
  );
}

function createRuleBasedFallbackVerdict(input: RiskAnalysisInput): RiskVerdict {
  const hasSuspiciousText = containsSuspiciousPaymentLanguage(input);
  const recommendation = input.recipientMatch?.recommendation ?? "no-match";

  if (hasSuspiciousText) {
    return {
      verdict: "Block",
      riskScore: 85,
      recommendedRoute: "Block",
      reasons: [
        "Payment context contains scam-like urgency or wallet safety language.",
        "PayGuard could not get a valid structured LLM response, so it used deterministic local risk rules."
      ],
      summary: "This payment has suspicious context and should not be signed."
    };
  }

  if (recommendation === "trusted-match") {
    return {
      verdict: "Safe",
      riskScore: 20,
      recommendedRoute: "Direct Send",
      reasons: [
        "Recipient wallet matches a saved trusted recipient.",
        "PayGuard used deterministic local risk rules after the LLM returned malformed JSON."
      ],
      summary: "This payment matches local trusted-recipient records and can be sent directly."
    };
  }

  return {
    verdict: "Review",
    riskScore: 50,
    recommendedRoute: "Guarded Payment",
    reasons: [
      "Payment has limited trusted local context.",
      "PayGuard used deterministic local risk rules after the LLM returned malformed JSON."
    ],
    summary:
      "This payment needs review, so guarded payment is safer than sending directly."
  };
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

function normalizeVerdict(verdict: RiskVerdict, input: RiskAnalysisInput): RiskVerdict {
  const modelScore = Math.max(0, Math.min(100, Math.round(verdict.riskScore)));
  const hasSuspiciousText = containsSuspiciousPaymentLanguage(input);
  const recommendation = input.recipientMatch?.recommendation ?? "no-match";
  const isManualUnknownPayment =
    !input.ocrText?.trim() &&
    recommendation === "no-match" &&
    Boolean(input.payment.recipientWallet);

  if (recommendation === "trusted-match" && !hasSuspiciousText) {
    return {
      verdict: "Safe",
      riskScore: Math.min(modelScore, 25),
      recommendedRoute: "Direct Send",
      reasons: normalizeReasons([
        "Recipient wallet matches a saved trusted recipient.",
        "No invoice or memo scam signals were detected."
      ]),
      summary: "This payment matches local trusted-recipient records and can be sent directly."
    };
  }

  if (isManualUnknownPayment && !hasSuspiciousText) {
    return {
      verdict: "Review",
      riskScore: Math.max(45, Math.min(modelScore, 60)),
      recommendedRoute: "Guarded Payment",
      reasons: normalizeReasons([
        "Manual payment only; no invoice or screenshot was uploaded.",
        "No trusted recipient history matched this wallet yet.",
        "Use a guarded payment if you want a recovery window before final settlement."
      ]),
      summary:
        "This manual payment has limited local context, so a guarded payment is safer than blocking or sending blindly."
    };
  }

  const normalizedVerdict = normalizeVerdictRoute(verdict, modelScore, hasSuspiciousText);
  const riskScore = normalizeRiskScore(normalizedVerdict);

  return {
    verdict: normalizedVerdict.verdict,
    riskScore,
    recommendedRoute: normalizedVerdict.recommendedRoute,
    reasons: normalizeReasons(normalizedVerdict.reasons),
    summary: normalizedVerdict.summary
  };
}

function normalizeVerdictRoute(
  verdict: RiskVerdict,
  modelScore: number,
  hasSuspiciousText: boolean
): RiskVerdict {
  if (
    (verdict.verdict === "Block" || verdict.recommendedRoute === "Block") &&
    modelScore < 75 &&
    !hasSuspiciousText
  ) {
    return {
      ...verdict,
      verdict: "Review",
      recommendedRoute: "Guarded Payment"
    };
  }

  if (verdict.verdict === "Block" || verdict.recommendedRoute === "Block") {
    return {
      ...verdict,
      verdict: "Block",
      recommendedRoute: "Block"
    };
  }

  if (verdict.verdict === "Safe" && verdict.recommendedRoute !== "Direct Send") {
    return {
      ...verdict,
      recommendedRoute: "Direct Send"
    };
  }

  if (verdict.recommendedRoute === "Guarded Payment") {
    return {
      ...verdict,
      verdict: verdict.verdict === "Safe" ? "Review" : verdict.verdict
    };
  }

  return verdict;
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

function normalizeReasons(reasons: string[]) {
  const nonRiskPhrases = new Set([
    "no ocr text available",
    "no wallet mismatch",
    "no amount deviation from history",
    "no missing recipient history",
    "no invoice consistency"
  ]);
  const usefulReasons = reasons
    .map((reason) => reason.trim())
    .filter(Boolean)
    .filter((reason) => !nonRiskPhrases.has(reason.toLowerCase()))
    .slice(0, 5);

  return usefulReasons.length
    ? usefulReasons
    : ["QVAC completed local payment analysis with limited available context."];
}

function containsSuspiciousPaymentLanguage(input: RiskAnalysisInput) {
  const text = [
    input.ocrText,
    input.payment.memo,
    input.recipientMatch?.reasons.join(" ")
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  return [
    "urgent",
    "act now",
    "private key",
    "seed phrase",
    "recovery phrase",
    "wallet verification",
    "gift card",
    "double your",
    "final warning",
    "account suspended"
  ].some((phrase) => text.includes(phrase));
}

async function importQvacSdk() {
  return (await import("@qvac/sdk")) as typeof import("@qvac/sdk") & {
    QWEN3_600M_INST_Q4: Parameters<typeof loadModel>[0] extends { modelSrc: infer ModelSrc }
      ? ModelSrc
      : unknown;
  };
}
