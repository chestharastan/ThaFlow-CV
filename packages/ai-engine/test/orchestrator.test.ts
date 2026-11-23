import { describe, expect, it, vi } from "vitest";
import type { AIPreferences } from "@thaflow/cv-core";
import { AIOrchestrator, AIOutputError, AIUnavailableError, CloudProvider, LocalProvider, type AIProvider } from "../src";

const fake = (kind: "local" | "cloud", output: unknown, available = true): AIProvider & { runTask: ReturnType<typeof vi.fn> } => ({
  name: kind,
  kind,
  isAvailable: async () => available,
  runTask: vi.fn(async () => output),
});

const prefs = (p: Partial<AIPreferences>): AIPreferences => ({ mode: "off", cloudEndpoint: "", cloudConsent: false, ...p });
const rewrite = { task: "rewrite_text" as const, language: "en" as const, content: { text: "i build websites", kind: "experience" as const } };

describe("provider selection", () => {
  it("makes no provider calls when AI is off", async () => {
    const cloud = fake("cloud", { text: "x" });
    const local = fake("local", { text: "x" });
    const ai = new AIOrchestrator({ local, cloud, preferences: prefs({ mode: "off", cloudConsent: true }) });
    await expect(ai.run(rewrite)).rejects.toThrow(AIUnavailableError);
    expect(await ai.getState()).toBe("unavailable");
    expect(cloud.runTask).not.toHaveBeenCalled();
    expect(local.runTask).not.toHaveBeenCalled();
  });

  it("never falls back to cloud when local is unavailable", async () => {
    const cloud = fake("cloud", { text: "x" });
    const ai = new AIOrchestrator({ local: fake("local", {}, false), cloud, preferences: prefs({ mode: "local", cloudConsent: true }) });
    await expect(ai.run(rewrite)).rejects.toMatchObject({ reason: "local-unavailable" });
    expect(cloud.runTask).not.toHaveBeenCalled();
  });

  it("requires consent before using cloud", async () => {
    const cloud = fake("cloud", { text: "x" });
    const ai = new AIOrchestrator({ cloud, preferences: prefs({ mode: "cloud", cloudConsent: false }) });
    await expect(ai.run(rewrite)).rejects.toMatchObject({ reason: "cloud-consent-required" });
    expect(cloud.runTask).not.toHaveBeenCalled();
  });

  it("uses cloud once enabled and consented", async () => {
    const cloud = fake("cloud", { text: "Developed websites." });
    const ai = new AIOrchestrator({ cloud, preferences: prefs({ mode: "cloud", cloudConsent: true }) });
    expect(await ai.getState()).toBe("cloud-ready");
    const { result, provider } = await ai.run(rewrite);
    expect(result.text).toBe("Developed websites.");
    expect(provider).toBe("cloud");
  });
});

describe("output validation", () => {
  it("rejects output that does not match the schema", async () => {
    const ai = new AIOrchestrator({ cloud: fake("cloud", { answer: 42 }), preferences: prefs({ mode: "cloud", cloudConsent: true }) });
    await expect(ai.run(rewrite)).rejects.toThrow(AIOutputError);
  });

  it("creates pending suggestions that keep the original and carry integrity warnings", async () => {
    const cloud = fake("cloud", { text: "Led a team of 12 engineers building websites." });
    const ai = new AIOrchestrator({ cloud, preferences: prefs({ mode: "cloud", cloudConsent: true }) });
    const s = await ai.suggestRewrite({
      cvId: "cv1",
      targetSection: "experiences",
      targetField: "experiences.e1.description",
      text: "i build websites",
      kind: "experience",
      language: "en",
    });
    expect(s.status).toBe("pending");
    expect(s.originalText).toBe("i build websites");
    expect(s.provider).toBe("cloud");
    expect(s.warnings.length).toBeGreaterThanOrEqual(2);
  });
});

describe("CloudProvider", () => {
  it("sends only the task payload, without credentials", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true, result: { text: "ok" } })));
    const provider = new CloudProvider({ endpoint: "https://ai.example.test/", fetch: fetchMock as never });
    expect(await provider.runTask(rewrite)).toEqual({ text: "ok" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://ai.example.test/v1/tasks");
    expect(JSON.parse(init.body as string)).toEqual(rewrite);
    expect(init.credentials).toBe("omit");
    expect(init.referrerPolicy).toBe("no-referrer");
  });

  it("is unavailable without a valid endpoint", async () => {
    expect(await new CloudProvider({ endpoint: "" }).isAvailable()).toBe(false);
    expect(await new CloudProvider({ endpoint: "javascript:alert(1)" }).isAvailable()).toBe(false);
  });
});

describe("LocalProvider", () => {
  it("is unavailable with no runtime and never loads implicitly", async () => {
    expect(await new LocalProvider(null).isAvailable()).toBe(false);
    const load = vi.fn();
    const runtime = { modelName: "m", downloadSizeMB: 900, isSupported: async () => true, isLoaded: () => false, load, generate: async () => "" };
    expect(await new LocalProvider(runtime).isAvailable()).toBe(false);
    expect(load).not.toHaveBeenCalled();
  });

  it("parses JSON replies from a loaded runtime", async () => {
    const runtime = {
      modelName: "m",
      downloadSizeMB: 900,
      isSupported: async () => true,
      isLoaded: () => true,
      load: async () => {},
      generate: async () => 'Sure!\n```json\n{"text": "Developed websites."}\n```',
    };
    expect(await new LocalProvider(runtime).runTask(rewrite)).toEqual({ text: "Developed websites." });
  });
});
