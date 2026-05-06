import {
  close,
  embed,
  loadModel,
  ragCloseWorkspace,
  ragIngest,
  ragSearch,
  unloadModel,
  type ModelProgressUpdate
} from "@qvac/sdk";

const workspace = "payguard-smoke-rag";

const trustedRecipientDocs = [
  [
    "Trusted recipient: Acme Store",
    "Wallet: 7xK9mPZrLs8Qa4NdTz6Vu1JcBf3We9HyRkSMn2PaQ4pL",
    "Normal token: USDC",
    "Normal amount range: 100.00 to 500.00 USDC",
    "Known invoice pattern: INV-####",
    "Payment history: office supplies, small merchant purchases"
  ].join("\n"),
  [
    "Trusted recipient: Nova Hosting",
    "Wallet: 9bN3pLQ7ws8Tq2VxCd44mAnpR7Zu2jVP9rwLK1nQp777",
    "Normal token: USDT",
    "Normal amount range: 20.00 to 120.00 USDT",
    "Known invoice pattern: HOST-####",
    "Payment history: VPS and domain infrastructure"
  ].join("\n"),
  [
    "Trusted recipient: Lagos Design Studio",
    "Wallet: 6xVqL92mbRt8cJWzG9PKsH8xRUiYt2Gad34VZn7LQm12",
    "Normal token: USDC",
    "Normal amount range: 750.00 to 2000.00 USDC",
    "Known invoice pattern: LDS-####",
    "Payment history: brand and product design invoices"
  ].join("\n")
];

const query = [
  "New payment request from OCR:",
  "Merchant Name: Acme Store",
  "Amount: 8125.00 USDC",
  "Invoice Number: INV-2048",
  "Wallet Address: 7xK9mPZrLs8Qa4NdTz6VulJcBf3We9HyRkSMn2PaQ4pL"
].join("\n");

void main();

async function main() {
  let modelId: string | undefined;

  try {
    console.log("QVAC embeddings + RAG smoke test");
    console.log("Loading embedding model. First run may download about 640 MB...\n");

    const { GTE_LARGE_FP16: embeddingModel } = await importQvacSdk();

    if (!embeddingModel) {
      throw new Error("Could not find GTE_LARGE_FP16 in the QVAC SDK.");
    }

    modelId = await loadModel({
      modelSrc: embeddingModel,
      modelType: "llamacpp-embedding",
      onProgress: (progress: ModelProgressUpdate) => {
        process.stdout.write(`\rLoading model: ${progress.percentage.toFixed(1)}%`);
      },
      modelConfig: {
        gpuLayers: 99,
        device: "gpu"
      }
    });

    process.stdout.write("\n");
    console.log(`Loaded embedding model: ${modelId}\n`);

    console.log("Ingesting trusted recipient history into local RAG workspace...");
    const ingestResult = await ragIngest({
      modelId,
      workspace,
      documents: trustedRecipientDocs,
      chunk: false
    });

    const successfulIngests = ingestResult.processed.filter(
      (item: { status: string }) => item.status === "fulfilled"
    );
    console.log(`Ingested ${successfulIngests.length}/${trustedRecipientDocs.length} documents\n`);

    console.log("Searching local RAG workspace for the new payment...");
    const results = await ragSearch({
      modelId,
      workspace,
      query,
      topK: 3
    });

    printSearchResults(results);

    console.log("Running direct embedding similarity check...");
    const { embedding } = await embed({
      modelId,
      text: [query, trustedRecipientDocs[0], trustedRecipientDocs[1]]
    });

    const [queryEmbedding, acmeEmbedding, novaEmbedding] = embedding;

    if (!queryEmbedding || !acmeEmbedding || !novaEmbedding) {
      throw new Error("Expected three embeddings from batch embed call.");
    }

    console.log(`  Similarity to Acme Store history: ${cosineSimilarity(queryEmbedding, acmeEmbedding).toFixed(4)}`);
    console.log(`  Similarity to Nova Hosting history: ${cosineSimilarity(queryEmbedding, novaEmbedding).toFixed(4)}`);
    console.log();

    console.log("RAG smoke test passed.");
  } catch (error) {
    console.error("\nRAG smoke test failed.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await ragCloseWorkspace({ workspace, deleteOnClose: true }).catch(() => {});

    if (modelId) {
      console.log("Unloading embedding model...");
      await unloadModel({ modelId, clearStorage: false });
    }

    await close();
  }
}

async function importQvacSdk() {
  return (await import("@qvac/sdk")) as typeof import("@qvac/sdk") & {
    GTE_LARGE_FP16: Parameters<typeof loadModel>[0] extends { modelSrc: infer ModelSrc }
      ? ModelSrc
      : unknown;
  };
}

type RagResult = Awaited<ReturnType<typeof ragSearch>>[number];

function printSearchResults(results: RagResult[]) {
  console.log("Top RAG matches:");

  for (const [index, result] of results.entries()) {
    console.log(`${index + 1}. score=${result.score.toFixed(4)}`);
    console.log(indent(result.content, "   "));
    console.log();
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;

  for (let index = 0; index < vecA.length; index += 1) {
    dotProduct += vecA[index] * vecB[index];
  }

  return dotProduct;
}

function indent(text: string, prefix: string) {
  return text
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}
