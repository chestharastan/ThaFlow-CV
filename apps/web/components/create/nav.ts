"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import type { QuestionId } from "@thaflow/questionnaire";

/** Every question is a URL: /create/?id=<cvId>&q=<question>, plus &e=<entryId> while one job, school or project is open. */
export function createUrl(id: string, question: QuestionId, entry?: string): string {
  const params = new URLSearchParams({ id, q: question });
  if (entry) params.set("e", entry);
  return `/create/?${params.toString()}`;
}

export const templatesUrl = (id: string) => `/templates/?id=${encodeURIComponent(id)}`;

export interface FlowNav {
  /** Move forward to a new screen. */
  push(url: string): void;
  /** Swap the current screen for another without leaving a history entry behind. */
  replace(url: string): void;
  /**
   * Go to a screen that is logically behind this one. When it is also the
   * previous history entry (or one of `alsoBehind` is), this is the browser's
   * own Back, so the in-page Back control and the browser button agree and
   * history does not grow. Otherwise (after a reload or a deep link) it navigates there.
   */
  back(url: string, ...alsoBehind: string[]): void;
  /** Leave a sub-screen (one open entry) for its parent (the list). */
  close(url: string): void;
}

/**
 * Navigation for the create flow. Keeps a trail of the flow's URLs visited
 * since the page was opened, so stepping back can reuse history instead of
 * adding to it.
 */
export function useFlowNav(currentUrl: string | null): FlowNav {
  const router = useRouter();
  const trail = useRef<string[]>([]);

  useEffect(() => {
    if (!currentUrl) return;
    const seen = trail.current;
    if (seen[seen.length - 1] === currentUrl) return;
    const at = seen.lastIndexOf(currentUrl);
    // Seen before: the person went back to it. Otherwise it is a step forward.
    if (at >= 0) seen.length = at + 1;
    else seen.push(currentUrl);
  }, [currentUrl]);

  return useMemo(() => {
    const behind = () => (trail.current.length >= 2 ? trail.current[trail.current.length - 2] : undefined);
    const replace = (url: string) => {
      if (trail.current.length > 0) trail.current[trail.current.length - 1] = url;
      router.replace(url);
    };
    return {
      push: (url) => router.push(url),
      replace,
      back(url, ...alsoBehind) {
        const previous = behind();
        if (previous !== undefined && (previous === url || alsoBehind.includes(previous))) window.history.back();
        else router.push(url);
      },
      close(url) {
        if (behind() === url) window.history.back();
        else replace(url);
      },
    };
  }, [router]);
}
