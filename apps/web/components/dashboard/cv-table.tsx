"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CVDocument } from "@thaflow/cv-core";
import { downloadBackup, fileNameFor } from "@thaflow/export-engine";
import { createRuleEngine } from "@thaflow/rule-engine";
import { getTemplate } from "@thaflow/template-engine";
import { More } from "@/components/icons";
import { ScaledPreview } from "@/components/preview";
import { Button, cx } from "@/components/ui";
import { getStore, useApp } from "@/lib/app-context";
import { notifyCVsChanged } from "@/lib/use-cvs";

const rules = createRuleEngine();

type Status = "ready" | "draft" | "fix";

/** Ready when nothing is wrong and most of it is there; a fix is needed when a rule found an error. */
export function statusOf(errors: number, completeness: number): Status {
  if (errors > 0) return "fix";
  return completeness >= 80 ? "ready" : "draft";
}

const STATUS_STYLE: Record<Status, string> = {
  ready: "bg-ok-soft text-ok",
  draft: "bg-surface text-muted",
  fix: "bg-warn-soft text-warn",
};

/** The first page, small. Rendered only once the row is near the screen. */
function Thumbnail({ cv }: { cv: CVDocument }) {
  const holder = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = holder.current;
    if (!el || near) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: "200px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);
  return (
    <div ref={holder} className="pointer-events-none aspect-[210/297] w-10 shrink-0 overflow-hidden rounded-[4px] bg-paper ring-1 ring-line" aria-hidden>
      {near && <ScaledPreview cv={cv} bare />}
    </div>
  );
}

function when(iso: string, language: "en" | "km", t: ReturnType<typeof useApp>["t"]): string {
  const date = new Date(iso);
  const locale = language === "km" ? "km-KH" : "en-GB";
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(new Date()) - day(date)) / 86_400_000);
  if (days === 0) return t("dash.today", { time });
  if (days === 1) return t("dash.yesterday", { time });
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

function RowMenu({ cv, name }: { cv: CVDocument; name: string }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const item = "flex w-full items-center px-3.5 py-2 text-left text-sm text-ink hover:bg-surface";
  const act = (action: () => Promise<void> | void) => async () => {
    setOpen(false);
    await action();
    notifyCVsChanged();
  };
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("dash.actions", { name })}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink"
        data-testid="cv-menu"
      >
        <More />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-paper py-1 shadow-pop">
          {confirming ? (
            <div className="space-y-2 px-3.5 py-2.5" role="alertdialog" aria-label={t("landing.deleteConfirm")}>
              <p className="text-sm text-danger">{t("landing.deleteConfirm")}</p>
              <div className="flex gap-2">
                <Button small variant="danger" onClick={act(() => getStore().deleteCV(cv.id))} data-testid="cv-delete-confirm">
                  {t("action.delete")}
                </Button>
                <Button small variant="ghost" onClick={() => setConfirming(false)}>
                  {t("action.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Link role="menuitem" href={`/editor/?id=${cv.id}`} className={item}>
                {t("dash.open")}
              </Link>
              <Link role="menuitem" href={`/create/?id=${cv.id}`} className={item} data-testid="cv-answers">
                {t("dash.answers")}
              </Link>
              <button role="menuitem" type="button" className={item} onClick={act(async () => void (await getStore().duplicateCV(cv.id, ` (${t("landing.copy")})`)))} data-testid="cv-duplicate">
                {t("landing.duplicate")}
              </button>
              <button role="menuitem" type="button" className={item} onClick={act(() => downloadBackup([cv], `${fileNameFor(cv)}.thaflow.json`))} data-testid="cv-backup">
                {t("landing.backup")}
              </button>
              <button role="menuitem" type="button" className={cx(item, "border-t border-line text-danger")} onClick={() => setConfirming(true)} data-testid="cv-delete">
                {t("action.delete")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** The CVs on this device as a table: what each is, how far along, when it was last changed. */
export function CVTable({ cvs }: { cvs: CVDocument[] }) {
  const { t, settings } = useApp();
  const reports = useMemo(() => new Map(cvs.map((cv) => [cv.id, rules.run(cv, { locale: settings.uiLanguage })])), [cvs, settings.uiLanguage]);
  const head = "px-4 py-3 text-left text-[13px] font-medium text-muted";
  return (
    <div className="rounded-2xl border border-line bg-paper" data-testid="cv-table">
      <table className="w-full table-fixed">
        <thead className="border-b border-line">
          <tr>
            <th scope="col" className={cx(head, "pl-5")}>
              {t("dash.col.name")}
            </th>
            <th scope="col" className={cx(head, "hidden w-36 md:table-cell")}>
              {t("dash.col.status")}
            </th>
            <th scope="col" className={cx(head, "hidden w-44 lg:table-cell")}>
              {t("dash.col.complete")}
            </th>
            <th scope="col" className={cx(head, "hidden w-48 sm:table-cell")}>
              {t("dash.col.edited")}
            </th>
            <th scope="col" className="w-14">
              <span className="sr-only">{t("dash.col.actions")}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {cvs.map((cv) => {
            const report = reports.get(cv.id)!;
            const status = statusOf(report.counts.error, report.completeness);
            const name = cv.personal.fullName.trim() || cv.metadata.title || t("landing.untitled");
            const meta = [cv.personal.headline?.trim(), getTemplate(cv.appearance.templateId).name].filter(Boolean).join(" · ");
            const edited = when(cv.metadata.updatedAt, settings.uiLanguage, t);
            return (
              <tr key={cv.id} className="transition-colors hover:bg-canvas" data-testid="cv-row">
                <td className="py-3 pl-5 pr-4">
                  <Link href={`/editor/?id=${cv.id}`} className="flex min-w-0 items-center gap-4 rounded-md" data-testid="cv-open">
                    <Thumbnail cv={cv} />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium text-ink" lang={cv.metadata.language}>
                        {name}
                      </span>
                      <span className="block truncate text-[13px] text-muted">{meta}</span>
                      {/* Small screens have no room for the other columns. */}
                      <span className="block truncate text-[13px] text-muted sm:hidden">
                        {t(`dash.status.${status}`)} · {edited}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium", STATUS_STYLE[status])} data-testid="cv-status">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                    {t(`dash.status.${status}`)}
                  </span>
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={report.completeness} aria-valuemin={0} aria-valuemax={100} aria-label={t("dash.col.complete")}>
                      <div className={cx("h-full rounded-full", report.completeness >= 80 ? "bg-ok" : "bg-ink-soft")} style={{ width: `${report.completeness}%` }} />
                    </div>
                    <span className="text-sm text-ink-soft tabular-nums">{report.completeness}%</span>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-sm text-ink-soft sm:table-cell">{edited}</td>
                <td className="py-3 pr-3">
                  <RowMenu cv={cv} name={name} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
