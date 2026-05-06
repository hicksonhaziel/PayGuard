import {
  SUPPORTED_AUDIO_FORMATS,
  close,
  loadModel,
  transcribe,
  unloadModel,
  type ModelProgressUpdate,
  type TranscribeSegment
} from "@qvac/sdk";
import { existsSync } from "node:fs";
import path from "node:path";

const audioPath = resolveAudioPath(process.argv[2]);

void main();

async function main() {
  let modelId: string | undefined;

  try {
    if (!audioPath) {
      printUsage();
      process.exitCode = 1;
      return;
    }

    if (!existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    console.log("QVAC speech-to-text smoke test");
    console.log(`Audio: ${audioPath}\n`);
    console.log("Loading Whisper model. First run may download the model asset...\n");

    const { WHISPER_TINY: whisperTiny } = await importQvacSdk();

    if (!whisperTiny) {
      throw new Error("Could not find WHISPER_TINY in the QVAC SDK.");
    }

    modelId = await loadModel({
      modelSrc: whisperTiny,
      modelType: "whispercpp-transcription",
      modelConfig: {
        strategy: "greedy",
        n_threads: 4,
        language: "en",
        translate: false,
        no_timestamps: false,
        single_segment: false,
        print_timestamps: true,
        token_timestamps: true,
        temperature: 0,
        suppress_blank: true,
        suppress_nst: true,
        audio_format: "f32le",
        contextParams: {
          use_gpu: true,
          flash_attn: true,
          gpu_device: 0
        }
      },
      onProgress: (progress: ModelProgressUpdate) => {
        process.stdout.write(`\rLoading model: ${progress.percentage.toFixed(1)}%`);
      }
    });

    process.stdout.write("\n");
    console.log(`Loaded STT model: ${modelId}\n`);
    console.log("Transcribing audio...\n");

    const segments = await transcribe({
      modelId,
      audioChunk: audioPath,
      metadata: true
    });

    printSegments(segments);
    console.log("STT smoke test passed.");
  } catch (error) {
    console.error("\nSTT smoke test failed.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (modelId) {
      console.log("Unloading STT model...");
      await unloadModel({ modelId, clearStorage: false });
    }

    await close();
  }
}

async function importQvacSdk() {
  return (await import("@qvac/sdk")) as typeof import("@qvac/sdk") & {
    WHISPER_TINY: Parameters<typeof loadModel>[0] extends { modelSrc: infer ModelSrc }
      ? ModelSrc
      : unknown;
  };
}

function resolveAudioPath(inputPath?: string) {
  if (inputPath) {
    return path.resolve(process.cwd(), inputPath);
  }

  const candidates = [
    path.resolve(process.cwd(), "stttest.wav"),
    path.resolve(process.cwd(), "voice-test.wav"),
    path.resolve(process.cwd(), "../../stttest.wav"),
    path.resolve(process.cwd(), "../../voice-test.wav")
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

function printUsage() {
  console.error("Usage:");
  console.error("  npm run smoke:qvac:stt -w apps/qvac-agent -- ./path/to/audio.wav");
  console.error("");
  console.error("Suggested test phrase:");
  console.error("  Send 250 USDC to Acme Store using guarded payment.");
  console.error("");
  console.error(`Supported audio formats from SDK: ${JSON.stringify(SUPPORTED_AUDIO_FORMATS)}`);
}

function printSegments(segments: TranscribeSegment[]) {
  console.log("Transcript segments:");

  for (const segment of segments) {
    const start = (segment.startMs / 1000).toFixed(2);
    const end = (segment.endMs / 1000).toFixed(2);
    console.log(`  [${start}s -> ${end}s] ${segment.text}`);
  }

  const transcript = segments.map((segment) => segment.text).join("").trim();

  console.log();
  console.log(`Full transcript: ${transcript || "(empty)"}`);
  console.log();
}
