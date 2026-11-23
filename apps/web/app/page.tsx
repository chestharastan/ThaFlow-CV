"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseBackup, type CVDocument } from "@thaflow/cv-core";
import { downloadBackup, fileNameFor } from "@thaflow/export-engine";
import { AppHeader, LanguageToggle } from "@/components/app-header";
import { ArrowRight } from "@/components/icons";
import { Button, Card } from "@/components/ui";
import { getStore, useApp } from "@/lib/app-context";

const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export default function LandingPage() {
  const { t, settings } = useApp();
  const [cvs, setCvs] = useState<CVDocument[]>([]);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      setCvs(await getStore().listCVs());
    } catch {
      setCvs([]);
      setNotice({ kind: "error", text: t("landing.storageError") });
    }
  }, [t]);

  useEffect(() => void reload(), [reload]);

  const restore = async (file: File) => {
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("too large");
      const restored = parseBackup(await file.text());
      for (const cv of restored) await getStore().saveCV(cv);
      setNotice({ kind: "ok", text: t("landing.restored", { count: restored.length }) });
      await reload();
    } catch {
      setNotice({ kind: "error", text: t("landing.restoreFailed") });
    }
  };

  const dateFormat = new Intl.DateTimeFormat(settings.uiLanguage === "km" ? "km-KH" : "en-GB", { dateStyle: "medium" });
  const quiet = "rounded-md py-1 text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline";

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader>
        <LanguageToggle />
      </AppHeader>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-16 pt-[9vh] sm:pt-[14vh]">
        <section className="animate-enter">
          <h1 className="text-[40px] font-semibold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[56px]">{t("landing.headline")}</h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">{t("landing.sub")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="/create/"
              data-testid="landing-create"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-brand bg-brand px-6 text-[15px] font-medium text-on-brand shadow-soft transition-colors hover:border-brand-hover hover:bg-brand-hover"
            >
              {t("landing.create")}
              <ArrowRight />
            </Link>
            <p className="text-sm text-muted">{t("landing.facts")}</p>
          </div>
        </section>

        {notice && (
          <p
            role="status"
            data-testid="landing-notice"
            className={`mt-10 rounded-lg px-3 py-2 text-sm ${notice.kind === "ok" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}
          >
            {notice.text}
          </p>
        )}

        {cvs.length > 0 && (
          <section className="mt-14" aria-labelledby="your-cvs">
            <h2 id="your-cvs" className="mb-3 text-sm font-medium text-muted">
              {t("landing.yours")}
            </h2>
            <Card className="divide-y divide-line overflow-hidden">
              {cvs.map((cv) => {
                const title = cv.personal.fullName.trim() || cv.metadata.title || t("landing.untitled");
                const meta = [cv.personal.headline?.trim(), t("landing.edited", { date: dateFormat.format(new Date(cv.metadata.updatedAt)) })].filter(Boolean).join(" · ");
                return (
                  <div key={cv.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3" data-testid="landing-cv">
                    <Link href={`/editor/?id=${cv.id}`} className="min-w-0 flex-1 rounded-md py-1" data-testid="landing-cv-open">
                      <span className="block truncate text-[15px] font-medium text-ink" lang={cv.metadata.language}>
                        {title}
                      </span>
                      <span className="block truncate text-sm text-muted">{meta}</span>
                    </Link>
                    {confirming === cv.id ? (
                      <div className="flex items-center gap-2" role="alertdialog" aria-label={t("landing.deleteConfirm")}>
                        <span className="text-sm text-danger">{t("landing.deleteConfirm")}</span>
                        <Button
                          small
                          variant="danger"
                          data-testid="landing-cv-delete-confirm"
                          onClick={async () => {
                            await getStore().deleteCV(cv.id);
                            setConfirming(null);
                            await reload();
                          }}
                        >
                          {t("action.delete")}
                        </Button>
                        <Button small variant="ghost" onClick={() => setConfirming(null)}>
                          {t("action.cancel")}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Button
                          small
                          variant="ghost"
                          data-testid="landing-cv-duplicate"
                          onClick={async () => {
                            await getStore().duplicateCV(cv.id, ` (${t("landing.copy")})`);
                            await reload();
                          }}
                        >
                          {t("landing.duplicate")}
                        </Button>
                        <Button small variant="ghost" data-testid="landing-cv-backup" onClick={() => downloadBackup([cv], `${fileNameFor(cv)}.thaflow.json`)}>
                          {t("landing.backup")}
                        </Button>
                        <Button small variant="ghost" data-testid="landing-cv-delete" onClick={() => setConfirming(cv.id)}>
                          {t("action.delete")}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>
          </section>
        )}

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            data-testid="landing-restore-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void restore(file);
            }}
          />
          <button type="button" className={quiet} onClick={() => fileInput.current?.click()} data-testid="landing-restore">
            {t("landing.restore")}
          </button>
          {cvs.length > 1 && (
            <button type="button" className={quiet} data-testid="landing-backup-all" onClick={() => downloadBackup(cvs, `thaflow-cv-backup-${new Date().toISOString().slice(0, 10)}.json`)}>
              {t("landing.backupAll")}
            </button>
          )}
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 pb-6 text-sm text-muted">
        <span>{t("landing.family")}</span>
        <Link href="/settings/" className={quiet} data-testid="landing-settings">
          {t("landing.settings")}
        </Link>
      </footer>
    </div>
  );
}
