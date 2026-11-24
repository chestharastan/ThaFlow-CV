"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import type { MessageKey } from "@thaflow/localization";
import { LanguageToggle } from "@/components/app-header";
import { useDevice } from "@/components/device-report";
import { Close, FilePlus, Files, Help, Layout, Menu, Shield, SidebarToggle, Sliders } from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { cx } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { useCVs } from "@/lib/use-cvs";

/*
 * The app around the work, in the ThaOCR layout: a quiet sidebar with the places to go, a privacy line at
 * its foot, and the page beside it. The question flow, the template chooser and the editor stay
 * full-screen and focused; they lead back here.
 */

interface NavItem {
  href: string;
  label: MessageKey;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  testId: string;
  count?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard/", label: "dash.nav.new", icon: FilePlus, testId: "nav-new" },
  { href: "/dashboard/cvs/", label: "dash.nav.cvs", icon: Files, testId: "nav-cvs", count: true },
  { href: "/dashboard/templates/", label: "dash.nav.templates", icon: Layout, testId: "nav-templates" },
  { href: "/settings/", label: "dash.nav.settings", icon: Sliders, testId: "nav-settings" },
];
const HELP: NavItem = { href: "/dashboard/help/", label: "dash.nav.help", icon: Help, testId: "nav-help" };

const COLLAPSED_KEY = "thaflow-cv:sidebar-collapsed";

const strip = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

function isActive(pathname: string, href: string): boolean {
  const here = strip(pathname);
  const target = strip(href);
  return target === "/dashboard" ? here === target : here === target || here.startsWith(`${target}/`);
}

function NavLink({ item, collapsed, count, onNavigate }: { item: NavItem; collapsed: boolean; count?: number; onNavigate?: () => void }) {
  const { t } = useApp();
  const pathname = usePathname() ?? "";
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  const label = t(item.label);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      data-testid={item.testId}
      className={cx(
        "flex h-10 items-center gap-3 rounded-lg text-[15px] transition-colors",
        collapsed ? "justify-center px-0" : "px-3",
        active ? "bg-cream font-medium text-ink" : "text-ink-soft hover:bg-surface hover:text-ink",
      )}
    >
      <Icon width={18} height={18} className="shrink-0" />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && count !== undefined && count > 0 && (
        <span className="rounded-full bg-surface px-2 text-xs leading-5 text-muted tabular-nums" data-testid={`${item.testId}-count`}>
          {count}
        </span>
      )}
    </Link>
  );
}

function SidebarBody({ collapsed, onToggle, onClose }: { collapsed: boolean; onToggle?: () => void; onClose?: () => void }) {
  const { t } = useApp();
  const { cvs } = useCVs();
  const device = useDevice();
  const status = device?.offlineReady ? t("dash.status.offline") : t("dash.status.device");
  return (
    <div className="flex h-full flex-col">
      <div className={cx("flex gap-2 px-3 pt-3", collapsed ? "flex-col items-center" : "h-16 items-center")}>
        <Link href="/" className={cx("flex min-w-0 items-center gap-2.5 rounded-lg p-1", !collapsed && "flex-1")} aria-label={t("dash.about")} title={t("dash.about")}>
          <LogoMark className="h-9 w-9 drop-shadow-[0_0_0.5px_rgba(20,20,20,0.35)]" />
          {!collapsed && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-semibold tracking-[-0.01em] text-ink" lang="en">
                ThaFlow CV
              </span>
              <span className="block truncate text-xs text-muted">{t("dash.subtitle")}</span>
            </span>
          )}
        </Link>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={t(collapsed ? "dash.expand" : "dash.collapse")}
            title={t(collapsed ? "dash.expand" : "dash.collapse")}
            aria-expanded={!collapsed}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink"
            data-testid="sidebar-toggle"
          >
            <SidebarToggle />
          </button>
        )}
        {onClose && (
          <button type="button" onClick={onClose} aria-label={t("dash.close")} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink" autoFocus>
            <Close />
          </button>
        )}
      </div>

      <nav className="mt-3 flex-1 space-y-1 px-3" aria-label={t("dash.nav.label")}>
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} count={item.count ? cvs?.length : undefined} onNavigate={onClose} />
        ))}
      </nav>

      <div className="px-3 pb-3">
        <NavLink item={HELP} collapsed={collapsed} onNavigate={onClose} />
        <div
          className={cx("mt-2 flex items-center gap-2 border-t border-line pt-3 text-xs text-muted", collapsed ? "justify-center" : "px-2")}
          title={`${t("dash.status.private")} · ${status}`}
          data-testid="sidebar-status"
        >
          <Shield width={15} height={15} className="shrink-0" />
          {!collapsed && (
            <span className="truncate">
              {t("dash.status.private")} · {status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { t } = useApp();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      // Storage blocked: start expanded.
    }
  }, []);
  const toggle = () => {
    setCollapsed((was) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, was ? "0" : "1");
      } catch {
        // Not remembered; it still works for this visit.
      }
      return !was;
    });
  };

  // The phone menu closes when a page is chosen, and with Escape.
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <div className="flex min-h-dvh">
      <aside className={cx("sticky top-0 hidden h-dvh shrink-0 border-r border-line transition-[width] duration-200 md:block", collapsed ? "w-[4.5rem]" : "w-60")} data-testid="sidebar">
        <SidebarBody collapsed={collapsed} onToggle={toggle} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phones: a bar with the menu, since there is no room for the sidebar. */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3 md:hidden">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label={t("dash.menu")}
            aria-expanded={drawer}
            className="grid h-10 w-10 place-items-center rounded-lg text-ink-soft hover:bg-surface"
            data-testid="menu-open"
          >
            <Menu />
          </button>
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg" aria-label={t("dash.about")}>
            <LogoMark className="h-8 w-8 drop-shadow-[0_0_0.5px_rgba(20,20,20,0.35)]" />
            <span className="truncate text-[15px] font-semibold text-ink" lang="en">
              ThaFlow CV
            </span>
          </Link>
          <LanguageToggle />
        </header>

        <div className="hidden justify-end px-6 pt-4 md:flex lg:px-10">
          <div className="rounded-xl border border-line bg-paper p-0.5 shadow-soft">
            <LanguageToggle />
          </div>
        </div>

        <main className="w-full max-w-[80rem] flex-1 px-4 pb-16 pt-6 sm:px-6 md:pt-2 lg:px-10">{children}</main>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label={t("dash.menu")}>
          <button type="button" className="absolute inset-0 bg-ink/25" aria-label={t("dash.close")} tabIndex={-1} onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-canvas shadow-pop">
            <SidebarBody collapsed={false} onClose={() => setDrawer(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

/** The title of a dashboard page, its one-line purpose, and anything that belongs beside it. */
export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[32px]">{title}</h1>
        {sub && <p className="mt-1.5 text-[15px] text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** The privacy line under the work, as on ThaOCR. */
export function PrivacyNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 flex items-start gap-2 text-sm text-muted" data-testid="privacy-note">
      <Shield width={16} height={16} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}
