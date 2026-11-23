"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createEmptyCV, type CVLanguage, type CVTarget } from "@thaflow/cv-core";
import { SUPPORTED_LANGUAGES, type MessageKey } from "@thaflow/localization";
import { Shell } from "@/components/shell";
import { Button, Card, Field, TextInput, cx } from "@/components/ui";
import { getStore, useApp } from "@/lib/app-context";

const targets: CVTarget[] = ["student", "professional", "academic", "general"];
/** A sensible starting template per audience; the user can change it at any time. */
const defaultTemplate: Record<CVTarget, string> = { student: "graduate", professional: "modern", academic: "academic", general: "minimal" };

export default function NewCVPage() {
  const { t, settings } = useApp();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<CVLanguage | null>(null);
  const [target, setTarget] = useState<CVTarget>("general");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cvLanguage = language ?? settings.uiLanguage;

  const create = async (next: "guide" | "editor") => {
    setBusy(true);
    try {
      const cv = await getStore().saveCV(createEmptyCV({ title: title.trim() || t("new.defaultTitle"), language: cvLanguage, target, templateId: defaultTemplate[target] }));
      router.push(`/${next}/?id=${cv.id}`);
    } catch {
      setError(t("home.storageError"));
      setBusy(false);
    }
  };

  const choice = (selected: boolean) => cx("rounded-lg border-2 px-3 py-2.5 text-left text-sm transition-colors", selected ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-400");

  return (
    <Shell>
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">{t("new.title")}</h1>
        <Card className="space-y-6 p-5">
          <Field label={t("field.cvTitle")} hint={t("new.titleHint")}>
            {(id) => <TextInput id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("new.defaultTitle")} data-testid="new-title" />}
          </Field>
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-slate-600">{t("new.language")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button key={lang.code} type="button" lang={lang.code} aria-pressed={cvLanguage === lang.code} onClick={() => setLanguage(lang.code)} className={choice(cvLanguage === lang.code)} data-testid={`lang-${lang.code}`}>
                  {lang.name}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-slate-600">{t("new.target")}</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {targets.map((key) => (
                <button key={key} type="button" aria-pressed={target === key} onClick={() => setTarget(key)} className={choice(target === key)} data-testid={`target-${key}`}>
                  <span className="block font-semibold text-slate-900">{t(`target.${key}` as MessageKey)}</span>
                  <span className="block text-xs text-slate-500">{t(`target.${key}.help` as MessageKey)}</span>
                </button>
              ))}
            </div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={busy} onClick={() => void create("editor")}>{t("new.skipToEditor")}</Button>
            <Button variant="primary" disabled={busy} onClick={() => void create("guide")} data-testid="start-guide">
              {t("new.start")}
            </Button>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
