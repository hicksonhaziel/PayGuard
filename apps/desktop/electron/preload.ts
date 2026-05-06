import { contextBridge, ipcRenderer, webUtils } from "electron";

contextBridge.exposeInMainWorld("payguardDesktop", {
  analyzeDocumentWithOcr: (imagePath: string) =>
    ipcRenderer.invoke("qvac:analyze-document-ocr", imagePath),
  analyzePaymentRisk: (input: unknown) =>
    ipcRenderer.invoke("qvac:analyze-payment-risk", input),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  matchRecipientWithRag: (input: unknown) =>
    ipcRenderer.invoke("qvac:match-recipient-rag", input),
  onExternalWalletConnected: (callback: (wallet: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, wallet: unknown) => {
      callback(wallet);
    };

    ipcRenderer.on("wallet:external-connected", listener);

    return () => {
      ipcRenderer.removeListener("wallet:external-connected", listener);
    };
  },
  startExternalWalletConnect: () =>
    ipcRenderer.invoke("wallet:start-external-connect"),
  starterMessage: "Electron React + Tailwind starter is running."
});
