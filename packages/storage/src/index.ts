import Dexie, { type Table } from "dexie";
import {
  DEFAULT_SETTINGS,
  appSettingsSchema,
  createId,
  migrateCV,
  type AppSettings,
  type CVDocument,
  type CVRevision,
  type ContentSuggestion,
} from "@thaflow/cv-core";

/** Maximum revisions kept per CV; older ones are pruned. */
export const MAX_REVISIONS_PER_CV = 30;

export class CVDatabase extends Dexie {
  cvs!: Table<CVDocument, string>;
  revisions!: Table<CVRevision, string>;
  suggestions!: Table<ContentSuggestion, string>;
  settings!: Table<AppSettings, string>;

  constructor(name = "ThaFlowCV") {
    super(name);
    // Bump the version and add an .upgrade() step whenever indexes change.
    // CV *content* migrations live in @thaflow/cv-core (migrateCV) and run on read.
    this.version(1).stores({
      cvs: "id, metadata.updatedAt",
      revisions: "id, cvId, createdAt",
      suggestions: "id, cvId, status",
      settings: "id",
    });
  }
}

/**
 * All persistence goes through this class. Everything stays in the browser's
 * IndexedDB: there is no server-side copy of any CV.
 */
export class CVStore {
  constructor(public readonly db: CVDatabase = new CVDatabase()) {}

  async listCVs(): Promise<CVDocument[]> {
    const rows = await this.db.cvs.orderBy("metadata.updatedAt").reverse().toArray();
    const out: CVDocument[] = [];
    for (const row of rows) {
      try {
        out.push(migrateCV(row));
      } catch {
        // Skip unreadable rows instead of breaking the whole list.
      }
    }
    return out;
  }

  async getCV(id: string): Promise<CVDocument | undefined> {
    const row = await this.db.cvs.get(id);
    return row ? migrateCV(row) : undefined;
  }

  /** Validates, stamps updatedAt and writes. Returns the stored document. */
  async saveCV(cv: CVDocument): Promise<CVDocument> {
    const valid = migrateCV({
      ...cv,
      metadata: { ...cv.metadata, updatedAt: new Date().toISOString() },
    });
    await this.db.cvs.put(valid);
    return valid;
  }

  async deleteCV(id: string): Promise<void> {
    await this.db.transaction("rw", this.db.cvs, this.db.revisions, this.db.suggestions, async () => {
      await this.db.cvs.delete(id);
      await this.db.revisions.where("cvId").equals(id).delete();
      await this.db.suggestions.where("cvId").equals(id).delete();
    });
  }

  async duplicateCV(id: string, titleSuffix = " (copy)"): Promise<CVDocument | undefined> {
    const source = await this.getCV(id);
    if (!source) return undefined;
    const now = new Date().toISOString();
    const copy: CVDocument = {
      ...structuredClone(source),
      id: createId(),
      metadata: { ...source.metadata, title: source.metadata.title + titleSuffix, createdAt: now, updatedAt: now },
    };
    return this.saveCV(copy);
  }

  /* ---------- Revisions ---------- */

  async addRevision(cv: CVDocument, label?: string): Promise<CVRevision> {
    const revision: CVRevision = {
      id: createId(),
      cvId: cv.id,
      createdAt: new Date().toISOString(),
      label,
      snapshot: structuredClone(cv),
    };
    await this.db.revisions.put(revision);
    const all = await this.db.revisions.where("cvId").equals(cv.id).sortBy("createdAt");
    const excess = all.length - MAX_REVISIONS_PER_CV;
    if (excess > 0) await this.db.revisions.bulkDelete(all.slice(0, excess).map((r) => r.id));
    return revision;
  }

  async listRevisions(cvId: string): Promise<CVRevision[]> {
    const all = await this.db.revisions.where("cvId").equals(cvId).sortBy("createdAt");
    // A snapshot kept by an earlier version is brought up to date on read, like the CVs themselves.
    const out: CVRevision[] = [];
    for (const revision of all.reverse()) {
      try {
        out.push({ ...revision, snapshot: migrateCV(revision.snapshot) });
      } catch {
        // An unreadable snapshot is left out rather than breaking the list.
      }
    }
    return out;
  }

  /* ---------- Suggestions ---------- */

  async putSuggestion(suggestion: ContentSuggestion): Promise<void> {
    await this.db.suggestions.put(suggestion);
  }

  async listSuggestions(cvId: string): Promise<ContentSuggestion[]> {
    const all = await this.db.suggestions.where("cvId").equals(cvId).sortBy("createdAt");
    return all.reverse();
  }

  /* ---------- Settings ---------- */

  async getSettings(): Promise<AppSettings> {
    const row = await this.db.settings.get("app");
    const parsed = appSettingsSchema.safeParse(row);
    return parsed.success ? parsed.data : { ...DEFAULT_SETTINGS };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.db.settings.put(appSettingsSchema.parse(settings));
  }

  /* ---------- Data control ---------- */

  /** Intentionally removes every locally saved CV, revision, suggestion and setting. */
  async clearAllData(): Promise<void> {
    await this.db.transaction(
      "rw",
      [this.db.cvs, this.db.revisions, this.db.suggestions, this.db.settings],
      async () => {
        await Promise.all([
          this.db.cvs.clear(),
          this.db.revisions.clear(),
          this.db.suggestions.clear(),
          this.db.settings.clear(),
        ]);
      },
    );
  }
}

/**
 * Ask the browser not to evict our IndexedDB data under storage pressure.
 * Returns whether storage is persistent (false when unsupported or denied).
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch {
    return false;
  }
}
