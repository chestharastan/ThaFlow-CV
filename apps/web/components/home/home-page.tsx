"use client";

import Link from "next/link";
import { useMemo, type ComponentType, type ReactNode, type SVGProps } from "react";
import type { MessageKey } from "@thaflow/localization";
import { getTemplate } from "@thaflow/template-engine";
import { LanguageToggle } from "@/components/app-header";
import { DeviceChecklist, DeviceChips, useDevice } from "@/components/device-report";
import { Faq, IconChip, LimitList, ModelList } from "@/components/info";
import { Logo } from "@/components/logo";
import { ScaledPreview } from "@/components/preview";
import { cx } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { sampleCV, useSamplePhoto } from "@/lib/sample-cv";
import { useCVs } from "@/lib/use-cvs";
import {
  ArrowRight,
  Check,
  Download,
  FilePlus,
  Globe,
  Layout,
  ListCheck,
  Lock,
  MessageSquare,
  Phone,
  Sparkle,
  UploadCloud,
  WifiOff,
} from "@/components/icons";
import { Demo } from "./demo";

/*
 * The product page: what ThaFlow CV does, for someone who is not technical, why it is worth using, what
 * runs on their device and what does not work well yet, a check of the device they are holding, and a
 * working demo. Every way forward leads to the dashboard.
 */

const NAV = [
  { id: "features", label: "home.nav.features" },
  { id: "demo", label: "home.nav.demo" },
  { id: "device", label: "home.nav.device" },
  { id: "faq", label: "home.nav.faq" },
] as const;

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const FEATURES: { key: string; icon: IconType }[] = [
  { key: "questions", icon: MessageSquare },
  { key: "import", icon: UploadCloud },
  { key: "designs", icon: Layout },
  { key: "download", icon: Download },
  { key: "check", icon: ListCheck },
  { key: "write", icon: Sparkle },
];

const WHY: { key: string; icon: IconType }[] = [
  { key: "free", icon: Check },
  { key: "private", icon: Lock },
  { key: "offline", icon: WifiOff },
  { key: "khmer", icon: Globe },
  { key: "yours", icon: Download },
  { key: "phone", icon: Phone },
];

const primary =
  "inline-flex h-12 items-center gap-2 rounded-xl border border-brand bg-brand px-6 text-[15px] font-medium text-on-brand shadow-soft transition-colors hover:border-brand-hover hover:bg-brand-hover";
const secondary = "inline-flex h-12 items-center gap-2 rounded-xl border border-line-strong bg-paper px-6 text-[15px] font-medium text-ink shadow-soft transition-colors hover:border-ink";

function Section({ id, index, title, sub, children, className }: { id: string; index: string; title: string; sub?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cx("scroll-mt-20 border-t border-line py-20 sm:py-24", className)} aria-labelledby={`${id}-title`}>
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="mb-4 flex items-center gap-3 text-xs font-medium text-muted tabular-nums">
          <span className="h-px w-6 bg-ink-soft" aria-hidden />
          {index}
        </p>
        <h2 id={`${id}-title`} className="max-w-3xl text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[40px]">
          {title}
        </h2>
        {sub && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{sub}</p>}
        <div className="mt-10 sm:mt-12">{children}</div>
      </div>
    </section>
  );
}

/** Three real CVs, fanned like printed pages: the standard sheet, a dark side column, a colour band. */
function HeroSheets() {
  const { settings } = useApp();
  const photo = useSamplePhoto();
  const cv = useMemo(() => sampleCV(settings.uiLanguage, photo), [settings.uiLanguage, photo]);
  const sheet = "absolute aspect-[210/297] overflow-hidden rounded-md bg-paper shadow-page ring-1 ring-line";
  return (
    <div className="relative mx-auto aspect-[10/9] w-full max-w-[34rem]" aria-hidden>
      <div className={cx(sheet, "left-0 top-[9%] w-[46%] -rotate-[7deg]")}>
        <ScaledPreview cv={cv} template={getTemplate("kravanh")} bare />
      </div>
      <div className={cx(sheet, "right-0 top-[13%] w-[46%] rotate-[6deg]")}>
        <ScaledPreview cv={cv} template={getTemplate("srepok")} bare />
      </div>
      <div className={cx(sheet, "left-[25%] top-0 z-10 w-[50%]")}>
        <ScaledPreview cv={cv} template={getTemplate("sambor")} bare />
      </div>
    </div>
  );
}

export function HomePage() {
  const { t } = useApp();
  const device = useDevice();
  const { cvs } = useCVs();
  const returning = Boolean(cvs && cvs.length > 0);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5 sm:px-8">
          <Link href="/" className="shrink-0 rounded-md py-1" aria-label="ThaFlow CV">
            <Logo />
          </Link>
          <nav className="hidden flex-1 items-center justify-center gap-7 md:flex" aria-label={t("home.nav.label")}>
            {NAV.map((item, i) => (
              <a key={item.id} href={`#${item.id}`} className="flex items-baseline gap-1.5 rounded-md py-1 text-sm text-ink-soft transition-colors hover:text-ink">
                <span className="text-[11px] text-faint tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                {t(item.label)}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <LanguageToggle />
            <Link
              href="/dashboard/"
              className="hidden h-9 items-center rounded-lg border border-line-strong bg-paper px-3.5 text-sm font-medium text-ink shadow-soft transition-colors hover:border-ink sm:inline-flex"
              data-testid="landing-open"
            >
              {t("home.openApp")}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:pb-28">
          <div className="animate-enter">
            <p className="mb-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-muted">
              <span className="h-px w-6 bg-ink-soft" aria-hidden />
              {t("home.eyebrow")}
            </p>
            <h1 className="text-[42px] font-semibold leading-[1.04] tracking-[-0.04em] text-ink sm:text-[60px]">{t("landing.headline")}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">{t("home.sub")}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/dashboard/" className={primary} data-testid="landing-create">
                {t(returning ? "home.continue" : "home.create")}
                <ArrowRight />
              </Link>
              <a href="#demo" className={secondary} data-testid="landing-demo">
                {t("home.seeIt")}
              </a>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium uppercase tracking-[0.12em] text-muted">
              {(["free", "noAccount", "private", "offline", "khmer"] as const).map((tag) => (
                <li key={tag} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-ink-soft" aria-hidden />
                  {t(`home.tag.${tag}`)}
                </li>
              ))}
            </ul>
          </div>
          <HeroSheets />
        </section>

        {/* ---------- What it does ---------- */}
        <Section id="features" index="01" title={t("home.features.title")} sub={t("home.features.sub")}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ key, icon }) => (
              <li key={key} className="rounded-2xl border border-line bg-paper p-6 shadow-soft">
                <IconChip icon={icon} />
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.01em] text-ink">{t(`home.f.${key}.title` as MessageKey)}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{t(`home.f.${key}.text` as MessageKey)}</p>
              </li>
            ))}
          </ul>

          <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3" aria-label={t("home.how.title")}>
            {([1, 2, 3] as const).map((n) => (
              <li key={n} className="bg-canvas p-6 sm:p-7">
                <p className="text-sm font-medium text-muted tabular-nums">{String(n).padStart(2, "0")}</p>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.015em] text-ink">{t(`home.how.${n}.title`)}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{t(`home.how.${n}.text`)}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* ---------- Demo ---------- */}
        <Section id="demo" index="02" title={t("home.demo.title")} sub={t("home.demo.sub")}>
          <Demo />
        </Section>

        {/* ---------- Why here ---------- */}
        <Section id="why" index="03" title={t("home.why.title")} sub={t("home.why.sub")}>
          <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {WHY.map(({ key, icon }) => (
              <li key={key} className="flex gap-4">
                <IconChip icon={icon} />
                <div>
                  <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{t(`home.why.${key}.title` as MessageKey)}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{t(`home.why.${key}.text` as MessageKey)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* ---------- What runs where ---------- */}
        <Section id="models" index="04" title={t("home.models.title")} sub={t("home.models.sub")}>
          <ModelList />
        </Section>

        {/* ---------- This device ---------- */}
        <Section id="device" index="05" title={t("home.device.title")} sub={t("home.device.sub")}>
          <DeviceChips info={device} className="mb-5" />
          <DeviceChecklist info={device} />
          <p className="mt-4 text-sm text-muted">{t("device.estimate")}</p>
        </Section>

        {/* ---------- Limits ---------- */}
        <Section id="limits" index="06" title={t("home.limits.title")} sub={t("home.limits.sub")}>
          <LimitList />
        </Section>

        {/* ---------- Questions ---------- */}
        <Section id="faq" index="07" title={t("home.faq.title")}>
          <Faq />
        </Section>

        {/* ---------- Start ---------- */}
        <section className="border-t border-line py-20 sm:py-24">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 sm:px-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[40px]">{t("home.cta.title")}</h2>
              <p className="mt-3 text-lg text-ink-soft">{t("home.cta.text")}</p>
            </div>
            <Link href="/dashboard/" className={primary} data-testid="landing-start">
              <FilePlus />
              {t(returning ? "home.continue" : "home.create")}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:px-8">
          <span>{t("landing.family")}</span>
          <div className="flex gap-5">
            <Link href="/dashboard/" className="rounded-md py-1 transition-colors hover:text-ink">
              {t("home.openApp")}
            </Link>
            <Link href="/settings/" className="rounded-md py-1 transition-colors hover:text-ink" data-testid="landing-settings">
              {t("landing.settings")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
