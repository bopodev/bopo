"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import styles from "./theme-toggle.module.scss";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme !== "light" : true;
  const nextTheme = isDark ? "light" : "dark";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
      className={styles.themeToggleButton}
    >
      <span className={styles.themeToggleLabel1}>
        {isDark ? <SunIcon className={styles.themeToggleSunIcon} /> : <MoonIcon className={styles.themeToggleSunIcon} />}
        <span>{mounted ? `${isDark ? "Dark" : "Light"} mode` : "Theme"}</span>
      </span>
      <span className={styles.themeToggleLabel2}>{mounted ? `Mode` : ""}</span>
    </Button>
  );
}
