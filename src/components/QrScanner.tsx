"use client";

import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";

/** QR-koderna innehåller en länk som slutar med /s/<token>. */
export function tokenFromQr(text: string): string {
  const match = text.match(/\/s\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : text.trim();
}

export function QrScanner({ onResult, onClose }: { onResult: (token: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        timer = setInterval(() => {
          if (doneRef.current || !ctx || video.readyState < 2) return;
          const w = video.videoWidth;
          const h = video.videoHeight;
          const scale = Math.min(1, 640 / Math.max(w, h));
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
          if (code?.data) {
            doneRef.current = true;
            navigator.vibrate?.(80);
            onResult(tokenFromQr(code.data));
          }
        }, 200);
      } catch {
        setError(true);
      }
    })();

    return () => {
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onResult]);

  return (
    <div className="overlay">
      <h2>{t("scanTitle")}</h2>
      {error ? (
        <p className="center" style={{ maxWidth: 420 }}>
          {t("scanCameraError")}
        </p>
      ) : (
        <>
          <video ref={videoRef} className="scanner-video" playsInline muted />
          <p>{t("scanHint")}</p>
        </>
      )}
      <button className="btn" onClick={onClose} style={{ marginTop: 12 }}>
        {t("close")}
      </button>
    </div>
  );
}
