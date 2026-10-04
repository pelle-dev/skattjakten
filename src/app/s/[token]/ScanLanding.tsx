"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { scanAction } from "../../actions/play";

export function ScanLanding({ huntId, token }: { huntId: string; token: string }) {
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
      <TopBar />
      <main className="page center">
        <div className="card">
          <div style={{ fontSize: "3rem" }}>🔍</div>
          <p className="big">{error ?? "Kollar QR-koden…"}</p>
        </div>
      </main>
    </>
  );
}
