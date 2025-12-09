// app/theme/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  colors: {
    background: string;
    card: string;
    text: string;
    subtext: string;
    border: string;
    iconBg: string;
  };
};

const ThemeContext = createContext<ThemeContextType | null>(null);

const lightColors = {
  background: "#f7f7f7",
  card: "#ffffff",
  text: "#111",
  subtext: "#666",
  border: "#ddd",
  iconBg: "#eee",
};

const darkColors = {
  background: "#000",
  card: "#111",
  text: "#ffffff",
  subtext: "#aaa",
  border: "#333",
  iconBg: "#222",
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const stored = await AsyncStorage.getItem("app.darkMode");
    if (stored === "true") setThemeState("dark");
    else if (stored === "false") setThemeState("light");
    else {
      // fallback to system color scheme
      const sys = Appearance.getColorScheme();
      setThemeState(sys === "dark" ? "dark" : "light");
    }
  };

  const setTheme = async (t: Theme) => {
    setThemeState(t);
    await AsyncStorage.setItem("app.darkMode", t === "dark" ? "true" : "false");
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
        setTheme,
        toggleTheme,
        colors: theme === "dark" ? darkColors : lightColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
    return ctx;
};
