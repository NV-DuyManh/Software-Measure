// frontend/src/hooks/useTheme.js
import { useState, useEffect } from "react";

const THEMES = ["light", "dark", "mint-pink", "rose-blue", "peach"];

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("fp-theme") || "light"
  );

  useEffect(() => {
    const root = document.documentElement;
    // Xóa tất cả thuộc tính theme cũ
    root.removeAttribute("data-theme");
    
    // Nếu không phải light (mặc định), thì thêm attribute mới
    if (theme !== "light") {
      root.setAttribute("data-theme", theme);
    }
    localStorage.setItem("fp-theme", theme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme((prevTheme) => {
      const currentIndex = THEMES.indexOf(prevTheme);
      const nextIndex = (currentIndex + 1) % THEMES.length;
      return THEMES[nextIndex];
    });
  };

  return { theme, cycleTheme };
}