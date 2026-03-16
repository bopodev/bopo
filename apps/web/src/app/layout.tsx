import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/components/ui/shadcn.scss";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemePaletteProvider } from "@/components/theme-palette-provider";
import { Toaster } from "@/components/ui/sonner";
import styles from "./layout.module.scss";

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "Bopo",
  description: "AI company orchestration in one interface"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${styles.viewBody1}`}>
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
