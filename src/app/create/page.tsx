"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_HUNT_INPUT, HuntForm } from "@/components/HuntForm";
import { useToast } from "@/components/Toast";
import { createHuntAction } from "../actions/host";

export default function CreatePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <main className="page">
      <p>
        <a href="/">← Till startsidan</a>
      </p>
      <h1>Skapa ny skattjakt</h1>
      <p className="muted">Välj grunderna. Sedan bygger du ledtrådarna en i taget med Ledtrådshjälparen.</p>
      <HuntForm
        initial={DEFAULT_HUNT_INPUT}
        mode="create"
        busy={busy}
        onSubmit={async (input) => {
          setBusy(true);
          const res = await createHuntAction(input);
          if (res.ok) router.push(`/hunt/${res.data.id}/build`);
          else {
            toast.show(res.error);
            setBusy(false);
          }
        }}
      />
      {toast.node}
    </main>
  );
}
