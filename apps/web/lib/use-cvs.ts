"use client";

import { useCallback, useEffect, useState } from "react";
import type { CVDocument } from "@thaflow/cv-core";
import { getStore } from "./app-context";

const CHANGED = "thaflow-cv:cvs-changed";

/** Tell every list of CVs on screen (the sidebar count, the tables) to read the store again. */
export function notifyCVsChanged(): void {
  window.dispatchEvent(new Event(CHANGED));
}

/** The CVs on this device, newest first. `cvs` is null until the first read has finished. */
export function useCVs(): { cvs: CVDocument[] | null; failed: boolean; reload(): Promise<void> } {
  const [cvs, setCvs] = useState<CVDocument[] | null>(null);
  const [failed, setFailed] = useState(false);
  const reload = useCallback(async () => {
    try {
      setCvs(await getStore().listCVs());
      setFailed(false);
    } catch {
      setCvs([]);
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    void reload();
    const again = () => void reload();
    window.addEventListener(CHANGED, again);
    return () => window.removeEventListener(CHANGED, again);
  }, [reload]);
  return { cvs, failed, reload };
}
