"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import type { Language } from "@/lib/types";
import { scanAction } from "../../actions/play";

export function ScanLanding({ huntId, token, lang, brand }: { huntId: string; token: string; lang: Language; brand: string }) {
  const router = useRouter();
  const sent = useRef(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    scanAction(huntId, token).then((res) => {
      if (res.ok) router.replace(`/play/${huntId}?r=${res.data.result.outcome}&p=${res.data.result.points}`);
      else setError(res.error);
    });
  }, [huntId, token, router]);
  return (
    <>
      <TopBar brand={brand} />
      <main className="page center">
        <div className="card">
          <div style={{ fontSize: "3rem" }}>🔍</div>
          <p className="big">{error ?? (lang === "sv" ? "Kollar QR-koden…" : "Checking the QR code…")}</p>
        </div>
      </main>
    </>
  );
}
