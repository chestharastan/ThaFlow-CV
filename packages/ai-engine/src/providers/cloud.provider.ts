import type { AIProvider, AITaskRequest } from "../types";

export interface CloudProviderOptions {
  /** Base URL of a ThaFlow AI server, e.g. "https://ai.example.com". */
  endpoint: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Talks to the stateless ThaFlow AI server. The request body is exactly the
 * task payload: no user id, no cookies (credentials: "omit"), no referrer.
 */
export class CloudProvider implements AIProvider {
  readonly name = "cloud";
  readonly kind = "cloud" as const;
  private readonly base: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: CloudProviderOptions) {
    this.base = options.endpoint.trim().replace(/\/+$/, "");
    this.fetchImpl = options.fetch ?? ((...args) => fetch(...args));
    this.timeoutMs = options.timeoutMs ?? 60_000;
  }

  /** Configured with a valid http(s) URL. Does not make a network request. */
  async isAvailable(): Promise<boolean> {
    try {
      const url = new URL(this.base);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }

  async runTask(request: AITaskRequest, signal?: AbortSignal): Promise<unknown> {
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const response = await this.fetchImpl(`${this.base}/v1/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) throw new Error(`Cloud AI request failed (${response.status}).`);
    const body = (await response.json()) as { success?: boolean; result?: unknown; error?: string };
    if (!body.success) throw new Error(body.error || "Cloud AI request failed.");
    return body.result;
  }
}
