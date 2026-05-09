import {
  close,
  loadModel,
  textToSpeech,
  unloadModel,
  type ModelProgressUpdate
} from "@qvac/sdk";
import type { RiskVerdict } from "./llm.js";

export type SpokenVerdictResult = {
  audioBase64: string;
  mimeType: "audio/wav";
  sampleRate: number;
  spokenText: string;
};

const ttsSampleRate = 44100;

export async function synthesizeSpokenVerdict(
  verdict: RiskVerdict
): Promise<SpokenVerdictResult> {
  const spokenText = formatSpokenVerdict(verdict);
  let modelId: string | undefined;

  try {
    const models = await importQvacSdk();

    modelId = await loadModel({
      modelSrc: models.TTS_SUPERTONIC2_OFFICIAL_TEXT_ENCODER_SUPERTONE_FP32,
      modelType: "onnx-tts",
      modelConfig: {
        ttsEngine: "supertonic",
        language: "en",
        ttsSpeed: 1,
        ttsNumInferenceSteps: 5,
        ttsSupertonicMultilingual: false,
        ttsTextEncoderSrc: models.TTS_SUPERTONIC2_OFFICIAL_TEXT_ENCODER_SUPERTONE_FP32,
        ttsDurationPredictorSrc:
          models.TTS_SUPERTONIC2_OFFICIAL_DURATION_PREDICTOR_SUPERTONE_FP32,
        ttsVectorEstimatorSrc:
          models.TTS_SUPERTONIC2_OFFICIAL_VECTOR_ESTIMATOR_SUPERTONE_FP32,
        ttsVocoderSrc: models.TTS_SUPERTONIC2_OFFICIAL_VOCODER_SUPERTONE_FP32,
        ttsUnicodeIndexerSrc:
          models.TTS_SUPERTONIC2_OFFICIAL_UNICODE_INDEXER_SUPERTONE_FP32,
        ttsTtsConfigSrc: models.TTS_SUPERTONIC2_OFFICIAL_TTS_CONFIG_SUPERTONE,
        ttsVoiceStyleSrc: models.TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_6
      },
      onProgress: (_progress: ModelProgressUpdate) => {}
    });

    const result = textToSpeech({
      inputType: "text",
      modelId,
      stream: false,
      text: spokenText
    });
    const samples = await result.buffer;
    await result.done;

    return {
      audioBase64: encodeWav(samples, ttsSampleRate).toString("base64"),
      mimeType: "audio/wav",
      sampleRate: ttsSampleRate,
      spokenText
    };
  } finally {
    if (modelId) {
      await unloadModel({ modelId, clearStorage: false });
    }

    await close();
  }
}

export function formatSpokenVerdict(verdict: RiskVerdict) {
  return `Verdict: ${verdict.verdict}. Recommended route: ${verdict.recommendedRoute}.`;
}

function encodeWav(samples: number[], sampleRate: number) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  samples.forEach((sample, index) => {
    const clamped = Math.max(-32768, Math.min(32767, Math.round(sample)));
    buffer.writeInt16LE(clamped, 44 + index * 2);
  });

  return buffer;
}

async function importQvacSdk() {
  return (await import("@qvac/sdk")) as typeof import("@qvac/sdk") & {
    TTS_SUPERTONIC2_OFFICIAL_DURATION_PREDICTOR_SUPERTONE_FP32: unknown;
    TTS_SUPERTONIC2_OFFICIAL_TEXT_ENCODER_SUPERTONE_FP32: unknown;
    TTS_SUPERTONIC2_OFFICIAL_TTS_CONFIG_SUPERTONE: unknown;
    TTS_SUPERTONIC2_OFFICIAL_UNICODE_INDEXER_SUPERTONE_FP32: unknown;
    TTS_SUPERTONIC2_OFFICIAL_VECTOR_ESTIMATOR_SUPERTONE_FP32: unknown;
    TTS_SUPERTONIC2_OFFICIAL_VOCODER_SUPERTONE_FP32: unknown;
    TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE_6: unknown;
  };
}
