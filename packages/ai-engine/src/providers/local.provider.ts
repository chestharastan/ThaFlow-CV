import { buildPrompt, parseJsonReply } from "../prompts";
import type { AIProvider, AITaskRequest } from "../types";

/**
 * Minimal contract for an on-device text model (WebLLM, Transformers.js, a
 * native bridge in a Tauri/mobile shell, ...). Model choice is deliberately
 * left to an adapter so it can follow real device and Khmer-quality testing.
 */
export interface LocalRuntime {
  readonly modelName: string;
  /** Approximate download size, shown to the user before they opt in. */
  readonly downloadSizeMB: number;
  /** True when this device can run the model (e.g. WebGPU present). Must not download anything. */
  isSupported(): Promise<boolean>;
  isLoaded(): boolean;
  /** Download/initialize the model. Only ever called after an explicit user action. */
  load(onProgress?: (fraction: number) => void): Promise<void>;
  generate(prompt: { system: string; user: string }, signal?: AbortSignal): Promise<string>;
}

export class LocalProvider implements AIProvider {
  readonly name = "local";
  readonly kind = "local" as const;

  constructor(private readonly runtime: LocalRuntime | null) {}

  get hasRuntime(): boolean {
    return this.runtime !== null;
  }

  describe() {
    return this.runtime
      ? { modelName: this.runtime.modelName, downloadSizeMB: this.runtime.downloadSizeMB, loaded: this.runtime.isLoaded() }
      : null;
  }

  async isSupported(): Promise<boolean> {
    return this.runtime ? this.runtime.isSupported() : false;
  }

  /** Available only once the model has been loaded; never triggers a download. */
  async isAvailable(): Promise<boolean> {
    return this.runtime?.isLoaded() ?? false;
  }

  async load(onProgress?: (fraction: number) => void): Promise<void> {
    if (!this.runtime) throw new Error("No local AI runtime is installed.");
    await this.runtime.load(onProgress);
  }

  async runTask(request: AITaskRequest, signal?: AbortSignal): Promise<unknown> {
    if (!this.runtime?.isLoaded()) throw new Error("Local model is not loaded.");
    return parseJsonReply(await this.runtime.generate(buildPrompt(request), signal));
  }
}
