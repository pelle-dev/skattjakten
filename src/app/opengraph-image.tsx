import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Förhandsbilden som visas när någon delar en länk till appen (sms, Messenger, Facebook).
export const alt = "Skattjakten – skapa en rolig skattjakt på några minuter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/skattjakten-logo-primary.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFF4DE",
          borderBottom: "24px solid #F2C94C",
          padding: 60,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={587} height={272} alt="" />
        <div style={{ marginTop: 36, fontSize: 52, fontWeight: 800, color: "#1D4E5F", textAlign: "center" }}>
          Skapa en rolig skattjakt på några minuter
        </div>
        <div style={{ marginTop: 14, fontSize: 32, color: "#2F735A" }}>Göm, scanna, lös och hitta skatten.</div>
      </div>
    ),
    size,
  );
}
