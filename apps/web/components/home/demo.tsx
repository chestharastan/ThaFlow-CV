"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import type { CVLanguage } from "@thaflow/cv-core";
import { getTemplate } from "@thaflow/template-engine";
import { ArrowRight } from "@/components/icons";
import { ScaledPreview } from "@/components/preview";
import { TextInput, cx } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { sampleCV, useSamplePhoto } from "@/lib/sample-cv";

/** A spread of the designs: the standard sheet, side columns, a banner, and plain ones. */
const DEMO_TEMPLATES = ["sambor", "sesan", "kravanh", "srepok", "vihear", "minimal", "modern", "executive"];

const pill = "inline-flex h-9 items-center rounded-full border px-3.5 text-sm transition-colors";

/**
 * The product, working: type a name and a job, switch the design and the language, and the real
 * renderer redraws the CV. Nothing typed here is saved.
 */
export function Demo() {
  const { t, settings } = useApp();
  const nameId = useId();
  const jobId = useId();
  const [language, setLanguage] = useState<CVLanguage>(settings.uiLanguage);
  const [name, setName] = useState("");
  const [job, setJob] = useState("");
  const [templateId, setTemplateId] = useState(DEMO_TEMPLATES[0]!);
  const photo = useSamplePhoto();

  // Follow the interface language until the visitor picks one here.
  const [picked, setPicked] = useState(false);
  useEffect(() => {
    if (!picked) setLanguage(settings.uiLanguage);
  }, [settings.uiLanguage, picked]);

  const cv = useMemo(() => {
    const next = sampleCV(language, photo);
    if (name.trim()) next.personal.fullName = name.trim();
    if (job.trim()) next.personal.headline = job.trim();
    next.appearance.templateId = templateId;
    return next;
  }, [language, photo, name, job, templateId]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:gap-14">
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor={nameId} className="mb-1.5 block text-xs font-medium text-muted">
              {t("home.demo.name")}
            </label>
            <TextInput id={nameId} controlSize="lg" value={name} placeholder={t("home.demo.namePlaceholder")} onChange={(e) => setName(e.target.value)} autoComplete="off" data-testid="demo-name" />
          </div>
          <div>
            <label htmlFor={jobId} className="mb-1.5 block text-xs font-medium text-muted">
              {t("home.demo.job")}
            </label>
            <TextInput id={jobId} controlSize="lg" value={job} placeholder={t("home.demo.jobPlaceholder")} onChange={(e) => setJob(e.target.value)} autoComplete="off" data-testid="demo-job" />
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-xs font-medium text-muted">{t("home.demo.language")}</legend>
          <div className="flex flex-wrap gap-2">
            {(["en", "km"] as const).map((code) => (
              <button
                key={code}
                type="button"
                lang={code}
                aria-pressed={language === code}
                onClick={() => {
                  setPicked(true);
                  setLanguage(code);
                }}
                className={cx(pill, language === code ? "border-ink bg-cream font-medium text-ink" : "border-line-strong bg-paper text-ink-soft hover:border-ink")}
                data-testid={`demo-lang-${code}`}
              >
                {code === "en" ? "English" : "ខ្មែរ"}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-medium text-muted">{t("home.demo.design")}</legend>
          <div className="flex flex-wrap gap-2">
            {DEMO_TEMPLATES.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={templateId === id}
                onClick={() => setTemplateId(id)}
                className={cx(pill, templateId === id ? "border-ink bg-cream font-medium text-ink" : "border-line-strong bg-paper text-ink-soft hover:border-ink")}
                data-testid={`demo-template-${id}`}
              >
                {getTemplate(id).name}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2 pt-1">
          <Link
            href="/dashboard/"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-paper px-5 text-[15px] font-medium text-ink shadow-soft transition-colors hover:border-ink"
            data-testid="demo-cta"
          >
            {t("home.demo.cta")}
            <ArrowRight />
          </Link>
          <p className="text-[13px] text-muted">{t("home.demo.note")}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-surface p-4 sm:p-8" aria-label={t("home.demo.previewLabel")} role="img" data-testid="demo-preview">
        {/* The first page, at a size that can be read. */}
        <div className="mx-auto aspect-[210/297] w-full max-w-[36rem] overflow-hidden rounded-md bg-paper shadow-page ring-1 ring-line">
          <ScaledPreview cv={cv} template={getTemplate(templateId)} bare />
        </div>
      </div>
    </div>
  );
}
