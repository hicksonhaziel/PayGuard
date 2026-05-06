import {
  ModelType,
  close,
  modelRegistryList,
  modelRegistrySearch,
  type ModelRegistryEntry
} from "@qvac/sdk";

type RegistryCheck = {
  label: string;
  search: Parameters<typeof modelRegistrySearch>[0];
};

const checks: RegistryCheck[] = [
  {
    label: "OCR",
    search: { addon: "ocr" }
  },
  {
    label: "LLM completion",
    search: { engine: ModelType.llamacppCompletion }
  },
  {
    label: "Text embeddings",
    search: { engine: ModelType.llamacppEmbedding }
  },
  {
    label: "Speech-to-text",
    search: { addon: "whisper" }
  },
  {
    label: "Text-to-speech",
    search: { addon: "tts" }
  }
];

void main();

async function main() {
  console.log("QVAC model registry smoke test");
  console.log("Checking model availability for PayGuard capabilities...\n");

  try {
    const allModels = await modelRegistryList();
    console.log(`Registry reachable: ${allModels.length} total models found\n`);

    for (const check of checks) {
      const models = await modelRegistrySearch(check.search);
      printModelSummary(check.label, models);
    }

    console.log("Smoke test passed: QVAC SDK can reach and query the model registry.");
    await close();
  } catch (error) {
    console.error("Smoke test failed.");
    console.error(error);
    await close();
    process.exit(1);
  }
}

function printModelSummary(label: string, models: ModelRegistryEntry[]) {
  console.log(`${label}: ${models.length} model(s)`);

  for (const model of models.slice(0, 3)) {
    console.log(
      `  - ${model.name} | addon=${model.addon} | engine=${model.engine} | size=${formatSize(
        model.expectedSize
      )}`
    );
  }

  if (models.length > 3) {
    console.log(`  ...and ${models.length - 3} more`);
  }

  console.log();
}

function formatSize(bytes?: number) {
  if (!bytes) {
    return "unknown";
  }

  if (bytes < 1024) {
    return `${bytes}B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}
