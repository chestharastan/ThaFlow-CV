"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import type { CVDocument } from "@thaflow/cv-core";
import type { MessageKey } from "@thaflow/localization";
import { TEMPLATE_CATEGORIES, getTemplate, templates, type CVTemplate, type TemplateCategory } from "@thaflow/template-engine";
import { AppHeader, LanguageToggle } from "@/components/app-header";
import { ArrowRight, Check, Close } from "@/components/icons";
import { ScaledPreview } from "@/components/preview";
import { Button, cx } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { useEditor } from "@/lib/editor-store";

type Filter = "all" | TemplateCategory;

/**
 * One template rendered with the person's own CV. Rendering thirty full A4
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
    <button
      ref={holder}
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(template.id)}
      data-testid={`template-${template.id}`}
      className="group block w-full rounded-xl text-left"
    >
      <div
        className={cx(
          "relative aspect-[210/297] overflow-hidden rounded-xl border bg-paper transition-[border-color,box-shadow]",
          selected ? "border-ink shadow-page ring-1 ring-ink" : "border-line shadow-soft group-hover:border-line-strong group-hover:shadow-page",
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

export function Gallery() {
  const { t } = useApp();
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";
  const { cv, status, load, update } = useEditor();
  const [filter, setFilter] = useState<Filter>("all");
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (id) void load(id);
  }, [id, load]);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoomed(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed]);

  if (!id || status === "missing") {
    return (
      <div className="flex min-h-dvh flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-xl flex-1 px-5 pt-[14vh]" data-testid="gallery-not-found">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em]">{t("gallery.notFound")}</h1>
          <Link href="/" className="mt-5 inline-block text-[15px] text-ink underline underline-offset-4">
            {t("gallery.home")}
          </Link>
        </main>
      </div>
    );
  }
  if (!cv) return <div className="min-h-dvh" aria-busy="true" />;

  const selected = getTemplate(cv.appearance.templateId);
  const shown = templates.filter((tpl) => filter === "all" || tpl.category === filter);
  const select = (templateId: string) => update((d) => void (d.appearance.templateId = templateId));
  const confirm = async () => {
    await useEditor.getState().flush();
    router.push(`/editor/?id=${cv.id}`);
  };
  const filters: Filter[] = ["all", ...TEMPLATE_CATEGORIES];

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader>
        <LanguageToggle />
      </AppHeader>

      <main className="mx-auto w-full max-w-[84rem] flex-1 px-5 pb-28 pt-4 sm:px-8 sm:pt-8 lg:pb-12">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] lg:gap-12">
          <div className="animate-enter">
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] sm:text-[32px]">{t("gallery.title")}</h1>
            <div role="tablist" aria-label={t("gallery.filter")} className="-mx-1 mt-5 flex flex-wrap gap-1">
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
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4" data-testid="template-grid">
              {shown.map((tpl) => (
                <TemplateCard key={tpl.id} cv={cv} template={tpl} selected={tpl.id === selected.id} onSelect={select} />
              ))}
            </div>
          </div>

          {/* Wide screens: the chosen template at reading size, always in view. */}
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold tracking-[-0.01em] text-ink" data-testid="selected-template">
                    {selected.name}
                  </div>
                  <div className="text-sm text-muted">{t(`gallery.${selected.category}` as MessageKey)}</div>
                </div>
                <Button variant="primary" size="lg" onClick={() => void confirm()} data-testid="use-template">
                  {t("gallery.use")}
                  <ArrowRight />
                </Button>
              </div>
              <div className="max-h-[calc(100dvh-8.5rem)] overflow-y-auto rounded-xl">
                <ScaledPreview cv={cv} template={selected} />
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Phones and tablets: a bar that is always reachable. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{selected.name}</div>
        <Button size="lg" onClick={() => setZoomed(true)} data-testid="preview-template">
          {t("gallery.preview")}
        </Button>
        <Button variant="primary" size="lg" onClick={() => void confirm()} data-testid="use-template-mobile">
          {t("gallery.use")}
        </Button>
      </div>

      {zoomed && (
        <div className="fixed inset-0 z-30 flex flex-col bg-canvas lg:hidden" role="dialog" aria-modal="true" aria-label={selected.name}>
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4">
            <div className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{selected.name}</div>
            <Button variant="ghost" className="px-2!" onClick={() => setZoomed(false)} aria-label={t("gallery.close")} autoFocus>
              <Close />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <ScaledPreview cv={cv} template={selected} />
          </div>
          <div className="border-t border-line p-3">
            <Button variant="primary" size="lg" className="w-full" onClick={() => void confirm()}>
              {t("gallery.use")}
              <ArrowRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
