"use client";

import { useEffect, useState } from "react";
import { SUPPORTED_LANGUAGES } from "@thaflow/localization";
import { Shell } from "@/components/shell";
import { Button, Card, Field, Select, TextInput } from "@/components/ui";
import { localProvider, useAI } from "@/lib/ai";
import { getStore, useApp } from "@/lib/app-context";

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
  const radio = "mt-0.5 h-4 w-4 accent-[var(--color-brand-600)]";

  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("nav.settings")}</h1>

        <Card className="p-5">
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
        </Card>

        <Card className="space-y-4 p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{t("settings.ai")}</h2>
            <p className="mt-1 text-sm text-slate-600">{t("settings.aiIntro")}</p>
          </div>
          <fieldset className="space-y-3">
            <legend className="sr-only">{t("settings.ai")}</legend>
            <label className="flex gap-3 text-sm">
              <input type="radio" name="ai-mode" className={radio} checked={mode === "off"} onChange={() => void updateSettings({ ai: { mode: "off" } })} data-testid="ai-off" />
              <span>
                <span className="block font-medium text-slate-900">{t("settings.aiOff")}</span>
                <span className="block text-slate-500">{t("settings.aiOffHelp")}</span>
              </span>
            </label>
            <label className="flex gap-3 text-sm">
              <input type="radio" name="ai-mode" className={radio} checked={mode === "local"} disabled={!localProvider.hasRuntime} onChange={() => void updateSettings({ ai: { mode: "local" } })} />
              <span className={localProvider.hasRuntime ? "" : "opacity-60"}>
                <span className="block font-medium text-slate-900">{t("settings.aiLocal")}</span>
                <span className="block text-slate-500">{localProvider.hasRuntime ? t("settings.aiLocalHelp") : t("settings.aiLocalMissing")}</span>
              </span>
            </label>
            <label className="flex gap-3 text-sm">
              <input type="radio" name="ai-mode" className={radio} checked={mode === "cloud"} onChange={() => void updateSettings({ ai: { mode: "cloud" } })} data-testid="ai-cloud" />
              <span>
                <span className="block font-medium text-slate-900">{t("settings.aiCloud")}</span>
                <span className="block text-slate-500">{t("settings.aiCloudHelp")}</span>
              </span>
            </label>
          </fieldset>

          {mode === "cloud" && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <Field label={t("settings.endpoint")} hint={t("settings.endpointHint")} error={endpointValid ? undefined : t("settings.endpointInvalid")}>
                {(id) => (
                  <TextInput id={id} type="url" value={endpoint} placeholder="https://ai.example.com" invalid={!endpointValid} onChange={(e) => setEndpoint(e.target.value)} onBlur={() => endpointValid && void updateSettings({ ai: { cloudEndpoint: endpoint.trim() } })} data-testid="ai-endpoint" />
                )}
              </Field>
              <div className="text-sm text-slate-700">
                <p className="font-medium">{t("settings.consentTitle")}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600">
                  <li>{t("settings.consent1")}</li>
                  <li>{t("settings.consent2")}</li>
                  <li>{t("settings.consent3")}</li>
                </ul>
              </div>
              <label className="flex items-start gap-2 text-sm font-medium text-slate-900">
                <input type="checkbox" className={radio} checked={cloudConsent} onChange={(e) => void updateSettings({ ai: { cloudConsent: e.target.checked } })} data-testid="ai-consent" />
                {t("settings.consentCheck")}
              </label>
            </div>
          )}
          <p className="text-sm" role="status" data-testid="ai-state">
            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${state === "unavailable" ? "bg-slate-400" : "bg-emerald-500"}`} aria-hidden />
            {t(state === "local-ready" ? "settings.stateLocal" : state === "cloud-ready" ? "settings.stateCloud" : "settings.stateNone")}
          </p>
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="text-base font-semibold text-slate-900">{t("settings.data")}</h2>
          <p className="text-sm text-slate-600">{t("settings.dataIntro")}</p>
          <p className="text-xs text-slate-500">
            {persistent === null ? "" : persistent ? t("settings.persistent") : t("settings.notPersistent")}
            {usage !== null ? ` · ${t("settings.usage", { size: (usage / 1024 / 1024).toFixed(1) })}` : ""}
          </p>
          {cleared && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{t("settings.cleared")}</p>}
          {confirmClear ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3" role="alertdialog" aria-label={t("settings.clearConfirm")}>
              <p className="flex-1 text-sm text-red-800">{t("settings.clearConfirm")}</p>
              <Button variant="danger" onClick={async () => {
                await getStore().clearAllData();
                await reloadSettings();
                setConfirmClear(false);
                setCleared(true);
              }} data-testid="confirm-clear">
                {t("settings.clearYes")}
              </Button>
              <Button onClick={() => setConfirmClear(false)}>{t("action.cancel")}</Button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => { setConfirmClear(true); setCleared(false); }} data-testid="clear-data">
              {t("settings.clear")}
            </Button>
          )}
        </Card>
      </div>
    </Shell>
  );
}
