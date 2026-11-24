"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SUPPORTED_LANGUAGES } from "@thaflow/localization";
import { useApp } from "@/lib/app-context";
import { Logo } from "./logo";
import { cx } from "./ui";

/** Text-only interface language switch. */
export function LanguageToggle({ className }: { className?: string }) {
  const { settings, updateSettings } = useApp();
  return (
    <div className={cx("flex items-center gap-0.5 text-sm", className)} role="group" aria-label="Language">
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = settings.uiLanguage === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            lang={lang.code}
            aria-pressed={active}
            onClick={() => void updateSettings({ uiLanguage: lang.code })}
            className={cx("rounded-md px-2 py-1.5 transition-colors", active ? "font-semibold text-ink" : "text-muted hover:text-ink")}
          >
            {lang.code === "en" ? "EN" : "ខ្មែរ"}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The header of the focused screens (questions, template chooser): logo on the left (back to the dashboard), optional
 * content in the middle, actions on the right. No background, no border.
 */
export function AppHeader({ center, children, className }: { center?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <header className={cx("flex h-14 shrink-0 items-center gap-3 px-4 sm:px-6", className)}>
      <Link href="/dashboard/" className="rounded-md py-1" aria-label="ThaFlow CV">
        <Logo />
      </Link>
      <div className="min-w-0 flex-1">{center}</div>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </header>
  );
}
