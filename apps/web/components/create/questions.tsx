"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createId, type CVDocument, type CVLanguage, type LanguageSkill } from "@thaflow/cv-core";
import {
  LANGUAGE_LEVELS,
  canLeave,
  isValidEmail,
  levelLabel,
  levelOf,
  listSkills,
  primaryAction,
  setFullName,
  setLanguage,
  setSkills,
  setSpokenLanguages,
  type LanguageLevel,
} from "@thaflow/questionnaire";
import { draftSummary } from "@thaflow/rule-engine";
import { Button, Field, Select, TagInput, TextArea, TextInput, cx } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { useEditor } from "@/lib/editor-store";
import { BOX_HEIGHT, PLACEHOLDER } from "./date-input";
import { Choice, Choices, ErrorLine, Heading, Primary, QuestionForm } from "./frame";

export interface QuestionProps {
  cv: CVDocument;
  /** Leave this question for the next one. */
  onNext(): void;
}

/** Ctrl/Cmd+Enter submits from a multi-line box, where plain Enter starts a new line. */
export function submitOnModEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }
}

export function LanguageQuestion({ cv, onNext }: QuestionProps) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  const heading = useId();
  const current = cv.metadata.language;
  const choose = (language: CVLanguage) => {
    if (language !== current) update((draft) => setLanguage(draft, language));
    onNext();
  };
  return (
    <>
      <Heading id={heading}>{t("create.language.question")}</Heading>
      <Choices labelledBy={heading}>
        <Choice label="English" lang="en" selected={current === "en"} autoFocus={current === "en"} onSelect={() => choose("en")} testId="create-language-en" />
        <Choice label="ខ្មែរ" lang="km" selected={current === "km"} autoFocus={current === "km"} onSelect={() => choose("km")} testId="create-language-km" />
      </Choices>
    </>
  );
}

export function NameQuestion({ cv, onNext }: QuestionProps) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  const heading = useId();
  const box = useId();
  const ok = canLeave(cv, "name");
  return (
    <QuestionForm onSubmit={() => ok && onNext()}>
      <Heading id={heading} htmlFor={box}>
        {t("create.name.question")}
      </Heading>
      <TextInput
        id={box}
        aria-labelledby={heading}
        aria-required
        controlSize="lg"
        autoFocus
        autoComplete="name"
        autoCapitalize="words"
        enterKeyHint="next"
        value={cv.personal.fullName}
        placeholder={t("create.name.placeholder")}
        onChange={(e) => update((draft) => setFullName(draft, e.target.value), "create.name")}
        data-testid="create-name"
      />
      <Primary disabled={!ok}>{t("create.next")}</Primary>
    </QuestionForm>
  );
}

export function TitleQuestion({ cv, onNext }: QuestionProps) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  const heading = useId();
  const box = useId();
  return (
    <QuestionForm onSubmit={onNext}>
      <Heading id={heading} htmlFor={box}>
        {t("create.title.question")}
      </Heading>
      <TextInput
        id={box}
        aria-labelledby={heading}
        controlSize="lg"
        autoFocus
        autoComplete="organization-title"
        enterKeyHint="next"
        value={cv.personal.headline ?? ""}
        placeholder={t("create.title.placeholder")}
        onChange={(e) => update((draft) => void (draft.personal.headline = e.target.value), "create.title")}
        data-testid="create-title"
      />
      <Primary>{t(primaryAction(cv, "title") === "skip" ? "create.skip" : "create.next")}</Primary>
    </QuestionForm>
  );
}

export function ContactQuestion({ cv, onNext }: QuestionProps) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  const [tried, setTried] = useState(false);
  const boxes = useRef<HTMLDivElement>(null);
  const wrongEmail = tried && !isValidEmail(cv.personal.email);
  const submit = () => {
    if (canLeave(cv, "contact")) return onNext();
    setTried(true);
    boxes.current?.querySelector<HTMLInputElement>('input[type="email"]')?.focus();
  };
  return (
    <QuestionForm onSubmit={submit}>
      <Heading>{t("create.contact.question")}</Heading>
      <div ref={boxes} className="space-y-4">
        <Field label={t("field.email")}>
          {(id) => (
            <>
              <TextInput
                id={id}
                type="email"
                inputMode="email"
                controlSize="lg"
                autoFocus
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                invalid={wrongEmail}
                aria-describedby={wrongEmail ? `${id}-error` : undefined}
                value={cv.personal.email ?? ""}
                placeholder={t("create.contact.emailPlaceholder")}
                onChange={(e) => update((draft) => void (draft.personal.email = e.target.value), "create.email")}
                data-testid="create-email"
              />
              {wrongEmail && <ErrorLine id={`${id}-error`}>{t("create.error.email")}</ErrorLine>}
            </>
          )}
        </Field>
        <Field label={t("field.phone")}>
          {(id) => (
            <TextInput
              id={id}
              type="tel"
              inputMode="tel"
              controlSize="lg"
              autoComplete="tel"
              value={cv.personal.phone ?? ""}
              placeholder={t("create.contact.phonePlaceholder")}
              onChange={(e) => update((draft) => void (draft.personal.phone = e.target.value), "create.phone")}
              data-testid="create-phone"
            />
          )}
        </Field>
        <Field label={t("field.location")}>
          {(id) => (
            <TextInput
              id={id}
              controlSize="lg"
              autoComplete="address-level2"
              enterKeyHint="next"
              value={cv.personal.location ?? ""}
              placeholder={t("create.contact.locationPlaceholder")}
              onChange={(e) => update((draft) => void (draft.personal.location = e.target.value), "create.location")}
              data-testid="create-location"
            />
          )}
        </Field>
      </div>
      <Primary>{t(primaryAction(cv, "contact") === "skip" ? "create.skip" : "create.next")}</Primary>
    </QuestionForm>
  );
}

export function SkillsQuestion({ cv, onNext }: QuestionProps) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  const box = "create-skills-input";
  const skills = listSkills(cv);
  // What is typed but not yet a tag still counts as an answer (it becomes a tag on leaving the box).
  const [typing, setTyping] = useState(false);
  useEffect(() => setTyping(false), [skills.length]);
  return (
    <QuestionForm onSubmit={onNext}>
      <Heading htmlFor={box}>{t("create.skills.question")}</Heading>
      <div onInput={(e) => setTyping(Boolean((e.target as HTMLInputElement).value?.trim()))} data-testid="create-skills">
        <TagInput
          id={box}
          controlSize="lg"
          autoFocus
          values={skills}
          onChange={(names) => update((draft) => setSkills(draft, names))}
          placeholder={t("create.skills.placeholder")}
          removeLabel={t("action.remove")}
        />
      </div>
      <Primary>{t(skills.length === 0 && !typing ? "create.skip" : "create.next")}</Primary>
    </QuestionForm>
  );
}

type LanguageRow = LanguageSkill;
const blankRow = (): LanguageRow => ({ id: createId(), name: "" });
/** Select value for a proficiency that was written by hand or read from a file: kept exactly as it is. */
const KEEP = "as-written";

export function LanguagesQuestion({ cv, onNext }: QuestionProps) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  const heading = useId();
  // Rows live here while the question is open so a row being retyped does not vanish; only named rows are stored.
  const [rows, setRows] = useState<LanguageRow[]>(() => [...cv.languages.map((row) => ({ ...row })), blankRow()]);

  const commit = (next: LanguageRow[]) => {
    const last = next[next.length - 1];
    const withSpare = !last || last.name.trim() ? [...next, blankRow()] : next;
    setRows(withSpare);
    update((draft) => setSpokenLanguages(draft, withSpare), "create.languages");
  };
  const change = (id: string, patch: Partial<LanguageRow>) => commit(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const levelNames: Record<LanguageLevel, string> = {
    native: t("create.level.native"),
    fluent: t("create.level.fluent"),
    good: t("create.level.good"),
    basic: t("create.level.basic"),
  };
  const named = rows.some((row) => row.name.trim());

  return (
    <QuestionForm onSubmit={onNext}>
      <Heading id={heading}>{t("create.languages.question")}</Heading>
      <ul className="space-y-3" aria-labelledby={heading}>
        {rows.map((row, index) => {
          const level = levelOf(row.proficiency);
          const custom = !level && row.proficiency?.trim() ? row.proficiency : null;
          const hasName = Boolean(row.name.trim());
          return (
            <li key={row.id} className="flex items-center gap-2" data-testid="create-language-row">
              <TextInput
                controlSize="lg"
                autoFocus={index === 0}
                value={row.name}
                placeholder={t("field.languageName")}
                aria-label={`${t("field.languageName")} ${index + 1}`}
                autoCapitalize="words"
                enterKeyHint="next"
                onChange={(e) => change(row.id, { name: e.target.value })}
                className="min-w-0 flex-1"
                data-testid="create-language-name"
              />
              {/* The width lives on a wrapper: the box itself is always full width. */}
              <div className="w-36 shrink-0 sm:w-44">
                <Select
                  controlSize="lg"
                  value={level ?? (custom ? KEEP : "")}
                  disabled={!hasName}
                  aria-label={`${t("field.proficiency")} ${index + 1}`}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === KEEP) return;
                    change(row.id, { proficiency: value ? levelLabel(value as LanguageLevel, cv.metadata.language) : undefined });
                  }}
                  className={cx(BOX_HEIGHT, !level && !custom && PLACEHOLDER, "disabled:cursor-not-allowed")}
                  data-testid="create-language-level"
                >
                  <option value="">{t("field.proficiency")}</option>
                  {custom && (
                    <option value={KEEP} className="text-ink">
                      {custom}
                    </option>
                  )}
                  {LANGUAGE_LEVELS.map((value) => (
                    <option key={value} value={value} className="text-ink">
                      {levelNames[value]}
                    </option>
                  ))}
                </Select>
              </div>
              <button
                type="button"
                onClick={() => commit(rows.filter((other) => other.id !== row.id))}
                aria-label={`${t("action.remove")}: ${row.name.trim() || `${t("field.languageName")} ${index + 1}`}`}
                className={cx(
                  "grid h-11 w-9 shrink-0 place-items-center rounded-lg text-xl text-muted transition-colors hover:bg-surface hover:text-ink",
                  !hasName && "invisible",
                )}
                tabIndex={hasName ? 0 : -1}
                data-testid="create-language-remove"
              >
                <span aria-hidden>×</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Primary>{t(named ? "create.next" : "create.skip")}</Primary>
    </QuestionForm>
  );
}

export function AboutQuestion({ cv, onNext }: QuestionProps) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  const heading = useId();
  const box = useId();
  const draft = draftSummary(cv);
  return (
    <QuestionForm onSubmit={onNext}>
      <Heading id={heading} htmlFor={box}>
        {t("create.about.question")}
      </Heading>
      <TextArea
        id={box}
        aria-labelledby={heading}
        controlSize="lg"
        rows={6}
        autoFocus
        value={cv.summary}
        placeholder={t("create.about.placeholder")}
        onChange={(e) => update((draft) => void (draft.summary = e.target.value), "create.about")}
        onKeyDown={submitOnModEnter}
        data-testid="create-about"
      />
      {draft && !cv.summary.trim() && (
        <div className="-mt-2 mb-6">
          {/* Written from the answers already given, on this device. */}
          <Button onClick={() => update((d) => void (d.summary = draft), "create.about")} data-testid="create-about-write">
            {t("write.forMe")}
          </Button>
        </div>
      )}
      <Primary>{t(primaryAction(cv, "about") === "skip" ? "create.skip" : "create.next")}</Primary>
    </QuestionForm>
  );
}
