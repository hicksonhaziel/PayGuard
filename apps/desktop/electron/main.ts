import path from "node:path";
import http from "node:http";
import { existsSync } from "node:fs";
import { app, BrowserWindow, ipcMain, nativeImage, shell } from "electron";
import {
  analyzeDocumentWithOcr,
  analyzePaymentRiskWithLlm,
  matchPaymentRecipientWithRag,
  type PaymentRagInput,
  type RiskAnalysisInput
} from "@payguard/qvac-agent";
import {
  addPaymentHistory,
  addRecipient,
  listOnchainImports,
  listPaymentHistory,
  listRecipients,
  type StoredPaymentHistory
} from "./local-store.js";

const devServerUrl = "http://127.0.0.1:5174";
const appIconPath = path.join(__dirname, "../assets/icon.png");
const supportedOcrExtensions = new Set([".png", ".jpg", ".jpeg"]);
const solanaRpcUrl =
  process.env.PAYGUARD_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const stablecoinMints = {
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
} as const;
const balanceCacheTtlMs = Number(process.env.PAYGUARD_BALANCE_CACHE_SECONDS ?? 60) * 1000;
let walletBridgeServer: http.Server | null = null;
let walletBridgeTimeout: NodeJS.Timeout | null = null;
let mainWindow: BrowserWindow | null = null;
const balanceCache = new Map<string, CachedWalletBalances>();

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
}

function getAppIcon() {
  const image = nativeImage.createFromPath(appIconPath);

  if (image.isEmpty()) {
    return appIconPath;
  }

  return image.resize({ width: 256, height: 256 });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#07111f",
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (app.isPackaged) {
    window.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    window.loadURL(devServerUrl);
  }

  window.on("closed", () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  mainWindow = window;
}

function registerQvacHandlers() {
  ipcMain.handle("qvac:analyze-document-ocr", async (_event, imagePath: unknown) => {
    if (typeof imagePath !== "string" || !imagePath.trim()) {
      throw new Error("A local image path is required for QVAC OCR.");
    }

    const normalizedPath = path.resolve(imagePath);
    const extension = path.extname(normalizedPath).toLowerCase();

    if (!supportedOcrExtensions.has(extension)) {
      throw new Error("QVAC OCR currently supports PNG and JPG images.");
    }

    if (!existsSync(normalizedPath)) {
      throw new Error(`Document not found: ${normalizedPath}`);
    }

    return analyzeDocumentWithOcr(normalizedPath);
  });

  ipcMain.handle("qvac:match-recipient-rag", async (_event, input: unknown) => {
    if (!isPaymentRagInput(input)) {
      throw new Error("Valid payment context is required for QVAC RAG matching.");
    }

    return matchPaymentRecipientWithRag(input);
  });

  ipcMain.handle("qvac:analyze-payment-risk", async (_event, input: unknown) => {
    if (!isRiskAnalysisInput(input)) {
      throw new Error("Valid payment analysis context is required for QVAC LLM.");
    }

    return analyzePaymentRiskWithLlm(input);
  });
}

function registerWalletHandlers() {
  ipcMain.handle("wallet:start-external-connect", async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);

    if (!window) {
      throw new Error("Could not find the PayGuard window for wallet connection.");
    }

    const connectUrl = await startExternalWalletBridge(window);
    await shell.openExternal(connectUrl);

    return { url: connectUrl };
  });

  ipcMain.handle("wallet:get-balances", async (_event, walletAddress: unknown) => {
    if (typeof walletAddress !== "string" || !walletAddress.trim()) {
      throw new Error("A connected wallet address is required to fetch balances.");
    }

    return getWalletBalances(walletAddress.trim());
  });
}

async function getWalletBalances(walletAddress: string) {
  const now = Date.now();
  const cached = balanceCache.get(walletAddress);

  if (cached && cached.expiresAt > now) {
    return createBalanceResponse(cached, false, {});
  }

  const [sol, usdc, usdt] = await Promise.allSettled([
    getSolBalance(walletAddress),
    getSplTokenBalance(walletAddress, stablecoinMints.USDC),
    getSplTokenBalance(walletAddress, stablecoinMints.USDT)
  ]);
  const errors = {
    SOL: getBalanceError(sol),
    USDC: getBalanceError(usdc),
    USDT: getBalanceError(usdt)
  };
  const nextBalances = {
    SOL: unwrapBalanceResult(sol, cached?.balances.SOL ?? null),
    USDC: unwrapBalanceResult(usdc, cached?.balances.USDC ?? null),
    USDT: unwrapBalanceResult(usdt, cached?.balances.USDT ?? null)
  };
  const nextCache: CachedWalletBalances = {
    balances: nextBalances,
    cachedAt:
      sol.status === "fulfilled" || usdc.status === "fulfilled" || usdt.status === "fulfilled"
        ? now
        : cached?.cachedAt ?? now,
    expiresAt: now + balanceCacheTtlMs
  };

  balanceCache.set(walletAddress, nextCache);

  return createBalanceResponse(nextCache, Boolean(cached), errors);
}

function unwrapBalanceResult(
  result: PromiseSettledResult<number>,
  fallback: number | null
) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function getBalanceError(result: PromiseSettledResult<number>) {
  if (result.status === "fulfilled") {
    return null;
  }

  return result.reason instanceof Error ? result.reason.message : "Balance request failed.";
}

function createBalanceResponse(
  cached: CachedWalletBalances,
  isStale: boolean,
  errors: WalletBalanceErrors
) {
  return {
    ...cached.balances,
    cachedAt: new Date(cached.cachedAt).toISOString(),
    errors,
    expiresAt: new Date(cached.expiresAt).toISOString(),
    isStale
  };
}

async function getSolBalance(walletAddress: string) {
  const response = await callSolanaRpc<{ value: number }>("getBalance", [
    walletAddress,
    { commitment: "confirmed" }
  ]);

  return response.value / 1_000_000_000;
}

async function getSplTokenBalance(walletAddress: string, mintAddress: string) {
  const response = await callSolanaRpc<TokenAccountsByOwnerResult>(
    "getTokenAccountsByOwner",
    [
      walletAddress,
      { mint: mintAddress },
      { commitment: "confirmed", encoding: "jsonParsed" }
    ]
  );

  return response.value.reduce((total, account) => {
    const tokenAmount = account.account.data.parsed.info.tokenAmount;
    const rawAmount = Number(tokenAmount.amount);

    if (!Number.isFinite(rawAmount)) {
      return total;
    }

    return total + rawAmount / 10 ** tokenAmount.decimals;
  }, 0);
}

async function callSolanaRpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(solanaRpcUrl, {
    body: JSON.stringify({
      id: crypto.randomUUID(),
      jsonrpc: "2.0",
      method,
      params
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Solana RPC request failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as {
    error?: { message?: string };
    result?: T;
  };

  if (payload.error) {
    throw new Error(payload.error.message ?? "Solana RPC returned an error.");
  }

  if (payload.result === undefined) {
    throw new Error("Solana RPC did not return a result.");
  }

  return payload.result;
}

type TokenAccountsByOwnerResult = {
  value: Array<{
    account: {
      data: {
        parsed: {
          info: {
            tokenAmount: {
              amount: string;
              decimals: number;
            };
          };
        };
      };
    };
  }>;
};

type WalletBalanceSymbol = "SOL" | "USDC" | "USDT";

type WalletBalanceMap = Record<WalletBalanceSymbol, number | null>;

type WalletBalanceErrors = Partial<Record<WalletBalanceSymbol, string | null>>;

type CachedWalletBalances = {
  balances: WalletBalanceMap;
  cachedAt: number;
  expiresAt: number;
};

function registerLocalStoreHandlers() {
  ipcMain.handle("store:recipients:list", (_event, ownerWallet: unknown) =>
    listRecipients(assertOwnerWallet(ownerWallet))
  );

  ipcMain.handle("store:recipients:add", (_event, input: unknown) => {
    if (!isRecipientInput(input)) {
      throw new Error("Valid recipient name and wallet address are required.");
    }

    return addRecipient(input);
  });

  ipcMain.handle("store:history:list", (_event, ownerWallet: unknown) =>
    listPaymentHistory(assertOwnerWallet(ownerWallet))
  );

  ipcMain.handle("store:history:add", (_event, input: unknown) => {
    if (!isPaymentHistoryInput(input)) {
      throw new Error("Valid payment history details are required.");
    }

    return addPaymentHistory(input);
  });

  ipcMain.handle("store:onchain-imports:list", (_event, ownerWallet: unknown) =>
    listOnchainImports(assertOwnerWallet(ownerWallet))
  );
}

function assertOwnerWallet(ownerWallet: unknown) {
  if (typeof ownerWallet !== "string" || !ownerWallet.trim()) {
    throw new Error("A connected wallet address is required.");
  }

  return ownerWallet.trim();
}

function isPaymentRagInput(input: unknown): input is PaymentRagInput {
  if (!input || typeof input !== "object") {
    return false;
  }

  return ["ocrText", "recipientWallet", "amount", "token", "memo"].every((key) => {
    const value = (input as Record<string, unknown>)[key];
    return value === undefined || typeof value === "string";
  });
}

function isRiskAnalysisInput(input: unknown): input is RiskAnalysisInput {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as { payment?: unknown; ocrText?: unknown };

  return (
    isPaymentRagInput(candidate.payment) &&
    (candidate.ocrText === undefined || typeof candidate.ocrText === "string")
  );
}

function isRecipientInput(input: unknown): input is Parameters<typeof addRecipient>[0] {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Record<string, unknown>;

  return (
    typeof candidate.walletAddress === "string" &&
    candidate.walletAddress.trim().length > 0 &&
    typeof candidate.ownerWallet === "string" &&
    candidate.ownerWallet.trim().length > 0 &&
    (candidate.name === undefined || typeof candidate.name === "string") &&
    (candidate.category === undefined || typeof candidate.category === "string") &&
    (candidate.notes === undefined || typeof candidate.notes === "string")
  );
}

function isPaymentHistoryInput(
  input: unknown
): input is Parameters<typeof addPaymentHistory>[0] {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Record<string, unknown>;
  const validRoutes: StoredPaymentHistory["route"][] = [
    "Direct Send",
    "Guarded Payment",
    "Block"
  ];
  const validVerdicts: StoredPaymentHistory["verdict"][] = [
    "Safe",
    "Review",
    "Block"
  ];

  return (
    typeof candidate.amount === "string" &&
    typeof candidate.ownerWallet === "string" &&
    candidate.ownerWallet.trim().length > 0 &&
    typeof candidate.recipientName === "string" &&
    typeof candidate.recipientWallet === "string" &&
    typeof candidate.riskScore === "number" &&
    typeof candidate.summary === "string" &&
    typeof candidate.token === "string" &&
    validRoutes.includes(candidate.route as StoredPaymentHistory["route"]) &&
    validVerdicts.includes(candidate.verdict as StoredPaymentHistory["verdict"]) &&
    (candidate.senderWallet === undefined || typeof candidate.senderWallet === "string") &&
    (candidate.txSignature === undefined || typeof candidate.txSignature === "string") &&
    (candidate.source === undefined ||
      candidate.source === "manual" ||
      candidate.source === "payguard" ||
      candidate.source === "onchain-import")
  );
}

async function startExternalWalletBridge(window: BrowserWindow) {
  await closeWalletBridge();

  const nonce = crypto.randomUUID();

  walletBridgeServer = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/connect") {
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      });
      response.end(renderWalletConnectPage(nonce));
      return;
    }

    if (request.method === "POST" && url.pathname === "/wallet-connected") {
      const chunks: Buffer[] = [];

      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        try {
          const payload = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
            address?: unknown;
            label?: unknown;
            nonce?: unknown;
            provider?: unknown;
          };

          if (payload.nonce !== nonce || typeof payload.address !== "string") {
            response.writeHead(400, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ ok: false }));
            return;
          }

          window.webContents.send("wallet:external-connected", {
            address: payload.address,
            label:
              typeof payload.label === "string" ? payload.label : "Solana Wallet",
            provider:
              payload.provider === "solflare" || payload.provider === "phantom"
                ? payload.provider
                : "injected"
          });

          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ ok: true }));
          void closeWalletBridge();
        } catch {
          response.writeHead(400, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ ok: false }));
        }
      });
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
  });

  const port = await new Promise<number>((resolve, reject) => {
    walletBridgeServer?.once("error", reject);
    walletBridgeServer?.listen(0, "127.0.0.1", () => {
      const address = walletBridgeServer?.address();

      if (!address || typeof address === "string") {
        reject(new Error("Could not allocate a local wallet bridge port."));
        return;
      }

      resolve(address.port);
    });
  });

  walletBridgeTimeout = setTimeout(() => {
    void closeWalletBridge();
  }, 120000);

  return `http://127.0.0.1:${port}/connect`;
}

async function closeWalletBridge() {
  if (walletBridgeTimeout) {
    clearTimeout(walletBridgeTimeout);
    walletBridgeTimeout = null;
  }

  if (!walletBridgeServer) {
    return;
  }

  const server = walletBridgeServer;
  walletBridgeServer = null;

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}

function renderWalletConnectPage(nonce: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Connect PayGuard Wallet</title>
  <style>
    body {
      align-items: center;
      background: #f7fafc;
      color: #030813;
      display: flex;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      justify-content: center;
      margin: 0;
      min-height: 100vh;
      padding: 24px;
    }
    main {
      background: white;
      border: 1px solid #e5e9eb;
      border-radius: 18px;
      box-shadow: 0 14px 45px rgba(15, 23, 42, 0.08);
      max-width: 440px;
      padding: 28px;
      width: 100%;
    }
    h1 {
      font-size: 24px;
      line-height: 1.2;
      margin: 0 0 10px;
    }
    p {
      color: #45474c;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 18px;
    }
    button {
      align-items: center;
      background: #030813;
      border: 0;
      border-radius: 12px;
      color: white;
      cursor: pointer;
      display: flex;
      font-size: 14px;
      font-weight: 800;
      justify-content: center;
      min-height: 44px;
      padding: 12px 16px;
      width: 100%;
    }
    button + button {
      margin-top: 10px;
    }
    .secondary {
      background: #f1f4f6;
      color: #030813;
    }
    #status {
      border-radius: 12px;
      background: #f1f4f6;
      color: #45474c;
      font-size: 13px;
      line-height: 1.5;
      margin-top: 14px;
      padding: 12px;
    }
  </style>
</head>
<body>
  <main>
    <h1>Connect PayGuard Wallet</h1>
    <p>This page connects to Solflare or Phantom in your browser and sends only your public wallet address back to the local PayGuard desktop app.</p>
    <button id="solflare">Connect Solflare</button>
    <button id="phantom" class="secondary">Connect Phantom</button>
    <div id="status">Waiting for wallet selection.</div>
  </main>
  <script>
    const nonce = ${JSON.stringify(nonce)};
    const statusEl = document.getElementById("status");

    function setStatus(message) {
      statusEl.textContent = message;
    }

    function getProvider(kind) {
      if (kind === "solflare" && window.solflare) return window.solflare;
      if (kind === "phantom" && window.phantom && window.phantom.solana) return window.phantom.solana;
      if (window.solana) return window.solana;
      return null;
    }

    async function connect(kind) {
      const provider = getProvider(kind);

      if (!provider) {
        setStatus(kind === "solflare" ? "Solflare is not available in this browser." : "Phantom is not available in this browser.");
        return;
      }

      try {
        setStatus("Opening wallet approval...");
        const response = await provider.connect();
        const publicKey = response && response.publicKey ? response.publicKey : provider.publicKey;
        const address = typeof publicKey === "string" ? publicKey : publicKey && publicKey.toString();

        if (!address) {
          throw new Error("Wallet connected but did not return a public key.");
        }

        setStatus("Sending public address back to PayGuard...");
        await fetch("/wallet-connected", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address,
            label: kind === "solflare" ? "Solflare" : kind === "phantom" ? "Phantom" : "Solana Wallet",
            nonce,
            provider: kind
          })
        });
        setStatus("Wallet connected. You can return to PayGuard.");
      } catch (error) {
        setStatus(error && error.message ? error.message : "Wallet connection failed.");
      }
    }

    document.getElementById("solflare").addEventListener("click", () => connect("solflare"));
    document.getElementById("phantom").addEventListener("click", () => connect("phantom"));
  </script>
</body>
</html>`;
}

app.whenReady().then(() => {
  app.setName("PayGuard");
  app.setAppUserModelId("com.payguard.desktop");
  registerQvacHandlers();
  registerWalletHandlers();
  registerLocalStoreHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("second-instance", () => {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.focus();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
