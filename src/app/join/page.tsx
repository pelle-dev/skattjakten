"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { normalizeCodeClient } from "./normalize";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <>
      <TopBar />
      <main className="page">
        <section className="card center">
          <div style={{ fontSize: "3rem" }}>🧭</div>
          <h1>Gå med i en skattjakt</h1>
          <p className="muted">Skriv koden du fått av skattgömmaren. Har ditt lag redan gått med? Skriv lagkoden.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const c = normalizeCodeClient(code);
              if (c) router.push(`/join/${c}`);
            }}
          >
            <input className="code-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="KOD" autoCapitalize="characters" autoComplete="off" maxLength={8} />
            <button className="btn primary huge" style={{ marginTop: 14 }}>
              Gå vidare
            </button>
          </form>
        </section>
        <p className="muted small center">Du kan också scanna skattgömmarens QR-kod för att gå med.</p>
      </main>
    </>
  );
}
