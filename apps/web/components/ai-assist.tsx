"use client";

import { useState } from "react";
import type { ContentSuggestion } from "@thaflow/cv-core";
import { useApp } from "@/lib/app-context";
import { Button, TextArea } from "./ui";
import { useWorkspace, type AssistRequest } from "./workspace-context";

/** Side-by-side original vs. suggestion. Nothing changes in the CV until the user accepts. */
export function SuggestionCard({ suggestion }: { suggestion: ContentSuggestion }) {
  const { t } = useApp();
  const { resolveSuggestion } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(suggestion.suggestedText);
  return (
    <div className="mt-2 rounded-lg border border-line bg-cream p-3 text-sm" data-testid="suggestion">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink">{t("write.suggestion")}</span>
        <span className="rounded bg-paper px-1.5 py-0.5 text-[11px] text-muted">
          {suggestion.provider === "cloud" ? t("ai.providerCloud") : t("ai.providerLocal")}
        </span>
      </div>
      <p className="text-xs font-medium text-muted">{t("ai.original")}</p>
      <p className="mb-2 whitespace-pre-wrap text-ink-soft">{suggestion.originalText}</p>
      <p className="text-xs font-medium text-muted">{t("ai.suggested")}</p>
      {editing ? (
        <TextArea value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={t("ai.suggested")} />
      ) : (
        <p className="whitespace-pre-wrap text-ink">{suggestion.suggestedText}</p>
      )}
      {suggestion.warnings.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 rounded-md bg-warn-soft py-2 pl-6 pr-2 text-xs text-warn" role="alert">
          {suggestion.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button small variant="primary" onClick={() => resolveSuggestion(suggestion.id, "accept", editing ? draft : undefined)}>
          {editing ? t("ai.acceptEdited") : t("ai.accept")}
        </Button>
        {!editing && (
          <Button small onClick={() => setEditing(true)}>
            {t("ai.edit")}
          </Button>
        )}
        <Button small variant="ghost" onClick={() => resolveSuggestion(suggestion.id, "reject")}>
          {t("ai.reject")}
        </Button>
      </div>
    </div>
  );
}

/** AI actions under a text field. Renders nothing when no AI provider is ready. */
export function AIAssist(props: AssistRequest & { cvLanguage: "en" | "km" }) {
  const { t } = useApp();
  const ws = useWorkspace();
  const pending = ws.suggestions.find((s) => s.status === "pending" && s.targetField === props.field);
  if (pending) return <SuggestionCard suggestion={pending} />;
  if (ws.aiState === "unavailable") return null;
  const busy = ws.busyField === props.field;
  const disabled = busy || ws.busyField !== null || props.text.trim().length < 3;
  const request: AssistRequest = { field: props.field, section: props.section, text: props.text, kind: props.kind, position: props.position };
  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button small disabled={disabled} onClick={() => ws.requestRewrite(request)}>
          {busy ? t("ai.working") : t("ai.improve")}
        </Button>
        <Button small disabled={disabled} onClick={() => ws.requestRewrite({ ...request, longer: true })} data-testid="ai-longer">
          {t("ai.longer")}
        </Button>
        <Button small variant="ghost" disabled={disabled} onClick={() => ws.requestTranslation(request)}>
          {props.cvLanguage === "km" ? t("ai.translateToEn") : t("ai.translateToKm")}
        </Button>
        {ws.aiState === "cloud-ready" && <span className="text-[11px] text-muted">{t("ai.cloudNotice")}</span>}
      </div>
      {ws.aiError?.field === props.field && (
        <p className="mt-1 text-xs text-danger" role="alert">
          {ws.aiError.message}
        </p>
      )}
    </div>
  );
}
