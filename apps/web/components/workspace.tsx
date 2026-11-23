"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIOutputError, AIUnavailableError } from "@thaflow/ai-engine";
import { SECTION_KEYS, createId, setTextAtPath, type CVDocument, type ContentSuggestion, type SectionKey } from "@thaflow/cv-core";
import { downloadBackup, downloadBlob, fileNameFor, generateDOCX, printToPDF } from "@thaflow/export-engine";
import type { MessageKey } from "@thaflow/localization";
import { createRuleEngine } from "@thaflow/rule-engine";
import { CVPreview } from "@thaflow/template-engine";
import { Download, Redo, Undo } from "./icons";
import { LogoMark } from "./logo";
import { useAI } from "@/lib/ai";
import { getStore, useApp } from "@/lib/app-context";
import { useEditor } from "@/lib/editor-store";
import { SectionForm } from "./forms";
import { TemplateGrid } from "./gallery/template-grid";
import { CheckPanel, DesignPanel, HistoryPanel, QuickAdd } from "./panels";
import { ScaledPreview } from "./preview";
import { AppHeader } from "./app-header";
import { Button, cx } from "./ui";
import { WorkspaceContext, type AssistRequest, type WorkspaceContextValue } from "./workspace-context";

const ruleEngine = createRuleEngine();
type Tab = "content" | "template" | "design" | "check" | "history";
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
  const item = "flex w-full items-baseline justify-between gap-4 px-3.5 py-2.5 text-left text-sm text-ink hover:bg-surface";
  return (
    <div ref={ref} className="relative">
      <Button variant="primary" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} data-testid="export">
        <Download />
        {t("export.button")}
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1.5 w-60 overflow-hidden rounded-xl border border-line bg-paper py-1 shadow-pop">
          <button role="menuitem" className={item} onClick={run(() => printToPDF(cv))} data-testid="export-pdf">
            <span className="font-medium">PDF</span>
            <span className="text-xs text-muted">{t("export.pdfHint")}</span>
          </button>
          <button role="menuitem" className={item} onClick={run(async () => downloadBlob(await generateDOCX(cv), `${fileNameFor(cv)}.docx`))} data-testid="export-docx">
            <span className="font-medium">Word</span>
            <span className="text-xs text-muted">.docx</span>
          </button>
          <button role="menuitem" className={cx(item, "border-t border-line")} onClick={run(() => downloadBackup([cv], `${fileNameFor(cv)}.thaflow.json`))} data-testid="export-json">
            <span className="font-medium">{t("export.json")}</span>
            <span className="text-xs text-muted">.json</span>
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="absolute right-0 z-30 mt-1.5 w-60 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Segmented control in the ThaFlow family style: a quiet track with the active item raised in white. */
function Segmented<T extends string>(props: { value: T; onChange(value: T): void; options: { value: T; label: string; badge?: number; testId?: string }[]; label: string; className?: string }) {
  return (
    <div role="tablist" aria-label={props.label} className={cx("flex rounded-xl bg-surface p-1", props.className)}>
      {props.options.map((o) => {
        const active = o.value === props.value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => props.onChange(o.value)}
            data-testid={o.testId}
            className={cx("flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm transition-colors", active ? "bg-paper font-medium text-ink shadow-soft" : "text-muted hover:text-ink")}
          >
            {o.label}
            {o.badge ? <span className="rounded-full bg-warn-soft px-1.5 text-[11px] font-semibold leading-[18px] text-warn">{o.badge}</span> : null}
          </button>
        );
      })}
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
  const [mobileView, setMobileView] = useState<"edit" | "preview">("preview");
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
            ? await orchestrator.suggestRewrite({ ...common, kind: request.kind, position: request.position, ...(request.longer ? { length: "longer" as const } : {}) })
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
      suggestDraft({ field, section, original, suggested }) {
        const current = useEditor.getState().cv;
        if (!current) return;
        const suggestion: ContentSuggestion = {
          id: createId(),
          cvId: current.id,
          targetSection: section,
          targetField: field,
          originalText: original,
          suggestedText: suggested,
          provider: "local",
          status: "pending",
          warnings: [],
          createdAt: new Date().toISOString(),
        };
        setSuggestions((list) => [suggestion, ...list.filter((s) => !(s.status === "pending" && s.targetField === field))]);
        void getStore().putSuggestion(suggestion);
      },
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
      <div className="flex min-h-dvh flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-xl flex-1 px-5 pt-[14vh]" data-testid="editor-not-found">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em]">{t("editor.notFound")}</h1>
          <Link href="/" className="mt-5 inline-block text-[15px] text-ink underline underline-offset-4">
            {t("nav.home")}
          </Link>
        </main>
      </div>
    );
  }
  if (!cv || !report) return <div className="min-h-dvh" aria-busy="true" />;

  const issueCount = report.counts.error + report.counts.warning;
  const openSection = (target: StepId) => {
    setSection(target);
    setTab("content");
    setMobileView("edit");
  };
  const restorable = suggestions.filter((s) => s.status === "accepted" || s.status === "edited").slice(0, 5);
  const templateLink = "inline-flex h-9 items-center rounded-lg border border-line bg-paper px-3.5 text-sm font-medium text-ink shadow-soft transition-colors hover:border-line-strong hover:bg-surface";

  return (
    <WorkspaceContext.Provider value={workspace}>
      <div className="no-print flex h-dvh flex-col">
        <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-line px-3 sm:gap-2 sm:px-5">
          <Link href="/" className="shrink-0 rounded-lg" aria-label={t("nav.home")}>
            <LogoMark className="h-8 w-8" />
          </Link>
          <input
            value={cv.metadata.title}
            onChange={(e) => update((d) => void (d.metadata.title = e.target.value), "title")}
            aria-label={t("field.cvTitle")}
            data-testid="cv-title"
            className="h-9 min-w-0 flex-1 truncate rounded-lg border border-transparent bg-transparent px-2 text-[15px] font-semibold tracking-[-0.01em] text-ink transition-colors hover:border-line focus:border-line-strong focus:bg-paper focus:outline-none"
          />
          <span className="hidden whitespace-nowrap text-xs text-muted md:inline" aria-live="polite" data-testid="save-state">
            {saveState === "saving" ? t("save.saving") : saveState === "error" ? t("save.error") : t("save.saved")}
          </span>
          <Button variant="ghost" className="hidden px-2! sm:inline-flex" disabled={past.length === 0} onClick={undo} aria-label={t("action.undo")} title={t("action.undo")} data-testid="undo">
            <Undo />
          </Button>
          <Button variant="ghost" className="hidden px-2! sm:inline-flex" disabled={future.length === 0} onClick={redo} aria-label={t("action.redo")} title={t("action.redo")} data-testid="redo">
            <Redo />
          </Button>
          <button type="button" className={cx(templateLink, "hidden sm:inline-flex")} onClick={() => { setTab("template"); setMobileView("edit"); }} data-testid="open-templates">
            {t("design.template")}
          </button>
          <ExportMenu cv={cv} />
        </header>

        <div className="flex items-center gap-2 border-b border-line px-3 py-2 lg:hidden">
          <Segmented
            label={t("editor.view")}
            className="flex-1"
            value={mobileView}
            onChange={(v) => setMobileView(v)}
            options={[
              { value: "preview" as const, label: t("editor.preview"), testId: "view-preview" },
              { value: "edit" as const, label: t("editor.edit"), testId: "view-edit" },
            ]}
          />
          <button type="button" className={cx(templateLink, "sm:hidden")} onClick={() => { setTab("template"); setMobileView("edit"); }}>
            {t("design.template")}
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className={cx("w-full min-w-0 flex-col overflow-y-auto lg:flex lg:w-[30rem] lg:shrink-0 lg:border-r lg:border-line xl:w-[33rem]", mobileView === "edit" ? "flex" : "hidden")}>
            <div className="sticky top-0 z-10 bg-canvas px-4 pb-2 pt-3">
              <Segmented
                label={t("editor.tools")}
                value={tab}
                onChange={(v) => setTab(v)}
                options={[
                  { value: "content" as const, label: t("tab.content"), testId: "tab-content" },
                  { value: "template" as const, label: t("tab.template"), testId: "tab-template" },
                  { value: "design" as const, label: t("tab.design"), testId: "tab-design" },
                  { value: "check" as const, label: t("tab.check"), badge: issueCount, testId: "tab-check" },
                  { value: "history" as const, label: t("tab.history"), testId: "tab-history" },
                ]}
              />
            </div>
            <div className="flex-1 px-4 pb-10 pt-2" role="tabpanel">
              {tab === "content" && (
                <>
                  <nav className="mb-5 flex flex-wrap gap-1" aria-label={t("editor.sections")}>
                    {ALL_SECTIONS.map((key) => {
                      const hasIssue = report.results.some((r) => r.section === key && r.severity === "error");
                      const active = section === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          aria-current={active ? "true" : undefined}
                          onClick={() => setSection(key)}
                          data-testid={`section-${key}`}
                          className={cx("inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors", active ? "bg-cream font-medium text-ink" : "text-muted hover:bg-surface hover:text-ink")}
                        >
                          {t(`section.${key}` as MessageKey)}
                          {hasIssue && <span className="h-1.5 w-1.5 rounded-full bg-danger" role="img" aria-label={t("severity.error")} />}
                        </button>
                      );
                    })}
                  </nav>
                  <SectionForm cv={cv} section={section} />
                  <div className="mt-5">
                    <QuickAdd cv={cv} onAdded={(s) => openSection(s)} />
                  </div>
                  {restorable.length > 0 && (
                    <div className="mt-6 border-t border-line pt-3">
                      <h3 className="mb-1 text-xs font-medium text-muted">{t("ai.acceptedTitle")}</h3>
                      <ul className="space-y-1">
                        {restorable.map((s) => (
                          <li key={s.id} className="flex items-center justify-between gap-2 text-xs text-muted">
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
              {tab === "template" && (
                <>
                  <TemplateGrid cv={cv} selectedId={cv.appearance.templateId} onSelect={(templateId) => update((d) => void (d.appearance.templateId = templateId))} columns="grid-cols-2 sm:grid-cols-3" />
                  <Link href={`/templates/?id=${cv.id}`} className="mt-5 inline-block text-sm text-muted underline underline-offset-4 hover:text-ink" data-testid="change-template">
                    {t("editor.fullGallery")}
                  </Link>
                </>
              )}
              {tab === "design" && <DesignPanel cv={cv} />}
              {tab === "check" && <CheckPanel cv={cv} report={report} onOpenSection={openSection} />}
              {tab === "history" && <HistoryPanel cv={cv} />}
            </div>
          </div>

          <div className={cx("min-w-0 flex-1 overflow-y-auto px-3 py-4 sm:p-8 lg:block", mobileView === "preview" ? "block" : "hidden")} data-testid="preview">
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
