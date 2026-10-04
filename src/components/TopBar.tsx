import Link from "next/link";

export function TopBar({ brand = "Skattjakten", right }: { brand?: string; right?: React.ReactNode }) {
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="logo">🗺️</span>
        {brand}
      </Link>
      {right}
    </header>
  );
}
