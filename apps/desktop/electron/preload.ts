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
  getWalletBalances: (walletAddress: string) =>
    ipcRenderer.invoke("wallet:get-balances", walletAddress),
  startExternalWalletConnect: () =>
    ipcRenderer.invoke("wallet:start-external-connect"),
  store: {
    addPaymentHistory: (input: unknown) =>
      ipcRenderer.invoke("store:history:add", input),
    addRecipient: (input: unknown) =>
      ipcRenderer.invoke("store:recipients:add", input),
    listOnchainImports: (ownerWallet: string) =>
      ipcRenderer.invoke("store:onchain-imports:list", ownerWallet),
    listPaymentHistory: (ownerWallet: string) =>
      ipcRenderer.invoke("store:history:list", ownerWallet),
    listRecipients: (ownerWallet: string) =>
      ipcRenderer.invoke("store:recipients:list", ownerWallet)
  },
  starterMessage: "Electron React + Tailwind starter is running."
});
