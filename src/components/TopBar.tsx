import Link from "next/link";
import { Wordmark } from "./Brand";

export function TopBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="topbar">
      <Link href="/" className="brand" aria-label="Skattjakten, till startsidan">
        <Wordmark height={26} />
      </Link>
      {right}
    </header>
  );
}
