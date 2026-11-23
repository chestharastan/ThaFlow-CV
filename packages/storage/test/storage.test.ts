import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { sampleCV } from "../../cv-core/test/fixtures";
import { CVDatabase, CVStore, MAX_REVISIONS_PER_CV } from "../src";

let store: CVStore;
let n = 0;
beforeEach(() => {
  store = new CVStore(new CVDatabase(`test-${n++}`));
});

describe("CVStore", () => {
  it("saves, reopens and lists CVs", async () => {
    const saved = await store.saveCV(sampleCV());
    // A second store on the same database simulates an application restart.
    const reopened = await new CVStore(new CVDatabase(store.db.name)).getCV(saved.id);
    expect(reopened).toEqual(saved);
    expect((await store.listCVs()).map((c) => c.id)).toEqual([saved.id]);
  });

  it("refuses to store invalid documents", async () => {
    await expect(store.saveCV({ id: "x" } as never)).rejects.toThrow();
  });

  it("duplicates with a new id and deletes with related records", async () => {
    const cv = await store.saveCV(sampleCV());
    const copy = await store.duplicateCV(cv.id);
    expect(copy!.id).not.toBe(cv.id);
    expect(copy!.metadata.title).toBe("Sample (copy)");
    await store.addRevision(cv);
    await store.deleteCV(cv.id);
    expect(await store.getCV(cv.id)).toBeUndefined();
    expect(await store.listRevisions(cv.id)).toEqual([]);
    expect(await store.listCVs()).toHaveLength(1);
  });

  it("prunes old revisions", async () => {
    const cv = await store.saveCV(sampleCV());
    for (let i = 0; i < MAX_REVISIONS_PER_CV + 3; i++) await store.addRevision(cv, `r${i}`);
    expect(await store.listRevisions(cv.id)).toHaveLength(MAX_REVISIONS_PER_CV);
  });

  it("stores settings and clears everything on request", async () => {
    expect((await store.getSettings()).ai.mode).toBe("off");
    await store.saveSettings({ id: "app", uiLanguage: "km", ai: { mode: "cloud", cloudEndpoint: "https://x.test", cloudConsent: true } });
    expect((await store.getSettings()).uiLanguage).toBe("km");
    await store.saveCV(sampleCV());
    await store.clearAllData();
    expect(await store.listCVs()).toEqual([]);
    expect((await store.getSettings()).uiLanguage).toBe("en");
  });
});
