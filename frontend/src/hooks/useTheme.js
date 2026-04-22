import { useState, useEffect } from "react";

// Khai báo 6 theme của chúng ta
const THEMES = ["light", "dark", "mint-pink", "rose-blue", "peach", "rainbow"];

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("fp-theme") || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.removeAttribute("data-theme");
    if (theme !== "light") {
      root.setAttribute("data-theme", theme);
    }
    localStorage.setItem("fp-theme", theme);
  }, [theme]);

  // Hàm luân chuyển qua 6 màu
  const cycleTheme = () => {
    setTheme(prev => {
      const nextIndex = (THEMES.indexOf(prev) + 1) % THEMES.length;
      return THEMES[nextIndex];
    });
  };

  return { theme, cycleTheme };
}