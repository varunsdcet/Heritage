import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "@myheritage/tokens/css";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-display",
});

const certBody = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-cert-body",
});

const certDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--font-cert-display",
});

export const metadata: Metadata = {
  title: "MyHeritage",
  description: "MyHeritage — Heritage Community College",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${certBody.variable} ${certDisplay.variable}`}>
      <body>{children}</body>
    </html>
  );
}
