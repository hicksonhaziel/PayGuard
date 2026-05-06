import {
  close,
  completion,
  loadModel,
  type ModelProgressUpdate,
  unloadModel
} from "@qvac/sdk";

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
    spokenSummary: {
      type: "string"
    }
  },
  required: ["verdict", "riskScore", "recommendedRoute", "reasons", "spokenSummary"],
  additionalProperties: false
} as const;

void main();

async function main() {
  let modelId: string | undefined;

  try {
    console.log("QVAC LLM completion smoke test");
    console.log("Loading small local LLM. First run may download around a few hundred MB...\n");

    const { QWEN3_600M_INST_Q4: qwen3Small } = await importQvacSdk();

    if (!qwen3Small) {
      throw new Error("Could not find QWEN3_600M_INST_Q4 in the QVAC SDK.");
    }

    modelId = await loadModel({
      modelSrc: qwen3Small,
      modelType: "llamacpp-completion",
      onProgress: (progress: ModelProgressUpdate) => {
        process.stdout.write(`\rLoading model: ${progress.percentage.toFixed(1)}%`);
      }
    });

    process.stdout.write("\n");
    console.log(`Loaded LLM model: ${modelId}\n`);

    const prompt = [
      "Analyze this Solana stablecoin payment before signature.",
      "",
      "Payment extracted from OCR:",
      "- merchantName: Acme Store",
      "- amount: 8125.00",
      "- token: USDC",
      "- invoiceNumber: INV-2048",
      "- walletAddress: 7xK9mPZrLs8Qa4NdTz6VulJcBf3We9HyRkSMn2PaQ4pL",
      "",
      "Local trusted recipient history:",
      "- Acme Store is trusted.",
      "- Last known Acme Store wallet: 7xK9mPZrLs8Qa4NdTz6Vu1JcBf3We9HyRkSMn2PaQ4pL",
      "- Normal Acme Store payment range: 100.00 to 500.00 USDC.",
      "",
      "Return a risk verdict. Consider wallet mismatch, amount deviation, invoice consistency, and whether guarded payment is safer."
    ].join("\n");

    console.log("Running risk analysis...\n");

    const run = completion({
      modelId,
      stream: true,
      history: [
        {
          role: "system",
          content:
            "You are PayGuard's local payment risk analyst. Reply only with the requested JSON. /no_think"
        },
        {
          role: "user",
          content: prompt
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
      if (event.type === "contentDelta") {
        process.stdout.write(event.text);
      }
    }

    const final = await run.final;
    const parsed = JSON.parse(final.contentText.trim()) as RiskVerdict;

    process.stdout.write("\n\n");
    printVerdict(parsed);
    console.log("LLM smoke test passed.");
  } catch (error) {
    console.error("\nLLM smoke test failed.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (modelId) {
      console.log("Unloading LLM model...");
      await unloadModel({ modelId, clearStorage: false });
    }

    await close();
  }
}

async function importQvacSdk() {
  return (await import("@qvac/sdk")) as typeof import("@qvac/sdk") & {
    QWEN3_600M_INST_Q4: Parameters<typeof loadModel>[0] extends { modelSrc: infer ModelSrc }
      ? ModelSrc
      : unknown;
  };
}

type RiskVerdict = {
  verdict: "Safe" | "Review" | "Block";
  riskScore: number;
  recommendedRoute: "Direct Send" | "Guarded Payment" | "Block";
  reasons: string[];
  spokenSummary: string;
};

function printVerdict(verdict: RiskVerdict) {
  console.log("Parsed verdict:");
  console.log(`  Verdict: ${verdict.verdict}`);
  console.log(`  Risk score: ${verdict.riskScore}`);
  console.log(`  Recommended route: ${verdict.recommendedRoute}`);
  console.log("  Reasons:");

  for (const reason of verdict.reasons) {
    console.log(`    - ${reason}`);
  }

  console.log(`  Spoken summary: ${verdict.spokenSummary}`);
  console.log();
}
