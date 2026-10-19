"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// Besöksstatistik (Vercel Web Analytics). Den använder inga cookies och sparar inga personuppgifter.
// Adresserna till jakter, lag och QR-koder innehåller hemliga koder, så de skickas bara som
// ett mönster, t.ex. /hunt/[id]/teams. Frågetecken-delen (?...) skickas aldrig.

/** Gör om en sökväg till ett mönster utan hemliga koder. null betyder att sidan inte ska räknas. */
export function anonymizePath(path: string): string | null {
  const parts = path.split("/").filter(Boolean);
  switch (parts[0]) {
    case undefined:
      return "/";
    case "statistik":
      return null;
    case "hunt":
      return ["/hunt/[id]", ...parts.slice(2)].join("/");
    case "play":
      return "/play/[id]";
    case "diploma":
      return "/diploma/[id]";
    case "s":
      return "/s/[kod]";
    case "join":
      return parts.length > 1 ? "/join/[kod]" : "/join";
    default:
      return "/" + parts.join("/");
  }
}

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url);
  const path = anonymizePath(url.pathname);
  return path ? { ...event, url: url.origin + path } : null;
}

export function WebAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
