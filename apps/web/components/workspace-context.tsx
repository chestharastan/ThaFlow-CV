"use client";

import { createContext, useContext } from "react";
import type { AIRuntimeState, RewriteKind } from "@thaflow/ai-engine";
import type { ContentSuggestion, SectionKey } from "@thaflow/cv-core";
import type { RuleResult } from "@thaflow/rule-engine";

export interface AssistRequest {
  field: string;
  section: SectionKey | "personal";
  text: string;
  kind: RewriteKind;
  position?: string;
  /** Ask for a fuller version instead of the same length. */
  longer?: boolean;
}

export interface WorkspaceContextValue {
  issues: RuleResult[];
  aiState: AIRuntimeState;
  /** Field path currently being processed by AI, if any. */
  busyField: string | null;
  aiError: { field: string; message: string } | null;
  suggestions: ContentSuggestion[];
  requestRewrite(request: AssistRequest): void;
  requestTranslation(request: AssistRequest): void;
  /** Offer text written on this device (no AI) as a suggestion beside the person's own. */
  suggestDraft(draft: { field: string; section: SectionKey | "personal"; original: string; suggested: string }): void;
  resolveSuggestion(id: string, action: "accept" | "reject", editedText?: string): void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside the workspace");
  return ctx;
}
