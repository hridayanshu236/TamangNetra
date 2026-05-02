import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "../src/components/ui/toaster";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TamangNetra — Trilingual Translation Tool",
  description: "See Across Languages. Translate with Precision. Trilingual file translation (English ↔ Nepali ↔ Tamang) with PII scrubbing, AES-256 encryption, knowledge graph consistency, and OCR.",
  keywords: ["TamangNetra", "translation", "Nepali", "Tamang", "trilingual", "OCR", "PII", "encryption", "TMT API"],
  authors: [{ name: "TamangNetra Team" }],
  icons: {
    icon: "/tamangnetra-logo.png",
  },
  openGraph: {
    title: "TamangNetra — Trilingual Translation Tool",
    description: "See Across Languages. Translate with Precision. English ↔ Nepali ↔ Tamang",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TamangNetra — Trilingual Translation Tool",
    description: "See Across Languages. Translate with Precision.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
