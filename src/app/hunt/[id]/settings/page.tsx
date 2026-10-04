"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { HuntForm } from "@/components/HuntForm";
import { useToast } from "@/components/Toast";
import { updateSettingsAction } from "../../../actions/host";
import { useHostBundle } from "../useHostBundle";

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { bundle, reload } = useHostBundle(id);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  if (!bundle) return <p className="muted">Laddar…</p>;
  const h = bundle.hunt;
  const locked = h.status !== "draft";
  return (
    <div style={{ maxWidth: 720 }}>
      {locked && <div className="notice warn">Skattjakten har startat. Bara namn och beskrivning kan ändras nu.</div>}
      <HuntForm
        key={h.id + h.plan}
        mode="edit"
        locked={locked}
        busy={busy}
        initial={{
          name: h.name,
          description: h.description,
          template: h.template,
          gameMode: h.gameMode,
          playMode: h.playMode,
          ageGroup: h.ageGroup,
          themes: h.themes,
          difficulty: h.difficulty,
          plan: h.plan,
          clueCount: bundle.checkpoints.length,
          winMode: h.winMode,
          startMode: h.startMode,
          startIntervalMinutes: h.startIntervalMinutes,
          allowPhotos: h.allowPhotos,
        }}
        onSubmit={async (input) => {
          setBusy(true);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { clueCount, ...rest } = input;
          const res = await updateSettingsAction(id, locked ? { name: rest.name, description: rest.description } : rest);
          setBusy(false);
          if (res.ok) {
            toast.show("Sparat!", true);
            reload();
            router.refresh();
          } else toast.show(res.error);
        }}
      />
      {toast.node}
    </div>
  );
}
