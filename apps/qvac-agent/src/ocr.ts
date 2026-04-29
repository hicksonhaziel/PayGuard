export type OcrInput = {
  fileName: string;
  mimeType: string;
};

export async function runOcr(_input: OcrInput) {
  throw new Error("QVAC OCR adapter not implemented yet.");
}

