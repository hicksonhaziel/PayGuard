import { useEffect, useState } from "react";
import type {
  PaymentRagInput,
  RecipientRagResult,
  RiskVerdict,
  TrustedRecipientRecord
} from "@payguard/qvac-agent";
import { TopNavigation } from "./components/layout/top-navigation";
import { AnalyzeStatePage } from "./pages/analyze-state-page";
import { ConfirmPage } from "./pages/confirm-page";
import { ConfirmTransactionPage } from "./pages/confirm-transaction-page";
import { HistoryPage } from "./pages/history-page";
import { HomePage } from "./pages/home-page";
import { NewPaymentPage } from "./pages/new-payment-page";
import { RecipientsPage } from "./pages/recipients-page";
import { SuccessPage } from "./pages/success-page";

export type AppScreen =
  | "home"
  | "history"
  | "recipients"
  | "new-payment"
  | "analyzing"
  | "confirm"
  | "confirm-transaction"
  | "success";
export type ConnectedWallet = {
  address: string;
  connectedAt: string;
  label: string;
  provider: "phantom" | "solflare" | "injected";
};
export type SolanaNetwork = "mainnet-beta" | "devnet";
export type PrefilledRecipient = {
  name: string;
  walletAddress: string;
};
export type PaymentDecision = {
  amount: string;
  token: string;
  walletAddress: string;
  recipientName: string;
  memo: string;
  selectedRoute: "Direct Send" | "Guarded Payment" | "Block";
  verdict: RiskVerdict;
};
export type PaymentAnalysisRequest = {
  ocrRecipientName: string | null;
  ocrText?: string;
  payment: PaymentRagInput;
  savedRecipientName: string | null;
  trustedRecipients: TrustedRecipientRecord[];
};

const screenOrder: Record<AppScreen, number> = {
  home: 0,
  history: 1,
  recipients: 2,
  "new-payment": 3,
  analyzing: 4,
  confirm: 5,
  "confirm-transaction": 6,
  success: 7
};
const walletStorageKey = "payguard-connected-wallet";
const networkStorageKey = "payguard-solana-network";

export default function App() {
  const [activeScreen, setActiveScreen] = useState<AppScreen>("home");
  const [visibleScreen, setVisibleScreen] = useState<AppScreen>("home");
  const [paymentDecision, setPaymentDecision] =
    useState<PaymentDecision | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [prefilledRecipient, setPrefilledRecipient] =
    useState<PrefilledRecipient | null>(null);
  const [connectedWallet, setConnectedWallet] =
    useState<ConnectedWallet | null>(() => loadStoredWallet());
  const [selectedNetwork, setSelectedNetwork] =
    useState<SolanaNetwork>(() => loadStoredNetwork());
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<
    "forward" | "backward"
  >("forward");

  useEffect(() => {
    if (activeScreen === visibleScreen) {
      return;
    }

    setIsExiting(true);
    const timeout = window.setTimeout(() => {
      setVisibleScreen(activeScreen);
      setIsExiting(false);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [activeScreen, visibleScreen]);

  useEffect(() => {
    const unsubscribe = window.payguardDesktop?.onExternalWalletConnected((wallet) => {
      saveConnectedWallet(wallet);
      setWalletError(null);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  function saveConnectedWallet(wallet: Omit<ConnectedWallet, "connectedAt">) {
    const nextWallet: ConnectedWallet = {
      ...wallet,
      connectedAt: new Date().toISOString()
    };

    setConnectedWallet(nextWallet);
    window.localStorage.setItem(walletStorageKey, JSON.stringify(nextWallet));
  }

  function navigateTo(screen: AppScreen) {
    setTransitionDirection(
      screenOrder[screen] < screenOrder[activeScreen] ? "backward" : "forward"
    );
    setActiveScreen(screen);
  }

  function startNewPayment(recipient?: PrefilledRecipient) {
    setTransitionDirection("forward");
    setPaymentDecision(null);
    setPrefilledRecipient(recipient ?? null);
    setActiveScreen("new-payment");
  }

  function startRiskAnalysis(request: PaymentAnalysisRequest) {
    setPaymentDecision(null);
    setAnalysisError(null);
    navigateTo("analyzing");
    void runRiskAnalysis(request);
  }

  async function runRiskAnalysis(request: PaymentAnalysisRequest) {
    try {
      if (!window.payguardDesktop?.matchRecipientWithRag) {
        throw new Error("Desktop QVAC RAG bridge is not available.");
      }

      if (!window.payguardDesktop?.analyzePaymentRisk) {
        throw new Error("Desktop QVAC LLM bridge is not available.");
      }

      const recipientMatch = await window.payguardDesktop.matchRecipientWithRag({
        ...request.payment,
        trustedRecipients: request.trustedRecipients
      });
      const verdict = await window.payguardDesktop.analyzePaymentRisk({
        payment: request.payment,
        ocrText: request.ocrText,
        recipientMatch
      });

      setPaymentDecision(buildPaymentDecision(request, recipientMatch, verdict));
      navigateTo("confirm");
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "QVAC payment analysis failed."
      );
    }
  }

  function completeDirectSend() {
    if (paymentDecision) {
      setPaymentDecision({
        ...paymentDecision,
        selectedRoute: "Direct Send"
      });
    }

    navigateTo("confirm-transaction");
  }

  function chooseGuardedPayment() {
    if (paymentDecision) {
      setPaymentDecision({
        ...paymentDecision,
        selectedRoute: "Guarded Payment"
      });
    }

    navigateTo("confirm-transaction");
  }

  async function connectWallet() {
    setWalletError(null);

    const provider = findInjectedSolanaProvider();

    if (!provider) {
      try {
        await window.payguardDesktop?.startExternalWalletConnect();
        setWalletError(
          "Opened wallet connection in your browser. Approve Solflare or Phantom there, then return to PayGuard."
        );
      } catch (error) {
        setWalletError(
          error instanceof Error
            ? error.message
            : "Could not open the external wallet connection page."
        );
      }
      return;
    }

    try {
      const response = await provider.connect();
      const publicKey = response?.publicKey ?? provider.publicKey;
      const address =
        typeof publicKey === "string" ? publicKey : publicKey?.toString();

      if (!address) {
        throw new Error("Wallet connected, but no public key was returned.");
      }

      saveConnectedWallet({
        address,
        label: provider.isSolflare
          ? "Solflare"
          : provider.isPhantom
            ? "Phantom"
            : "Solana Wallet",
        provider: provider.isSolflare
          ? "solflare"
          : provider.isPhantom
            ? "phantom"
            : "injected"
      });
    } catch (error) {
      setWalletError(
        error instanceof Error ? error.message : "Wallet connection failed."
      );
    }
  }

  async function disconnectWallet() {
    const provider = findInjectedSolanaProvider();
    await provider?.disconnect?.().catch(() => {});
    setConnectedWallet(null);
    setWalletError(null);
    window.localStorage.removeItem(walletStorageKey);
  }

  function changeNetwork(network: SolanaNetwork) {
    setSelectedNetwork(network);
    window.localStorage.setItem(networkStorageKey, network);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7fafc] dark:bg-[#0f172a]">
      {visibleScreen !== "analyzing" &&
      visibleScreen !== "confirm" &&
      visibleScreen !== "confirm-transaction" &&
      visibleScreen !== "success" ? (
        <TopNavigation
          activeScreen={activeScreen}
          onNavigate={navigateTo}
        />
      ) : null}

      <div
        className={`pg-page-transition ${
          isExiting ? "pg-page-exit" : "pg-page-enter"
        } ${
          transitionDirection === "backward"
            ? "pg-page-backward"
            : "pg-page-forward"
        }`}
        key={visibleScreen}
      >
        {visibleScreen === "home" ? (
          <HomePage
            network={selectedNetwork}
            wallet={connectedWallet}
            walletError={walletError}
            onConnectWallet={connectWallet}
            onDisconnectWallet={disconnectWallet}
            onNetworkChange={changeNetwork}
            onStartPayment={startNewPayment}
            onViewHistory={() => navigateTo("history")}
            onViewRecipients={() => navigateTo("recipients")}
          />
        ) : visibleScreen === "history" ? (
          <HistoryPage network={selectedNetwork} wallet={connectedWallet} />
        ) : visibleScreen === "recipients" ? (
          <RecipientsPage
            network={selectedNetwork}
            wallet={connectedWallet}
            onStartPayment={startNewPayment}
          />
        ) : visibleScreen === "analyzing" ? (
          <AnalyzeStatePage
            error={analysisError}
            onBack={() => navigateTo("new-payment")}
          />
        ) : visibleScreen === "confirm" ? (
          <ConfirmPage
            decision={paymentDecision}
            onCancel={() => navigateTo("home")}
            onDirectSend={completeDirectSend}
            onGuardedPayment={chooseGuardedPayment}
          />
        ) : visibleScreen === "confirm-transaction" ? (
          <ConfirmTransactionPage
            decision={paymentDecision}
            onBack={() => navigateTo("confirm")}
            onSign={() => navigateTo("success")}
          />
        ) : visibleScreen === "success" ? (
          <SuccessPage
            decision={paymentDecision}
            network={selectedNetwork}
            wallet={connectedWallet}
            onNewPayment={() => startNewPayment()}
          />
        ) : (
          <NewPaymentPage
            network={selectedNetwork}
            wallet={connectedWallet}
            prefilledRecipient={prefilledRecipient}
            onBack={() => navigateTo("home")}
            onAnalyze={startRiskAnalysis}
          />
        )}
      </div>
    </div>
  );
}

function buildPaymentDecision(
  request: PaymentAnalysisRequest,
  recipientMatch: RecipientRagResult | null,
  verdict: RiskVerdict
): PaymentDecision {
  return {
    amount: request.payment.amount || "0.00",
    token: request.payment.token || "USDC",
    walletAddress: request.payment.recipientWallet || "Unknown wallet",
    recipientName:
      request.savedRecipientName ||
      recipientMatch?.bestMatch?.recipientName ||
      request.ocrRecipientName ||
      "Unknown recipient",
    memo: request.payment.memo || "",
    selectedRoute: verdict.recommendedRoute,
    verdict
  };
}

function loadStoredNetwork(): SolanaNetwork {
  if (typeof window === "undefined") {
    return "mainnet-beta";
  }

  const network = window.localStorage.getItem(networkStorageKey);

  return network === "devnet" || network === "mainnet-beta"
    ? network
    : "mainnet-beta";
}

function loadStoredWallet(): ConnectedWallet | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawWallet = window.localStorage.getItem(walletStorageKey);

    if (!rawWallet) {
      return null;
    }

    const wallet = JSON.parse(rawWallet) as Partial<ConnectedWallet>;

    if (
      typeof wallet.address !== "string" ||
      typeof wallet.label !== "string" ||
      (wallet.provider !== "phantom" &&
        wallet.provider !== "solflare" &&
        wallet.provider !== "injected")
    ) {
      window.localStorage.removeItem(walletStorageKey);
      return null;
    }

    return {
      address: wallet.address,
      connectedAt:
        typeof wallet.connectedAt === "string"
          ? wallet.connectedAt
          : new Date().toISOString(),
      label: wallet.label,
      provider: wallet.provider
    };
  } catch {
    window.localStorage.removeItem(walletStorageKey);
    return null;
  }
}

function findInjectedSolanaProvider() {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.solflare?.isSolflare) {
    return window.solflare;
  }

  if (window.phantom?.solana?.isPhantom) {
    return window.phantom.solana;
  }

  if (window.solana) {
    return window.solana;
  }

  return null;
}
