"use client";

import { useRef, useState } from "react";

// Bildspel på startsidan: så går en skattjakt till för deltagarna.
// Byter bara bild när man själv trycker eller sveper (inget automatiskt bildbyte, enligt den lugna profilen).
const SLIDES = [
  { src: "/sa-funkar-det/1-ga-med.webp", title: "Gå med", text: "Laget skriver in sin kod i mobilen." },
  { src: "/sa-funkar-det/2-ledtrad.webp", title: "Följ ledtråden", text: "Läs ledtråden, gå dit och scanna QR-koden." },
  { src: "/sa-funkar-det/3-fragor.webp", title: "Svara på frågor", text: "På varje plats väntar några frågor." },
  { src: "/sa-funkar-det/4-uppdrag.webp", title: "Gör ett uppdrag", text: "Ett litet uppdrag tillsammans, sedan låses nästa ledtråd upp." },
  { src: "/sa-funkar-det/5-skatten.webp", title: "Hitta skatten", text: "Sista ledtråden leder till skatten." },
  { src: "/sa-funkar-det/6-diplom.webp", title: "Få ett diplom", text: "Alla lag får ett diplom att spara eller skriva ut." },
];

export function HowItWorks() {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const go = (i: number) => setIndex((i + SLIDES.length) % SLIDES.length);
  const slide = SLIDES[index];

  return (
    <div
      className="slideshow"
      aria-roledescription="bildspel"
      aria-label="Så går det till"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="slide-phone">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={slide.src} alt={`${slide.title}: ${slide.text}`} width={480} height={1038} />
      </div>
      <div className="slide-caption" aria-live="polite">
        <div className="muted small">
          Steg {index + 1} av {SLIDES.length}
        </div>
        <strong className="big">{slide.title}</strong>
        <p className="small" style={{ margin: "2px 0 0" }}>
          {slide.text}
        </p>
      </div>
      <div className="slide-controls">
        <button type="button" className="btn secondary" onClick={() => go(index - 1)} aria-label="Föregående bild">
          ←
        </button>
        <div className="slide-dots">
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              className={i === index ? "on" : ""}
              onClick={() => setIndex(i)}
              aria-label={`Visa steg ${i + 1}: ${s.title}`}
              aria-current={i === index}
            />
          ))}
        </div>
        <button type="button" className="btn secondary" onClick={() => go(index + 1)} aria-label="Nästa bild">
          →
        </button>
      </div>
      {/* Förladdar bilderna så att bytet går direkt. */}
      <div hidden>
        {SLIDES.map((s) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={s.src} src={s.src} alt="" />
        ))}
      </div>
    </div>
  );
}
