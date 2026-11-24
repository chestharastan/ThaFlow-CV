"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { CVDocument } from "@thaflow/cv-core";
import type { MessageKey } from "@thaflow/localization";
import { TEMPLATE_CATEGORIES, templates, type CVTemplate, type TemplateCategory } from "@thaflow/template-engine";
import { Check } from "@/components/icons";
import { ScaledPreview } from "@/components/preview";
import { cx } from "@/components/ui";
import { useApp } from "@/lib/app-context";

type Filter = "all" | TemplateCategory;

/**
 * One template rendered with the person's own CV. Rendering forty full A4
 * documents at once is heavy, so a card only renders once it nears the viewport.
 */
const TemplateCard = memo(function TemplateCard(props: { cv: CVDocument; template: CVTemplate; selected: boolean; onSelect(id: string): void }) {
  const { cv, template, selected, onSelect } = props;
  const holder = useRef<HTMLButtonElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = holder.current;
    if (!el || near) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: "600px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);
  return (
    <button ref={holder} type="button" aria-pressed={selected} onClick={() => onSelect(template.id)} data-testid={`template-${template.id}`} className="group block w-full rounded-xl text-left">
      <div
        className={cx(
          "relative aspect-[210/297] overflow-hidden rounded-xl border bg-paper transition-[border-color,box-shadow,transform] duration-200",
          selected ? "border-ink shadow-page ring-1 ring-ink" : "border-line shadow-soft group-hover:-translate-y-0.5 group-hover:border-line-strong group-hover:shadow-page",
        )}
      >
        <div className="pointer-events-none" aria-hidden>
          {near && <ScaledPreview cv={cv} template={template} bare />}
        </div>
        {selected && (
          <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-on-brand">
            <Check width={14} height={14} strokeWidth={2.4} />
          </span>
        )}
      </div>
      <div className={cx("mt-2 px-0.5 text-sm", selected ? "font-semibold text-ink" : "text-ink-soft")}>{template.name}</div>
    </button>
  );
});

/** Style filter plus the grid of templates. Used by the full chooser and by the editor's Template tab. */
export function TemplateGrid(props: { cv: CVDocument; selectedId: string; onSelect(id: string): void; columns: string }) {
  const { t } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const filters: Filter[] = ["all", ...TEMPLATE_CATEGORIES];
  const shown = templates.filter((tpl) => filter === "all" || tpl.category === filter);
  return (
    <>
      <div role="tablist" aria-label={t("gallery.filter")} className="-mx-1 flex flex-wrap gap-1">
        {filters.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            data-testid={`filter-${key}`}
            className={cx("h-9 rounded-lg px-3 text-sm transition-colors", filter === key ? "bg-cream font-medium text-ink" : "text-muted hover:bg-surface hover:text-ink")}
          >
            {t(`gallery.${key}` as MessageKey)}
          </button>
        ))}
      </div>
      <div className={cx("mt-5 grid gap-x-4 gap-y-6", props.columns)} data-testid="template-grid">
        {shown.map((tpl) => (
          <TemplateCard key={tpl.id} cv={props.cv} template={tpl} selected={tpl.id === props.selectedId} onSelect={props.onSelect} />
        ))}
      </div>
    </>
  );
}
