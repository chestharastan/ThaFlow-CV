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

/**
 * An AI server the operator of this site runs, set at build time with
 * NEXT_PUBLIC_THAFLOW_AI_URL. When present, people only have to switch cloud AI
 * on and agree; without it they would have to know a server address.
 */
export const DEFAULT_AI_ENDPOINT = process.env.NEXT_PUBLIC_THAFLOW_AI_URL ?? "";

export function useAI(): { orchestrator: AIOrchestrator; state: AIRuntimeState } {
  const { settings } = useApp();
  const { mode, cloudConsent } = settings.ai;
  const cloudEndpoint = settings.ai.cloudEndpoint || DEFAULT_AI_ENDPOINT;
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
