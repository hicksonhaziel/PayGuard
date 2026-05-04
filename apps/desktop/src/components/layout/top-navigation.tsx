import { useEffect, useState } from "react";
import type { AppScreen } from "../../App";
import banner from "../../../assets/payguardbanner.png";

const navigationItems: { label: string; screen: AppScreen | null }[] = [
  { label: "Dashboard", screen: "home" },
  { label: "History", screen: "history" },
  { label: "Recipients", screen: "recipients" }
];
const themeStorageKey = "payguard-theme";

type Theme = "light" | "dark";

interface TopNavigationProps {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

export function TopNavigation({ activeScreen, onNavigate }: TopNavigationProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const storedTheme = window.localStorage.getItem(themeStorageKey);

    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-center border-b border-[#c6c6cc]/30 bg-[#f7fafc] dark:border-white/10 dark:bg-[#0f172a]">
      <div className="flex w-full max-w-[1200px] items-center justify-between px-8 max-lg:px-5">
        <div className="flex min-w-0 items-center gap-10">
          <img
            alt="PayGuard"
            className="h-auto w-[132px] object-contain"
            src={banner}
          />

          <nav className="flex items-center gap-6 max-lg:hidden" aria-label="Primary navigation">
            {navigationItems.map((item) => (
              <button
                className={`relative h-16 border-0 bg-transparent p-0 font-['Manrope'] text-sm font-semibold transition-colors ${
                  item.screen === activeScreen
                    ? "text-[#030813] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#006c49] dark:text-white dark:after:bg-[#6ffbbe]"
                    : "text-[#45474c] hover:text-[#030813] dark:text-slate-400 dark:hover:text-white"
                }`}
                key={item.label}
                onClick={() => {
                  if (item.screen) {
                    onNavigate(item.screen);
                  }
                }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 max-md:gap-1.5">
          <div className="flex items-center gap-2 rounded-full border border-[#c6c6cc]/50 bg-[#f1f4f6] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.05em] text-[#45474c] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 max-md:hidden" title="Connected wallet">
            <span className="h-[7px] w-[7px] rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
            <span>0x71C...3921</span>
          </div>

          <button
            className="pg-icon-button"
            onClick={toggleTheme}
            type="button"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="material-symbols-outlined">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>
          <button className="pg-icon-button" type="button" aria-label="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </div>
    </header>
  );
}
