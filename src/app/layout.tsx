import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Nunito_Sans } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Typsnitt enligt grafiska profilen: Nunito Sans för rubriker, Atkinson Hyperlegible för brödtext.
const nunitoSans = Nunito_Sans({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"], variable: "--font-nunito-sans", display: "swap" });
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap" });

// Bara startsidan ska synas i Google. Jakter, lag, diplom och värdsidor är privata,
// så alla sidor är "noindex" om de inte själva säger något annat (se page.tsx).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Skattjakten",
  description: "Skapa en rolig skattjakt på några minuter. Göm, scanna, lös och hitta skatten.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "sv_SE",
    siteName: "Skattjakten",
  },
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
