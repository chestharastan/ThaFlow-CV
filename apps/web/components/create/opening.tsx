"use client";

import { useEffect, useId, useRef } from "react";
import type { CVDocument } from "@thaflow/cv-core";
import type { ImportErrorCode, ImportResult } from "@thaflow/import-engine";
import type { MessageKey } from "@thaflow/localization";
import { answerOpening, type OpeningQuestionId } from "@thaflow/questionnaire";
import { useApp } from "@/lib/app-context";
import { Choice, Choices, ErrorLine, Heading, Primary, QuestionForm } from "./frame";

/** Why the opening could not go on. Import codes come from the import engine; the rest are ours. */
export type OpeningFailure = ImportErrorCode | "empty" | "storage";

/** Where reading a file has got to. Lives in the flow so Back can step out of it. */
export type ImportState =
  | { phase: "idle"; failure?: OpeningFailure }
  | { phase: "reading" }
  | { phase: "found"; result: ImportResult; fileName: string };

/** Turns what a file contained into a CV, on top of `base` (which supplies the id and everything the file lacks). */
export type BuildFromImport = (base: CVDocument) => CVDocument;

// The import engine (PDF and Word readers) is only loaded when someone picks a file.
const loadEngine = () => import("@thaflow/import-engine");

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function StartQuestion({
  failure,
  onAsk,
  onCreate,
}: {
  failure?: OpeningFailure;
  onAsk(question: OpeningQuestionId): void;
  onCreate(): void;
}) {
  const { t } = useApp();
  const heading = useId();
  const answer = (choice: "yes" | "no") => {
    const outcome = answerOpening("start", choice);
    if ("ask" in outcome) onAsk(outcome.ask);
    else onCreate();
  };
  return (
    <>
      <Heading id={heading}>{t("create.start.question")}</Heading>
      <Choices labelledBy={heading} focus>
        <Choice label={t("create.start.yes")} onSelect={() => answer("yes")} testId="create-start-yes" />
        <Choice label={t("create.start.no")} onSelect={() => answer("no")} testId="create-start-no" />
      </Choices>
      {failure && <ErrorLine>{t(`create.error.${failure}`)}</ErrorLine>}
    </>
  );
}

function plural(t: ReturnType<typeof useApp>["t"], key: "job" | "school" | "project" | "skill" | "language", count: number): string {
  const form: MessageKey = `create.found.${key}.${count === 1 ? "one" : "other"}`;
  return t(form, { count });
}

export function SourceQuestion({
  state,
  onState,
  onCreate,
}: {
  state: ImportState;
  onState(state: ImportState): void;
  /** Create the CV: blank, or from the file when `build` is given. */
  onCreate(build?: BuildFromImport): void;
}) {
  const { t } = useApp();
  const heading = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  // Only the latest pick may report back, and only while this screen is still shown.
  const run = useRef(0);
  useEffect(() => () => void run.current++, []);

  const read = async (file: File) => {
    const mine = ++run.current;
    onState({ phase: "reading" });
    let next: ImportState;
    try {
      const engine = await loadEngine();
      const result = await engine.importCVFile(file, { pdfWorkerSrc: "/pdf.worker.min.mjs" });
      next = engine.isImportEmpty(result.data) ? { phase: "idle", failure: "empty" } : { phase: "found", result, fileName: file.name };
    } catch (error) {
      const code = error instanceof Error && error.name === "ImportError" ? (error as Error & { code?: ImportErrorCode }).code : undefined;
      next = { phase: "idle", failure: code ?? "corrupt" };
    }
    if (mine === run.current) onState(next);
  };

  const answer = (choice: "file" | "type") => {
    const outcome = answerOpening("source", choice);
    if ("create" in outcome && outcome.create === "import") fileInput.current?.click();
    else onCreate();
  };

  if (state.phase === "found") {
    const { data, warnings } = state.result;
    const counts = [
      ["job", data.experiences.length],
      ["school", data.education.length],
      ["project", data.projects.length],
      ["skill", data.skills.reduce((total, group) => total + group.skills.length, 0)],
      ["language", data.languages.length],
    ] as const;
    const summary = counts.filter(([, count]) => count > 0).map(([key, count]) => plural(t, key, count));
    const who = data.personal.fullName?.trim() || data.personal.email?.trim() || state.fileName;
    const useIt = async () => {
      const engine = await loadEngine();
      onCreate((base) => engine.createCVFromImport(data, base));
    };
    return (
      <QuestionForm onSubmit={() => void useIt()}>
        <Heading>{t("create.found.question")}</Heading>
        <div data-testid="create-found">
          <p className="break-words text-xl font-medium text-ink" data-testid="create-found-name">
            {who}
          </p>
          {summary.length > 0 && (
            <p className="mt-1 text-lg text-muted" data-testid="create-found-counts">
              {summary.join(" · ")}
            </p>
          )}
          {warnings.length > 0 && (
            <p className="mt-3 text-sm text-warn" data-testid="create-found-warning">
              {t("create.found.warning")}
            </p>
          )}
        </div>
        <Primary autoFocus>{t("create.continue")}</Primary>
      </QuestionForm>
    );
  }

  return (
    <>
      <Heading id={heading}>{t("create.source.question")}</Heading>
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="create-file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void read(file);
        }}
      />
      {state.phase === "reading" ? (
        <p role="status" className="flex min-h-16 items-center text-lg text-muted" data-testid="create-reading">
          {t("create.source.reading")}
        </p>
      ) : (
        <>
          {state.failure && (
            <ErrorLine testId="create-import-error" className="-mt-4 mb-4">
              {t(`create.error.${state.failure}`)}
            </ErrorLine>
          )}
          <Choices labelledBy={heading} focus>
            <Choice label={t("create.source.file")} detail={t("create.source.fileTypes")} onSelect={() => answer("file")} testId="create-source-file" />
            {/* Sits right under the file choice on a phone, and under both choices when they are side by side. */}
            <p className="text-sm text-muted sm:order-last sm:col-span-2" data-testid="create-source-private">
              {t("create.source.private")}
            </p>
            <Choice label={t("create.source.type")} onSelect={() => answer("type")} testId="create-source-type" />
          </Choices>
        </>
      )}
    </>
  );
}
