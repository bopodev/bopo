"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import styles from "./theme-toggle.module.scss";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const active = mounted && theme === "light" ? "light" : "dark";

  return (
    <button
      type="button"
      className={styles.themeToggle}
      role="switch"
      aria-checked={active === "dark"}
      aria-label="Dark mode"
      onClick={() => setTheme(active === "light" ? "dark" : "light")}
    >
      <span
        className={cn(styles.themeToggleBtn, active === "light" && styles.themeToggleBtnActive)}
        aria-hidden
      >
        <SunIcon className={styles.themeToggleIcon} aria-hidden />
      </span>
      <span
        className={cn(styles.themeToggleBtn, active === "dark" && styles.themeToggleBtnActive)}
        aria-hidden
      >
        <MoonIcon className={styles.themeToggleIcon} aria-hidden />
      </span>
    </button>
  );
}
