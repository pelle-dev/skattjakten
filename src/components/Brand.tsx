// Skattjaktens logotyper. Filerna ligger i public/brand/ (se grafiska profilen).
// Primär = färg på ljus bakgrund, monochrome = allt i Skogsstig, white = på mörk bakgrund.

type Variant = "primary" | "monochrome" | "white";

/** Hela logotypen: ordmärke, streckad stig och skattkista. För startsida och större ytor. */
export function Logo({ variant = "primary", width = 240, className }: { variant?: Variant; width?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/brand/skattjakten-logo-${variant}.png`} alt="Skattjakten" width={width} height={Math.round((width * 272) / 587)} className={className} />
  );
}

/** Bara ordmärket. Där symbolen inte får plats, till exempel i toppraden. */
export function Wordmark({ variant = "primary", height = 26, className }: { variant?: Variant; height?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/brand/skattjakten-wordmark-${variant}.png`} alt="Skattjakten" height={height} width={Math.round((height * 587) / 98)} className={className} />
  );
}

/** Symbolen: stig och skattkista. För små ytor, laddning, tomma lägen och diplom. */
export function BrandSymbol({ variant = "primary", width = 120, className }: { variant?: Variant; width?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/brand/skattjakten-symbol-${variant}.png`} alt="" aria-hidden width={width} height={Math.round((width * 144) / 426)} className={className} />
  );
}
