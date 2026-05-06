import type {
  PaymentRagInput,
  QvacOcrResult,
  RecipientRagResult,
  RiskAnalysisInput,
  RiskVerdict
} from "@payguard/qvac-agent";

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
      starterMessage: string;
    };
    solana?: InjectedSolanaProvider;
    solflare?: InjectedSolanaProvider;
  }
}

export {};
