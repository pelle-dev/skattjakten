"use client";

import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { DIFFICULTIES, MISSION_EXAMPLES, templateById } from "@/lib/catalog";
import type { Difficulty, Question } from "@/lib/types";
import type { HostBundle, HostCheckpoint } from "@/lib/views";
import {
  addCheckpointAction,
  aiClueAction,
  aiHelpAction,
  aiQuestionsAction,
  approveQuestionAction,
  deleteQuestionAction,
  moveCheckpointAction,
  removeCheckpointAction,
  saveQuestionAction,
  setMissionAction,
  updateCheckpointAction,
  updateTreasureAction,
} from "../../../actions/host";
import { useHostBundle } from "../useHostBundle";

type Toast = ReturnType<typeof useToast>;

const STEPS = ["Placering", "Svårighet", "Ledtråd", "Hjälptext", "Frågor", "Uppdrag"] as const;

export default function BuildPage() {
  const { id } = useParams<{ id: string }>();
  const { bundle, reload, error } = useHostBundle(id);
  const [selected, setSelected] = useState<string>("");
  const toast = useToast();

  useEffect(() => {
    if (bundle && !selected) setSelected(bundle.checkpoints[0]?.id ?? "treasure");
  }, [bundle, selected]);

  if (error) return <div className="notice bad">{error}</div>;
  if (!bundle) return <p className="muted">Laddar…</p>;

  const draft = bundle.hunt.status === "draft";
  const cp = bundle.checkpoints.find((c) => c.id === selected);
  const canAdd = draft && bundle.checkpoints.length < bundle.limits.maxClues;

  return (
    <>
      {!draft && <div className="notice warn">Skattjakten har startat. Du kan rätta texter, men inte lägga till ledtrådar eller ändra frågor.</div>}
      <div className="builder">
        <aside className="card" style={{ padding: 12 }}>
          <h3 style={{ margin: "4px 6px 10px" }}>Ledtrådskedjan</h3>
          <div className="cp-list">
            {bundle.checkpoints.map((c) => {
              const ready = c.publicClueText.trim() && c.questions.length > 0 && c.questions.every((q) => q.approvedByHost);
              return (
                <button key={c.id} className={`cp-item ${selected === c.id ? "on" : ""}`} onClick={() => setSelected(c.id)}>
                  <span className="cp-num">{c.order + 1}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong>{c.title}</strong>
                    <br />
                    <span className="muted small">{c.hostPlacementNote || "Ingen placering ännu"}</span>
                  </span>
                  {ready ? <span className="badge">Klar</span> : <span className="badge warn">!</span>}
                </button>
              );
            })}
            <button className={`cp-item ${selected === "treasure" ? "on" : ""}`} onClick={() => setSelected("treasure")}>
              <span className="cp-num" style={{ background: "var(--accent)", color: "var(--ink)" }}>
                💎
              </span>
              <span style={{ flex: 1 }}>
                <strong>Skatten</strong>
                <br />
                <span className="muted small">{bundle.treasure?.hostPlacementNote || "Ingen placering ännu"}</span>
              </span>
            </button>
          </div>
          {draft && (
            <button
              className="btn block"
              style={{ marginTop: 10 }}
              disabled={!canAdd}
              onClick={async () => {
                const res = await addCheckpointAction(id);
                if (!res.ok) return toast.show(res.error);
                await reload();
                setSelected(res.data);
              }}
            >
              + Lägg till ledtråd
            </button>
          )}
          <p className="muted small" style={{ margin: "8px 6px 0" }}>
            {bundle.checkpoints.length} av max {bundle.limits.maxClues} ledtrådar ({bundle.hunt.plan === "free" ? "gratis" : "betald"}).
          </p>
        </aside>

        <section>
          {cp ? (
            <CheckpointEditor key={cp.id} bundle={bundle} cp={cp} draft={draft} reload={reload} toast={toast} onRemoved={() => setSelected("")} />
          ) : selected === "treasure" && bundle.treasure ? (
            <TreasureEditor key="treasure" bundle={bundle} reload={reload} toast={toast} />
          ) : null}
        </section>
      </div>
      {toast.node}
    </>
  );
}

// ---------------------------------------------------------------------------

function QrPreview({ token }: { token: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/s/${token}`, { margin: 1, width: 160 }).then(setSrc);
  }, [token]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="QR-kod" width={120} height={120} /> : null;
}

function AiButton({ label, onClick }: { label: string; onClick: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn small gold"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onClick();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Tänker…" : `✨ ${label}`}
    </button>
  );
}

function CheckpointEditor({
  bundle,
  cp,
  draft,
  reload,
  toast,
  onRemoved,
}: {
  bundle: HostBundle;
  cp: HostCheckpoint;
  draft: boolean;
  reload: () => Promise<void>;
  toast: Toast;
  onRemoved: () => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: cp.title,
    hostPlacementNote: cp.hostPlacementNote,
    publicClueText: cp.publicClueText,
    helpText: cp.helpText,
    difficulty: cp.difficulty as Difficulty,
  });
  const [variant, setVariant] = useState(0);
  const [mission, setMission] = useState(cp.mission?.missionText ?? "");
  const huntId = bundle.hunt.id;

  const save = async (patch: Partial<typeof form>) => {
    const res = await updateCheckpointAction(cp.id, patch);
    if (!res.ok) toast.show(res.error);
    else reload();
  };
  const field = (key: "title" | "hostPlacementNote" | "publicClueText" | "helpText") => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
    onBlur: () => form[key] !== cp[key] && save({ [key]: form[key] }),
  });
  const done = [
    !!cp.hostPlacementNote.trim(),
    true,
    !!cp.publicClueText.trim(),
    !!cp.helpText.trim(),
    cp.questions.length >= 3 && cp.questions.every((q) => q.approvedByHost),
    !!cp.mission || !bundle.limits.missions,
  ];
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="row">
          <span className="cp-num">{cp.order + 1}</span>
          <input {...field("title")} style={{ fontWeight: 800, maxWidth: 260 }} aria-label="Titel" />
        </div>
        <div className="row">
          <QrPreview token={cp.qrToken} />
        </div>
      </div>
      <div className="steps">
        {STEPS.map((s, i) => (
          <button key={s} className={`${step === i ? "on" : ""} ${done[i] ? "ok" : ""}`} onClick={() => setStep(i)}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div>
          <label className="field">
            <span>Var ska QR-koden placeras?</span>
            <textarea {...field("hostPlacementNote")} placeholder="T.ex. Under den röda bänken vid lekplatsen." />
            <small>🔒 Privat anteckning. Bara du ser den, på placeringslistan.</small>
          </label>
          <button className="btn primary" onClick={next}>
            Nästa: svårighet →
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <div className="field">
            <span>Hur svår ska ledtråden vara?</span>
            <div className="chips">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`chip ${form.difficulty === d.id ? "on" : ""}`}
                  onClick={() => {
                    setForm((f) => ({ ...f, difficulty: d.id }));
                    save({ difficulty: d.id });
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <small>Enkel = rak instruktion. Medel = lite omskrivet. Klurig = en gåta.</small>
          </div>
          <button className="btn primary" onClick={next}>
            Nästa: ledtråd →
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <label className="field">
            <span>Ledtråden som deltagarna ser</span>
            <textarea {...field("publicClueText")} placeholder="Skriv själv eller låt Ledtrådshjälparen föreslå." style={{ minHeight: 110 }} />
            <small>Den här ledtråden visas när deltagarna ska leta efter kontrollpunkt {cp.order + 1}.</small>
          </label>
          <div className="row" style={{ marginBottom: 14 }}>
            <AiButton
              label={form.publicClueText ? "Nytt förslag" : "Föreslå ledtråd"}
              onClick={async () => {
                const res = await aiClueAction(huntId, {
                  placementNote: form.hostPlacementNote,
                  difficulty: form.difficulty,
                  previous: form.publicClueText,
                  variant,
                });
                if (!res.ok) return toast.show(res.error);
                setVariant((v) => v + 1);
                setForm((f) => ({ ...f, publicClueText: res.data }));
                save({ publicClueText: res.data });
              }}
            />
            {!form.hostPlacementNote && <span className="muted small">Skriv placeringen i steg 1 först.</span>}
          </div>
          <p className="muted small">Du kan alltid redigera förslaget eller skriva en helt egen ledtråd.</p>
          <button className="btn primary" onClick={next}>
            Nästa: hjälptext →
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <label className="field">
            <span>Hjälptext</span>
            <textarea {...field("helpText")} placeholder="T.ex. Leta vid den röda bänken på lekplatsen." />
            <small>Visas bara om deltagarna trycker på ”Be om hjälp” (kostar {bundle.hunt.scoring.hintPenalty} poäng).</small>
          </label>
          <div className="row" style={{ marginBottom: 14 }}>
            <AiButton
              label="Föreslå hjälptext"
              onClick={async () => {
                const res = await aiHelpAction(huntId, { placementNote: form.hostPlacementNote, clue: form.publicClueText });
                if (!res.ok) return toast.show(res.error);
                setForm((f) => ({ ...f, helpText: res.data }));
                save({ helpText: res.data });
              }}
            />
          </div>
          <button className="btn primary" onClick={next}>
            Nästa: frågor →
          </button>
        </div>
      )}

      {step === 4 && <QuestionsStep bundle={bundle} cp={cp} draft={draft} reload={reload} toast={toast} onNext={next} />}

      {step === 5 && (
        <div>
          {!bundle.limits.missions ? (
            <div className="notice gold">Uppdrag finns i betalt läge. Byt plan under Inställningar.</div>
          ) : (
            <>
              <label className="field">
                <span>Uppdrag efter frågorna (valfritt)</span>
                <textarea
                  value={mission}
                  disabled={!draft}
                  onChange={(e) => setMission(e.target.value)}
                  onBlur={async () => {
                    if (mission === (cp.mission?.missionText ?? "")) return;
                    const res = await setMissionAction(cp.id, mission || null);
                    if (!res.ok) toast.show(res.error);
                    reload();
                  }}
                  placeholder="T.ex. Gör en high-five med alla i laget."
                />
                <small>Deltagarna markerar själva uppdraget som klart (+{bundle.hunt.scoring.missionCompleted} poäng).</small>
              </label>
              {draft && (
                <div className="chips" style={{ marginBottom: 14 }}>
                  {[...templateById(bundle.hunt.template).missions, ...MISSION_EXAMPLES]
                    .filter((m, i, all) => all.indexOf(m) === i)
                    .slice(0, 10)
                    .map((m) => (
                      <button
                        key={m}
                        type="button"
                        className="chip"
                        onClick={async () => {
                          setMission(m);
                          const res = await setMissionAction(cp.id, m);
                          if (!res.ok) toast.show(res.error);
                          reload();
                        }}
                      >
                        {m}
                      </button>
                    ))}
                </div>
              )}
              {draft && cp.mission && (
                <button
                  className="btn small danger"
                  onClick={async () => {
                    setMission("");
                    await setMissionAction(cp.id, null);
                    reload();
                  }}
                >
                  Inget uppdrag här
                </button>
              )}
            </>
          )}
        </div>
      )}

      {draft && (
        <div className="row" style={{ marginTop: 24, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <button className="btn small" disabled={cp.order === 0} onClick={async () => (await moveCheckpointAction(cp.id, -1), reload())}>
            ↑ Flytta upp
          </button>
          <button
            className="btn small"
            disabled={cp.order === bundle.checkpoints.length - 1}
            onClick={async () => (await moveCheckpointAction(cp.id, 1), reload())}
          >
            ↓ Flytta ner
          </button>
          <button
            className="btn small danger"
            style={{ marginLeft: "auto" }}
            onClick={async () => {
              if (!confirm(`Ta bort ${cp.title}?`)) return;
              const res = await removeCheckpointAction(cp.id);
              if (!res.ok) return toast.show(res.error);
              onRemoved();
              reload();
            }}
          >
            Ta bort ledtråd
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function QuestionsStep({
  bundle,
  cp,
  draft,
  reload,
  toast,
  onNext,
}: {
  bundle: HostBundle;
  cp: HostCheckpoint;
  draft: boolean;
  reload: () => Promise<void>;
  toast: Toast;
  onNext: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const free = 3 - cp.questions.length;
  return (
    <div>
      <p className="muted small">
        Tre flervalsfrågor visas när deltagarna har scannat QR-koden. AI-förslag måste godkännas innan jakten kan starta.
        {bundle.aiMode === "mock" && " (AI körs i exempelläge: ingen API-nyckel är inlagd.)"}
      </p>
      {cp.questions.map((q, i) => (
        <QuestionEditor key={q.id + q.updatedAt} index={i} cpId={cp.id} q={q} draft={draft} reload={reload} toast={toast} />
      ))}
      {adding && <QuestionEditor index={cp.questions.length} cpId={cp.id} draft={draft} reload={reload} toast={toast} onDone={() => setAdding(false)} />}
      {draft && free > 0 && !adding && (
        <div className="row" style={{ marginBottom: 14 }}>
          <AiButton
            label={`Skapa ${free} fråg${free > 1 ? "or" : "a"} med AI`}
            onClick={async () => {
              const res = await aiQuestionsAction(cp.id);
              if (!res.ok) return toast.show(res.error);
              await reload();
            }}
          />
          <button className="btn small" onClick={() => setAdding(true)}>
            ✍️ Skriv egen fråga
          </button>
        </div>
      )}
      {draft && cp.questions.some((q) => !q.approvedByHost) && (
        <button
          className="btn small primary"
          style={{ marginBottom: 14 }}
          onClick={async () => {
            for (const q of cp.questions.filter((x) => !x.approvedByHost)) await approveQuestionAction(q.id, true);
            reload();
          }}
        >
          ✓ Godkänn alla frågor här
        </button>
      )}
      <div>
        <button className="btn primary" onClick={onNext}>
          Nästa: uppdrag →
        </button>
      </div>
    </div>
  );
}

function QuestionEditor({
  index,
  cpId,
  q,
  draft,
  reload,
  toast,
  onDone,
}: {
  index: number;
  cpId: string;
  q?: Question;
  draft: boolean;
  reload: () => Promise<void>;
  toast: Toast;
  onDone?: () => void;
}) {
  const [text, setText] = useState(q?.questionText ?? "");
  const [alts, setAlts] = useState<string[]>(q ? [...q.alternatives] : ["", "", ""]);
  const [correct, setCorrect] = useState(q?.correctAnswer ?? 0);
  const [explanation, setExplanation] = useState(q?.explanation ?? "");
  const [editing, setEditing] = useState(!q);

  const saveIt = async (approve: boolean) => {
    const res = await saveQuestionAction(cpId, {
      id: q?.id,
      questionText: text,
      alternatives: alts,
      correctAnswer: correct,
      explanation,
      approvedByHost: approve,
    });
    if (!res.ok) return toast.show(res.error);
    setEditing(false);
    onDone?.();
    reload();
  };

  return (
    <div className="card" style={{ background: q && !q.approvedByHost ? "var(--accent-soft)" : "var(--molnvit)", boxShadow: "none" }}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <strong>Fråga {index + 1}</strong>
        <span className="row">
          {q?.generatedByAi && <span className="badge gold">AI</span>}
          {q && (q.approvedByHost ? <span className="badge">Godkänd</span> : <span className="badge warn">Granska</span>)}
        </span>
      </div>
      {editing && draft ? (
        <>
          <label className="field">
            <span>Frågetext</span>
            <input value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <span style={{ fontWeight: 700 }}>Svarsalternativ (markera rätt svar)</span>
          <div className="stack" style={{ margin: "8px 0 12px" }}>
            {alts.map((a, i) => (
              <div className="row" key={i} style={{ flexWrap: "nowrap" }}>
                <input type="radio" name={`correct-${q?.id ?? "new"}`} checked={correct === i} onChange={() => setCorrect(i)} aria-label="Rätt svar" style={{ width: 24, height: 24 }} />
                <input value={a} onChange={(e) => setAlts(alts.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Alternativ ${i + 1}`} />
                {alts.length > 3 && (
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => {
                      setAlts(alts.filter((_, j) => j !== i));
                      if (correct === i) setCorrect(0);
                      else if (correct > i) setCorrect(correct - 1);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {alts.length < 4 && (
              <button type="button" className="btn ghost small" onClick={() => setAlts([...alts, ""])}>
                + Fjärde alternativ
              </button>
            )}
          </div>
          <label className="field">
            <span>Förklaring (bara för dig)</span>
            <input value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Valfritt" />
          </label>
          <div className="row">
            <button className="btn primary small" onClick={() => saveIt(true)}>
              Spara och godkänn
            </button>
            {q && (
              <button
                className="btn small"
                onClick={() => {
                  setEditing(false);
                  setText(q.questionText);
                  setAlts([...q.alternatives]);
                  setCorrect(q.correctAnswer);
                  setExplanation(q.explanation);
                }}
              >
                Avbryt
              </button>
            )}
            {!q && (
              <button className="btn small" onClick={onDone}>
                Avbryt
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p style={{ fontWeight: 700 }}>{q?.questionText}</p>
          <ol style={{ margin: "0 0 8px", paddingLeft: 22 }}>
            {q?.alternatives.map((a, i) => (
              <li key={i} style={{ fontWeight: i === q.correctAnswer ? 800 : 400, color: i === q.correctAnswer ? "var(--primary)" : undefined }}>
                {a} {i === q.correctAnswer && "✓"}
              </li>
            ))}
          </ol>
          {q?.explanation && <p className="muted small">{q.explanation}</p>}
          {draft && q && (
            <div className="row">
              {!q.approvedByHost && (
                <button className="btn primary small" onClick={async () => (await approveQuestionAction(q.id, true), reload())}>
                  ✓ Godkänn
                </button>
              )}
              <button className="btn small" onClick={() => setEditing(true)}>
                Redigera
              </button>
              <AiButton
                label="Byt ut"
                onClick={async () => {
                  const res = await aiQuestionsAction(cpId, q.id);
                  if (!res.ok) return toast.show(res.error);
                  await reload();
                }}
              />
              <button className="btn small danger" onClick={async () => (await deleteQuestionAction(q.id), reload())}>
                Ta bort
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function TreasureEditor({ bundle, reload, toast }: { bundle: HostBundle; reload: () => Promise<void>; toast: Toast }) {
  const t = bundle.treasure!;
  const [form, setForm] = useState({ hostPlacementNote: t.hostPlacementNote, publicClueText: t.publicClueText, helpText: t.helpText });
  const [variant, setVariant] = useState(0);
  const save = async (patch: Partial<typeof form>) => {
    const res = await updateTreasureAction(bundle.hunt.id, patch);
    if (!res.ok) toast.show(res.error);
    else reload();
  };
  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
    onBlur: () => form[key] !== t[key] && save({ [key]: form[key] }),
  });
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>💎 Skatten</h2>
        <QrPreview token={t.qrToken} />
      </div>
      <label className="field">
        <span>Var gömmer du skatten (och dess QR-kod)?</span>
        <textarea {...field("hostPlacementNote")} placeholder="T.ex. I kylskåpet, längst in på översta hyllan." />
        <small>🔒 Privat anteckning.</small>
      </label>
      <label className="field">
        <span>Sista ledtråden – den leder till skatten</span>
        <textarea {...field("publicClueText")} style={{ minHeight: 110 }} />
        <small>Visas efter sista kontrollpunkten.</small>
      </label>
      <div className="row" style={{ marginBottom: 14 }}>
        <AiButton
          label="Föreslå sista ledtråd"
          onClick={async () => {
            const res = await aiClueAction(bundle.hunt.id, {
              placementNote: form.hostPlacementNote,
              difficulty: bundle.hunt.difficulty,
              previous: form.publicClueText,
              variant,
            });
            if (!res.ok) return toast.show(res.error);
            setVariant((v) => v + 1);
            setForm((f) => ({ ...f, publicClueText: res.data }));
            save({ publicClueText: res.data });
          }}
        />
      </div>
      <label className="field">
        <span>Hjälptext för skatten</span>
        <textarea {...field("helpText")} />
      </label>
      <AiButton
        label="Föreslå hjälptext"
        onClick={async () => {
          const res = await aiHelpAction(bundle.hunt.id, { placementNote: form.hostPlacementNote, clue: form.publicClueText });
          if (!res.ok) return toast.show(res.error);
          setForm((f) => ({ ...f, helpText: res.data }));
          save({ helpText: res.data });
        }}
      />
      <p className="muted small" style={{ marginTop: 14 }}>
        Att hitta skatten ger {bundle.hunt.scoring.treasureFound} poäng.
      </p>
    </div>
  );
}
