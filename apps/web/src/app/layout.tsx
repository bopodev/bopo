import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/components/ui/shadcn.scss";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemePaletteProvider } from "@/components/theme-palette-provider";
import { Toaster } from "@/components/ui/sonner";
import styles from "./layout.module.scss";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "Bopo",
  description: "AI company orchestration in one interface"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${styles.viewBody1}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
          storageKey="bopodev-theme-v2"
        >
          <ThemePaletteProvider>
            {children}
            <Toaster position="bottom-right" />
          </ThemePaletteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
