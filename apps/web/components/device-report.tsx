"use client";

import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { OCR_DOWNLOAD_BYTES, modelsAreCached } from "@thaflow/import-engine/models";
import type { MessageKey } from "@thaflow/localization";
import { useAI } from "@/lib/ai";
import { useApp } from "@/lib/app-context";
import { assessDevice, detectDevice, detectNow, readingEstimate, type Capability, type DeviceInfo, type Verdict } from "@/lib/device";
import { MODEL_BASE } from "@/lib/ocr";
import { AlertCircle, CheckCircle, Clock, Cpu, Download, MinusCircle, Phone, WifiOff, XCircle } from "./icons";
import { cx } from "./ui";

/** What this device can do. Null until the page is running in the browser. */
export function useDevice(): DeviceInfo | null {
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  useEffect(() => {
    let live = true;
    const check = () => void detectDevice(() => modelsAreCached(MODEL_BASE)).then((next) => live && setInfo(next));
    setInfo(detectNow());
    check();
    // The app becomes available offline once the service worker takes over this page.
    navigator.serviceWorker?.addEventListener("controllerchange", check);
    return () => {
      live = false;
      navigator.serviceWorker?.removeEventListener("controllerchange", check);
    };
  }, []);
  return info;
}

/** The capabilities, with the AI setting folded in. */
export function useCapabilities(info: DeviceInfo | null): Capability[] | null {
  const { state } = useAI();
  return info ? assessDevice(info, { cloudReady: state === "cloud-ready" }, OCR_DOWNLOAD_BYTES) : null;
}

const chip = "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-paper px-3 text-[13px] text-ink-soft";

/** The short version, as a row of chips: the device, the reader, its speed, and offline use. */
export function DeviceChips({ info, className }: { info: DeviceInfo | null; className?: string }) {
  const { t } = useApp();
  if (!info) {
    return (
      <div className={cx("flex flex-wrap gap-2", className)} data-testid="device-chips">
        <span className={cx(chip, "text-muted")}>{t("device.checking")}</span>
      </div>
    );
  }
  const estimate = readingEstimate(info);
  const machine = [
    info.threads ? t("device.chip.cores", { threads: info.threads }) : "",
    info.memoryGB ? t("device.chip.memory", { memory: info.memoryGB }) : "",
  ].filter(Boolean);
  const size = Math.round(OCR_DOWNLOAD_BYTES / 1_000_000);
  return (
    <div className={cx("flex flex-wrap gap-2", className)} data-testid="device-chips">
      <span className={chip} title={t(info.phone ? "device.chip.phone" : "device.chip.computer")}>
        {info.phone ? <Phone width={15} height={15} /> : <Cpu width={15} height={15} />}
        {[t(info.phone ? "device.chip.phone" : "device.chip.computer"), ...machine].join(" · ")}
      </span>
      {!info.webAssembly ? (
        <span className={cx(chip, "text-danger")}>
          <XCircle width={15} height={15} />
          {t("device.chip.readerNo")}
        </span>
      ) : info.readerCached ? (
        <span className={cx(chip, "border-ok/25 text-ok")} data-testid="device-reader">
          <CheckCircle width={15} height={15} />
          {t("device.chip.readerReady")}
        </span>
      ) : (
        <span className={chip} data-testid="device-reader">
          <Download width={15} height={15} />
          {t("device.chip.readerDownload", { size })}
        </span>
      )}
      {estimate && (
        <span className={chip} title={t("device.estimate")}>
          <Clock width={15} height={15} />
          {t("device.chip.speed", { low: estimate.low, high: estimate.high })}
        </span>
      )}
      {info.serviceWorker && (
        <span className={chip}>
          <WifiOff width={15} height={15} />
          {t(info.offlineReady ? "device.chip.offline" : "device.chip.offlineSoon")}
        </span>
      )}
    </div>
  );
}

const VERDICT: Record<Verdict, { icon: ComponentType<SVGProps<SVGSVGElement>>; className: string; label: MessageKey }> = {
  yes: { icon: CheckCircle, className: "text-ok", label: "device.verdict.yes" },
  maybe: { icon: AlertCircle, className: "text-warn", label: "device.verdict.maybe" },
  no: { icon: XCircle, className: "text-danger", label: "device.verdict.no" },
  off: { icon: MinusCircle, className: "text-muted", label: "device.verdict.off" },
};

/** The full answer: each thing a person might want to do, and whether this device can. */
export function DeviceChecklist({ info, className }: { info: DeviceInfo | null; className?: string }) {
  const { t } = useApp();
  const capabilities = useCapabilities(info);
  if (!capabilities) {
    return (
      <p className={cx("text-sm text-muted", className)} role="status">
        {t("device.checking")}
      </p>
    );
  }
  return (
    <ul className={cx("divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper", className)} data-testid="device-check">
      {capabilities.map((capability) => {
        const verdict = VERDICT[capability.verdict];
        const Icon = verdict.icon;
        return (
          <li key={capability.id} className="flex gap-3 px-4 py-3.5 sm:px-5" data-testid={`device-${capability.id}`} data-verdict={capability.verdict}>
            <Icon width={20} height={20} className={cx("mt-0.5 shrink-0", verdict.className)} aria-hidden />
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-ink">
                {t(`device.${capability.id}.title` as MessageKey)}
                <span className="sr-only">: {t(verdict.label)}</span>
              </p>
              <p className="text-sm text-muted">{t(capability.note, capability.values)}</p>
              {capability.extra && <p className="mt-0.5 text-sm text-warn">{t(capability.extra)}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
