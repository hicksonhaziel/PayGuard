import path from "node:path";
import http from "node:http";
import { existsSync } from "node:fs";
import { app, BrowserWindow, ipcMain, nativeImage, shell } from "electron";
import { readFileSync } from "node:fs";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync
} from "@solana/spl-token";
import {
  analyzeDocumentWithOcr,
  analyzePaymentRiskWithLlm,
  matchPaymentRecipientWithRag,
  type PaymentRagInput,
  type PaymentRagRequest,
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
type SolanaNetwork = "mainnet-beta" | "devnet";
type DirectSendInput = {
  amount: string;
  network: SolanaNetwork;
  recipientWallet: string;
  senderWallet: string;
  token: "USDC" | "USDT";
};

const solanaRpcUrls: Record<SolanaNetwork, string> = {
  devnet: process.env.PAYGUARD_SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com",
  "mainnet-beta":
    process.env.PAYGUARD_SOLANA_MAINNET_RPC_URL ??
    process.env.PAYGUARD_SOLANA_RPC_URL ??
    "https://api.mainnet-beta.solana.com"
};
const stablecoinMints: Record<
  SolanaNetwork,
  { USDC: string | null; USDT: string | null }
> = {
  devnet: {
    USDC:
      process.env.PAYGUARD_DEVNET_USDC_MINT ??
      "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    USDT: process.env.PAYGUARD_DEVNET_USDT_MINT ?? null
  },
  "mainnet-beta": {
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
  }
};
const balanceCacheTtlMs = Number(process.env.PAYGUARD_BALANCE_CACHE_SECONDS ?? 60) * 1000;
let walletBridgeServer: http.Server | null = null;
let walletBridgeTimeout: NodeJS.Timeout | null = null;
let mainWindow: BrowserWindow | null = null;
const balanceCache = new Map<string, CachedWalletBalances>();
const solanaWeb3BrowserBundle = readFileSync(
  path.join(__dirname, "../../../node_modules/@solana/web3.js/lib/index.iife.min.js"),
  "utf8"
);

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
    if (!isPaymentRagRequest(input)) {
      throw new Error("Valid payment context is required for QVAC RAG matching.");
    }

    const { trustedRecipients, ...paymentInput } = input;

    return matchPaymentRecipientWithRag(paymentInput, trustedRecipients);
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

  ipcMain.handle("wallet:get-balances", async (_event, input: unknown) => {
    const walletAddress =
      input && typeof input === "object"
        ? (input as Record<string, unknown>).walletAddress
        : input;
    const network =
      input && typeof input === "object"
        ? assertNetwork((input as Record<string, unknown>).network)
        : "mainnet-beta";

    if (typeof walletAddress !== "string" || !walletAddress.trim()) {
      throw new Error("A connected wallet address is required to fetch balances.");
    }

    return getWalletBalances(walletAddress.trim(), network);
  });

  ipcMain.handle("wallet:direct-send", async (event, input: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender);

    if (!window) {
      throw new Error("Could not find the PayGuard window for direct payment signing.");
    }

    if (!isDirectSendInput(input)) {
      throw new Error("Valid direct payment details are required.");
    }

    return startExternalDirectSendBridge(window, input);
  });
}

async function getWalletBalances(walletAddress: string, network: SolanaNetwork) {
  const now = Date.now();
  const cacheKey = `${network}:${walletAddress}`;
  const cached = balanceCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return createBalanceResponse(cached, false, {});
  }

  const [sol, usdc, usdt] = await Promise.allSettled([
    getSolBalance(walletAddress, network),
    getSplTokenBalance(walletAddress, stablecoinMints[network].USDC, network),
    getSplTokenBalance(walletAddress, stablecoinMints[network].USDT, network)
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

  balanceCache.set(cacheKey, nextCache);

  return createBalanceResponse(nextCache, Boolean(cached), errors);
}

function unwrapBalanceResult(
  result: PromiseSettledResult<number | null>,
  fallback: number | null
) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function getBalanceError(result: PromiseSettledResult<number | null>) {
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

async function getSolBalance(walletAddress: string, network: SolanaNetwork) {
  const response = await callSolanaRpc<{ value: number }>("getBalance", [
    walletAddress,
    { commitment: "confirmed" }
  ], network);

  return response.value / 1_000_000_000;
}

async function getSplTokenBalance(
  walletAddress: string,
  mintAddress: string | null,
  network: SolanaNetwork
) {
  if (!mintAddress) {
    return null;
  }

  const response = await callSolanaRpc<TokenAccountsByOwnerResult>(
    "getTokenAccountsByOwner",
    [
      walletAddress,
      { mint: mintAddress },
      { commitment: "confirmed", encoding: "jsonParsed" }
    ],
    network
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

async function callSolanaRpc<T>(
  method: string,
  params: unknown[],
  network: SolanaNetwork
): Promise<T> {
  const response = await fetch(solanaRpcUrls[network], {
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
  ipcMain.handle("store:recipients:list", (_event, input: unknown) => {
    const scope = assertWalletNetworkScope(input);
    return listRecipients(scope.ownerWallet, scope.network);
  });

  ipcMain.handle("store:recipients:add", (_event, input: unknown) => {
    if (!isRecipientInput(input)) {
      throw new Error("Valid recipient name and wallet address are required.");
    }

    return addRecipient(input);
  });

  ipcMain.handle("store:history:list", (_event, input: unknown) => {
    const scope = assertWalletNetworkScope(input);
    return listPaymentHistory(scope.ownerWallet, scope.network);
  });

  ipcMain.handle("store:history:add", (_event, input: unknown) => {
    if (!isPaymentHistoryInput(input)) {
      throw new Error("Valid payment history details are required.");
    }

    return addPaymentHistory(input);
  });

  ipcMain.handle("store:onchain-imports:list", (_event, input: unknown) => {
    const scope = assertWalletNetworkScope(input);
    return listOnchainImports(scope.ownerWallet, scope.network);
  });
}

function assertWalletNetworkScope(input: unknown) {
  if (typeof input === "string") {
    return {
      ownerWallet: assertOwnerWallet(input),
      network: "mainnet-beta" as SolanaNetwork
    };
  }

  if (!input || typeof input !== "object") {
    throw new Error("A connected wallet address is required.");
  }

  const record = input as Record<string, unknown>;

  return {
    ownerWallet: assertOwnerWallet(record.ownerWallet),
    network: assertNetwork(record.network)
  };
}

function assertOwnerWallet(ownerWallet: unknown) {
  if (typeof ownerWallet !== "string" || !ownerWallet.trim()) {
    throw new Error("A connected wallet address is required.");
  }

  return ownerWallet.trim();
}

function assertNetwork(network: unknown): SolanaNetwork {
  if (network === "mainnet-beta" || network === "devnet") {
    return network;
  }

  return "mainnet-beta";
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

function isDirectSendInput(input: unknown): input is DirectSendInput {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Record<string, unknown>;

  return (
    typeof candidate.amount === "string" &&
    Number(candidate.amount) > 0 &&
    (candidate.network === "mainnet-beta" || candidate.network === "devnet") &&
    typeof candidate.recipientWallet === "string" &&
    candidate.recipientWallet.trim().length > 0 &&
    typeof candidate.senderWallet === "string" &&
    candidate.senderWallet.trim().length > 0 &&
    (candidate.token === "USDC" || candidate.token === "USDT")
  );
}

function isPaymentRagRequest(input: unknown): input is PaymentRagRequest {
  if (!isPaymentRagInput(input)) {
    return false;
  }

  const trustedRecipients = (input as Record<string, unknown>).trustedRecipients;

  return (
    trustedRecipients === undefined ||
    (Array.isArray(trustedRecipients) && trustedRecipients.every(isTrustedRecipientRecord))
  );
}

function isTrustedRecipientRecord(input: unknown) {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Record<string, unknown>;

  return (
    typeof candidate.name === "string" &&
    typeof candidate.wallet === "string" &&
    typeof candidate.normalToken === "string" &&
    typeof candidate.normalAmountRange === "string" &&
    typeof candidate.invoicePattern === "string" &&
    typeof candidate.paymentHistory === "string"
  );
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
    (candidate.network === "mainnet-beta" || candidate.network === "devnet") &&
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
    (candidate.network === "mainnet-beta" || candidate.network === "devnet") &&
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

async function startExternalDirectSendBridge(
  window: BrowserWindow,
  input: DirectSendInput
) {
  await closeWalletBridge();

  const transaction = await buildDirectSendTransaction(input);
  const nonce = crypto.randomUUID();
  const bridgeResult = new Promise<{ signature: string }>((resolve, reject) => {
    walletBridgeServer = http.createServer((request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");

      if (request.method === "GET" && url.pathname === "/solana-web3.js") {
        response.writeHead(200, {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-store"
        });
        response.end(solanaWeb3BrowserBundle);
        return;
      }

      if (request.method === "GET" && url.pathname === "/sign") {
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store"
        });
        response.end(renderDirectSendPage(nonce, input, transaction));
        return;
      }

      if (request.method === "POST" && url.pathname === "/signed") {
        const chunks: Buffer[] = [];

        request.on("data", (chunk: Buffer) => chunks.push(chunk));
        request.on("end", () => {
          try {
            const payload = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
              nonce?: unknown;
              signature?: unknown;
            };

            if (payload.nonce !== nonce || typeof payload.signature !== "string") {
              response.writeHead(400, { "Content-Type": "application/json" });
              response.end(JSON.stringify({ ok: false }));
              return;
            }

            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ ok: true }));
            resolve({ signature: payload.signature });
            void closeWalletBridge();
          } catch (error) {
            response.writeHead(400, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ ok: false }));
            reject(error);
            void closeWalletBridge();
          }
        });
        return;
      }

      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Not found");
    });

    walletBridgeServer.once("error", reject);
    walletBridgeServer.listen(0, "127.0.0.1", () => {
      const address = walletBridgeServer?.address();

      if (!address || typeof address === "string") {
        reject(new Error("Could not allocate a local signing bridge port."));
        return;
      }

      walletBridgeTimeout = setTimeout(() => {
        reject(new Error("Wallet signing timed out."));
        void closeWalletBridge();
      }, 180000);

      void shell.openExternal(`http://127.0.0.1:${address.port}/sign`);
    });
  });

  return bridgeResult;
}

async function buildDirectSendTransaction(input: DirectSendInput) {
  const mintAddress = stablecoinMints[input.network][input.token];

  if (!mintAddress) {
    throw new Error(`${input.token} is not configured on ${input.network}.`);
  }

  const sender = new PublicKey(input.senderWallet);
  const recipient = new PublicKey(input.recipientWallet);
  const mint = new PublicKey(mintAddress);
  const decimals = 6;
  const sourceAta = getAssociatedTokenAddressSync(mint, sender);
  const destinationAta = getAssociatedTokenAddressSync(mint, recipient);
  const connection = new Connection(solanaRpcUrls[input.network], "confirmed");
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    blockhash,
    feePayer: sender,
    lastValidBlockHeight
  });

  transaction.add(
    createAssociatedTokenAccountIdempotentInstruction(
      sender,
      destinationAta,
      recipient,
      mint
    ),
    createTransferCheckedInstruction(
      sourceAta,
      mint,
      destinationAta,
      sender,
      decimalAmountToBaseUnits(input.amount, decimals),
      decimals
    )
  );

  return {
    base64: transaction
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64"),
    mintAddress,
    rpcUrl: solanaRpcUrls[input.network]
  };
}

function decimalAmountToBaseUnits(amount: string, decimals: number) {
  const trimmedAmount = amount.trim();
  const [wholePart, fractionalPart = ""] = trimmedAmount.split(".");

  if (!/^\d+$/.test(wholePart) || !/^\d*$/.test(fractionalPart)) {
    throw new Error("Enter a valid payment amount.");
  }

  const paddedFraction = fractionalPart.padEnd(decimals, "0").slice(0, decimals);

  if (fractionalPart.length > decimals) {
    throw new Error(`Amount supports at most ${decimals} decimal places.`);
  }

  return BigInt(wholePart) * 10n ** BigInt(decimals) + BigInt(paddedFraction || "0");
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

function renderDirectSendPage(
  nonce: string,
  input: DirectSendInput,
  transaction: { base64: string; mintAddress: string; rpcUrl: string }
) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sign PayGuard Payment</title>
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
      max-width: 480px;
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
    dl {
      background: #f1f4f6;
      border-radius: 14px;
      display: grid;
      gap: 10px;
      margin: 0 0 18px;
      padding: 14px;
    }
    div.row {
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }
    dt {
      color: #45474c;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }
    dd {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      margin: 0;
      max-width: 270px;
      overflow: hidden;
      text-align: right;
      text-overflow: ellipsis;
      white-space: nowrap;
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
    <h1>Sign PayGuard Direct Payment</h1>
    <p>Review this direct stablecoin transfer, then approve it in Solflare or Phantom. PayGuard never sees your private key.</p>
    <dl>
      <div class="row"><dt>Amount</dt><dd>${escapeHtml(input.amount)} ${escapeHtml(input.token)}</dd></div>
      <div class="row"><dt>Network</dt><dd>${escapeHtml(input.network)}</dd></div>
      <div class="row"><dt>From</dt><dd title="${escapeHtml(input.senderWallet)}">${escapeHtml(input.senderWallet)}</dd></div>
      <div class="row"><dt>To</dt><dd title="${escapeHtml(input.recipientWallet)}">${escapeHtml(input.recipientWallet)}</dd></div>
      <div class="row"><dt>Mint</dt><dd title="${escapeHtml(transaction.mintAddress)}">${escapeHtml(transaction.mintAddress)}</dd></div>
    </dl>
    <button id="solflare">Sign with Solflare</button>
    <button id="phantom" class="secondary">Sign with Phantom</button>
    <div id="status">Waiting for wallet selection.</div>
  </main>
  <script src="/solana-web3.js"></script>
  <script>
    const nonce = ${JSON.stringify(nonce)};
    const expectedAddress = ${JSON.stringify(input.senderWallet)};
    const rpcUrl = ${JSON.stringify(transaction.rpcUrl)};
    const transactionBase64 = ${JSON.stringify(transaction.base64)};
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

    function base64ToBytes(value) {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);

      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }

      return bytes;
    }

    async function sign(kind) {
      const provider = getProvider(kind);

      if (!provider) {
        setStatus(kind === "solflare" ? "Solflare is not available in this browser." : "Phantom is not available in this browser.");
        return;
      }

      try {
        setStatus("Opening wallet approval...");
        const connectResponse = await provider.connect();
        const publicKey = connectResponse && connectResponse.publicKey ? connectResponse.publicKey : provider.publicKey;
        const address = typeof publicKey === "string" ? publicKey : publicKey && publicKey.toString();

        if (address !== expectedAddress) {
          throw new Error("Connected wallet does not match the PayGuard sender wallet.");
        }

        const transaction = solanaWeb3.Transaction.from(base64ToBytes(transactionBase64));
        let signature;

        if (provider.signAndSendTransaction) {
          setStatus("Requesting wallet signature...");
          const result = await provider.signAndSendTransaction(transaction);
          signature = typeof result === "string" ? result : result && result.signature;
        } else if (provider.signTransaction) {
          setStatus("Requesting wallet signature...");
          const signedTransaction = await provider.signTransaction(transaction);
          setStatus("Sending signed transaction...");
          const connection = new solanaWeb3.Connection(rpcUrl, "confirmed");
          signature = await connection.sendRawTransaction(signedTransaction.serialize());
        } else {
          throw new Error("This wallet does not support transaction signing.");
        }

        if (!signature) {
          throw new Error("Wallet did not return a transaction signature.");
        }

        setStatus("Returning signature to PayGuard...");
        await fetch("/signed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nonce, signature })
        });
        setStatus("Payment submitted. You can return to PayGuard.");
      } catch (error) {
        setStatus(error && error.message ? error.message : "Payment signing failed.");
      }
    }

    document.getElementById("solflare").addEventListener("click", () => sign("solflare"));
    document.getElementById("phantom").addEventListener("click", () => sign("phantom"));
  </script>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
