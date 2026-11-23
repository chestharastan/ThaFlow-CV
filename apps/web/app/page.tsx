"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CVValidationError, parseBackup, type CVDocument } from "@thaflow/cv-core";
import { downloadBackup, fileNameFor } from "@thaflow/export-engine";
import { computeCompleteness } from "@thaflow/rule-engine";
import { getTemplate } from "@thaflow/template-engine";
import { ScaledPreview } from "@/components/preview";
import { Shell } from "@/components/shell";
import { Button, Card } from "@/components/ui";
import { getStore, useApp } from "@/lib/app-context";

export default function HomePage() {
  const { t, settings } = useApp();
  const router = useRouter();
  const [cvs, setCvs] = useState<CVDocument[] | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      setCvs(await getStore().listCVs());
    } catch {
      setCvs([]);
      setNotice({ kind: "error", text: t("home.storageError") });
    }
  }, [t]);

  useEffect(() => void reload(), [reload]);

  const importFile = async (file: File) => {
    try {
      if (file.size > 20 * 1024 * 1024) throw new CVValidationError("too large");
      const imported = parseBackup(await file.text());
      for (const cv of imported) await getStore().saveCV(cv);
      setNotice({ kind: "ok", text: t("home.imported", { count: imported.length }) });
      await reload();
    } catch {
      setNotice({ kind: "error", text: t("home.importFailed") });
    }
  };

  const dateFormat = new Intl.DateTimeFormat(settings.uiLanguage === "km" ? "km-KH" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("home.title")}</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">{t("home.privacy")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void importFile(file);
          }} data-testid="import-input" />
          <Button onClick={() => fileInput.current?.click()}>{t("home.import")}</Button>
          {cvs && cvs.length > 0 && <Button onClick={() => downloadBackup(cvs, `thaflow-cv-backup-${new Date().toISOString().slice(0, 10)}.json`)}>{t("home.backupAll")}</Button>}
          <Button variant="primary" onClick={() => router.push("/create/")} data-testid="new-cv">
            + {t("home.new")}
          </Button>
        </div>
      </div>

      {notice && (
        <p role="status" className={`mb-4 rounded-lg px-3 py-2 text-sm ${notice.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {notice.text}
        </p>
      )}

      {cvs === null ? (
        <p className="text-sm text-slate-500">{t("common.loading")}</p>
      ) : cvs.length === 0 ? (
        <Card className="px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-slate-900">{t("home.emptyTitle")}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{t("home.emptyBody")}</p>
          <Button variant="primary" className="mt-5" onClick={() => router.push("/create/")}>
            + {t("home.new")}
          </Button>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cvs.map((cv) => (
            <li key={cv.id}>
              <Card className="flex h-full flex-col overflow-hidden">
                <Link href={`/editor/?id=${cv.id}`} className="block h-44 overflow-hidden bg-slate-100" aria-label={`${t("home.open")}: ${cv.metadata.title}`}>
                  <div className="pointer-events-none px-6 pt-4">
                    <ScaledPreview cv={cv} />
                  </div>
                </Link>
                <div className="flex flex-1 flex-col gap-2 border-t border-slate-100 p-3">
                  <div>
                    <h2 className="truncate text-sm font-semibold text-slate-900">{cv.metadata.title}</h2>
                    <p className="text-xs text-slate-500">
                      {getTemplate(cv.appearance.templateId).name} · {cv.metadata.language === "km" ? "ខ្មែរ" : "English"} · {computeCompleteness(cv)}%
                    </p>
                    <p className="text-xs text-slate-400">{t("home.updated", { date: dateFormat.format(new Date(cv.metadata.updatedAt)) })}</p>
                  </div>
                  {confirmDelete === cv.id ? (
                    <div className="flex items-center gap-2 text-xs" role="alertdialog" aria-label={t("home.deleteConfirm")}>
                      <span className="flex-1 text-red-700">{t("home.deleteConfirm")}</span>
                      <Button small variant="danger" onClick={async () => {
                        await getStore().deleteCV(cv.id);
                        setConfirmDelete(null);
                        await reload();
                      }} data-testid="confirm-delete">
                        {t("action.delete")}
                      </Button>
                      <Button small onClick={() => setConfirmDelete(null)}>{t("action.cancel")}</Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      <Button small variant="primary" onClick={() => router.push(`/editor/?id=${cv.id}`)}>{t("home.open")}</Button>
                      <Button small onClick={async () => {
                        await getStore().duplicateCV(cv.id, ` (${t("home.copy")})`);
                        await reload();
                      }}>{t("home.duplicate")}</Button>
                      <Button small onClick={() => downloadBackup([cv], `${fileNameFor(cv)}.thaflow.json`)}>{t("home.backup")}</Button>
                      <Button small variant="ghost" onClick={() => setConfirmDelete(cv.id)} className="hover:text-red-600" data-testid="delete-cv">{t("action.delete")}</Button>
                    </div>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
