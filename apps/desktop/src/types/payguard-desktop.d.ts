import type {
  PaymentRagInput,
  PaymentRagRequest,
  QvacOcrResult,
  RecipientRagResult,
  RiskAnalysisInput,
  RiskVerdict
} from "@payguard/qvac-agent";

type StoredRecipient = {
  id: string;
  network: "mainnet-beta" | "devnet";
  ownerWallet: string;
  name: string;
  walletAddress: string;
  category: string;
  notes: string;
  trustedSince: string;
  createdAt: string;
  updatedAt: string;
};

type RecipientSummary = StoredRecipient & {
  averageAmount: string;
  lastPayment: string;
  payments: number;
};

type StoredPaymentHistory = {
  id: string;
  network: "mainnet-beta" | "devnet";
  ownerWallet: string;
  recipientId: string | null;
  recipientName: string;
  senderWallet: string;
  recipientWallet: string;
  amount: string;
  token: string;
  route: "Direct Send" | "Guarded Payment" | "Block";
  verdict: "Safe" | "Review" | "Block";
  riskScore: number;
  txSignature: string;
  source: "manual" | "payguard" | "onchain-import";
  summary: string;
  paidAt: string;
  createdAt: string;
};

type StoredOnchainImport = {
  id: string;
  network: "mainnet-beta" | "devnet";
  walletAddress: string;
  recipientWallet: string;
  status: "pending" | "completed" | "failed";
  importedCount: number;
  lastSignature: string | null;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
};

type GuardedPaymentRecord = {
  amount: string;
  createdAt: string;
  escrowAddress: string;
  mintAddress: string;
  network: "mainnet-beta" | "devnet";
  recipientWallet: string;
  role: "sender" | "recipient";
  senderWallet: string;
  status: "funded" | "cancelled" | "claimed" | "unknown";
  token: "USDC" | "USDT";
  unlockAt: string;
  vaultAddress: string;
};

declare global {
  type InjectedSolanaProvider = {
    isPhantom?: boolean;
    isSolflare?: boolean;
    publicKey?: {
      toString: () => string;
    } | string;
    connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{
      publicKey?: {
        toString: () => string;
      } | string;
    } | void>;
    disconnect?: () => Promise<void>;
  };

  interface Window {
    phantom?: {
      solana?: InjectedSolanaProvider;
    };
    payguardDesktop?: {
      getStablecoinConfig: () => Promise<{
        devnetUsdcMint: string | null;
        devnetUsdtConfigured: boolean;
        devnetUsdtMint: string | null;
        mainnetUsdcMint: string | null;
        mainnetUsdtMint: string | null;
      }>;
      analyzeDocumentWithOcr: (imagePath: string) => Promise<QvacOcrResult>;
      analyzePaymentRisk: (input: RiskAnalysisInput) => Promise<RiskVerdict>;
      synthesizeSpokenVerdict: (input: RiskVerdict) => Promise<{
        audioBase64: string;
        mimeType: "audio/wav";
        sampleRate: number;
        spokenText: string;
      }>;
      speakVerdictWithSystemVoice: (text: string) => Promise<{
        ok: true;
        engine: string;
      }>;
      getPathForFile: (file: File) => string;
      getWalletBalances: (input: {
        network: "mainnet-beta" | "devnet";
        walletAddress: string;
      }) => Promise<{
        SOL: number | null;
        USDC: number | null;
        USDT: number | null;
        cachedAt: string;
        errors: Partial<Record<"SOL" | "USDC" | "USDT", string | null>>;
        expiresAt: string;
        isStale: boolean;
      }>;
      matchRecipientWithRag: (input: PaymentRagRequest) => Promise<RecipientRagResult>;
      onExternalWalletConnected: (
        callback: (wallet: {
          address: string;
          label: string;
          provider: "phantom" | "solflare" | "injected";
        }) => void
      ) => () => void;
      startDirectSend: (input: {
        amount: string;
        network: "mainnet-beta" | "devnet";
        recipientWallet: string;
        senderWallet: string;
        token: "USDC" | "USDT";
        walletProvider?: "phantom" | "solflare" | "injected";
      }) => Promise<{ signature: string }>;
      startGuardedPayment: (input: {
        amount: string;
        guardedHoldHours: number;
        network: "mainnet-beta" | "devnet";
        recipientWallet: string;
        senderWallet: string;
        token: "USDC" | "USDT";
        walletProvider?: "phantom" | "solflare" | "injected";
      }) => Promise<{
        escrowAddress: string;
        signature: string;
        unlockAt: string;
        vaultAddress: string;
      }>;
      startGuardedCancel: (input: {
        amount: string;
        escrowAddress: string;
        network: "mainnet-beta" | "devnet";
        recipientWallet: string;
        senderWallet: string;
        token: "USDC" | "USDT";
        vaultAddress: string;
        walletProvider?: "phantom" | "solflare" | "injected";
      }) => Promise<{ signature: string }>;
      startGuardedClaim: (input: {
        amount: string;
        escrowAddress: string;
        network: "mainnet-beta" | "devnet";
        recipientWallet: string;
        senderWallet: string;
        token: "USDC" | "USDT";
        vaultAddress: string;
        walletProvider?: "phantom" | "solflare" | "injected";
      }) => Promise<{ signature: string }>;
      listGuardedPayments: (input: {
        network: "mainnet-beta" | "devnet";
        walletAddress: string;
      }) => Promise<GuardedPaymentRecord[]>;
      startExternalWalletConnect: () => Promise<{ url: string }>;
      store: {
        addPaymentHistory: (
          input: Omit<
            StoredPaymentHistory,
            "createdAt" | "id" | "paidAt" | "recipientId"
          >
        ) => Promise<StoredPaymentHistory>;
        addRecipient: (input: {
          category?: string;
          name?: string;
          network: "mainnet-beta" | "devnet";
          notes?: string;
          ownerWallet: string;
          walletAddress: string;
        }) => Promise<StoredRecipient>;
        listOnchainImports: (input: {
          network: "mainnet-beta" | "devnet";
          ownerWallet: string;
        }) => Promise<StoredOnchainImport[]>;
        listPaymentHistory: (input: {
          network: "mainnet-beta" | "devnet";
          ownerWallet: string;
        }) => Promise<StoredPaymentHistory[]>;
        listRecipients: (input: {
          network: "mainnet-beta" | "devnet";
          ownerWallet: string;
        }) => Promise<RecipientSummary[]>;
      };
      starterMessage: string;
    };
    solana?: InjectedSolanaProvider;
    solflare?: InjectedSolanaProvider;
  }
}

export {};
