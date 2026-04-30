type DesktopBridge = {
  starterMessage: string;
};

declare global {
  interface Window {
    payguardDesktop?: DesktopBridge;
  }
}

const target = document.querySelector("[data-starter-message]");

if (target instanceof HTMLElement && window.payguardDesktop) {
  target.textContent = window.payguardDesktop.starterMessage;
}
