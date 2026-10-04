"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["", "Översikt"],
  ["/settings", "Inställningar"],
  ["/build", "Ledtrådar"],
  ["/preview", "Förhandsgranska"],
  ["/print", "Skriv ut"],
  ["/teams", "Lag"],
  ["/dashboard", "Kontrollpanel"],
  ["/results", "Resultat"],
] as const;

export function HostTabs({ huntId }: { huntId: string }) {
  const path = usePathname();
  const base = `/hunt/${huntId}`;
  return (
    <nav className="tabs">
      {TABS.map(([suffix, label]) => (
        <Link key={suffix} href={base + suffix} className={path === base + suffix ? "on" : ""}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
