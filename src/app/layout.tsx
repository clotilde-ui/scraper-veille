import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { ConfirmDialogProvider } from "@/contexts/ConfirmDialogContext";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmDialogContainer } from "@/components/ConfirmDialog";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Scraper — SONATE",
  description: "Outil de scraping et d'audit de sites web",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} antialiased bg-background`}
      >
        <ConfirmDialogProvider>
          <AppShell>{children}</AppShell>
          <ConfirmDialogContainer />
          <Toaster richColors position="bottom-right" />
        </ConfirmDialogProvider>
      </body>
    </html>
  );
}
