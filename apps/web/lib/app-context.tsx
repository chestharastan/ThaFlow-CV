"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_SETTINGS, type AppSettings } from "@thaflow/cv-core";
import { createTranslator, type Translator } from "@thaflow/localization";
import { CVStore, requestPersistentStorage } from "@thaflow/storage";

let storeSingleton: CVStore | null = null;
/** One IndexedDB connection for the whole app. Browser only. */
export function getStore(): CVStore {
  storeSingleton ??= new CVStore();
  return storeSingleton;
}

interface AppContextValue {
  settings: AppSettings;
  ready: boolean;
  t: Translator;
  updateSettings(patch: Partial<Omit<AppSettings, "id" | "ai">> & { ai?: Partial<AppSettings["ai"]> }): Promise<void>;
  reloadSettings(): Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  // Latest settings, so two quick updates (e.g. blur + click) never overwrite each other with stale state.
  const latest = useRef(settings);

  const reloadSettings = useCallback(async () => {
    try {
      latest.current = await getStore().getSettings();
      setSettings(latest.current);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reloadSettings();
    void requestPersistentStorage();
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, [reloadSettings]);

  useEffect(() => {
    document.documentElement.lang = settings.uiLanguage;
  }, [settings.uiLanguage]);

  const updateSettings = useCallback<AppContextValue["updateSettings"]>(
    async (patch) => {
      const current = latest.current;
      const next: AppSettings = { ...current, ...patch, id: "app", ai: { ...current.ai, ...patch.ai } };
      latest.current = next;
      setSettings(next);
      await getStore().saveSettings(next);
    },
    [],
  );

  const t = useMemo(() => createTranslator(settings.uiLanguage), [settings.uiLanguage]);
  const value = useMemo(
    () => ({ settings, ready, t, updateSettings, reloadSettings }),
    [settings, ready, t, updateSettings, reloadSettings],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
