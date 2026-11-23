"use client";

import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { useApp } from "@/lib/app-context";

export default function NotFound() {
  const { t } = useApp();
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 pt-[14vh]">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] sm:text-[32px]">{t("landing.notFound")}</h1>
        <Link href="/" className="mt-5 inline-block text-[15px] text-ink underline underline-offset-4">
          {t("landing.home")}
        </Link>
      </main>
    </div>
  );
}
