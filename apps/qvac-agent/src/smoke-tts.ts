import {
  close,
  loadModel,
  textToSpeech,
  unloadModel,
  type ModelProgressUpdate
} from "@qvac/sdk";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const sampleRate = 44100;
const defaultText =
  "PayGuard marked this payment for review because the amount is much higher than normal and the recipient wallet does not fully match your trusted history. Guarded payment is recommended.";
const text = process.argv.slice(2).join(" ") || defaultText;
const outputPath = path.resolve(process.cwd(), "tts-output.wav");
const voiceStyle = process.env.PAYGUARD_TTS_VOICE ?? "F2";
const ttsEngine = process.env.PAYGUARD_TTS_ENGINE ?? "supertonic";
const referenceAudioPath = process.env.PAYGUARD_TTS_REFERENCE
  ? path.resolve(process.cwd(), process.env.PAYGUARD_TTS_REFERENCE)
  : resolveReferenceAudioPath();

void main();

async function main() {
  let modelId: string | undefined;

  try {
    console.log("QVAC text-to-speech smoke test");
    console.log(`Engine: ${ttsEngine}`);
    console.log(`Text: ${text}`);
    console.log(`Voice: ${ttsEngine === "supertonic" ? voiceStyle : referenceAudioPath ?? "none"}`);
    console.log(`Output: ${outputPath}\n`);
    console.log("Loading TTS model assets. First run may download several files...\n");

    const ttsModels = await importQvacSdk();
    const loadOptions =
      ttsEngine === "chatterbox"
        ? createChatterboxLoadOptions(ttsModels)
        : createSupertonicLoadOptions(ttsModels);

    modelId = await loadModel(loadOptions);

    process.stdout.write("\n");
    console.log(`Loaded TTS model: ${modelId}\n`);
    console.log("Generating speech...\n");

    const result = textToSpeech({
      modelId,
      text,
      inputType: "text",
      stream: false
    });

    const samples = await result.buffer;
    await result.done;

    printSampleStats(samples);

    const wav = createWav(samples, ttsEngine === "chatterbox" ? 24000 : sampleRate);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, wav);

    console.log(`Generated ${samples.length} PCM samples.`);
    console.log(`Saved WAV: ${outputPath}`);
    console.log("TTS smoke test passed.");
  } catch (error) {
    console.error("\nTTS smoke test failed.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (modelId) {
      console.log("Unloading TTS model...");
      await unloadModel({ modelId, clearStorage: false });
    }

    await close();
  }
}

function createSupertonicLoadOptions(ttsModels: TtsModels) {
  const selectedVoice = selectVoiceStyle(ttsModels, voiceStyle);

  return {
      modelSrc: ttsModels.TTS_SUPERTONIC2_OFFICIAL_TEXT_ENCODER_SUPERTONE_FP32.src,
      modelType: "onnx-tts",
      modelConfig: {
        ttsEngine: "supertonic",
        language: "en",
        ttsSpeed: 1,
        ttsNumInferenceSteps: 5,
        ttsSupertonicMultilingual: false,
        ttsTextEncoderSrc: ttsModels.TTS_SUPERTONIC2_OFFICIAL_TEXT_ENCODER_SUPERTONE_FP32.src,
        ttsDurationPredictorSrc:
          ttsModels.TTS_SUPERTONIC2_OFFICIAL_DURATION_PREDICTOR_SUPERTONE_FP32.src,
        ttsVectorEstimatorSrc:
          ttsModels.TTS_SUPERTONIC2_OFFICIAL_VECTOR_ESTIMATOR_SUPERTONE_FP32.src,
        ttsVocoderSrc: ttsModels.TTS_SUPERTONIC2_OFFICIAL_VOCODER_SUPERTONE_FP32.src,
        ttsUnicodeIndexerSrc:
          ttsModels.TTS_SUPERTONIC2_OFFICIAL_UNICODE_INDEXER_SUPERTONE_FP32.src,
        ttsTtsConfigSrc: ttsModels.TTS_SUPERTONIC2_OFFICIAL_TTS_CONFIG_SUPERTONE.src,
        ttsVoiceStyleSrc: selectedVoice.src
      },
      onProgress: (progress: ModelProgressUpdate) => {
        process.stdout.write(`\rLoading assets: ${progress.percentage.toFixed(1)}%`);
      }
    } as const;
}

function createChatterboxLoadOptions(ttsModels: TtsModels) {
  if (!referenceAudioPath) {
    throw new Error(
      "Chatterbox requires reference audio. Set PAYGUARD_TTS_REFERENCE=./path/to/reference.wav"
    );
  }

  return {
    modelSrc: ttsModels.TTS_TOKENIZER_EN_CHATTERBOX.src,
    modelType: "onnx-tts",
    modelConfig: {
      ttsEngine: "chatterbox",
      language: "en",
      ttsTokenizerSrc: ttsModels.TTS_TOKENIZER_EN_CHATTERBOX.src,
      ttsSpeechEncoderSrc: ttsModels.TTS_SPEECH_ENCODER_EN_CHATTERBOX_FP32.src,
      ttsEmbedTokensSrc: ttsModels.TTS_EMBED_TOKENS_EN_CHATTERBOX_FP32.src,
      ttsConditionalDecoderSrc: ttsModels.TTS_CONDITIONAL_DECODER_EN_CHATTERBOX_FP32.src,
      ttsLanguageModelSrc: ttsModels.TTS_LANGUAGE_MODEL_EN_CHATTERBOX_FP32.src,
      referenceAudioSrc: referenceAudioPath
    },
    onProgress: (progress: ModelProgressUpdate) => {
      process.stdout.write(`\rLoading assets: ${progress.percentage.toFixed(1)}%`);
    }
  } as const;
}

type LoadableModel = {
  src: string;
};

type TtsModels = {
  TTS_SUPERTONIC2_OFFICIAL_TEXT_ENCODER_SUPERTONE_FP32: LoadableModel;
  TTS_SUPERTONIC2_OFFICIAL_DURATION_PREDICTOR_SUPERTONE_FP32: LoadableModel;
  TTS_SUPERTONIC2_OFFICIAL_VECTOR_ESTIMATOR_SUPERTONE_FP32: LoadableModel;
  TTS_SUPERTONIC2_OFFICIAL_VOCODER_SUPERTONE_FP32: LoadableModel;
  TTS_SUPERTONIC2_OFFICIAL_UNICODE_INDEXER_SUPERTONE_FP32: LoadableModel;
  TTS_SUPERTONIC2_OFFICIAL_TTS_CONFIG_SUPERTONE: LoadableModel;
  TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE: LoadableModel;
  TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_1: LoadableModel;
  TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_2: LoadableModel;
  TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_3: LoadableModel;
  TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_4: LoadableModel;
  TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_5: LoadableModel;
  TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_6: LoadableModel;
  TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_7: LoadableModel;
  TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_8: LoadableModel;
  TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_9: LoadableModel;
  TTS_TOKENIZER_EN_CHATTERBOX: LoadableModel;
  TTS_SPEECH_ENCODER_EN_CHATTERBOX_FP32: LoadableModel;
  TTS_EMBED_TOKENS_EN_CHATTERBOX_FP32: LoadableModel;
  TTS_CONDITIONAL_DECODER_EN_CHATTERBOX_FP32: LoadableModel;
  TTS_LANGUAGE_MODEL_EN_CHATTERBOX_FP32: LoadableModel;
};

async function importQvacSdk() {
  return (await import("@qvac/sdk")) as typeof import("@qvac/sdk") & TtsModels;
}

function selectVoiceStyle(models: TtsModels, voice: string) {
  const voiceMap: Record<string, LoadableModel> = {
    F1: models.TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE,
    F2: models.TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_1,
    F3: models.TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_2,
    F4: models.TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_3,
    F5: models.TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_4,
    M1: models.TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_5,
    M2: models.TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_6,
    M3: models.TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_7,
    M4: models.TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_8,
    M5: models.TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_9
  };

  const selected = voiceMap[voice.toUpperCase()];

  if (!selected) {
    throw new Error(`Unknown TTS voice "${voice}". Use one of: ${Object.keys(voiceMap).join(", ")}`);
  }

  return selected;
}

function resolveReferenceAudioPath() {
  const candidates = [
    path.resolve(process.cwd(), "reference.wav"),
    path.resolve(process.cwd(), "Jalingo.wav"),
    path.resolve(process.cwd(), "Jalingo.m4a"),
    path.resolve(process.cwd(), "../../reference.wav"),
    path.resolve(process.cwd(), "../../Jalingo.wav"),
    path.resolve(process.cwd(), "../../Jalingo.m4a")
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

function createWav(samples: number[], wavSampleRate: number) {
  const data = int16ArrayToBuffer(samples);
  return Buffer.concat([createWavHeader(data.length, wavSampleRate), data]);
}

function int16ArrayToBuffer(samples: number[]) {
  const buffer = Buffer.alloc(samples.length * 2);
  const maxAbs = samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
  const normalizedFloatOutput = maxAbs <= 1.5;
  const scale = normalizedFloatOutput ? 32767 : maxAbs > 32767 ? 32767 / maxAbs : 1;

  for (let index = 0; index < samples.length; index += 1) {
    const raw = Number.isFinite(samples[index]) ? samples[index] : 0;
    const sample = Math.max(-32768, Math.min(32767, Math.round(raw * scale)));
    buffer.writeInt16LE(sample, index * 2);
  }

  return buffer;
}

function printSampleStats(samples: number[]) {
  let min = Infinity;
  let max = -Infinity;
  let nonFinite = 0;

  for (const sample of samples) {
    if (!Number.isFinite(sample)) {
      nonFinite += 1;
      continue;
    }

    min = Math.min(min, sample);
    max = Math.max(max, sample);
  }

  console.log("PCM sample stats:");
  console.log(`  min=${min.toFixed(4)} max=${max.toFixed(4)} nonFinite=${nonFinite}`);
  console.log();
}

function createWavHeader(dataLength: number, wavSampleRate: number) {
  const header = Buffer.alloc(44);
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = wavSampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(wavSampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}
