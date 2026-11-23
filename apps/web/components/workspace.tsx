"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIOutputError, AIUnavailableError } from "@thaflow/ai-engine";
import { SECTION_KEYS, setTextAtPath, type CVDocument, type ContentSuggestion, type SectionKey } from "@thaflow/cv-core";
import { downloadBackup, downloadBlob, fileNameFor, generateDOCX, printToPDF } from "@thaflow/export-engine";
import type { MessageKey } from "@thaflow/localization";
import { createRuleEngine } from "@thaflow/rule-engine";
import { CVPreview } from "@thaflow/template-engine";
import { useAI } from "@/lib/ai";
import { getStore, useApp } from "@/lib/app-context";
import { useEditor } from "@/lib/editor-store";
import { SectionForm } from "./forms";
import { CheckPanel, DesignPanel, HistoryPanel, QuickAdd } from "./panels";
import { ScaledPreview } from "./preview";
import { Button, cx } from "./ui";
import { WorkspaceContext, type AssistRequest, type WorkspaceContextValue } from "./workspace-context";

const ruleEngine = createRuleEngine();
type Tab = "content" | "design" | "check" | "history";
type StepId = "personal" | SectionKey;
const ALL_SECTIONS: StepId[] = ["personal", ...SECTION_KEYS];

function ExportMenu({ cv }: { cv: CVDocument }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const run = (action: () => void | Promise<void>) => async () => {
    setOpen(false);
    setError("");
    try {
      await useEditor.getState().flush();
      await action();
    } catch {
      setError(t("export.failed"));
    }
  };
  const item = "block w-full px-3 py-2 text-left text-sm hover:bg-slate-100";
  return (
    <div ref={ref} className="relative">
      <Button variant="primary" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} data-testid="export">
        {t("export.button")}
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <button role="menuitem" className={item} onClick={run(() => printToPDF(cv))} data-testid="export-pdf">
            {t("export.pdf")}
            <span className="block text-xs text-slate-400">{t("export.pdfHint")}</span>
          </button>
          <button role="menuitem" className={item} onClick={run(async () => downloadBlob(await generateDOCX(cv), `${fileNameFor(cv)}.docx`))} data-testid="export-docx">
            {t("export.docx")}
            <span className="block text-xs text-slate-400">{t("export.docxHint")}</span>
          </button>
          <button role="menuitem" className={item} onClick={run(() => downloadBackup([cv], `${fileNameFor(cv)}.thaflow.json`))} data-testid="export-json">
            {t("export.json")}
            <span className="block text-xs text-slate-400">{t("export.jsonHint")}</span>
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="absolute right-0 mt-1 w-56 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function Workspace() {
  const { t, settings } = useApp();
  const id = useSearchParams().get("id") ?? "";
  const { cv, status, saveState, past, future, load, update, replace, undo, redo } = useEditor();
  const { orchestrator, state: aiState } = useAI();

  const [tab, setTab] = useState<Tab>("content");
  const [section, setSection] = useState<StepId>("personal");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [busyField, setBusyField] = useState<string | null>(null);
  const [aiError, setAiError] = useState<{ field: string; message: string } | null>(null);

  useEffect(() => {
    if (id) void load(id);
  }, [id, load]);

  useEffect(() => {
    if (!id) return;
    void getStore().listSuggestions(id).then(setSuggestions).catch(() => setSuggestions([]));
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const report = useMemo(() => (cv ? ruleEngine.run(cv, { locale: settings.uiLanguage }) : null), [cv, settings.uiLanguage]);

  const runAssist = useCallback(
    async (request: AssistRequest, kind: "rewrite" | "translate") => {
      const current = useEditor.getState().cv;
      if (!current) return;
      setBusyField(request.field);
      setAiError(null);
      try {
        const common = { cvId: current.id, targetSection: request.section, targetField: request.field, text: request.text, language: current.metadata.language, locale: settings.uiLanguage };
        const suggestion =
          kind === "rewrite"
            ? await orchestrator.suggestRewrite({ ...common, kind: request.kind, position: request.position })
            : await orchestrator.suggestTranslation({ ...common, targetLanguage: current.metadata.language === "km" ? "en" : "km" });
        await getStore().putSuggestion(suggestion);
        setSuggestions((list) => [suggestion, ...list]);
      } catch (error) {
        const message = error instanceof AIUnavailableError ? t("ai.errorUnavailable") : error instanceof AIOutputError ? t("ai.errorOutput") : t("ai.errorNetwork");
        setAiError({ field: request.field, message });
      } finally {
        setBusyField(null);
      }
    },
    [orchestrator, settings.uiLanguage, t],
  );

  const workspace = useMemo<WorkspaceContextValue>(
    () => ({
      issues: report?.results ?? [],
      aiState,
      busyField,
      aiError,
      suggestions,
      requestRewrite: (r) => void runAssist(r, "rewrite"),
      requestTranslation: (r) => void runAssist(r, "translate"),
      resolveSuggestion(suggestionId, action, editedText) {
        const suggestion = suggestions.find((s) => s.id === suggestionId);
        const current = useEditor.getState().cv;
        if (!suggestion || !current) return;
        const next: ContentSuggestion = {
          ...suggestion,
          status: action === "reject" ? "rejected" : editedText !== undefined ? "edited" : "accepted",
          suggestedText: editedText ?? suggestion.suggestedText,
        };
        if (action === "accept") replace(setTextAtPath(current, suggestion.targetField, next.suggestedText));
        setSuggestions((list) => list.map((s) => (s.id === suggestionId ? next : s)));
        void getStore().putSuggestion(next);
      },
    }),
    [report, aiState, busyField, aiError, suggestions, runAssist, replace],
  );

  if (!id || status === "missing") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="mb-4 text-slate-600">{t("editor.notFound")}</p>
        <Link href="/" className="text-brand-700 underline">
          {t("nav.home")}
        </Link>
      </div>
    );
  }
  if (!cv || !report) return <p className="p-8 text-center text-sm text-slate-500">{t("common.loading")}</p>;

  const issueCount = report.counts.error + report.counts.warning;
  const openSection = (target: StepId) => {
    setSection(target);
    setTab("content");
    setMobileView("edit");
  };
  const restorable = suggestions.filter((s) => s.status === "accepted" || s.status === "edited").slice(0, 5);

  return (
    <WorkspaceContext.Provider value={workspace}>
      <div className="no-print flex h-dvh flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
          <Link href="/" className="rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100" aria-label={t("nav.home")}>
            ← <span className="hidden sm:inline">{t("nav.home")}</span>
          </Link>
          <input
            value={cv.metadata.title}
            onChange={(e) => update((d) => void (d.metadata.title = e.target.value), "title")}
            aria-label={t("field.cvTitle")}
            className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1.5 text-sm font-semibold text-slate-900 hover:border-slate-300 focus:border-brand-500"
          />
          <span className="hidden text-xs text-slate-400 sm:inline" aria-live="polite" data-testid="save-state">
            {saveState === "saving" ? t("save.saving") : saveState === "error" ? t("save.error") : saveState === "saved" ? t("save.saved") : t("save.local")}
          </span>
          <Button variant="ghost" disabled={past.length === 0} onClick={undo} aria-label={t("action.undo")} title={t("action.undo")}>↶</Button>
          <Button variant="ghost" disabled={future.length === 0} onClick={redo} aria-label={t("action.redo")} title={t("action.redo")}>↷</Button>
          <Link href={`/templates/?id=${cv.id}`} className="hidden rounded-lg border border-line-strong px-3 py-2 text-sm font-medium text-ink hover:border-ink sm:inline-block">
            {t("design.template")}
          </Link>
          <ExportMenu cv={cv} />
        </header>

        <div className="flex border-b border-slate-200 bg-white lg:hidden" role="tablist">
          {(["edit", "preview"] as const).map((view) => (
            <button key={view} role="tab" aria-selected={mobileView === view} onClick={() => setMobileView(view)} className={cx("flex-1 py-2 text-sm font-medium", mobileView === view ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500")}>
              {t(view === "edit" ? "editor.edit" : "editor.preview")}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1">
          <div className={cx("w-full min-w-0 flex-col overflow-y-auto bg-slate-50 lg:flex lg:w-[30rem] lg:shrink-0 lg:border-r lg:border-slate-200 xl:w-[34rem]", mobileView === "edit" ? "flex" : "hidden")}>
            {(
              <>
                <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-white px-2" role="tablist">
                  {(["content", "design", "check", "history"] as const).map((key) => (
                    <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} data-testid={`tab-${key}`} className={cx("px-3 py-2.5 text-sm font-medium", tab === key ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500 hover:text-slate-800")}>
                      {t(`tab.${key}` as MessageKey)}
                      {key === "check" && issueCount > 0 && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">{issueCount}</span>}
                    </button>
                  ))}
                </div>
                <div className="flex-1 p-4" role="tabpanel">
                  {tab === "content" && (
                    <>
                      <nav className="mb-4 flex flex-wrap gap-1.5" aria-label={t("editor.sections")}>
                        {ALL_SECTIONS.map((key) => {
                          const hasIssue = report.results.some((r) => r.section === key && r.severity === "error");
                          return (
                            <button key={key} type="button" aria-current={section === key ? "true" : undefined} onClick={() => setSection(key)} data-testid={`section-${key}`} className={cx("rounded-full px-3 py-1 text-sm", section === key ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100")}>
                              {t(`section.${key}` as MessageKey)}
                              {hasIssue && <span className="ml-1 text-red-400" aria-label={t("severity.error")}>●</span>}
                            </button>
                          );
                        })}
                      </nav>
                      <SectionForm cv={cv} section={section} />
                      <div className="mt-4">
                        <QuickAdd cv={cv} onAdded={(s) => openSection(s)} />
                      </div>
                      {restorable.length > 0 && (
                        <div className="mt-6 border-t border-slate-200 pt-3">
                          <h3 className="mb-1 text-xs font-semibold text-slate-600">{t("ai.acceptedTitle")}</h3>
                          <ul className="space-y-1">
                            {restorable.map((s) => (
                              <li key={s.id} className="flex items-center justify-between gap-2 text-xs text-slate-500">
                                <span className="truncate">{s.suggestedText}</span>
                                <Button small variant="ghost" onClick={() => replace(setTextAtPath(cv, s.targetField, s.originalText))}>
                                  {t("ai.restoreOriginal")}
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                  {tab === "design" && <DesignPanel cv={cv} />}
                  {tab === "check" && <CheckPanel cv={cv} report={report} onOpenSection={openSection} />}
                  {tab === "history" && <HistoryPanel cv={cv} />}
                </div>
              </>
            )}
          </div>

          <div className={cx("min-w-0 flex-1 overflow-y-auto bg-slate-200 p-3 sm:p-6 lg:block", mobileView === "preview" ? "block" : "hidden")} data-testid="preview">
            <div className="mx-auto max-w-[210mm]">
              <ScaledPreview cv={cv} />
            </div>
          </div>
        </div>
      </div>
      {/* Unscaled copy that only exists on paper: this is what "Save as PDF" prints. */}
      <div className="print-only">
        <CVPreview cv={cv} pageStyle />
      </div>
    </WorkspaceContext.Provider>
  );
}
