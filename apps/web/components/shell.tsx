"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SUPPORTED_LANGUAGES } from "@thaflow/localization";
import { useApp } from "@/lib/app-context";

/** Header + page frame for the non-editor screens. */
export function Shell({ children }: { children: ReactNode }) {
  const { t, settings, updateSettings } = useApp();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-base font-bold text-slate-900">
            <span aria-hidden className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-sm text-white">T</span>
            ThaFlow CV
          </Link>
          <div className="flex-1" />
          <div className="flex overflow-hidden rounded-lg border border-slate-300 text-xs" role="group" aria-label={t("settings.uiLanguage")}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                lang={lang.code}
                aria-pressed={settings.uiLanguage === lang.code}
                onClick={() => void updateSettings({ uiLanguage: lang.code })}
                className={settings.uiLanguage === lang.code ? "bg-slate-900 px-2.5 py-1.5 text-white" : "bg-white px-2.5 py-1.5 text-slate-700 hover:bg-slate-100"}
              >
                {lang.code === "en" ? "EN" : "ខ្មែរ"}
              </button>
            ))}
          </div>
          <Link href="/settings/" className="rounded-lg px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
            {t("nav.settings")}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
