import { createId, type AIPreferences, type CVLanguage, type ContentSuggestion } from "@thaflow/cv-core";
import { checkSuggestionIntegrity, describeIntegrityFinding, normalizeWhitespace } from "@thaflow/rule-engine";
import {
  AIOutputError,
  AIUnavailableError,
  MAX_INPUT_CHARS,
  resultSchemas,
  type AIProvider,
  type AIRuntimeState,
  type AITaskName,
  type AITaskRequest,
  type AITaskResult,
  type RewriteKind,
} from "./types";

export interface OrchestratorOptions {
  local?: AIProvider | null;
  /** Built lazily from the user's endpoint; return null when not configured. */
  cloud?: AIProvider | null;
  preferences: AIPreferences;
}

/**
 * Decides which provider handles a task and validates everything that comes
 * back. The LLM never controls the application: it only returns data that is
 * schema-checked, integrity-checked and then confirmed by the user.
 *
 * Provider selection follows the user's explicit choice. There is no automatic
 * fallback from local to cloud: content leaves the device only when the user
 * selected cloud mode AND gave consent.
 */
export class AIOrchestrator {
  constructor(private readonly options: OrchestratorOptions) {}

  private async selectProvider(): Promise<AIProvider> {
    const { preferences, local, cloud } = this.options;
    if (preferences.mode === "off") throw new AIUnavailableError("off");
    if (preferences.mode === "local") {
      if (local && (await local.isAvailable())) return local;
      throw new AIUnavailableError("local-unavailable");
    }
    if (!preferences.cloudConsent) throw new AIUnavailableError("cloud-consent-required");
    if (cloud && (await cloud.isAvailable())) return cloud;
    throw new AIUnavailableError("cloud-not-configured");
  }

  async getState(): Promise<AIRuntimeState> {
    try {
      const provider = await this.selectProvider();
      return provider.kind === "local" ? "local-ready" : "cloud-ready";
    } catch {
      return "unavailable";
    }
  }

  /** Run a task and return schema-validated output plus the provider that produced it. */
  async run<T extends AITaskName>(
    request: Extract<AITaskRequest, { task: T }>,
    signal?: AbortSignal,
  ): Promise<{ result: AITaskResult<T>; provider: "local" | "cloud" }> {
    const provider = await this.selectProvider();
    const text = normalizeWhitespace(request.content.text);
    if (!text) throw new AIOutputError("Nothing to process.");
    if (text.length > MAX_INPUT_CHARS) throw new AIOutputError(`Text is longer than ${MAX_INPUT_CHARS} characters.`);
    const cleaned = { ...request, content: { ...request.content, text } } as AITaskRequest;
    const raw = await provider.runTask(cleaned, signal);
    const parsed = resultSchemas[request.task].safeParse(raw);
    if (!parsed.success) throw new AIOutputError("The AI returned an unexpected response.");
    return { result: parsed.data as AITaskResult<T>, provider: provider.kind };
  }

  /**
   * Ask for improved wording and wrap it as a pending suggestion. The original
   * text is preserved alongside it, and integrity warnings (invented numbers or
   * claims) are attached for the user to review.
   */
  async suggestRewrite(input: {
    cvId: string;
    targetSection: string;
    targetField: string;
    text: string;
    kind: RewriteKind;
    language: CVLanguage;
    position?: string;
    locale?: CVLanguage;
  }): Promise<ContentSuggestion> {
    const { result, provider } = await this.run({
      task: "rewrite_text",
      language: input.language,
      content: { text: input.text, kind: input.kind, ...(input.position ? { position: input.position } : {}) },
    });
    return this.toSuggestion(input, result.text, provider, true);
  }

  async suggestTranslation(input: {
    cvId: string;
    targetSection: string;
    targetField: string;
    text: string;
    language: CVLanguage;
    targetLanguage: CVLanguage;
    locale?: CVLanguage;
  }): Promise<ContentSuggestion> {
    const { result, provider } = await this.run({
      task: "translate_text",
      language: input.language,
      content: { text: input.text, targetLanguage: input.targetLanguage },
    });
    // Claim-word checks are language-specific, so only number checks are meaningful after translation.
    return this.toSuggestion(input, result.text, provider, false);
  }

  private toSuggestion(
    input: { cvId: string; targetSection: string; targetField: string; text: string; locale?: CVLanguage },
    suggestedText: string,
    provider: "local" | "cloud",
    fullIntegrity: boolean,
  ): ContentSuggestion {
    const findings = checkSuggestionIntegrity(input.text, suggestedText).filter(
      (f) => fullIntegrity || f.kind === "new-number",
    );
    return {
      id: createId(),
      cvId: input.cvId,
      targetSection: input.targetSection,
      targetField: input.targetField,
      originalText: input.text,
      suggestedText: suggestedText.trim(),
      provider,
      status: "pending",
      warnings: findings.map((f) => describeIntegrityFinding(f, input.locale ?? "en")),
      createdAt: new Date().toISOString(),
    };
  }
}
