import { createContext, useContext, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "aptushire_theme:v1";

const ThemeContext = createContext({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light");
  const resolvedTheme = "light";

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, "light");
    } catch {
      // Storage is optional; the rendered palette remains light regardless.
    }
  }, [theme]);

  function setTheme() {
    setThemeState("light");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, "light");
    } catch (err) {
      console.error("Failed to persist theme", err);
    }
  }

  function toggleTheme() {
    setTheme("light");
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
