import {
  loadModel,
  ocr,
  unloadModel,
  type OCRTextBlock
} from "@qvac/sdk";
import { existsSync } from "node:fs";
import path from "node:path";

const imagePath = resolveImagePath(process.argv[2]);

void main();

async function main() {
  let modelId: string | undefined;
  let closeSdk: () => Promise<void> = async () => {};

  try {
    if (!existsSync(imagePath)) {
      throw new Error(`Image not found: ${imagePath}`);
    }

    console.log("QVAC OCR smoke test");
    console.log(`Image: ${imagePath}\n`);
    console.log("Loading OCR model. First run may download the OCR model assets...");

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

    console.log(`Loaded OCR model: ${modelId}`);
    console.log("Running OCR...\n");

    const { blocks, stats } = ocr({
      modelId,
      image: imagePath,
      options: {
        paragraph: false
      }
    });

    const textBlocks = await blocks;
    const ocrStats = await stats;

    printBlocks(textBlocks);
    printStructuredHints(textBlocks);

    if (ocrStats) {
      console.log("OCR stats:");
      console.log(JSON.stringify(ocrStats, null, 2));
      console.log();
    }

    console.log("OCR smoke test passed.");
  } catch (error) {
    console.error("OCR smoke test failed.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (modelId) {
      console.log("Unloading OCR model...");
      await unloadModel({ modelId, clearStorage: false });
    }

    await closeSdk();
  }
}

async function importQvacSdk() {
  return (await import("@qvac/sdk")) as typeof import("@qvac/sdk") & {
    OCR_LATIN_RECOGNIZER_1: Parameters<typeof loadModel>[0] extends { modelSrc: infer ModelSrc }
      ? ModelSrc
      : unknown;
    close: () => Promise<void>;
  };
}

function resolveImagePath(inputPath?: string) {
  if (inputPath) {
    return path.resolve(process.cwd(), inputPath);
  }

  const candidates = [
    path.resolve(process.cwd(), "ocrtest.png"),
    path.resolve(process.cwd(), "../../ocrtest.png")
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function printBlocks(blocks: OCRTextBlock[]) {
  console.log(`Raw OCR text blocks: ${blocks.length}`);

  for (const [index, block] of blocks.entries()) {
    const confidence =
      block.confidence === undefined ? "unknown" : `${Math.round(block.confidence * 100)}%`;
    console.log(`${index + 1}. "${block.text}" confidence=${confidence}`);
  }

  console.log();
}

function printStructuredHints(blocks: OCRTextBlock[]) {
  const text = blocks.map((block) => block.text).join("\n");
  const amounts = uniqueMatches(
    text,
    /(?:[$€£]\s*)?\b\d+(?:,\d{3})*(?:\.\d{2,8})?\b\s*(?:USDT|USDC|USD|EUR|NGN)?/gi
  );
  const invoiceIds = uniqueMatches(
    text,
    /\b(?:invoice|inv|receipt|order|ref|reference|txn|transaction)[\s:#-]*[A-Z0-9-]{3,}\b/gi
  );
  const possibleWallets = uniqueMatches(text, /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g);
  const addressLikeValues = uniqueMatches(text, /\b[A-Za-z0-9]{32,50}\b/g);

  console.log("Structured hints:");
  console.log(`  Amount-like values: ${amounts.length ? amounts.join(", ") : "none found"}`);
  console.log(`  Invoice/reference IDs: ${invoiceIds.length ? invoiceIds.join(", ") : "none found"}`);
  console.log(
    `  Possible Solana addresses: ${possibleWallets.length ? possibleWallets.join(", ") : "none found"}`
  );
  console.log(
    `  Address-like OCR values: ${addressLikeValues.length ? addressLikeValues.join(", ") : "none found"}`
  );
  console.log();
}

function uniqueMatches(text: string, regex: RegExp) {
  return [...new Set([...text.matchAll(regex)].map((match) => match[0].trim()))];
}
