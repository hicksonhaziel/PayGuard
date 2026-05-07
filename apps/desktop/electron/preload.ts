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
  getWalletBalances: (input: unknown) =>
    ipcRenderer.invoke("wallet:get-balances", input),
  startDirectSend: (input: unknown) =>
    ipcRenderer.invoke("wallet:direct-send", input),
  startGuardedPayment: (input: unknown) =>
    ipcRenderer.invoke("wallet:guarded-payment", input),
  startGuardedCancel: (input: unknown) =>
    ipcRenderer.invoke("wallet:guarded-cancel", input),
  startGuardedClaim: (input: unknown) =>
    ipcRenderer.invoke("wallet:guarded-claim", input),
  listGuardedPayments: (input: unknown) =>
    ipcRenderer.invoke("wallet:list-guarded-payments", input),
  startExternalWalletConnect: () =>
    ipcRenderer.invoke("wallet:start-external-connect"),
  store: {
    addPaymentHistory: (input: unknown) =>
      ipcRenderer.invoke("store:history:add", input),
    addRecipient: (input: unknown) =>
      ipcRenderer.invoke("store:recipients:add", input),
    listOnchainImports: (input: unknown) =>
      ipcRenderer.invoke("store:onchain-imports:list", input),
    listPaymentHistory: (input: unknown) =>
      ipcRenderer.invoke("store:history:list", input),
    listRecipients: (input: unknown) =>
      ipcRenderer.invoke("store:recipients:list", input)
  },
  starterMessage: "Electron React + Tailwind starter is running."
});
