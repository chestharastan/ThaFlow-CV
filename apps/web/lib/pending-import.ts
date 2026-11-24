/**
 * A file chosen on the dashboard, handed to the import screen of the create flow.
 *
 * The dashboard takes a file (picked, dropped, pasted or photographed) and opens the flow's "start from
 * your CV" screen, which reads it with all its progress, error and review states. The file never leaves
 * memory: it is held here for the moment it takes to change screens. Handing it over expires after a few
 * seconds, so a file is never read by a screen that was opened long afterwards.
 */
const WINDOW_MS = 15_000;

let pending: { file: File; at: number } | null = null;

export function handOverImport(file: File): void {
  pending = { file, at: Date.now() };
}

/** The file handed over just now, if any. It stays until `clearPendingImport`, so a screen mounted twice still finds it. */
export function peekPendingImport(): File | null {
  if (pending && Date.now() - pending.at > WINDOW_MS) pending = null;
  return pending?.file ?? null;
}

export function clearPendingImport(file?: File): void {
  if (!file || pending?.file === file) pending = null;
}
