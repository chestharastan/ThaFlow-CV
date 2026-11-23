"use client";

import { useEffect, useState } from "react";
import type { ExtractionResult } from "@thaflow/ai-engine";
import { createEducation, createExperience, createId, createProject, createSkillGroup, type CVDocument, type CVRevision, type SectionKey } from "@thaflow/cv-core";
import type { MessageKey } from "@thaflow/localization";
import { classifyText, dedupeSkills, extractYears, normalizeWhitespace, splitSkillList, type ClassifiedSection, type RuleReport } from "@thaflow/rule-engine";
import { COLOR_PRESETS, FONT_OPTIONS, getTemplate, resolveAppearance, templates } from "@thaflow/template-engine";
import { useAI } from "@/lib/ai";
import { getStore, useApp } from "@/lib/app-context";
import { useEditor } from "@/lib/editor-store";
import { ScaledPreview } from "./preview";
import { Button, Card, Field, Select, TextArea, cx } from "./ui";

/* ---------- Design ---------- */

export function DesignPanel({ cv }: { cv: CVDocument }) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  const template = getTemplate(cv.appearance.templateId);
  const look = resolveAppearance(template, cv.appearance);
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">{t("design.template")}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {templates.map((tpl) => {
            const selected = tpl.id === template.id;
            return (
              <button
                key={tpl.id}
                type="button"
                aria-pressed={selected}
                data-testid={`template-${tpl.id}`}
                onClick={() => update((d) => void (d.appearance.templateId = tpl.id))}
                className={cx("overflow-hidden rounded-lg border-2 bg-white text-left transition-colors", selected ? "border-brand-600" : "border-slate-200 hover:border-slate-400")}
              >
                <div className="pointer-events-none h-40 overflow-hidden bg-slate-50" aria-hidden>
                  <ScaledPreview cv={cv} template={tpl} />
                </div>
                <div className="border-t border-slate-100 px-2 py-1.5">
                  <div className="text-xs font-semibold text-slate-800">{tpl.name}</div>
                  <div className="truncate text-[11px] text-slate-500">{t(`template.${tpl.id}` as MessageKey)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">{t("design.color")}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              aria-pressed={look.primary.toLowerCase() === color}
              onClick={() => update((d) => void (d.appearance.primaryColor = color))}
              style={{ background: color }}
              className={cx("h-7 w-7 rounded-full ring-offset-2", look.primary.toLowerCase() === color && "ring-2 ring-slate-900")}
            />
          ))}
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input type="color" value={look.primary} onChange={(e) => update((d) => void (d.appearance.primaryColor = e.target.value), "color")} className="h-7 w-9 cursor-pointer rounded border border-slate-300 bg-white" />
            {t("design.customColor")}
          </label>
          {cv.appearance.primaryColor && (
            <Button small variant="ghost" onClick={() => update((d) => void (d.appearance.primaryColor = ""))}>
              {t("design.reset")}
            </Button>
          )}
        </div>
      </section>

      <section>
        <Field label={t("design.font")} hint={t("design.fontHint")}>
          {(id) => (
            <Select id={id} value={cv.appearance.fontFamily} onChange={(e) => update((d) => void (d.appearance.fontFamily = e.target.value))}>
              <option value="">{t("design.templateDefault")}</option>
              {FONT_OPTIONS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">{t("design.sections")}</h3>
        <ul className="space-y-1">
          {cv.appearance.sectionOrder.map((key, index) => {
            const hidden = cv.appearance.hiddenSections.includes(key);
            return (
              <li key={key} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
                <span className={cx("flex-1 text-sm", hidden ? "text-slate-400 line-through" : "text-slate-800")}>{t(`section.${key}` as MessageKey)}</span>
                <Button small variant="ghost" disabled={index === 0} aria-label={t("action.moveUp")} onClick={() => update((d) => swap(d.appearance.sectionOrder, index, index - 1))}>↑</Button>
                <Button small variant="ghost" disabled={index === cv.appearance.sectionOrder.length - 1} aria-label={t("action.moveDown")} onClick={() => update((d) => swap(d.appearance.sectionOrder, index, index + 1))}>↓</Button>
                <Button
                  small
                  variant="ghost"
                  aria-pressed={hidden}
                  onClick={() =>
                    update((d) => {
                      d.appearance.hiddenSections = hidden ? d.appearance.hiddenSections.filter((k) => k !== key) : [...d.appearance.hiddenSections, key];
                    })
                  }
                >
                  {hidden ? t("design.show") : t("design.hide")}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function swap<T>(list: T[], a: number, b: number) {
  [list[a], list[b]] = [list[b]!, list[a]!];
}

/* ---------- Check (rule engine) ---------- */

const severityStyle = {
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-slate-200 bg-white text-slate-700",
} as const;

export function CheckPanel({ cv, report, onOpenSection }: { cv: CVDocument; report: RuleReport; onOpenSection(section: SectionKey | "personal"): void }) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-semibold text-slate-800">{t("check.completeness")}</span>
          <span className="tabular-nums text-slate-600">{report.completeness}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={report.completeness} aria-valuemin={0} aria-valuemax={100} aria-label={t("check.completeness")}>
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${report.completeness}%` }} />
        </div>
      </div>
      {report.results.length === 0 ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">{t("check.allGood")}</p>
      ) : (
        <ul className="space-y-2">
          {report.results.map((r, i) => (
            <li key={`${r.ruleId}-${i}`} className={cx("rounded-lg border px-3 py-2 text-sm", severityStyle[r.severity])}>
              <div className="flex items-start justify-between gap-2">
                <p>
                  <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-70">{t(`severity.${r.severity}` as MessageKey)}</span>
                  {r.message}
                </p>
                <code className="shrink-0 text-[10px] opacity-50">{r.ruleId}</code>
              </div>
              <div className="mt-1.5 flex gap-2">
                {r.section && (
                  <Button small onClick={() => onOpenSection(r.section!)}>
                    {t("check.fix")}
                  </Button>
                )}
                {r.ruleId === "SKL-001" && (
                  <Button small onClick={() => update((d) => void (d.skills = dedupeSkills(d.skills)))}>
                    {t("check.removeDuplicates")}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-400">{t("check.note")}</p>
    </div>
  );
}

/* ---------- History ---------- */

export function HistoryPanel({ cv }: { cv: CVDocument }) {
  const { t, settings } = useApp();
  const replace = useEditor((s) => s.replace);
  const [revisions, setRevisions] = useState<CVRevision[]>([]);
  const reload = () => void getStore().listRevisions(cv.id).then(setRevisions);
  useEffect(reload, [cv.id]);
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">{t("history.help")}</p>
      <Button
        onClick={async () => {
          await getStore().addRevision(cv);
          reload();
        }}
      >
        {t("history.saveNow")}
      </Button>
      {revisions.length === 0 ? (
        <p className="text-sm text-slate-400">{t("history.empty")}</p>
      ) : (
        <ul className="space-y-1">
          {revisions.map((rev) => (
            <li key={rev.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <span className="text-slate-700">{new Date(rev.createdAt).toLocaleString(settings.uiLanguage === "km" ? "km-KH" : "en-GB")}</span>
              <Button small onClick={() => replace({ ...rev.snapshot, id: cv.id })}>
                {t("history.restore")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Quick add from free text ---------- */

type Draft = { section: ClassifiedSection; fields: [MessageKey, string][]; missing: string[]; apply(cv: CVDocument): void; usedAI: boolean };

const sectionLabel: Record<ClassifiedSection, MessageKey> = {
  education: "section.education",
  experiences: "section.experiences",
  skills: "section.skills",
  projects: "section.projects",
  summary: "section.summary",
  unknown: "quick.unknown",
};

function buildDraft(text: string, section: ClassifiedSection, ai: ExtractionResult | null): Draft {
  const d = ai?.data ?? {};
  const years = extractYears(text);
  const s = (v: string | null | undefined) => v?.trim() || "";
  const list = (pairs: [MessageKey, string][]) => pairs.filter(([, v]) => v);
  const base = { section, missing: ai?.missingFields ?? [], usedAI: Boolean(ai) };
  switch (section) {
    case "education": {
      const entry = { ...createEducation(), institution: s(d.institution), degree: s(d.degree) || undefined, fieldOfStudy: s(d.fieldOfStudy) || undefined, startDate: s(d.startDate) || undefined, endDate: s(d.endDate) || (ai ? undefined : years.at(-1)), description: ai ? s(d.description) || undefined : text };
      return { ...base, fields: list([["field.institution", entry.institution], ["field.degree", entry.degree ?? ""], ["field.fieldOfStudy", entry.fieldOfStudy ?? ""], ["field.endDate", entry.endDate ?? ""], ["field.description", entry.description ?? ""]]), apply: (cv) => void cv.education.push(entry) };
    }
    case "experiences": {
      const entry = { ...createExperience(), company: s(d.company), position: s(d.position), startDate: s(d.startDate) || (ai ? undefined : years[0]), endDate: s(d.endDate) || (ai ? undefined : years[1]), isCurrent: Boolean(d.isCurrent), description: ai ? s(d.description) : text };
      return { ...base, fields: list([["field.position", entry.position], ["field.company", entry.company], ["field.startDate", entry.startDate ?? ""], ["field.endDate", entry.endDate ?? ""], ["field.description", entry.description]]), apply: (cv) => void cv.experiences.push(entry) };
    }
    case "projects": {
      const entry = { ...createProject(), name: s(d.name), description: ai ? s(d.description) : text };
      return { ...base, fields: list([["field.projectName", entry.name], ["field.description", entry.description]]), apply: (cv) => void cv.projects.push(entry) };
    }
    case "skills": {
      const names = d.skills?.length ? d.skills : splitSkillList(text);
      return {
        ...base,
        fields: list([["field.skills", names.join(", ")]]),
        apply: (cv) => {
          const group = cv.skills[0] ?? cv.skills[cv.skills.push(createSkillGroup()) - 1]!;
          group.skills.push(...names.map((name) => ({ id: createId(), name })));
          cv.skills = dedupeSkills(cv.skills);
        },
      };
    }
    default: {
      const summary = ai ? s(d.text) || text : text;
      return { ...base, section: "summary", fields: [["section.summary", summary]], apply: (cv) => void (cv.summary = cv.summary ? `${cv.summary}\n${summary}` : summary) };
    }
  }
}

/**
 * Paste informal text; rules classify it, AI (when the user enabled it)
 * extracts structure, and the user confirms before anything is added.
 */
export function QuickAdd({ cv, onAdded }: { cv: CVDocument; onAdded(section: SectionKey): void }) {
  const { t } = useApp();
  const { orchestrator, state } = useAI();
  const update = useEditor((s) => s.update);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    const clean = normalizeWhitespace(text);
    if (!clean) return;
    setError("");
    const guess = classifyText(clean);
    let ai: ExtractionResult | null = null;
    if (state !== "unavailable") {
      setBusy(true);
      try {
        ai = (await orchestrator.run({ task: "extract_section", language: cv.metadata.language, content: { text: clean, ...(guess.section !== "unknown" ? { hint: guess.section } : {}) } })).result;
      } catch {
        setError(t("quick.aiFailed"));
      } finally {
        setBusy(false);
      }
    }
    const section = ai && ai.section !== "unknown" ? ai.section : guess.section;
    setDraft(buildDraft(clean, section, ai));
  };

  if (!open) {
    return (
      <Button variant="ghost" small onClick={() => setOpen(true)} data-testid="quick-add">
        ⚡ {t("quick.open")}
      </Button>
    );
  }
  return (
    <Card className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{t("quick.title")}</h3>
        <Button small variant="ghost" onClick={() => { setOpen(false); setDraft(null); }}>✕</Button>
      </div>
      {!draft ? (
        <>
          <p className="text-xs text-slate-500">{state === "unavailable" ? t("quick.helpRules") : t("quick.helpAI")}</p>
          <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("quick.placeholder")} aria-label={t("quick.title")} data-testid="quick-text" />
          {state === "cloud-ready" && <p className="text-[11px] text-slate-400">{t("ai.cloudNotice")}</p>}
          <Button variant="primary" small disabled={busy || !text.trim()} onClick={analyze} data-testid="quick-analyze">
            {busy ? t("ai.working") : t("quick.analyze")}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-700">
            {t("quick.detected")} <strong>{t(sectionLabel[draft.section])}</strong>
          </p>
          <dl className="space-y-1 rounded-lg bg-slate-50 p-2 text-sm">
            {draft.fields.map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="w-28 shrink-0 text-xs text-slate-500">{t(label)}</dt>
                <dd className="whitespace-pre-wrap text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          {draft.missing.length > 0 && <p className="text-xs text-amber-700">{t("quick.missing", { fields: draft.missing.join(", ") })}</p>}
          {error && <p className="text-xs text-amber-700">{error}</p>}
          <p className="text-xs text-slate-500">{t("quick.review")}</p>
          <div className="flex gap-2">
            <Button
              variant="primary"
              small
              data-testid="quick-confirm"
              onClick={() => {
                const d = draft;
                update((cvDraft) => d.apply(cvDraft));
                setDraft(null);
                setText("");
                setOpen(false);
                onAdded(d.section as SectionKey);
              }}
            >
              {t("quick.add")}
            </Button>
            <Button small onClick={() => setDraft(null)}>
              {t("quick.discard")}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
