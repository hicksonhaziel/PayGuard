import {
  loadModel,
  ocr,
  unloadModel,
  type OCRTextBlock
} from "@qvac/sdk";
import { existsSync } from "node:fs";

export type QvacOcrHintSet = {
  amounts: string[];
  invoiceIds: string[];
  possibleWallets: string[];
  addressLikeValues: string[];
};

export type QvacOcrBlock = {
  text: string;
  confidence?: number;
};

export type QvacOcrResult = {
  imagePath: string;
  text: string;
  blocks: QvacOcrBlock[];
  hints: QvacOcrHintSet;
  stats: unknown;
};

export async function analyzeDocumentWithOcr(imagePath: string): Promise<QvacOcrResult> {
  if (!existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }

  let modelId: string | undefined;
  let closeSdk: () => Promise<void> = async () => {};

  try {
    const { close, OCR_LATIN_RECOGNIZER_1: latinRecognizer } = await importQvacSdk();
    closeSdk = close;

    if (!latinRecognizer) {
      throw new Error("Could not find the Latin OCR recognizer model in the QVAC SDK.");
    }

    modelId = await loadModel({
      modelSrc: latinRecognizer,
      modelType: "onnx-ocr",
      modelConfig: {
        langList: ["en"],
        useGPU: true,
        timeout: 30000,
        magRatio: 1.5,
        defaultRotationAngles: [90, 180, 270],
        contrastRetry: false,
        lowConfidenceThreshold: 0.5,
        recognizerBatchSize: 1
      }
    });

    const { blocks, stats } = ocr({
      modelId,
      image: imagePath,
      options: {
        paragraph: false
      }
    });

    const textBlocks = await blocks;
    const ocrStats = await stats;
    const normalizedBlocks = normalizeBlocks(textBlocks);
    const text = normalizedBlocks.map((block) => block.text).join("\n");

    return {
      imagePath,
      text,
      blocks: normalizedBlocks,
      hints: extractOcrHints(text),
      stats: ocrStats ?? null
    };
  } finally {
    if (modelId) {
      await unloadModel({ modelId, clearStorage: false });
    }

    await closeSdk();
  }
}

export function extractOcrHints(text: string): QvacOcrHintSet {
  return {
    amounts: uniqueMatches(
      text,
      /(?:[$€£]\s*)?\b\d+(?:,\d{3})*(?:\.\d{2,8})?\b\s*(?:USDT|USDC|USD|EUR|NGN)?/gi
    ),
    invoiceIds: uniqueMatches(
      text,
      /\b(?:invoice|inv|receipt|order|ref|reference|txn|transaction)[\s:#-]*[A-Z0-9-]{3,}\b/gi
    ),
    possibleWallets: uniqueMatches(text, /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g),
    addressLikeValues: uniqueMatches(text, /\b[A-Za-z0-9]{32,50}\b/g)
  };
}

async function importQvacSdk() {
  return (await import("@qvac/sdk")) as typeof import("@qvac/sdk") & {
    OCR_LATIN_RECOGNIZER_1: Parameters<typeof loadModel>[0] extends { modelSrc: infer ModelSrc }
      ? ModelSrc
      : unknown;
    close: () => Promise<void>;
  };
}

function normalizeBlocks(blocks: OCRTextBlock[]): QvacOcrBlock[] {
  return blocks
    .map((block) => ({
      text: block.text.trim(),
      confidence: block.confidence
    }))
    .filter((block) => block.text.length > 0);
}

function uniqueMatches(text: string, regex: RegExp) {
  return [...new Set([...text.matchAll(regex)].map((match) => match[0].trim()))];
}
