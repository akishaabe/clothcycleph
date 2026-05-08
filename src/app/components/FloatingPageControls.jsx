import { useEffect, useState } from "react";
import { ArrowUp, Moon, Sun } from "lucide-react";
import { useLocation } from "react-router-dom";

export function FloatingPageControls() {
  const { pathname } = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const hideScrollTop = pathname === "/settings";

  useEffect(() => {
    const savedTheme = localStorage.getItem("clothcycle-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = savedTheme ? savedTheme === "dark" : prefersDark;

    document.documentElement.classList.toggle("dark", shouldUseDark);
    setIsDark(shouldUseDark);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 280);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  const toggleDarkMode = () => {
    const nextIsDark = !isDark;

    document.documentElement.classList.toggle("dark", nextIsDark);
    localStorage.setItem("clothcycle-theme", nextIsDark ? "dark" : "light");
    setIsDark(nextIsDark);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[80] flex flex-col items-end gap-3">
      {!hideScrollTop && showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          title="Back to top"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#336158] text-white shadow-[0_14px_34px_rgba(25,34,29,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#2a4c48] focus:outline-none focus:ring-4 focus:ring-[#336158]/25"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      <button
        type="button"
        onClick={toggleDarkMode}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Light mode" : "Dark mode"}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#19221d] text-white shadow-[0_14px_34px_rgba(25,34,29,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#2a4c48] focus:outline-none focus:ring-4 focus:ring-[#336158]/25 dark:bg-white dark:text-[#19221d] dark:hover:bg-[#e7ebe6]"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
    </div>
  );
}
