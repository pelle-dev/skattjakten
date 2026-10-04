"use client";

import { useState } from "react";
import { AGE_GROUPS, DIFFICULTIES, GAME_MODES, LIMITS, TEMPLATES, THEMES, WIN_MODES, templateById } from "@/lib/catalog";
import type { HuntInput } from "@/lib/hunts";

export const DEFAULT_HUNT_INPUT: HuntInput = {
  name: "",
  description: "",
  template: "none",
  gameMode: "classic",
  playMode: "team",
  ageGroup: "child",
  themes: ["mixed"],
  difficulty: "easy",
  clueCount: 10,
  winMode: "points",
  startMode: "staggered",
  startIntervalMinutes: 3,
  allowPhotos: true,
};

function Choice<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { id: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button
          type="button"
          key={o.id}
          className={`chip ${value === o.id ? "on" : ""}`}
          disabled={disabled || o.disabled}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function HuntForm({
  initial,
  mode,
  locked,
  busy,
  onSubmit,
}: {
  initial: HuntInput;
  mode: "create" | "edit";
  /** Jakten har startat: bara namn och beskrivning kan ändras. */
  locked?: boolean;
  busy?: boolean;
  onSubmit: (input: HuntInput) => void;
}) {
  const [v, setV] = useState<HuntInput>(initial);
  const set = <K extends keyof HuntInput>(key: K, value: HuntInput[K]) => setV((prev) => ({ ...prev, [key]: value }));
  const limits = LIMITS;

  const setTemplate = (id: HuntInput["template"]) => {
    const tpl = templateById(id);
    setV((prev) => ({
      ...prev,
      template: id,
      themes: tpl.themes,
      ageGroup: tpl.ageGroup,
      difficulty: tpl.difficulty,
      name: prev.name || (id === "none" ? "" : tpl.label),
      description: prev.description || (id === "none" ? "" : tpl.description),
    }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <section className="card">
        <h2>Grunderna</h2>
        <div className="field">
          <span>Mall</span>
          <Choice
            value={v.template}
            disabled={locked}
            options={TEMPLATES.map((tpl) => ({ id: tpl.id, label: tpl.label, disabled: tpl.id !== "none" && !limits.templates }))}
            onChange={setTemplate}
          />
          <small>{templateById(v.template).description}</small>
        </div>
        <label className="field">
          <span>Namn på skattjakten</span>
          <input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="T.ex. Majas kalasjakt" maxLength={80} required />
        </label>
        <label className="field">
          <span>Beskrivning</span>
          <textarea value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Valfritt" maxLength={500} />
        </label>
      </section>

      <section className="card">
        <h2>Spelet</h2>
        <div className="field">
          <span>Spelläge</span>
          <Choice
            value={v.gameMode}
            disabled={locked}
            options={GAME_MODES.map((g) => ({
              id: g.id,
              label: g.label + (g.available ? "" : " (snart)"),
              disabled: !g.available || !limits.gameModes.includes(g.id),
            }))}
            onChange={(x) => set("gameMode", x)}
          />
          <small>{GAME_MODES.find((g) => g.id === v.gameMode)?.description}</small>
        </div>
        <div className="field">
          <span>Individuellt eller lag</span>
          <Choice
            value={v.playMode}
            disabled={locked}
            options={[
              { id: "team", label: "Lagspel" },
              { id: "individual", label: "Individuellt" },
            ]}
            onChange={(x) => set("playMode", x)}
          />
        </div>
        <div className="field">
          <span>Vinstläge</span>
          <Choice value={v.winMode} disabled={locked} options={WIN_MODES.map((w) => ({ id: w.id, label: w.label }))} onChange={(x) => set("winMode", x)} />
          <small>{WIN_MODES.find((w) => w.id === v.winMode)?.description}</small>
        </div>
        {mode === "create" && (
          <label className="field">
            <span>Antal ledtrådar</span>
            <input
              type="number"
              min={1}
              max={limits.maxClues}
              value={v.clueCount}
              onChange={(e) => set("clueCount", Number(e.target.value))}
              style={{ maxWidth: 120 }}
            />
            <small>
              10 är standard. Du kan lägga till eller ta bort ledtrådar senare. Plus en slutlig skatt.
            </small>
          </label>
        )}
      </section>

      <section className="card">
        <h2>Deltagarna</h2>
        <div className="field">
          <span>Åldersgrupp</span>
          <Choice value={v.ageGroup} disabled={locked} options={AGE_GROUPS.map((a) => ({ id: a.id, label: a.label }))} onChange={(x) => set("ageGroup", x)} />
        </div>
        <div className="field">
          <span>Svårighetsgrad</span>
          <Choice value={v.difficulty} disabled={locked} options={DIFFICULTIES.map((d) => ({ id: d.id, label: d.label }))} onChange={(x) => set("difficulty", x)} />
        </div>
        <div className="field">
          <span>Tema (välj ett eller flera)</span>
          <div className="chips">
            {THEMES.map((th) => {
              const on = v.themes.includes(th.id);
              return (
                <button
                  type="button"
                  key={th.id}
                  disabled={locked}
                  className={`chip ${on ? "on" : ""}`}
                  onClick={() => set("themes", on ? v.themes.filter((x) => x !== th.id) : [...v.themes, th.id].slice(-5))}
                >
                  {th.label}
                </button>
              );
            })}
          </div>
          <small>Temat påverkar AI-frågorna.</small>
        </div>
        <div className="field">
          <span>Lagbild</span>
          <Choice
            value={v.allowPhotos ? "on" : "off"}
            disabled={locked || !limits.photos}
            options={[
              { id: "on", label: "Tillåt bild" },
              { id: "off", label: "Bara avatarer" },
            ]}
            onChange={(x) => set("allowPhotos", x === "on")}
          />
          <small>Bilder visas bara för laget och dig, aldrig offentligt.</small>
        </div>
      </section>

      <section className="card">
        <h2>Start</h2>
        <div className="field">
          <span>Startläge</span>
          <Choice
            value={v.startMode}
            disabled={locked}
            options={[
              { id: "simultaneous", label: "Alla startar samtidigt" },
              { id: "staggered", label: "Med tidsintervall" },
            ]}
            onChange={(x) => set("startMode", x)}
          />
        </div>
        {v.startMode === "staggered" && (
          <div className="field">
            <span>Minuter mellan varje start</span>
            <div className="row">
              {[2, 3, 5].map((m) => (
                <button type="button" key={m} disabled={locked} className={`chip ${v.startIntervalMinutes === m ? "on" : ""}`} onClick={() => set("startIntervalMinutes", m)}>
                  {m} min
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={60}
                disabled={locked}
                value={v.startIntervalMinutes}
                onChange={(e) => set("startIntervalMinutes", Number(e.target.value))}
                style={{ maxWidth: 100 }}
                aria-label="Eget antal minuter"
              />
            </div>
            <small>Varje lag ser en nedräkning och får sin första ledtråd vid sin egen starttid.</small>
          </div>
        )}
      </section>

      <button className="btn primary huge" disabled={busy}>
        {mode === "create" ? "Skapa skattjakten →" : "Spara inställningar"}
      </button>
    </form>
  );
}
