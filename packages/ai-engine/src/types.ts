import { z } from "zod";
import type { CVLanguage } from "@thaflow/cv-core";

/**
 * AI tasks are small and self-contained. A request carries only the text the
 * user selected for that task: never the whole CV, an id, or contact details.
 */
export const rewriteKindSchema = z.enum(["summary", "experience", "project", "education", "general"]);
export type RewriteKind = z.infer<typeof rewriteKindSchema>;

export type AITaskRequest =
  | {
      task: "rewrite_text";
      language: CVLanguage;
      content: { text: string; kind: RewriteKind; position?: string; length?: "same" | "longer" };
    }
  | {
      task: "translate_text";
      language: CVLanguage;
      content: { text: string; targetLanguage: CVLanguage };
    }
  | {
      task: "extract_section";
      language: CVLanguage;
      content: { text: string; hint?: string };
    };

export type AITaskName = AITaskRequest["task"];

export const textResultSchema = z.object({ text: z.string().min(1).max(8000) });
export type TextResult = z.infer<typeof textResultSchema>;

const nullableStr = z.string().nullable().optional();

export const extractionResultSchema = z.object({
  section: z.enum(["education", "experiences", "skills", "projects", "summary", "unknown"]),
  data: z
    .object({
      institution: nullableStr,
      degree: nullableStr,
      fieldOfStudy: nullableStr,
      company: nullableStr,
      position: nullableStr,
      name: nullableStr,
      description: nullableStr,
      startDate: nullableStr,
      endDate: nullableStr,
      isCurrent: z.boolean().nullable().optional(),
      skills: z.array(z.string()).nullable().optional(),
      text: nullableStr,
    })
    .default({}),
  /** Model self-estimates. Shown to the user as hints; never used to auto-accept. */
  confidence: z.record(z.string(), z.number()).default({}),
  missingFields: z.array(z.string()).default([]),
  requiresConfirmation: z.boolean().default(true),
});
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export const resultSchemas = {
  rewrite_text: textResultSchema,
  translate_text: textResultSchema,
  extract_section: extractionResultSchema,
} as const;

export type AITaskResult<T extends AITaskName> = z.infer<(typeof resultSchemas)[T]>;

/**
 * Provider abstraction. Implement this to plug in a different local runtime or
 * cloud model without touching the rest of the application.
 */
export interface AIProvider {
  readonly name: string;
  readonly kind: "local" | "cloud";
  isAvailable(): Promise<boolean>;
  /** Returns raw, untrusted output. The orchestrator validates it. */
  runTask(request: AITaskRequest, signal?: AbortSignal): Promise<unknown>;
}

export type AIRuntimeState =
  /** A local model is loaded and usable. */
  | "local-ready"
  /** The user enabled cloud AI, gave consent, and an endpoint is configured. */
  | "cloud-ready"
  /** No provider: the rule engine and manual editing keep working. */
  | "unavailable";

export class AIUnavailableError extends Error {
  constructor(public readonly reason: "off" | "local-unavailable" | "cloud-not-configured" | "cloud-consent-required") {
    super(`AI is unavailable: ${reason}`);
    this.name = "AIUnavailableError";
  }
}

export class AIOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIOutputError";
  }
}

/** Hard cap on text sent to any provider, mirrored by the cloud server. */
export const MAX_INPUT_CHARS = 4000;
