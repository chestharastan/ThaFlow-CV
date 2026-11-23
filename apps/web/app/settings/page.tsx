"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { SUPPORTED_LANGUAGES } from "@thaflow/localization";
import { AppHeader } from "@/components/app-header";
import { ArrowLeft } from "@/components/icons";
import { Button, Card, Field, Select, TextInput, cx } from "@/components/ui";
import { localProvider, useAI } from "@/lib/ai";
import { getStore, useApp } from "@/lib/app-context";

function Group({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      {intro && <p className="mt-1 text-sm text-muted">{intro}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </Card>
  );
}

/** A selectable option row: cream fill and ink border when chosen, as in the rest of the ThaFlow family. */
function Option(props: { name: string; checked: boolean; disabled?: boolean; onSelect(): void; title: string; help: string; testId?: string }) {
  return (
    <label
      className={cx(
        "flex cursor-pointer gap-3 rounded-xl border px-4 py-3 transition-colors",
        props.checked ? "border-ink bg-cream" : "border-line bg-paper hover:border-line-strong",
        props.disabled && "cursor-not-allowed opacity-55 hover:border-line",
      )}
    >
      <input
        type="radio"
        name={props.name}
        checked={props.checked}
        disabled={props.disabled}
        onChange={props.onSelect}
        data-testid={props.testId}
        className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-ink)]"
      />
      <span>
        <span className="block text-sm font-medium text-ink">{props.title}</span>
        <span className="block text-sm text-muted">{props.help}</span>
      </span>
    </label>
  );
}

export default function SettingsPage() {
  const { t, settings, updateSettings, reloadSettings } = useApp();
  const { state } = useAI();
  const [endpoint, setEndpoint] = useState(settings.ai.cloudEndpoint);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<number | null>(null);

  useEffect(() => setEndpoint(settings.ai.cloudEndpoint), [settings.ai.cloudEndpoint]);
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersistent).catch(() => {});
    void navigator.storage?.estimate?.().then((e) => setUsage(e.usage ?? null)).catch(() => {});
  }, [cleared]);

  const endpointValid = (() => {
    if (!endpoint.trim()) return true;
    try {
      return ["https:", "http:"].includes(new URL(endpoint.trim()).protocol);
    } catch {
      return false;
    }
  })();
  const { mode, cloudConsent } = settings.ai;

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-16 pt-4 sm:pt-8">
        <Link href="/" className="-ml-2 inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm text-muted transition-colors hover:text-ink">
          <ArrowLeft />
          {t("settings.back")}
        </Link>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.025em] sm:text-[32px]">{t("settings.title")}</h1>

        <div className="mt-6 space-y-4">
          <Group title={t("settings.uiLanguage")}>
            <Field label={t("settings.uiLanguage")} hint={t("settings.uiLanguageHint")}>
              {(id) => (
                <Select id={id} value={settings.uiLanguage} onChange={(e) => void updateSettings({ uiLanguage: e.target.value as "en" | "km" })}>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </Group>

          <Group title={t("settings.ai")} intro={t("settings.aiIntro")}>
            <fieldset className="space-y-2">
              <legend className="sr-only">{t("settings.ai")}</legend>
              <Option name="ai-mode" checked={mode === "off"} onSelect={() => void updateSettings({ ai: { mode: "off" } })} title={t("settings.aiOff")} help={t("settings.aiOffHelp")} testId="ai-off" />
              <Option
                name="ai-mode"
                checked={mode === "local"}
                disabled={!localProvider.hasRuntime}
                onSelect={() => void updateSettings({ ai: { mode: "local" } })}
                title={t("settings.aiLocal")}
                help={localProvider.hasRuntime ? t("settings.aiLocalHelp") : t("settings.aiLocalMissing")}
              />
              <Option name="ai-mode" checked={mode === "cloud"} onSelect={() => void updateSettings({ ai: { mode: "cloud" } })} title={t("settings.aiCloud")} help={t("settings.aiCloudHelp")} testId="ai-cloud" />
            </fieldset>

            {mode === "cloud" && (
              <div className="space-y-4 rounded-xl bg-surface p-4">
                <Field label={t("settings.endpoint")} error={endpointValid ? undefined : t("settings.endpointInvalid")}>
                  {(id) => (
                    <TextInput
                      id={id}
                      type="url"
                      value={endpoint}
                      placeholder="https://ai.example.com"
                      invalid={!endpointValid}
                      onChange={(e) => setEndpoint(e.target.value)}
                      onBlur={() => endpointValid && void updateSettings({ ai: { cloudEndpoint: endpoint.trim() } })}
                      data-testid="ai-endpoint"
                    />
                  )}
                </Field>
                <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
                  <li>{t("settings.consent1")}</li>
                  <li>{t("settings.consent2")}</li>
                  <li>{t("settings.consent3")}</li>
                </ul>
                <label className="flex items-start gap-2.5 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-ink)]"
                    checked={cloudConsent}
                    onChange={(e) => void updateSettings({ ai: { cloudConsent: e.target.checked } })}
                    data-testid="ai-consent"
                  />
                  {t("settings.consentCheck")}
                </label>
              </div>
            )}
            <p className="flex items-center gap-2 text-sm text-muted" role="status" data-testid="ai-state">
              <span className={cx("inline-block h-2 w-2 rounded-full", state === "unavailable" ? "bg-line-strong" : "bg-ok")} aria-hidden />
              {t(state === "local-ready" ? "settings.stateLocal" : state === "cloud-ready" ? "settings.stateCloud" : "settings.stateNone")}
            </p>
          </Group>

          <Group title={t("settings.data")} intro={t("settings.dataIntro")}>
            {(persistent !== null || usage !== null) && (
              <p className="text-sm text-muted">
                {[persistent === null ? "" : persistent ? t("settings.persistent") : t("settings.notPersistent"), usage !== null ? t("settings.usage", { size: (usage / 1024 / 1024).toFixed(1) }) : ""].filter(Boolean).join(" · ")}
              </p>
            )}
            {cleared && (
              <p role="status" className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">
                {t("settings.cleared")}
              </p>
            )}
            {confirmClear ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-danger-soft p-3" role="alertdialog" aria-label={t("settings.clearConfirm")}>
                <p className="min-w-[12rem] flex-1 text-sm text-danger">{t("settings.clearConfirm")}</p>
                <Button
                  variant="danger"
                  data-testid="confirm-clear"
                  onClick={async () => {
                    await getStore().clearAllData();
                    await reloadSettings();
                    setConfirmClear(false);
                    setCleared(true);
                  }}
                >
                  {t("settings.clearYes")}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmClear(false)}>
                  {t("action.cancel")}
                </Button>
              </div>
            ) : (
              <Button
                variant="danger"
                data-testid="clear-data"
                onClick={() => {
                  setConfirmClear(true);
                  setCleared(false);
                }}
              >
                {t("settings.clear")}
              </Button>
            )}
          </Group>
        </div>
      </main>
    </div>
  );
}
