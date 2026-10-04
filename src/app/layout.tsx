import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Nunito_Sans } from "next/font/google";
import "./globals.css";

// Typsnitt enligt grafiska profilen: Nunito Sans för rubriker, Atkinson Hyperlegible för brödtext.
const nunitoSans = Nunito_Sans({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"], variable: "--font-nunito-sans", display: "swap" });
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap" });

export const metadata: Metadata = {
  title: "Skattjakten",
  description: "Skapa en rolig skattjakt på några minuter. Göm, scanna, lös och hitta skatten.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFF4DE",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${nunitoSans.variable} ${atkinson.variable}`}>
      <body>{children}</body>
    </html>
  );
}
