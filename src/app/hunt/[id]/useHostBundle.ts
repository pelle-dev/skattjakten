"use client";

import { useCallback, useEffect, useState } from "react";
import type { HostBundle } from "@/lib/views";
import { hostBundleAction } from "../../actions/host";

export function useHostBundle(huntId: string) {
  const [bundle, setBundle] = useState<HostBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const res = await hostBundleAction(huntId);
    if (res.ok) {
      setBundle(res.data);
      setError(null);
    } else setError(res.error);
  }, [huntId]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { bundle, error, reload };
}
