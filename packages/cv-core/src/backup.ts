import { createId } from "./factory";
import { CVValidationError, migrateCV } from "./migrations";
import type { CVDocument } from "./schema";

export const BACKUP_FORMAT = "thaflow-cv";
export const BACKUP_FORMAT_VERSION = 1;

export interface CVBackupFile {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  exportedAt: string;
  cvs: CVDocument[];
}

/** Portable JSON backup. Users have no account, so this is how data moves between devices. */
export function createBackup(cvs: CVDocument[]): CVBackupFile {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    cvs,
  };
}

export function serializeBackup(cvs: CVDocument[]): string {
  return JSON.stringify(createBackup(cvs), null, 2);
}

/**
 * Parse a backup file (or a bare CV JSON). Imported CVs get fresh ids so an
 * import never silently overwrites an existing local CV.
 */
export function parseBackup(json: string): CVDocument[] {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new CVValidationError("The file is not valid JSON.");
  }
  if (!data || typeof data !== "object") throw new CVValidationError("Not a ThaFlow CV backup.");
  const obj = data as Record<string, unknown>;
  let rawList: unknown[];
  if (obj.format === BACKUP_FORMAT && Array.isArray(obj.cvs)) {
    if (typeof obj.formatVersion === "number" && obj.formatVersion > BACKUP_FORMAT_VERSION) {
      throw new CVValidationError("This backup was created with a newer version of ThaFlow CV.");
    }
    rawList = obj.cvs;
  } else if ("metadata" in obj && "personal" in obj) {
    rawList = [obj];
  } else {
    throw new CVValidationError("Not a ThaFlow CV backup.");
  }
  if (rawList.length === 0) throw new CVValidationError("The backup contains no CVs.");
  return rawList.map((raw) => ({ ...migrateCV(raw), id: createId() }));
}
