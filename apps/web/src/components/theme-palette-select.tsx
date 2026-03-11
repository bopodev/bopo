"use client";

import { SwatchBook } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useThemePalette } from "@/components/theme-palette-provider";
import { THEME_PALETTES, type ThemePaletteId } from "@/lib/theme-palette";
import styles from "./theme-palette-select.module.scss";

export function ThemePaletteSelect() {
  const { palette, setPalette } = useThemePalette();
  const activePalette = THEME_PALETTES.find((themePalette) => themePalette.id === palette);

  return (
    <Select
      value={palette}
      onValueChange={(value) => setPalette(value as ThemePaletteId)}
    >
      <SelectTrigger className={styles.themePaletteTrigger} size="sm">
        <span className={styles.themePaletteLabel1}>
          <SwatchBook className={styles.themePaletteIcon} />
          <SelectValue placeholder="Theme" />
        </span>
        <span className={styles.themePaletteLabel2}>
          {activePalette ? "Theme" : ""}
        </span>
      </SelectTrigger>
      <SelectContent>
        {THEME_PALETTES.map(({ id, label }) => (
          <SelectItem key={id} value={id}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
