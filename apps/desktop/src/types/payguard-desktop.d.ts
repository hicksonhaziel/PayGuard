import type {
  PaymentRagInput,
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
      analyzeDocumentWithOcr: (imagePath: string) => Promise<QvacOcrResult>;
      analyzePaymentRisk: (input: RiskAnalysisInput) => Promise<RiskVerdict>;
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
      matchRecipientWithRag: (input: PaymentRagInput) => Promise<RecipientRagResult>;
      onExternalWalletConnected: (
        callback: (wallet: {
          address: string;
          label: string;
          provider: "phantom" | "solflare" | "injected";
        }) => void
      ) => () => void;
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
