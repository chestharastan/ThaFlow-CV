"use client";

import { useEffect, useMemo, useState } from "react";
import { AIOrchestrator, CloudProvider, LocalProvider, type AIRuntimeState } from "@thaflow/ai-engine";
import { useApp } from "./app-context";

/**
 * No on-device model ships with this build. A LocalRuntime adapter (WebLLM,
 * Transformers.js, ...) is registered here once one has passed device and
 * Khmer-quality evaluation; everything else already works against the interface.
 */
export const localProvider = new LocalProvider(null);

export function useAI(): { orchestrator: AIOrchestrator; state: AIRuntimeState } {
  const { settings } = useApp();
  const { mode, cloudEndpoint, cloudConsent } = settings.ai;
  const orchestrator = useMemo(
    () =>
      new AIOrchestrator({
        local: localProvider,
        cloud: cloudEndpoint ? new CloudProvider({ endpoint: cloudEndpoint }) : null,
        preferences: { mode, cloudEndpoint, cloudConsent },
      }),
    [mode, cloudEndpoint, cloudConsent],
  );
  const [state, setState] = useState<AIRuntimeState>("unavailable");
  useEffect(() => {
    let cancelled = false;
    void orchestrator.getState().then((s) => !cancelled && setState(s));
    return () => {
      cancelled = true;
    };
  }, [orchestrator]);
  return { orchestrator, state };
}
