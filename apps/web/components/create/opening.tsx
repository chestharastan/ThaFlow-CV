"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CVDocument } from "@thaflow/cv-core";
import type { ImportErrorCode, ImportResult, OcrProgress } from "@thaflow/import-engine";
import type { MessageKey } from "@thaflow/localization";
import { answerOpening, type OpeningQuestionId } from "@thaflow/questionnaire";
import { useApp } from "@/lib/app-context";
import { ocrOptions } from "@/lib/ocr";
import { Choice, Choices, ErrorLine, Heading, Primary, QuestionForm } from "./frame";

/** Why the opening could not go on. Import codes come from the import engine; the rest are ours. */
export type OpeningFailure = ImportErrorCode | "empty" | "storage";

/** Where reading a file has got to. Lives in the flow so Back can step out of it. */
export type ImportState =
  | { phase: "idle"; failure?: OpeningFailure }
  | { phase: "reading"; progress?: OcrProgress }
  | { phase: "found"; result: ImportResult; fileName: string };

/** Turns what a file contained into a CV, on top of `base` (which supplies the id and everything the file lacks). */
export type BuildFromImport = (base: CVDocument) => CVDocument;

// The import engine (PDF and Word readers) is only loaded when someone picks a file.
const loadEngine = () => import("@thaflow/import-engine");

// Pictures too: a photo of a printed CV, a screenshot, or a scan. They are read on the device like the rest.
const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*,.heic,.heif,.tif,.tiff";

/** True when what is being dragged over the page is a file from the device, not text or a link. */
const carriesFile = (event: DragEvent) => event.dataTransfer?.types.includes("Files") ?? false;

/** What the reader is doing, in words. Null while there is nothing more specific to say than "Reading…". */
function progressText(t: ReturnType<typeof useApp>["t"], progress: OcrProgress | undefined): string {
  if (!progress) return t("create.source.reading");
  if (progress.stage === "download") return t("create.source.downloading", { percent: Math.min(99, Math.floor((progress.loaded / Math.max(1, progress.total)) * 100)) });
  if (progress.stage === "prepare") return t("create.source.preparing");
  const percent = progress.total ? Math.floor((progress.done / progress.total) * 100) : 0;
  return progress.pages > 1 ? t("create.source.readingPage", { page: progress.page, pages: progress.pages, percent }) : t("create.source.readingPicture", { percent });
}

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
      const result = await engine.importCVFile(file, {
        pdfWorkerSrc: "/pdf.worker.min.mjs",
        pdfWasmUrl: "/pdfjs/wasm/",
        // Only used for pictures and for PDFs without usable text. Progress is shown because it takes a while.
        ocr: ocrOptions((progress) => {
          if (mine === run.current) onState({ phase: "reading", progress });
        }),
      });
      next = engine.isImportEmpty(result.data) ? { phase: "idle", failure: "empty" } : { phase: "found", result, fileName: file.name };
    } catch (error) {
      const code = error instanceof Error && error.name === "ImportError" ? (error as Error & { code?: ImportErrorCode }).code : undefined;
      next = { phase: "idle", failure: code ?? "corrupt" };
    }
    if (mine === run.current) onState(next);
  };

  // A file can be dropped instead of picked. The whole page takes it, not only the box: a file let go
  // of beside the box would otherwise be opened by the browser in place of the app.
  const idle = state.phase === "idle";
  const [dragging, setDragging] = useState(false);
  const onDropped = useRef(read);
  useEffect(() => {
    onDropped.current = read;
  });
  useEffect(() => {
    // dragenter and dragleave fire for every element the pointer crosses, so keep the ones it is over.
    let over: EventTarget[] = [];
    const show = () => setDragging(idle && over.length > 0);
    const enter = (event: DragEvent) => {
      if (!carriesFile(event) || !event.target) return;
      over = [...over.filter((target) => target !== event.target), event.target];
      show();
    };
    const leave = (event: DragEvent) => {
      // An element removed while the pointer was over it never reports leaving, so drop those too.
      over = over.filter((target) => target !== event.target && target instanceof Node && target.isConnected);
      show();
    };
    const hold = (event: DragEvent) => {
      if (!carriesFile(event) || !event.dataTransfer) return;
      event.preventDefault(); // without this the browser refuses the drop
      event.dataTransfer.dropEffect = idle ? "copy" : "none";
    };
    const drop = (event: DragEvent) => {
      if (!carriesFile(event)) return;
      event.preventDefault();
      over = [];
      show();
      const file = event.dataTransfer?.files[0];
      if (idle && file) void onDropped.current(file);
    };
    // The page gets no pointer events while something is dragged over it, so one arriving means the
    // drag is over, even if the browser never said the file left.
    const moved = () => {
      if (!over.length) return;
      over = [];
      show();
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", hold);
    window.addEventListener("drop", drop);
    window.addEventListener("pointermove", moved);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", hold);
      window.removeEventListener("drop", drop);
      window.removeEventListener("pointermove", moved);
    };
  }, [idle]);

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
              {t(warnings.includes("read-from-image") ? "create.found.pictureWarning" : "create.found.warning")}
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
        <div role="status" className="min-h-16" data-testid="create-reading">
          <p className="text-lg text-muted tabular-nums">{progressText(t, state.progress)}</p>
          {state.progress?.stage === "download" && (
            <p className="mt-2 text-sm text-muted" data-testid="create-reading-note">
              {t("create.source.downloadNote", { size: Math.round(state.progress.total / 1_000_000) })}
            </p>
          )}
        </div>
      ) : (
        <>
          {state.failure && (
            <ErrorLine testId="create-import-error" className="-mt-4 mb-4">
              {t(`create.error.${state.failure}`)}
            </ErrorLine>
          )}
          <Choices labelledBy={heading} focus>
            <Choice
              label={t(dragging ? "create.source.drop" : "create.source.file")}
              detail={t("create.source.fileTypes")}
              lit={dragging}
              onSelect={() => answer("file")}
              testId="create-source-file"
            />
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
