"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { createEmptyCV, createId, parseBackup, type CVLanguage } from "@thaflow/cv-core";
import { downloadBackup } from "@thaflow/export-engine";
import type { MessageKey } from "@thaflow/localization";
import { FIRST_CV_QUESTION } from "@thaflow/questionnaire";
import { getTemplate, templates } from "@thaflow/template-engine";
import { createUrl } from "@/components/create/nav";
import { DeviceChecklist, DeviceChips, useDevice } from "@/components/device-report";
import { TemplateGrid } from "@/components/gallery/template-grid";
import { ArrowRight, Camera, ChevronRight, FilePlus, Files, Folder, UploadCloud } from "@/components/icons";
import { Faq, LimitList, ModelList } from "@/components/info";
import { ScaledPreview } from "@/components/preview";
import { Button, cx } from "@/components/ui";
import { getStore, useApp } from "@/lib/app-context";
import { hasTouch } from "@/lib/device";
import { handOverImport } from "@/lib/pending-import";
import { sampleCV, useSamplePhoto } from "@/lib/sample-cv";
import { notifyCVsChanged, useCVs } from "@/lib/use-cvs";
import { CVTable } from "./cv-table";
import { PageHeader, PrivacyNote } from "./shell";

// The same kinds of file the create flow reads: PDF, Word, and pictures (photos, screenshots, scans).
const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*,.heic,.heif,.tif,.tiff";
const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

/** Start a CV: blank, straight into the questions (with a design already chosen, from the template browser). */
function useStartNew(): { start(templateId?: string): Promise<void>; failed: boolean } {
  const { settings } = useApp();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const start = useCallback(
    async (templateId?: string) => {
      try {
        const cv = createEmptyCV({ language: settings.uiLanguage, ...(templateId ? { templateId } : {}) });
        await getStore().saveCV(cv);
        notifyCVsChanged();
        router.push(createUrl(cv.id, FIRST_CV_QUESTION));
      } catch {
        setFailed(true);
      }
    },
    [router, settings.uiLanguage],
  );
  return { start, failed };
}

/* ---------- New CV (the dashboard's home) ---------- */

export function NewCVPage() {
  const { t } = useApp();
  const router = useRouter();
  const device = useDevice();
  const { cvs, failed: listFailed } = useCVs();
  const { start, failed } = useStartNew();
  const [dragging, setDragging] = useState(false);
  const [camera, setCamera] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  // A camera button only where there is one to hand: phones and tablets.
  useEffect(() => setCamera(hasTouch()), []);

  /** Read an existing CV: the create flow's import screen takes the file from here. */
  const startFrom = useCallback(
    (file: File) => {
      handOverImport(file);
      router.push(createUrl(createId(), "source"));
    },
    [router],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = event.clipboardData?.files?.[0];
      if (!file) return;
      event.preventDefault();
      startFrom(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [startFrom]);

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) startFrom(file);
  };

  const picked = (input: HTMLInputElement | null) => {
    const file = input?.files?.[0];
    if (input) input.value = "";
    if (file) startFrom(file);
  };

  return (
    <>
      <PageHeader title={t("dash.new.title")} sub={t("dash.new.sub")} />
      <DeviceChips info={device} className="mb-5" />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragging) setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={onDrop}
        className={cx(
          "flex flex-col items-center rounded-2xl border border-dashed px-5 py-14 text-center transition-colors sm:py-16",
          dragging ? "border-ink bg-cream" : "border-line-strong bg-paper",
        )}
        data-testid="dashboard-drop"
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-cream text-ink" aria-hidden>
          <UploadCloud width={24} height={24} />
        </span>
        <h2 className="mt-5 text-lg font-semibold text-ink">{t(dragging ? "dash.drop.release" : "dash.drop.title")}</h2>
        <p className="mt-1 max-w-md text-sm text-muted">{t(camera ? "dash.drop.textTouch" : "dash.drop.text")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Button variant="primary" size="lg" onClick={() => void start()} data-testid="dashboard-new">
            <FilePlus />
            {t("dash.drop.new")}
          </Button>
          <Button size="lg" onClick={() => fileInput.current?.click()} data-testid="dashboard-file">
            <Folder />
            {t("dash.drop.file")}
          </Button>
          {camera && (
            <Button size="lg" onClick={() => cameraInput.current?.click()} data-testid="dashboard-camera">
              <Camera />
              {t("dash.drop.camera")}
            </Button>
          )}
        </div>
        <input ref={fileInput} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => picked(e.currentTarget)} data-testid="dashboard-file-input" />
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => picked(e.currentTarget)} />
      </div>
      {(failed || listFailed) && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {t("landing.storageError")}
        </p>
      )}
      <PrivacyNote>{t("dash.private")}</PrivacyNote>

      {cvs && cvs.length > 0 && (
        <section className="mt-12" aria-labelledby="recent">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent" className="text-lg font-semibold text-ink">
              {t("dash.recent")}
            </h2>
            {cvs.length > 5 && (
              <Link href="/dashboard/cvs/" className="inline-flex items-center gap-1 rounded-md py-1 text-sm text-muted transition-colors hover:text-ink" data-testid="recent-all">
                {t("dash.viewAll")}
                <ChevronRight width={16} height={16} />
              </Link>
            )}
          </div>
          <CVTable cvs={cvs.slice(0, 5)} />
        </section>
      )}
    </>
  );
}

/* ---------- My CVs ---------- */

export function CVsPage() {
  const { t } = useApp();
  const { cvs, failed } = useCVs();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const restoreInput = useRef<HTMLInputElement>(null);

  const restore = async (file: File) => {
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("too large");
      const restored = parseBackup(await file.text());
      for (const cv of restored) await getStore().saveCV(cv);
      setNotice({ kind: "ok", text: t("landing.restored", { count: restored.length }) });
      notifyCVsChanged();
    } catch {
      setNotice({ kind: "error", text: t("landing.restoreFailed") });
    }
  };

  return (
    <>
      <PageHeader
        title={t("dash.cvs.title")}
        sub={t("dash.cvs.sub")}
        actions={
          <>
            <Button onClick={() => restoreInput.current?.click()} data-testid="cvs-restore">
              {t("landing.restore")}
            </Button>
            {cvs && cvs.length > 1 && (
              <Button onClick={() => downloadBackup(cvs, `thaflow-cv-backup-${new Date().toISOString().slice(0, 10)}.json`)} data-testid="cvs-backup-all">
                {t("landing.backupAll")}
              </Button>
            )}
          </>
        }
      />
      <input
        ref={restoreInput}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="cvs-restore-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void restore(file);
        }}
      />
      {(notice || failed) && (
        <p role="status" className={cx("mb-4 rounded-lg px-3 py-2 text-sm", notice?.kind === "ok" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger")} data-testid="cvs-notice">
          {notice?.text ?? t("landing.storageError")}
        </p>
      )}
      {cvs === null ? null : cvs.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-line bg-paper px-5 py-14 text-center" data-testid="cvs-empty">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cream text-ink" aria-hidden>
            <Files width={22} height={22} />
          </span>
          <p className="mt-4 text-[15px] text-ink-soft">{t("dash.empty")}</p>
          <Link
            href="/dashboard/"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-brand bg-brand px-4 text-sm font-medium text-on-brand shadow-soft transition-colors hover:bg-brand-hover"
          >
            <FilePlus />
            {t("dash.nav.new")}
          </Link>
        </div>
      ) : (
        <CVTable cvs={cvs} />
      )}
      <PrivacyNote>{t("dash.private")}</PrivacyNote>
    </>
  );
}

/* ---------- Templates ---------- */

export function TemplatesPage() {
  const { t, settings } = useApp();
  const { start, failed } = useStartNew();
  const photo = useSamplePhoto();
  const [language, setLanguage] = useState<CVLanguage>(settings.uiLanguage);
  const [selectedId, setSelectedId] = useState(templates[0]!.id);
  const cv = useMemo(() => sampleCV(language, photo), [language, photo]);
  const selected = getTemplate(selectedId);
  const use = () => void start(selected.id);

  return (
    <>
      <PageHeader
        title={t("dash.templates.title")}
        sub={t("dash.templates.sub", { count: templates.length })}
        actions={
          <div className="flex rounded-xl bg-surface p-1" role="group" aria-label={t("dash.templates.sample")}>
            {(["en", "km"] as const).map((code) => (
              <button
                key={code}
                type="button"
                lang={code}
                aria-pressed={language === code}
                onClick={() => setLanguage(code)}
                className={cx("h-8 rounded-lg px-3 text-sm transition-colors", language === code ? "bg-paper font-medium text-ink shadow-soft" : "text-muted hover:text-ink")}
                data-testid={`templates-lang-${code}`}
              >
                {code === "en" ? "English" : "ខ្មែរ"}
              </button>
            ))}
          </div>
        }
      />
      {failed && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {t("landing.storageError")}
        </p>
      )}
      <div className="pb-20 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:gap-10 lg:pb-0">
        <div className="min-w-0">
          <TemplateGrid cv={cv} selectedId={selectedId} onSelect={setSelectedId} columns="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" />
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold tracking-[-0.01em] text-ink" data-testid="templates-selected">
                  {selected.name}
                </div>
                <div className="text-sm text-muted">{t(`gallery.${selected.category}` as MessageKey)}</div>
              </div>
              <Button variant="primary" onClick={use} data-testid="templates-use">
                {t("dash.templates.use")}
                <ArrowRight />
              </Button>
            </div>
            <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-xl">
              <ScaledPreview cv={cv} template={selected} />
            </div>
          </div>
        </aside>
      </div>
      {/* Phones and tablets: the choice stays in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{selected.name}</div>
        <Button variant="primary" size="lg" onClick={use} data-testid="templates-use-mobile">
          {t("dash.templates.use")}
        </Button>
      </div>
    </>
  );
}

/* ---------- Help ---------- */

export function HelpPage() {
  const { t } = useApp();
  const device = useDevice();
  const heading = "text-lg font-semibold text-ink";
  return (
    <>
      <PageHeader title={t("dash.help.title")} sub={t("dash.help.sub")} />
      <div className="max-w-4xl space-y-12">
        <section aria-labelledby="help-device">
          <h2 id="help-device" className={cx(heading, "mb-1")}>
            {t("home.device.title")}
          </h2>
          <p className="mb-4 text-sm text-muted">{t("home.device.sub")}</p>
          <DeviceChips info={device} className="mb-4" />
          <DeviceChecklist info={device} />
          <p className="mt-3 text-sm text-muted">{t("device.estimate")}</p>
        </section>
        <section aria-labelledby="help-models">
          <h2 id="help-models" className={cx(heading, "mb-1")}>
            {t("home.models.title")}
          </h2>
          <p className="mb-4 text-sm text-muted">{t("home.models.sub")}</p>
          <ModelList />
        </section>
        <section aria-labelledby="help-limits">
          <h2 id="help-limits" className={cx(heading, "mb-4")}>
            {t("home.limits.title")}
          </h2>
          <LimitList />
        </section>
        <section aria-labelledby="help-faq">
          <h2 id="help-faq" className={cx(heading, "mb-4")}>
            {t("home.faq.title")}
          </h2>
          <Faq />
        </section>
        <Link href="/" className="inline-flex items-center gap-1.5 rounded-md py-1 text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          {t("dash.about")}
          <ChevronRight width={16} height={16} />
        </Link>
      </div>
    </>
  );
}
