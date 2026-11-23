"use client";

import { useEffect, useRef, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { AppHeader, LanguageToggle } from "@/components/app-header";
import { Button, cx } from "@/components/ui";
import { useApp } from "@/lib/app-context";

/**
 * The frame every question sits in: a thin progress line at the very top, the
 * header, a quiet Back, then the question itself. A screen is the question,
 * the box and the button; nothing here explains anything.
 */
export function Frame({
  progress,
  onBack,
  screenKey,
  children,
}: {
  /** 0 to 1; omit to hide the line (for example on the not-found screen). */
  progress?: number;
  onBack?: () => void;
  /** Changes whenever a different question or screen is shown, to replay the entrance. */
  screenKey: string;
  children?: ReactNode;
}) {
  const { t } = useApp();
  return (
    <div className="flex min-h-dvh flex-col">
      {progress !== undefined && (
        <div
          className="fixed inset-x-0 top-0 z-10 h-0.5 bg-line"
          role="progressbar"
          aria-label={t("create.progress")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          data-testid="create-progress"
        >
          <div className="h-full bg-ink" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      <AppHeader>
        <LanguageToggle />
      </AppHeader>
      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-20 pt-4 sm:pt-[7vh]">
        {/* The row is always there so the question does not jump when Back appears. */}
        <div className="-ml-2 flex h-11 items-center">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-muted transition-colors hover:text-ink"
              data-testid="create-back"
            >
              <span aria-hidden>←</span>
              {t("create.back")}
            </button>
          )}
        </div>
        {/*
          Boxes show focus with their own border (see ui.tsx). The global :focus-visible outline is
          not in a cascade layer, so it beats the primitives' outline-none and would draw a second
          ring around every box; switch it off here for boxes only. Buttons and ticks keep it.
        */}
        <div key={screenKey} className="animate-enter pt-3 [&_:is(input:not([type=checkbox]),textarea,select)]:outline-none!">
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * The question. When it has a single box, pass that box's id as `htmlFor`: the
 * heading becomes its label (and the box points back with aria-labelledby).
 */
export function Heading({ id, htmlFor, children }: { id?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <h1
      id={id}
      className="mb-8 text-balance text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl [html:lang(km)_&]:leading-normal"
      data-testid="create-question"
    >
      {htmlFor ? <label htmlFor={htmlFor}>{children}</label> : children}
    </h1>
  );
}

const BOXES = "input:not([type=checkbox]):not([type=file]):not([type=hidden]):not(:disabled), textarea:not(:disabled)";

/**
 * Enter moves on: to the next box when the screen has several, and from the
 * last one (or the only one) to the next question, via the primary button,
 * which is the form's submit button. Multi-line boxes keep Enter for new lines
 * and submit with Ctrl/Cmd+Enter (see submitOnModEnter).
 */
export function QuestionForm({ onSubmit, children }: { onSubmit(): void; children: ReactNode }) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  const enter = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter" || event.defaultPrevented || event.nativeEvent.isComposing) return;
    if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    const from = event.target;
    if (!(from instanceof HTMLInputElement) || !from.matches(BOXES)) return;
    const boxes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(BOXES));
    const next = boxes[boxes.indexOf(from) + 1];
    if (!next) return; // the last box: let the form submit
    event.preventDefault();
    next.focus();
  };
  return (
    <form noValidate onSubmit={submit} onKeyDown={enter}>
      {children}
    </form>
  );
}

/** The one filled element on the screen. */
export function Primary({
  children,
  disabled,
  autoFocus,
  testId = "create-next",
}: {
  children: ReactNode;
  disabled?: boolean;
  /** For screens with no box to type in, so Enter still moves on. */
  autoFocus?: boolean;
  testId?: string;
}) {
  return (
    <div className="mt-8">
      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={disabled}
        autoFocus={autoFocus}
        className="w-full sm:w-auto sm:min-w-36"
        data-testid={testId}
      >
        {children}
      </Button>
    </div>
  );
}

/** One line, shown only when something stops the person from going on. */
export function ErrorLine({
  children,
  id,
  className = "mt-2",
  testId = "create-error",
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  testId?: string;
}) {
  return (
    <p id={id} role="alert" className={cx("text-sm text-danger", className)} data-testid={testId}>
      {children}
    </p>
  );
}

/** A big outlined answer. Tapping it answers the question and moves on. */
export function Choice({
  label,
  detail,
  selected,
  autoFocus,
  disabled,
  lang,
  onSelect,
  testId,
  className,
}: {
  label: string;
  detail?: string;
  /** Marks the current answer when the question already has one. */
  selected?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  lang?: string;
  onSelect(): void;
  testId: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      lang={lang}
      aria-pressed={selected}
      autoFocus={autoFocus}
      disabled={disabled}
      onClick={onSelect}
      data-testid={testId}
      className={cx(
        "flex min-h-16 w-full flex-col items-center justify-center rounded-xl border bg-paper px-5 py-3 text-center text-lg font-medium text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:text-faint disabled:hover:border-line-strong",
        selected ? "border-ink ring-1 ring-ink" : "border-line-strong",
        className,
      )}
    >
      <span>{label}</span>
      {detail && <span className="text-sm font-normal text-muted">{detail}</span>}
    </button>
  );
}

/**
 * The answers to a choice question, side by side (stacked on a phone).
 *
 * When the question has no answer yet, pass `focus`: the group itself takes
 * focus, so no answer looks chosen, a screen reader hears the question, and
 * Tab lands on the first answer. When there is an answer, give that Choice
 * `autoFocus` instead.
 */
export function Choices({ labelledBy, focus, children }: { labelledBy: string; focus?: boolean; children: ReactNode }) {
  const group = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) group.current?.focus({ preventScroll: true });
  }, [focus]);
  return (
    <div ref={group} role="group" aria-labelledby={labelledBy} tabIndex={-1} className="grid grid-cols-1 gap-3 outline-none! sm:grid-cols-2">
      {children}
    </div>
  );
}
