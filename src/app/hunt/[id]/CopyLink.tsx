"use client";

import { useState } from "react";

export function CopyLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="row" style={{ marginBottom: 8 }}>
      <input readOnly value={url} aria-label={label} onFocus={(e) => e.target.select()} style={{ flex: 1, minWidth: 0, fontSize: "0.85rem" }} />
      <button
        type="button"
        className="btn small"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* urklipp saknas – användaren kan markera texten */
          }
        }}
      >
        {copied ? "Kopierad!" : "Kopiera"}
      </button>
    </div>
  );
}
