import type {
  PaymentRagInput,
  QvacOcrResult,
  RecipientRagResult,
  RiskAnalysisInput,
  RiskVerdict
} from "@payguard/qvac-agent";

type StoredRecipient = {
  id: string;
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
          notes?: string;
          walletAddress: string;
        }) => Promise<StoredRecipient>;
        listOnchainImports: () => Promise<StoredOnchainImport[]>;
        listPaymentHistory: () => Promise<StoredPaymentHistory[]>;
        listRecipients: () => Promise<RecipientSummary[]>;
      };
      starterMessage: string;
    };
    solana?: InjectedSolanaProvider;
    solflare?: InjectedSolanaProvider;
  }
}

export {};
