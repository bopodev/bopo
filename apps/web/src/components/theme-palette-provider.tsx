"use client";

import * as React from "react";
import {
  type ThemePaletteId,
  getStoredPalette,
  setStoredPalette,
} from "@/lib/theme-palette";

type ThemePaletteContextValue = {
  palette: ThemePaletteId;
  setPalette: (palette: ThemePaletteId) => void;
};

const ThemePaletteContext = React.createContext<ThemePaletteContextValue | null>(
  null
);

export function useThemePalette() {
  const ctx = React.useContext(ThemePaletteContext);
  if (!ctx) {
    throw new Error("useThemePalette must be used within ThemePaletteProvider");
  }
  return ctx;
}

export function ThemePaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = React.useState<ThemePaletteId>("default");
  const mounted = React.useRef(false);

  React.useEffect(() => {
    const stored = getStoredPalette();
    setPaletteState(stored);
    mounted.current = true;
  }, []);

  React.useEffect(() => {
    if (!mounted.current) return;
    const root = document.documentElement;
    if (palette === "default") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", palette);
    }
  }, [palette]);

  const setPalette = React.useCallback((next: ThemePaletteId) => {
    setStoredPalette(next);
    setPaletteState(next);
  }, []);

  const value = React.useMemo<ThemePaletteContextValue>(
    () => ({ palette, setPalette }),
    [palette, setPalette]
  );

  return (
    <ThemePaletteContext.Provider value={value}>
      {children}
    </ThemePaletteContext.Provider>
  );
}
