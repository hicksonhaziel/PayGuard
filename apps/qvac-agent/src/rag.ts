import {
  close,
  loadModel,
  ragCloseWorkspace,
  ragIngest,
  ragSearch,
  unloadModel,
  type ModelProgressUpdate
} from "@qvac/sdk";

type QvacRagSearchResult = Awaited<ReturnType<typeof ragSearch>>[number];

export type PaymentRagInput = {
  ocrText?: string;
  recipientWallet?: string;
  amount?: string;
  token?: string;
  memo?: string;
};

export type PaymentRagRequest = PaymentRagInput & {
  trustedRecipients?: TrustedRecipientRecord[];
};

export type TrustedRecipientRecord = {
  name: string;
  wallet: string;
  normalToken: string;
  normalAmountRange: string;
  invoicePattern: string;
  paymentHistory: string;
};

export type RecipientRagMatch = {
  score: number;
  content: string;
  recipientName: string | null;
};

export type RecipientRagResult = {
  query: string;
  bestMatch: RecipientRagMatch | null;
  matches: RecipientRagMatch[];
  recommendation: "trusted-match" | "review" | "no-match";
  reasons: string[];
};

const defaultTrustedRecipients: TrustedRecipientRecord[] = [
  {
    name: "Acme Store",
    wallet: "7xK9mPZrLs8Qa4NdTz6Vu1JcBf3We9HyRkSMn2PaQ4pL",
    normalToken: "USDC",
    normalAmountRange: "100.00 to 500.00 USDC",
    invoicePattern: "INV-####",
    paymentHistory: "office supplies, small merchant purchases"
  },
  {
    name: "Nova Hosting",
    wallet: "9bN3pLQ7ws8Tq2VxCd44mAnpR7Zu2jVP9rwLK1nQp777",
    normalToken: "USDT",
    normalAmountRange: "20.00 to 120.00 USDT",
    invoicePattern: "HOST-####",
    paymentHistory: "VPS and domain infrastructure"
  },
  {
    name: "Lagos Design Studio",
    wallet: "6xVqL92mbRt8cJWzG9PKsH8xRUiYt2Gad34VZn7LQm12",
    normalToken: "USDC",
    normalAmountRange: "750.00 to 2000.00 USDC",
    invoicePattern: "LDS-####",
    paymentHistory: "brand and product design invoices"
  }
];

export async function matchPaymentRecipientWithRag(
  input: PaymentRagInput,
  trustedRecipients = defaultTrustedRecipients
): Promise<RecipientRagResult> {
  if (!trustedRecipients.length) {
    return {
      query: formatPaymentQuery(input),
      bestMatch: null,
      matches: [],
      recommendation: "no-match",
      reasons: ["No local trusted recipient records are available yet."]
    };
  }

  const workspace = `payguard-recipient-rag-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
  let modelId: string | undefined;

  try {
    const { GTE_LARGE_FP16: embeddingModel } = await importQvacSdk();

    if (!embeddingModel) {
      throw new Error("Could not find GTE_LARGE_FP16 in the QVAC SDK.");
    }

    modelId = await loadModel({
      modelSrc: embeddingModel,
      modelType: "llamacpp-embedding",
      onProgress: (_progress: ModelProgressUpdate) => {},
      modelConfig: {
        gpuLayers: 99,
        device: "gpu"
      }
    });

    const documents = trustedRecipients.map(formatTrustedRecipient);

    await ragIngest({
      modelId,
      workspace,
      documents,
      chunk: false
    });

    const query = formatPaymentQuery(input);
    const results = await ragSearch({
      modelId,
      workspace,
      query,
      topK: 3
    });

    const matches: RecipientRagMatch[] = results.map((result: QvacRagSearchResult) => ({
      score: result.score,
      content: result.content,
      recipientName: extractRecipientName(result.content)
    }));
    const exactWalletMatch = findExactWalletMatch(trustedRecipients, input.recipientWallet);
    const rankedMatches: RecipientRagMatch[] = exactWalletMatch
      ? [
          {
            score: 1,
            content: formatTrustedRecipient(exactWalletMatch),
            recipientName: exactWalletMatch.name
          },
          ...matches.filter((match) => !match.content.includes(exactWalletMatch.wallet))
        ]
      : matches;

    return {
      query,
      bestMatch: rankedMatches[0] ?? null,
      matches: rankedMatches,
      ...classifyMatches(rankedMatches, input)
    };
  } finally {
    await ragCloseWorkspace({ workspace, deleteOnClose: true }).catch(() => {});

    if (modelId) {
      await unloadModel({ modelId, clearStorage: false });
    }

    await close();
  }
}

function findExactWalletMatch(
  recipients: TrustedRecipientRecord[],
  walletAddress?: string
) {
  const wallet = walletAddress?.trim();

  if (!wallet) {
    return null;
  }

  return recipients.find((recipient) => recipient.wallet === wallet) ?? null;
}

function formatTrustedRecipient(recipient: TrustedRecipientRecord) {
  return [
    `Trusted recipient: ${recipient.name}`,
    `Wallet: ${recipient.wallet}`,
    `Normal token: ${recipient.normalToken}`,
    `Normal amount range: ${recipient.normalAmountRange}`,
    `Known invoice pattern: ${recipient.invoicePattern}`,
    `Payment history: ${recipient.paymentHistory}`
  ].join("\n");
}

function formatPaymentQuery(input: PaymentRagInput) {
  return [
    "New payment request:",
    input.recipientWallet ? `Recipient wallet: ${input.recipientWallet}` : null,
    input.amount ? `Amount: ${input.amount}` : null,
    input.token ? `Token: ${input.token}` : null,
    input.memo ? `Memo: ${input.memo}` : null,
    input.ocrText ? ["OCR text:", input.ocrText].join("\n") : null
  ]
    .filter(Boolean)
    .join("\n");
}

function classifyMatches(
  matches: RecipientRagMatch[],
  input: PaymentRagInput
): Pick<RecipientRagResult, "recommendation" | "reasons"> {
  const bestMatch = matches[0];

  if (!bestMatch) {
    return {
      recommendation: "no-match",
      reasons: ["No trusted recipient history matched this payment context."]
    };
  }

  const reasons = [`Closest trusted history: ${bestMatch.recipientName ?? "unknown recipient"}.`];
  const wallet = input.recipientWallet?.trim();

  if (wallet && !bestMatch.content.includes(wallet)) {
    reasons.push("Entered wallet does not exactly match the closest trusted record.");
  }

  if (bestMatch.score >= 0.72 && reasons.length === 1) {
    return {
      recommendation: "trusted-match",
      reasons
    };
  }

  if (bestMatch.score >= 0.6) {
    reasons.push("Similarity is useful, but the payment still needs review.");
    return {
      recommendation: "review",
      reasons
    };
  }

  return {
    recommendation: "no-match",
    reasons: ["No strong trusted-recipient match was found."]
  };
}

function extractRecipientName(content: string) {
  return content.match(/^Trusted recipient:\s*(.+)$/im)?.[1]?.trim() ?? null;
}

async function importQvacSdk() {
  return (await import("@qvac/sdk")) as typeof import("@qvac/sdk") & {
    GTE_LARGE_FP16: Parameters<typeof loadModel>[0] extends { modelSrc: infer ModelSrc }
      ? ModelSrc
      : unknown;
  };
}
