"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDemoAction } from "./actions/host";

export function DemoButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await createDemoAction();
        if (res.ok) router.push(`/hunt/${res.data.id}`);
        else setBusy(false);
      }}
    >
      🧪 Skapa Testjakten
    </button>
  );
}
