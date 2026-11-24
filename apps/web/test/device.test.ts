import { describe, expect, it } from "vitest";
import { assessDevice, formatBytes, readingEstimate, type DeviceInfo } from "../lib/device";

const READER = 23_821_324;

const laptop: DeviceInfo = {
  threads: 8,
  memoryGB: 8,
  phone: false,
  webAssembly: true,
  storage: true,
  serviceWorker: true,
  offlineReady: true,
  quotaBytes: 12_000_000_000,
  usageBytes: 11_000_000,
  persisted: true,
  readerCached: false,
};

const verdicts = (info: DeviceInfo, cloudReady = false) => Object.fromEntries(assessDevice(info, { cloudReady }, READER).map((c) => [c.id, c.verdict]));
const find = (info: DeviceInfo, id: string, cloudReady = false) => assessDevice(info, { cloudReady }, READER).find((c) => c.id === id)!;

describe("what a device can do", () => {
  it("lists every capability, in order, and a typical laptop can do all of it", () => {
    expect(assessDevice(laptop, { cloudReady: false }, READER).map((c) => c.id)).toEqual(["write", "khmer", "pdf", "word", "readFile", "readPicture", "offline", "space", "ai"]);
    expect(verdicts(laptop)).toEqual({ write: "yes", khmer: "yes", pdf: "yes", word: "yes", readFile: "yes", readPicture: "yes", offline: "yes", space: "yes", ai: "off" });
  });

  it("says the reader is a one-time download until it is on the device, with a time a page", () => {
    expect(find(laptop, "readPicture")).toMatchObject({ note: "device.readPicture.download", values: { low: 15, high: 20, size: 24 } });
    expect(find({ ...laptop, readerCached: true }, "readPicture")).toMatchObject({ note: "device.readPicture.ready", values: { low: 15, high: 20 } });
  });

  it("is honest about phones, small machines and browsers that cannot run the reader", () => {
    expect(readingEstimate({ ...laptop, phone: true })).toEqual({ low: 30, high: 60 });
    expect(readingEstimate({ ...laptop, threads: 2 })).toEqual({ low: 25, high: 45 });
    expect(readingEstimate({ ...laptop, memoryGB: 2 })).toEqual({ low: 25, high: 45 });
    expect(readingEstimate({ ...laptop, threads: null, memoryGB: null })).toEqual({ low: 15, high: 20 });
    expect(find({ ...laptop, memoryGB: 1 }, "readPicture")).toMatchObject({ verdict: "maybe", note: "device.readPicture.lowMemory" });
    expect(find({ ...laptop, webAssembly: false }, "readPicture")).toMatchObject({ verdict: "no", note: "device.readPicture.no" });
    expect(readingEstimate({ ...laptop, webAssembly: false })).toBeNull();
    expect(find({ ...laptop, phone: true }, "pdf").note).toBe("device.pdf.phone");
  });

  it("explains blocked storage, offline use and space", () => {
    const blocked = { ...laptop, storage: false };
    expect(verdicts(blocked)).toMatchObject({ write: "no", space: "no" });
    expect(find({ ...laptop, serviceWorker: false }, "offline")).toMatchObject({ verdict: "no", note: "device.offline.no" });
    expect(find({ ...laptop, offlineReady: false }, "offline")).toMatchObject({ verdict: "yes", note: "device.offline.soon" });
    expect(find(laptop, "space")).toMatchObject({ verdict: "yes", values: { free: "12 GB", used: "11 MB" } });
    expect(find(laptop, "space").extra).toBeUndefined();
    expect(find({ ...laptop, persisted: false }, "space").extra).toBe("device.space.mayClear");
    expect(find({ ...laptop, quotaBytes: 40_000_000, usageBytes: 1_000_000 }, "space").verdict).toBe("maybe");
    expect(find({ ...laptop, quotaBytes: null }, "space")).toMatchObject({ verdict: "yes", note: "device.space.unknown" });
  });

  it("shows writing help as on only when cloud AI is set up and agreed to", () => {
    expect(find(laptop, "ai")).toMatchObject({ verdict: "off", note: "device.ai.off" });
    expect(find(laptop, "ai", true)).toMatchObject({ verdict: "yes", note: "device.ai.cloud" });
  });

  it("formats sizes the way people read them", () => {
    expect(formatBytes(500)).toBe("1 KB");
    expect(formatBytes(51_200)).toBe("51 KB");
    expect(formatBytes(4_759_758)).toBe("4.8 MB");
    expect(formatBytes(23_821_324)).toBe("24 MB");
    expect(formatBytes(1_340_000_000)).toBe("1.3 GB");
    expect(formatBytes(120_000_000_000)).toBe("120 GB");
  });
});
