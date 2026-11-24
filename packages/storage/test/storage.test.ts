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

  it("brings a CV and its saved versions up to date when they were stored by an earlier version", async () => {
    // As the app stored it before personal details existed: schema v1, no such section in the order.
    const old = sampleCV();
    const v1 = { ...old, metadata: { ...old.metadata, version: 1 }, appearance: { ...old.appearance, sectionOrder: old.appearance.sectionOrder.filter((key) => key !== "personalDetails") } };
    await store.db.cvs.put(v1 as never);
    await store.db.revisions.put({ id: "r1", cvId: old.id, createdAt: "2026-01-01T00:00:00.000Z", snapshot: v1 as never });

    const cv = await store.getCV(old.id);
    expect(cv!.metadata.version).toBe(2);
    expect(cv!.appearance.sectionOrder[0]).toBe("personalDetails");
    expect(cv!.appearance.sectionOrder.slice(1)).toEqual(v1.appearance.sectionOrder);
    expect((await store.listCVs())[0]!.appearance.sectionOrder[0]).toBe("personalDetails");
    const [revision] = await store.listRevisions(old.id);
    expect(revision!.snapshot.metadata.version).toBe(2);
    expect(revision!.snapshot.appearance.sectionOrder[0]).toBe("personalDetails");
    expect(revision!.snapshot.personal.fullName).toBe("Sok Dara");
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
