import { useEffect, useState } from "react";
import type {
  PaymentRagInput,
  QvacOcrResult,
  RecipientRagResult,
  RiskVerdict,
  TrustedRecipientRecord
} from "@payguard/qvac-agent";
import { TopNavigation } from "./components/layout/top-navigation";
import { AnalyzeStatePage } from "./pages/analyze-state-page";
import { ConfirmPage } from "./pages/confirm-page";
import { HistoryPage } from "./pages/history-page";
import { GuardedPaymentsPage } from "./pages/guarded-payments-page";
import { HomePage } from "./pages/home-page";
import { NewPaymentPage } from "./pages/new-payment-page";
import { RecipientsPage } from "./pages/recipients-page";
import { SuccessPage } from "./pages/success-page";

export type AppScreen =
  | "home"
  | "history"
  | "guarded"
  | "recipients"
  | "new-payment"
  | "analyzing"
  | "confirm"
  | "success";
export type ConnectedWallet = {
  address: string;
  connectedAt: string;
  label: string;
  provider: "phantom" | "solflare" | "injected";
};
export type SolanaNetwork = "mainnet-beta" | "devnet";
export type StablecoinConfig = {
  devnetUsdcMint: string | null;
  devnetUsdtConfigured: boolean;
  devnetUsdtMint: string | null;
  mainnetUsdcMint: string | null;
  mainnetUsdtMint: string | null;
};
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
  escrowAddress?: string;
  txSignature?: string;
  unlockAt?: string;
  vaultAddress?: string;
  guardedHoldHours: number;
  verdict: RiskVerdict;
};
export type PaymentAnalysisRequest = {
  documentPath?: string;
  hasDocument: boolean;
  ocrRecipientName: string | null;
  ocrText?: string;
  payment: PaymentRagInput;
  savedRecipientName: string | null;
  trustedRecipients: TrustedRecipientRecord[];
};
export type AnalysisStepKey = "ocr" | "rag" | "llm" | "explanation";

const screenOrder: Record<AppScreen, number> = {
  home: 0,
  history: 1,
  guarded: 2,
  recipients: 3,
  "new-payment": 4,
  analyzing: 5,
  confirm: 6,
  success: 7
};
const walletStorageKey = "payguard-connected-wallet";
const networkStorageKey = "payguard-solana-network";
let spokenVerdictRequestId = 0;

export default function App() {
  const [activeScreen, setActiveScreen] = useState<AppScreen>("home");
  const [visibleScreen, setVisibleScreen] = useState<AppScreen>("home");
  const [paymentDecision, setPaymentDecision] =
    useState<PaymentDecision | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [paymentActionError, setPaymentActionError] = useState<string | null>(null);
  const [analysisHasDocument, setAnalysisHasDocument] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStepKey>("rag");
  const [prefilledRecipient, setPrefilledRecipient] =
    useState<PrefilledRecipient | null>(null);
  const [connectedWallet, setConnectedWallet] =
    useState<ConnectedWallet | null>(() => loadStoredWallet());
  const [selectedNetwork, setSelectedNetwork] =
    useState<SolanaNetwork>(() => loadStoredNetwork());
  const [stablecoinConfig, setStablecoinConfig] = useState<StablecoinConfig>({
    devnetUsdcMint: null,
    devnetUsdtConfigured: false,
    devnetUsdtMint: null,
    mainnetUsdcMint: null,
    mainnetUsdtMint: null
  });
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

  useEffect(() => {
    window.payguardDesktop?.getStablecoinConfig?.()
      .then(setStablecoinConfig)
      .catch((error) => {
        console.warn("Stablecoin config bridge failed.", error);
      });
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
    setPaymentActionError(null);
    setPrefilledRecipient(recipient ?? null);
    setActiveScreen("new-payment");
  }

  function startRiskAnalysis(request: PaymentAnalysisRequest) {
    setPaymentDecision(null);
    setAnalysisError(null);
    setAnalysisHasDocument(request.hasDocument);
    setAnalysisStep(request.hasDocument ? "ocr" : "rag");
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

      let ocrResult: QvacOcrResult | null = null;

      if (request.hasDocument) {
        if (!request.documentPath) {
          throw new Error("A local document path is required for QVAC OCR.");
        }

        if (!window.payguardDesktop?.analyzeDocumentWithOcr) {
          throw new Error("Desktop QVAC OCR bridge is not available.");
        }

        setAnalysisStep("ocr");
        ocrResult = await window.payguardDesktop.analyzeDocumentWithOcr(request.documentPath);
      }

      const resolvedRequest = resolveAnalysisRequestFromOcr(request, ocrResult);

      validateResolvedPayment(resolvedRequest.payment);

      setAnalysisStep("rag");
      const recipientMatch = await window.payguardDesktop.matchRecipientWithRag({
        ...resolvedRequest.payment,
        trustedRecipients: request.trustedRecipients
      });
      setAnalysisStep("llm");
      const verdict = await window.payguardDesktop.analyzePaymentRisk({
        payment: resolvedRequest.payment,
        ocrText: resolvedRequest.ocrText,
        recipientMatch
      });

      setAnalysisStep("explanation");
      await waitForMinimumStepVisibility();
      setPaymentDecision(buildPaymentDecision(resolvedRequest, recipientMatch, verdict));
      navigateTo("confirm");
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "QVAC payment analysis failed."
      );
    }
  }

  async function completeDirectSend() {
    if (!paymentDecision || !connectedWallet) {
      setPaymentActionError("Connect a wallet before signing this payment.");
      return;
    }

    if (paymentDecision.token !== "USDC" && paymentDecision.token !== "USDT") {
      setPaymentActionError("Only USDC and USDT direct payments are supported.");
      return;
    }

    try {
      setPaymentActionError(null);
      const result = await window.payguardDesktop!.startDirectSend({
        amount: paymentDecision.amount,
        network: selectedNetwork,
        recipientWallet: paymentDecision.walletAddress,
        senderWallet: connectedWallet.address,
        token: paymentDecision.token,
        walletProvider: connectedWallet.provider
      });

      setPaymentDecision({
        ...paymentDecision,
        selectedRoute: "Direct Send",
        txSignature: result.signature
      });
      navigateTo("success");
    } catch (error) {
      setPaymentActionError(
        error instanceof Error ? error.message : "Direct payment signing failed."
      );
    }
  }

  async function chooseGuardedPayment(guardedHoldHours: number) {
    if (!paymentDecision || !connectedWallet) {
      setPaymentActionError("Connect a wallet before signing this guarded payment.");
      return;
    }

    if (
      selectedNetwork !== "devnet" ||
      (paymentDecision.token !== "USDC" && paymentDecision.token !== "USDT")
    ) {
      setPaymentActionError("Guarded payments are currently enabled for devnet USDC or demo USDT.");
      return;
    }

    try {
      setPaymentActionError(null);
      const result = await window.payguardDesktop!.startGuardedPayment({
        amount: paymentDecision.amount,
        guardedHoldHours,
        network: selectedNetwork,
        recipientWallet: paymentDecision.walletAddress,
        senderWallet: connectedWallet.address,
        token: paymentDecision.token as "USDC" | "USDT",
        walletProvider: connectedWallet.provider
      });

      setPaymentDecision({
        ...paymentDecision,
        escrowAddress: result.escrowAddress,
        guardedHoldHours,
        selectedRoute: "Guarded Payment",
        txSignature: result.signature,
        unlockAt: result.unlockAt,
        vaultAddress: result.vaultAddress
      });
      navigateTo("success");
    } catch (error) {
      setPaymentActionError(
        error instanceof Error ? error.message : "Guarded payment signing failed."
      );
    }
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
      visibleScreen !== "success" ? (
        <TopNavigation
          activeScreen={activeScreen}
          network={selectedNetwork}
          onNavigate={navigateTo}
          wallet={connectedWallet}
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
            stablecoinConfig={stablecoinConfig}
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
        ) : visibleScreen === "guarded" ? (
          <GuardedPaymentsPage network={selectedNetwork} wallet={connectedWallet} />
        ) : visibleScreen === "recipients" ? (
          <RecipientsPage
            network={selectedNetwork}
            wallet={connectedWallet}
            onStartPayment={startNewPayment}
          />
        ) : visibleScreen === "analyzing" ? (
          <AnalyzeStatePage
            activeStepKey={analysisStep}
            error={analysisError}
            hasDocument={analysisHasDocument}
            onBack={() => navigateTo("new-payment")}
          />
        ) : visibleScreen === "confirm" ? (
          paymentDecision ? (
            <ConfirmPage
              decision={paymentDecision}
              error={paymentActionError}
              onCancel={() => navigateTo("home")}
              onDirectSend={completeDirectSend}
              onGuardedPayment={chooseGuardedPayment}
              onSpeakVerdict={speakVerdict}
            />
          ) : (
            <AnalyzeStatePage
              activeStepKey="explanation"
              error={analysisError}
              hasDocument={analysisHasDocument}
              onBack={() => navigateTo("new-payment")}
            />
          )
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
            stablecoinConfig={stablecoinConfig}
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

async function speakVerdict(verdict: RiskVerdict) {
  const spokenText = `PayGuard verdict is ${verdict.verdict}. Route is ${verdict.recommendedRoute}.`;
  const requestId = (spokenVerdictRequestId += 1);

  stopActiveSpokenVerdict();

  if (window.payguardDesktop?.speakVerdictWithSystemVoice) {
    window.payguardDesktop.speakVerdictWithSystemVoice(spokenText).catch((error) => {
      if (requestId === spokenVerdictRequestId) {
        console.warn("System spoken verdict playback failed.", error);
        speakWithBrowserFallback(spokenText);
      }
    });
  } else {
    speakWithBrowserFallback(spokenText);
  }

  if (!window.payguardDesktop?.synthesizeSpokenVerdict) {
    return;
  }

  void window.payguardDesktop.synthesizeSpokenVerdict(verdict).catch((error) => {
    if (requestId === spokenVerdictRequestId) {
      console.warn("QVAC TTS verdict synthesis failed.", error);
    }
  });
}

function speakWithBrowserFallback(text: string) {
  stopActiveSpokenVerdict();

  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    return;
  }

  const requestId = spokenVerdictRequestId;
  let didSpeak = false;
  const speak = () => {
    if (didSpeak || requestId !== spokenVerdictRequestId) {
      return;
    }

    didSpeak = true;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((voice) => voice.lang.startsWith("en") && voice.localService) ??
      voices.find((voice) => voice.lang.startsWith("en"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  if (window.speechSynthesis.getVoices().length) {
    speak();
    return;
  }

  window.speechSynthesis.addEventListener(
    "voiceschanged",
    () => {
      speak();
    },
    { once: true }
  );
  window.setTimeout(speak, 300);
}

function stopActiveSpokenVerdict() {
  window.speechSynthesis?.cancel();
}

function resolveAnalysisRequestFromOcr(
  request: PaymentAnalysisRequest,
  ocrResult: QvacOcrResult | null
): PaymentAnalysisRequest {
  if (!ocrResult) {
    return request;
  }

  return {
    ...request,
    ocrRecipientName: request.ocrRecipientName ?? inferRecipientNameFromOcr(ocrResult.text),
    ocrText: ocrResult.text,
    payment: {
      ...request.payment,
      amount: request.payment.amount || ocrResult.hints.amounts[0],
      ocrText: ocrResult.text,
      recipientWallet:
        request.payment.recipientWallet ||
        ocrResult.hints.possibleWallets[0] ||
        ocrResult.hints.addressLikeValues[0]
    }
  };
}

function validateResolvedPayment(payment: PaymentRagInput) {
  if (!payment.recipientWallet?.trim()) {
    throw new Error("Could not find a recipient wallet in the payment details or uploaded document.");
  }

  if (!payment.amount?.trim()) {
    throw new Error("Could not find an amount in the payment details or uploaded document.");
  }
}

function inferRecipientNameFromOcr(text?: string) {
  if (!text) {
    return null;
  }

  const merchantMatch = text.match(/Merchant Name\s*\n?(.+)/i);
  const walletIndex = text.toLowerCase().indexOf("wallet address");

  if (merchantMatch?.[1]) {
    return merchantMatch[1].trim();
  }

  if (walletIndex > 0) {
    return (
      text
        .slice(0, walletIndex)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .at(-1) ?? null
    );
  }

  return null;
}

function waitForMinimumStepVisibility() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 450);
  });
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
      (recipientMatch?.recommendation === "trusted-match"
        ? recipientMatch.bestMatch?.recipientName
        : null) ||
      request.ocrRecipientName ||
      "Unknown recipient",
    memo: request.payment.memo || "",
    escrowAddress: undefined,
    guardedHoldHours: 24,
    selectedRoute: verdict.recommendedRoute,
    txSignature: undefined,
    unlockAt: undefined,
    vaultAddress: undefined,
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
