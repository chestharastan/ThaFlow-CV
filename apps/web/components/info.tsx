"use client";

import type { ComponentType, SVGProps } from "react";
import { OCR_DOWNLOAD_BYTES, OCR_MODEL_FILES } from "@thaflow/import-engine/models";
import type { MessageKey } from "@thaflow/localization";
import { useApp } from "@/lib/app-context";
import { ChevronDown, FileText, Image, Languages, Layout, ListCheck, Server, Sparkle } from "./icons";
import { cx } from "./ui";

/*
 * What the app is made of, and what it does not do well yet, in plain words. Shown on the product page
 * and again under Help in the dashboard, so the two never disagree.
 */

type Where = "device" | "server" | "none";
type Size = "included" | "off" | "none" | { bytes: number };

interface Part {
  key: "rules" | "designs" | "pdf" | "word" | "detector" | "recogniser" | "cloud" | "local";
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  where: Where;
  size: Size;
}

const PARTS: Part[] = [
  { key: "rules", icon: ListCheck, where: "device", size: "included" },
  { key: "designs", icon: Layout, where: "device", size: "included" },
  { key: "pdf", icon: FileText, where: "device", size: "included" },
  { key: "word", icon: FileText, where: "device", size: "included" },
  { key: "detector", icon: Image, where: "device", size: { bytes: OCR_MODEL_FILES.detector.bytes } },
  { key: "recogniser", icon: Languages, where: "device", size: { bytes: OCR_MODEL_FILES.recogniser.bytes } },
  { key: "cloud", icon: Server, where: "server", size: "off" },
  { key: "local", icon: Sparkle, where: "none", size: "none" },
];

const WHERE: Record<Where, { label: MessageKey; className: string }> = {
  device: { label: "home.where.device", className: "bg-ok-soft text-ok" },
  server: { label: "home.where.server", className: "bg-warn-soft text-warn" },
  none: { label: "home.where.none", className: "bg-surface text-muted" },
};

export function IconChip({ icon: Icon, className }: { icon: ComponentType<SVGProps<SVGSVGElement>>; className?: string }) {
  return (
    <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream text-ink", className)} aria-hidden>
      <Icon width={20} height={20} />
    </span>
  );
}

/** Every part that does the work: what it is, what it does, where it runs, and what it costs to get. */
export function ModelList() {
  const { t } = useApp();
  const size = (value: Size) =>
    value === "included" ? t("home.size.included") : value === "off" ? t("home.size.off") : value === "none" ? "—" : t("home.size.once", { size: (value.bytes / 1_000_000).toFixed(1) });
  return (
    <div>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper" data-testid="models">
        {PARTS.map((part) => (
          <li key={part.key} className="grid gap-x-6 gap-y-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.5fr)_minmax(0,0.85fr)] md:items-center" data-testid={`model-${part.key}`}>
            <div className="flex min-w-0 gap-3">
              <IconChip icon={part.icon} />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">{t(`home.model.${part.key}.name` as MessageKey)}</p>
                <p className="text-[13px] text-muted">{t(`home.model.${part.key}.tech` as MessageKey)}</p>
              </div>
            </div>
            <p className="text-sm text-ink-soft md:pl-0">{t(`home.model.${part.key}.what` as MessageKey)}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:flex-col md:items-end md:text-right">
              <span className={cx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", WHERE[part.where].className)}>{t(WHERE[part.where].label)}</span>
              <span className="text-[13px] text-muted tabular-nums">{size(part.size)}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 max-w-3xl text-sm text-muted">{t("home.models.note", { size: Math.round(OCR_DOWNLOAD_BYTES / 1_000_000) })}</p>
    </div>
  );
}

const LIMITS = ["speed", "check", "formats", "khmerPdf", "layout", "word", "browser", "ai"] as const;

/** What does not work well yet, so nothing comes as a surprise. */
export function LimitList() {
  const { t } = useApp();
  return (
    <ul className="grid gap-3 sm:grid-cols-2" data-testid="limits">
      {LIMITS.map((key) => (
        <li key={key} className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-[15px] font-semibold text-ink">{t(`home.limit.${key}.title` as MessageKey)}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t(`home.limit.${key}.text` as MessageKey)}</p>
        </li>
      ))}
    </ul>
  );
}

const QUESTIONS = ["free", "where", "internet", "phone", "later", "photo"] as const;

export function Faq() {
  const { t } = useApp();
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper" data-testid="faq">
      {QUESTIONS.map((key) => (
        <details key={key} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium text-ink transition-colors hover:bg-surface [&::-webkit-details-marker]:hidden">
            {t(`home.faq.${key}.q` as MessageKey)}
            <ChevronDown className="shrink-0 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <p className="px-5 pb-5 text-sm leading-relaxed text-ink-soft">{t(`home.faq.${key}.a` as MessageKey)}</p>
        </details>
      ))}
    </div>
  );
}
