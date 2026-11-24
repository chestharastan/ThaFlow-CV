"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createEmptyCV, createId, type CVDocument } from "@thaflow/cv-core";
import {
  FIRST_CV_QUESTION,
  FIRST_QUESTION,
  isEntrySection,
  isOpeningQuestion,
  isQuestionId,
  nextQuestion,
  previousQuestion,
  progress,
  resumeQuestion,
  sectionScreen,
  tidyAnswer,
  type CVQuestionId,
  type QuestionId,
} from "@thaflow/questionnaire";
import { getStore, useApp } from "@/lib/app-context";
import { useEditor } from "@/lib/editor-store";
import { SectionQuestion } from "./entries";
import { Frame, Heading } from "./frame";
import { createUrl, templatesUrl, useFlowNav } from "./nav";
import { SourceQuestion, StartQuestion, type BuildFromImport, type ImportState, type OpeningFailure } from "./opening";
import { AboutQuestion, ContactQuestion, DetailsQuestion, LanguageQuestion, LanguagesQuestion, NameQuestion, SkillsQuestion, TitleQuestion, type QuestionProps } from "./questions";

const IDLE: ImportState = { phase: "idle" };

/**
 * Creating a CV as a short conversation. The URL says where the person is
 * (/create/?id=<cvId>&q=<question>), the questionnaire package says what is
 * asked and what comes next, and the CV document holds every answer. This
 * component only connects the three.
 */
export function CreateFlow() {
  const params = useSearchParams();
  const router = useRouter();
  const { ready, settings } = useApp();

  const id = params.get("id");
  const asked = params.get("q");
  const question = isQuestionId(asked) ? asked : null;
  const openEntry = question && isEntrySection(question) ? params.get("e") : null;
  const nav = useFlowNav(id && question ? createUrl(id, question, openEntry ?? undefined) : null);

  const stored = useEditor((s) => s.cv);
  const status = useEditor((s) => s.status);
  const load = useEditor((s) => s.load);
  // The id whose lookup has finished, so "not found" is only said once it is known.
  const [looked, setLooked] = useState<string | null>(null);
  const cv = id && stored?.id === id && status === "ready" ? stored : null;

  const [importState, setImportState] = useState<ImportState>(IDLE);
  const [startFailure, setStartFailure] = useState<OpeningFailure | undefined>();
  const creating = useRef(false);

  useEffect(() => {
    if (!id) return;
    let current = true;
    void load(id).then(() => current && setLooked(id));
    return () => {
      current = false;
    };
  }, [id, load]);

  // /create/ itself: give the CV-to-be its id straight away, so every question, the opening included, is a URL.
  const opening = !asked || (question !== null && isOpeningQuestion(question));
  useEffect(() => {
    if (!id && opening) router.replace(createUrl(createId(), question ?? FIRST_QUESTION));
  }, [id, opening, question, router]);

  // A link to the CV without a question resumes where it was left.
  useEffect(() => {
    if (id && cv && !question) nav.replace(createUrl(id, resumeQuestion(cv)));
  }, [id, cv, question, nav]);

  // The first school or project is asked for directly: give that entry its own URL.
  const needsEntry = Boolean(cv && question && isEntrySection(question) && !openEntry && sectionScreen(cv, question) === "entry");
  useEffect(() => {
    if (id && question && needsEntry) nav.replace(createUrl(id, question, createId()));
  }, [id, question, needsEntry, nav]);

  // Reading a file belongs to its screen: leaving the screen forgets it.
  useEffect(() => {
    if (question !== "source") setImportState(IDLE);
    if (question !== "start") setStartFailure(undefined);
  }, [question, id]);

  /** Leave a question for the one after it; after the last, choose a template. */
  const advance = useCallback(
    (from: CVQuestionId) => {
      const editor = useEditor.getState();
      if (!id || !editor.cv) return;
      const tidied = structuredClone(editor.cv);
      tidyAnswer(tidied, from);
      if (JSON.stringify(tidied) !== JSON.stringify(editor.cv)) editor.replace(tidied);
      const next = nextQuestion(tidied, from);
      if (next) {
        void editor.flush();
        nav.push(createUrl(id, next));
      } else {
        void editor.flush().then(() => router.push(templatesUrl(id)));
      }
    },
    [id, nav, router],
  );

  /**
   * The opening has been answered: create the CV (blank, or from the file) and
   * start asking about it. Coming back to the opening of a CV that already
   * exists continues with that CV instead of creating another.
   */
  const begin = useCallback(
    async (build?: BuildFromImport) => {
      if (!id || creating.current) return;
      creating.current = true;
      try {
        const editor = useEditor.getState();
        if (editor.status === "ready" && editor.cv?.id === id) {
          if (build) editor.replace(build(editor.cv));
        } else {
          const existing = await getStore().getCV(id);
          const base: CVDocument = existing ?? { ...createEmptyCV({ language: settings.uiLanguage }), id };
          if (!existing || build) await getStore().saveCV(build ? build(base) : base);
          await editor.load(id);
          if (useEditor.getState().cv?.id !== id) throw new Error("The CV could not be saved.");
        }
        nav.push(createUrl(id, FIRST_CV_QUESTION));
      } catch {
        if (question === "source") setImportState({ phase: "idle", failure: "storage" });
        else setStartFailure("storage");
      } finally {
        creating.current = false;
      }
    },
    [id, nav, question, settings.uiLanguage],
  );

  // Wait for the saved interface language before showing words, so Khmer readers never see a flash of English.
  if (!ready) return <Frame screenKey="loading" />;

  if (!id) return opening ? <Frame screenKey="loading" progress={progress(null, FIRST_QUESTION)} /> : <NotFound />;

  if (question && isOpeningQuestion(question)) {
    const back =
      question === "start"
        ? undefined
        : importState.phase !== "idle"
          ? () => setImportState(IDLE)
          : () => nav.back(createUrl(id, "start"));
    return (
      <Frame progress={progress(cv, question)} onBack={back} screenKey={`${question}:${importState.phase === "found" ? "found" : "ask"}`}>
        {question === "start" ? (
          <StartQuestion failure={startFailure} onAsk={(next) => nav.push(createUrl(id, next))} onCreate={() => void begin()} />
        ) : (
          <SourceQuestion state={importState} onState={setImportState} onCreate={(build) => void begin(build)} />
        )}
      </Frame>
    );
  }

  if (!cv) return looked === id ? <NotFound /> : <Frame screenKey="loading" progress={question ? progress(null, question) : undefined} />;
  if (!question) return <Frame screenKey="loading" />;

  const here = question as CVQuestionId;
  const props: QuestionProps = { cv, onNext: () => advance(here) };
  const back = () => {
    // From an open entry, Back returns to the list (or to "have you worked?"); otherwise to the question before.
    if (isEntrySection(here) && openEntry && sectionScreen(cv, here) !== "entry") return nav.close(createUrl(id, here));
    const previous = previousQuestion(cv, here) ?? FIRST_QUESTION;
    // The opening may have been left from either of its questions; both are "behind" the first CV question.
    nav.back(createUrl(id, previous), ...(here === FIRST_CV_QUESTION ? [createUrl(id, "source")] : []));
  };

  let screen: ReactNode;
  switch (here) {
    case "language":
      screen = <LanguageQuestion {...props} />;
      break;
    case "name":
      screen = <NameQuestion {...props} />;
      break;
    case "title":
      screen = <TitleQuestion {...props} />;
      break;
    case "contact":
      screen = <ContactQuestion {...props} />;
      break;
    case "details":
      screen = <DetailsQuestion {...props} />;
      break;
    case "work":
    case "education":
    case "projects":
      screen = <SectionQuestion {...props} id={id} section={here} openEntry={openEntry} nav={nav} />;
      break;
    case "skills":
      screen = <SkillsQuestion {...props} />;
      break;
    case "languages":
      screen = <LanguagesQuestion {...props} />;
      break;
    case "about":
      screen = <AboutQuestion {...props} />;
      break;
  }

  const sub = isEntrySection(here) ? `:${openEntry ?? sectionScreen(cv, here)}` : "";
  return (
    <Frame progress={progress(cv, here)} onBack={back} screenKey={`${here}${sub}`}>
      {screen}
    </Frame>
  );
}

function NotFound() {
  const { t } = useApp();
  return (
    <Frame screenKey="not-found">
      <div data-testid="create-not-found">
        <Heading>{t("create.notFound")}</Heading>
        <Link href="/dashboard/" className="text-lg text-ink underline underline-offset-4 hover:text-ink-soft" data-testid="create-home-link">
          {t("create.home")}
        </Link>
      </div>
    </Frame>
  );
}
