import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// Säkerhetsrubriker som webbläsaren följer:
// - inga skript, bilder eller ramar från andra webbplatser (lagbilder är inbäddade som data:),
// - appen kan inte bäddas in i en annan sida,
// - adressen (med jaktens id eller värdnyckel) skickas inte vidare till andra webbplatser,
// - bara kameran används, och bara av appen själv.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Lagbilder skickas som små komprimerade bilder via server actions.
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
