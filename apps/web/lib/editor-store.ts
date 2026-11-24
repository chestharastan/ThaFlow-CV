"use client";

import { create } from "zustand";
import type { CVDocument } from "@thaflow/cv-core";
import { getStore } from "./app-context";

const AUTOSAVE_DELAY_MS = 500;
const UNDO_COALESCE_MS = 900;
const MAX_UNDO = 100;
const REVISION_INTERVAL_MS = 5 * 60 * 1000;

export type SaveState = "idle" | "saving" | "saved" | "error";

interface EditorState {
  cv: CVDocument | null;
  status: "loading" | "ready" | "missing";
  saveState: SaveState;
  past: CVDocument[];
  future: CVDocument[];
  load(id: string): Promise<void>;
  /** Apply an immutable change. `coalesceKey` merges rapid edits to one field into one undo step. */
  update(mutate: (draft: CVDocument) => void, coalesceKey?: string): void;
  replace(cv: CVDocument): void;
  undo(): void;
  redo(): void;
  flush(): Promise<void>;
  /**
   * Let go of the document held in memory, without saving it: for when the CV (`id`), or everything,
   * has just been deleted. Otherwise a later save would quietly write the deleted CV back.
   */
  forget(id?: string): void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastEdit = { key: "", at: 0 };
let lastRevisionAt = 0;

export const useEditor = create<EditorState>((set, get) => {
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    set({ saveState: "saving" });
    saveTimer = setTimeout(() => void get().flush(), AUTOSAVE_DELAY_MS);
  };

  const commit = (next: CVDocument, coalesceKey?: string) => {
    const { cv, past } = get();
    if (!cv) return;
    const now = Date.now();
    const merge = Boolean(coalesceKey) && coalesceKey === lastEdit.key && now - lastEdit.at < UNDO_COALESCE_MS;
    lastEdit = { key: coalesceKey ?? "", at: now };
    set({ cv: next, past: merge ? past : [...past.slice(-MAX_UNDO + 1), cv], future: [] });
    scheduleSave();
  };

  return {
    cv: null,
    status: "loading",
    saveState: "idle",
    past: [],
    future: [],

    async load(id) {
      // Moving between screens of the same CV keeps the document (and undo history) in memory.
      if (get().cv?.id === id && get().status === "ready") return;
      if (saveTimer) await get().flush();
      set({ cv: null, status: "loading", past: [], future: [], saveState: "idle" });
      try {
        const cv = await getStore().getCV(id);
        lastRevisionAt = Date.now();
        set(cv ? { cv, status: "ready" } : { status: "missing" });
      } catch {
        set({ status: "missing" });
      }
    },

    update(mutate, coalesceKey) {
      const { cv } = get();
      if (!cv) return;
      const draft = structuredClone(cv);
      mutate(draft);
      commit(draft, coalesceKey);
    },

    replace(cv) {
      commit(cv);
    },

    undo() {
      const { cv, past, future } = get();
      const previous = past[past.length - 1];
      if (!cv || !previous) return;
      lastEdit = { key: "", at: 0 };
      set({ cv: previous, past: past.slice(0, -1), future: [cv, ...future] });
      scheduleSave();
    },

    redo() {
      const { cv, past, future } = get();
      const next = future[0];
      if (!cv || !next) return;
      lastEdit = { key: "", at: 0 };
      set({ cv: next, past: [...past, cv], future: future.slice(1) });
      scheduleSave();
    },

    async flush() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      const { cv } = get();
      if (!cv) return;
      try {
        const store = getStore();
        await store.saveCV(cv);
        if (Date.now() - lastRevisionAt > REVISION_INTERVAL_MS) {
          lastRevisionAt = Date.now();
          await store.addRevision(cv);
        }
        // Only report "saved" if nothing changed while the write was in flight.
        if (get().cv === cv) set({ saveState: "saved" });
      } catch {
        set({ saveState: "error" });
      }
    },

    forget(id) {
      const { cv } = get();
      if (!cv || (id !== undefined && cv.id !== id)) return;
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      lastEdit = { key: "", at: 0 };
      set({ cv: null, status: "loading", past: [], future: [], saveState: "idle" });
    },
  };
});

if (typeof window !== "undefined") {
  // Best-effort flush when the tab is hidden or closed, so the last keystrokes survive. Only when there is
  // something unsaved: the document stays in memory after leaving the editor, and writing it out again
  // regardless would bring back a CV the person has since deleted.
  const flushNow = () => {
    if (saveTimer) void useEditor.getState().flush();
  };
  window.addEventListener("pagehide", flushNow);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushNow();
  });
}
