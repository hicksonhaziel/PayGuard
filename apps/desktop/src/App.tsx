import { useEffect, useState } from "react";
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
export type PaymentEntryMode = "manual" | "voice";

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

export default function App() {
  const [activeScreen, setActiveScreen] = useState<AppScreen>("home");
  const [visibleScreen, setVisibleScreen] = useState<AppScreen>("home");
  const [paymentEntryMode, setPaymentEntryMode] =
    useState<PaymentEntryMode>("manual");
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

  function navigateTo(screen: AppScreen) {
    setTransitionDirection(
      screenOrder[screen] < screenOrder[activeScreen] ? "backward" : "forward"
    );
    setActiveScreen(screen);
  }

  function startNewPayment(mode: PaymentEntryMode) {
    setTransitionDirection("forward");
    setPaymentEntryMode(mode);
    setActiveScreen("new-payment");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7fafc] dark:bg-[#0f172a]">
      {visibleScreen !== "analyzing" &&
      visibleScreen !== "confirm" &&
      visibleScreen !== "confirm-transaction" &&
      visibleScreen !== "success" ? (
        <TopNavigation activeScreen={activeScreen} onNavigate={navigateTo} />
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
          <HomePage onStartPayment={startNewPayment} />
        ) : visibleScreen === "history" ? (
          <HistoryPage />
        ) : visibleScreen === "recipients" ? (
          <RecipientsPage onStartPayment={() => startNewPayment("manual")} />
        ) : visibleScreen === "analyzing" ? (
          <AnalyzeStatePage onComplete={() => navigateTo("confirm")} />
        ) : visibleScreen === "confirm" ? (
          <ConfirmPage
            onCancel={() => navigateTo("home")}
            onDirectSend={() => navigateTo("home")}
            onGuardedPayment={() => navigateTo("confirm-transaction")}
          />
        ) : visibleScreen === "confirm-transaction" ? (
          <ConfirmTransactionPage
            onBack={() => navigateTo("confirm")}
            onSign={() => navigateTo("success")}
          />
        ) : visibleScreen === "success" ? (
          <SuccessPage onNewPayment={() => startNewPayment("manual")} />
        ) : (
          <NewPaymentPage
            entryMode={paymentEntryMode}
            onBack={() => navigateTo("home")}
            onAnalyze={() => navigateTo("analyzing")}
          />
        )}
      </div>
    </div>
  );
}
