"use client";

import { useEffect, useState } from "react";

export function useToast() {
  const [toast, setToast] = useState<{ text: string; good?: boolean } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  const node = toast ? (
    <div className={`toast ${toast.good ? "good" : ""}`} role="status" onClick={() => setToast(null)}>
      {toast.text}
    </div>
  ) : null;
  return { show: (text: string, good = false) => setToast({ text, good }), node };
}
