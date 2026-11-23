"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { createId, formatDateRange, type CVDocument, type Education, type Experience, type Project } from "@thaflow/cv-core";
import type { MessageKey } from "@thaflow/localization";
import {
  entriesOf,
  entryFor,
  isBlankEntry,
  removeEntry,
  sectionScreen,
  setWorked,
  tidyEntry,
  upsertEntry,
  validateEntry,
  workedAnswer,
  type EntryOf,
  type EntrySectionId,
} from "@thaflow/questionnaire";
import { Button, Field, TextArea, TextInput } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { useEditor } from "@/lib/editor-store";
import { DegreeSelect } from "@/components/degree-select";
import { DateInput } from "./date-input";
import { Choice, Choices, ErrorLine, Heading, Primary, QuestionForm } from "./frame";
import { createUrl, type FlowNav } from "./nav";
import { submitOnModEnter } from "./questions";

interface SectionProps {
  cv: CVDocument;
  id: string;
  section: EntrySectionId;
  /** The entry open for typing (from the URL), if any. */
  openEntry: string | null;
  nav: FlowNav;
  /** Leave this question for the next one. */
  onNext(): void;
}

/** Work, education and projects: ask, fill in one entry at a time, then show the list. */
export function SectionQuestion(props: SectionProps) {
  const screen = sectionScreen(props.cv, props.section, props.openEntry);
  if (screen === "ask") return <WorkedQuestion {...props} />;
  if (screen === "list") return <EntryList {...props} />;
  // With nothing open yet the flow is about to give the first entry its own URL.
  return props.openEntry ? <EntryForm key={props.openEntry} {...props} entryId={props.openEntry} /> : null;
}

function WorkedQuestion({ cv, id, nav, onNext }: SectionProps) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  const heading = useId();
  const answer = workedAnswer(cv);
  const yes = () => {
    update((draft) => setWorked(draft, true));
    nav.push(createUrl(id, "work", createId()));
  };
  const notYet = () => {
    update((draft) => setWorked(draft, false));
    onNext();
  };
  return (
    <>
      <Heading id={heading}>{t("create.work.question")}</Heading>
      <Choices labelledBy={heading} focus={!answer}>
        <Choice
          label={t("create.work.yes")}
          selected={answer ? answer === "yes" : undefined}
          autoFocus={answer === "yes"}
          onSelect={yes}
          testId="create-worked-yes"
        />
        <Choice
          label={t("create.work.no")}
          selected={answer ? answer === "not-yet" : undefined}
          autoFocus={answer === "not-yet"}
          onSelect={notYet}
          testId="create-worked-no"
        />
      </Choices>
    </>
  );
}

/* ---------- The list ---------- */

const joined = (...parts: (string | undefined | false)[]) => parts.filter((part) => part && part.trim()).join(" · ");

function EntryList({ cv, id, section, nav, onNext }: SectionProps) {
  const { t, settings } = useApp();
  const update = useEditor((s) => s.update);
  const [removing, setRemoving] = useState<string | null>(null);
  const language = settings.uiLanguage;

  const describe = (entry: Experience | Education | Project): { title: string; detail: string } => {
    if (section === "work") {
      const job = entry as Experience;
      const dates = formatDateRange(job.startDate, job.endDate, job.isCurrent, language);
      return job.position.trim() ? { title: job.position, detail: joined(job.company, dates) } : { title: job.company, detail: dates };
    }
    if (section === "education") {
      const school = entry as Education;
      const dates = formatDateRange(school.startDate, school.endDate, false, language);
      const study = [school.degree, school.fieldOfStudy].filter((part) => part && part.trim()).join(", ");
      return school.institution.trim() ? { title: school.institution, detail: joined(study, dates) } : { title: study, detail: dates };
    }
    const project = entry as Project;
    return { title: project.name, detail: project.description.split("\n")[0] ?? "" };
  };

  return (
    <>
      <Heading>{t(`create.${section}.list`)}</Heading>
      <ul className="divide-y divide-line border-y border-line" data-testid="create-entry-list">
        {entriesOf(cv, section).map((entry) => {
          const { title, detail } = describe(entry);
          const name = title.trim() || t("item.untitled");
          return (
            <li key={entry.id} className="py-3" data-testid="create-entry-row">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 py-1.5">
                  <p className="break-words text-lg font-medium text-ink">{name}</p>
                  {detail && <p className="line-clamp-2 break-words text-muted">{detail}</p>}
                </div>
                {removing === entry.id ? (
                  <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`${t("action.remove")}: ${name}`}>
                    <Button
                      variant="danger"
                      autoFocus
                      className="h-11"
                      onClick={() => {
                        setRemoving(null);
                        update((draft) => removeEntry(draft, section, entry.id));
                      }}
                      data-testid="create-entry-remove-confirm"
                    >
                      {t("action.remove")}
                    </Button>
                    <Button variant="ghost" className="h-11" onClick={() => setRemoving(null)} data-testid="create-entry-remove-cancel">
                      {t("action.cancel")}
                    </Button>
                  </div>
                ) : (
                  <div className="-mr-2 flex shrink-0 items-center">
                    <RowAction label={t("create.edit")} name={name} onClick={() => nav.push(createUrl(id, section, entry.id))} testId="create-entry-edit" />
                    <RowAction label={t("action.remove")} name={name} onClick={() => setRemoving(entry.id)} testId="create-entry-remove" />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Button
        size="lg"
        className="mt-4 w-full sm:w-auto"
        onClick={() => nav.push(createUrl(id, section, createId()))}
        data-testid="create-entry-add"
      >
        {t(`create.${section}.add`)}
      </Button>
      <QuestionForm onSubmit={onNext}>
        <Primary autoFocus>{t("create.next")}</Primary>
      </QuestionForm>
    </>
  );
}

function RowAction({ label, name, onClick, testId }: { label: string; name: string; onClick(): void; testId: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${name}`}
      className="inline-flex h-11 items-center rounded-lg px-2 text-sm text-muted transition-colors hover:text-ink"
      data-testid={testId}
    >
      {label}
    </button>
  );
}

/* ---------- One entry ---------- */

type DateField = "startDate" | "endDate";

/** Two short boxes that belong together: side by side when there is room, stacked on a phone. */
const PAIR = "grid grid-cols-1 gap-4 sm:grid-cols-2";

function EntryForm({ cv, id, section, entryId, nav, onNext }: SectionProps & { entryId: string }) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  const form = useRef<HTMLDivElement>(null);
  const [tried, setTried] = useState(false);
  // Dates that are typed but cannot be stored yet (half a year, a month without a year).
  const [unfinished, setUnfinished] = useState<Record<DateField, boolean>>({ startDate: false, endDate: false });

  const entries = entriesOf(cv, section);
  const at = entries.findIndex((entry) => entry.id === entryId);
  const others = entries.length - (at >= 0 ? 1 : 0);
  const first = at === 0 || (at < 0 && entries.length === 0);
  const entry = entryFor(cv, section, entryId);
  const badDate = unfinished.startDate || unfinished.endDate;
  const blank = isBlankEntry(section, entry) && !badDate;
  const issues = validateEntry(section, entry);

  const set = (patch: Partial<Experience & Education & Project>, key: string) =>
    update(
      (draft) => upsertEntry(draft, section, { ...entryFor(draft, section, entryId), ...patch } as EntryOf<typeof section>),
      `create.${section}.${entryId}.${key}`,
    );
  const setDate = (field: DateField) => (value: string, valid: boolean) => {
    set({ [field]: value || undefined }, field);
    setUnfinished((current) => ({ ...current, [field]: !valid }));
  };

  const submit = () => {
    if (blank) {
      // Nothing typed: the first entry of a section can be skipped; "another" simply has nothing to save.
      if (others === 0) onNext();
      return;
    }
    if (issues.length > 0 || badDate) {
      setTried(true);
      const target = issues.some((issue) => issue.code === "required") ? "input[type='text']" : "[aria-invalid='true']";
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(target)?.focus());
      return;
    }
    update((draft) => upsertEntry(draft, section, tidyEntry(section, entryFor(draft, section, entryId))));
    nav.close(createUrl(id, section));
  };

  const missing = tried && issues.some((issue) => issue.code === "required");
  const wrongOrder = tried && issues.some((issue) => issue.code === "date-order");
  const requiredError: Record<EntrySectionId, MessageKey> = { work: "create.error.job", education: "create.error.school", projects: "create.error.project" };
  const error = !tried ? null : missing ? t(requiredError[section]) : badDate ? t("create.error.year") : wrongOrder ? t("create.error.dateOrder") : null;

  const dates = (testId: string, withEnd: boolean) => (
    <div className={PAIR}>
      <DateInput label={t("field.startDate")} value={(entry as Experience).startDate} onChange={setDate("startDate")} showInvalid={tried} testId={`${testId}-start`} />
      {withEnd && (
        <DateInput label={t("field.endDate")} value={(entry as Experience).endDate} onChange={setDate("endDate")} showInvalid={tried} invalid={wrongOrder} testId={`${testId}-end`} />
      )}
    </div>
  );

  let fields: ReactNode;
  if (section === "work") {
    const job = entry as Experience;
    fields = (
      <>
        <div className={PAIR}>
          <Field label={t("field.position")}>
            {(box) => (
              <TextInput
                id={box}
                type="text"
                controlSize="lg"
                autoFocus
                autoComplete="organization-title"
                invalid={missing}
                value={job.position}
                placeholder={t("create.work.positionPlaceholder")}
                onChange={(e) => set({ position: e.target.value }, "position")}
                data-testid="create-work-position"
              />
            )}
          </Field>
          <Field label={t("field.company")}>
            {(box) => (
              <TextInput
                id={box}
                type="text"
                controlSize="lg"
                autoComplete="organization"
                value={job.company}
                onChange={(e) => set({ company: e.target.value }, "company")}
                data-testid="create-work-company"
              />
            )}
          </Field>
        </div>
        {dates("create-work", !job.isCurrent)}
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-ink">
          <input
            type="checkbox"
            checked={job.isCurrent}
            onChange={(e) => {
              const isCurrent = e.target.checked;
              set(isCurrent ? { isCurrent, endDate: undefined } : { isCurrent }, "isCurrent");
              if (isCurrent) setUnfinished((current) => ({ ...current, endDate: false }));
            }}
            className="h-5 w-5 shrink-0 accent-ink"
            data-testid="create-work-current"
          />
          {t("field.isCurrent")}
        </label>
        <Field label={t("create.work.did")}>
          {(box) => (
            <TextArea
              id={box}
              controlSize="lg"
              rows={4}
              value={job.description}
              placeholder={t("create.work.didPlaceholder")}
              onChange={(e) => set({ description: e.target.value }, "description")}
              onKeyDown={submitOnModEnter}
              data-testid="create-work-description"
            />
          )}
        </Field>
      </>
    );
  } else if (section === "education") {
    const school = entry as Education;
    fields = (
      <>
        <Field label={t("field.institution")}>
          {(box) => (
            <TextInput
              id={box}
              type="text"
              controlSize="lg"
              autoFocus
              autoComplete="off"
              invalid={missing}
              value={school.institution}
              placeholder={t("create.education.institutionPlaceholder")}
              onChange={(e) => set({ institution: e.target.value }, "institution")}
              data-testid="create-education-institution"
            />
          )}
        </Field>
        <div className={PAIR}>
          <Field label={t("field.degree")}>
            {(box) => <DegreeSelect id={box} controlSize="lg" language={cv.metadata.language} value={school.degree} onChange={(degree) => set({ degree }, "degree")} testId="create-education-degree" />}
          </Field>
          <Field label={t("field.fieldOfStudy")}>
            {(box) => (
              <TextInput
                id={box}
                type="text"
                controlSize="lg"
                autoComplete="off"
                value={school.fieldOfStudy ?? ""}
                placeholder={t("create.education.fieldPlaceholder")}
                onChange={(e) => set({ fieldOfStudy: e.target.value }, "fieldOfStudy")}
                data-testid="create-education-field"
              />
            )}
          </Field>
        </div>
        {dates("create-education", true)}
      </>
    );
  } else {
    const project = entry as Project;
    fields = (
      <>
        <Field label={t("field.projectName")}>
          {(box) => (
            <TextInput
              id={box}
              type="text"
              controlSize="lg"
              autoFocus
              autoComplete="off"
              invalid={missing}
              value={project.name}
              placeholder={t("create.projects.namePlaceholder")}
              onChange={(e) => set({ name: e.target.value }, "name")}
              data-testid="create-project-name"
            />
          )}
        </Field>
        <Field label={t("create.projects.what")}>
          {(box) => (
            <TextArea
              id={box}
              controlSize="lg"
              rows={4}
              value={project.description}
              placeholder={t("create.projects.whatPlaceholder")}
              onChange={(e) => set({ description: e.target.value }, "description")}
              onKeyDown={submitOnModEnter}
              data-testid="create-project-description"
            />
          )}
        </Field>
      </>
    );
  }

  return (
    <QuestionForm onSubmit={submit}>
      <Heading>{t(first ? `create.${section}.first` : `create.${section}.another`)}</Heading>
      <div ref={form} className="space-y-4">
        {fields}
      </div>
      {error && <ErrorLine>{error}</ErrorLine>}
      <Primary disabled={blank && others > 0}>{t(blank && others === 0 ? "create.skip" : others === 0 ? "create.next" : "create.save")}</Primary>
    </QuestionForm>
  );
}
