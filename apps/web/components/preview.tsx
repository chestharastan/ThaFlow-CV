"use client";

import { useEffect, useRef, useState } from "react";
import type { CVDocument } from "@thaflow/cv-core";
import { CVPreview, type CVTemplate } from "@thaflow/template-engine";

const A4_WIDTH_PX = 793.7; // 210mm at 96dpi

/** On-screen preview: the real A4 render, scaled to fit its container. */
export function ScaledPreview({ cv, template, maxScale = 1 }: { cv: CVDocument; template?: CVTemplate; maxScale?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const next = Math.min(maxScale, outer.current.clientWidth / A4_WIDTH_PX);
      setScale(next);
      setHeight(inner.current.offsetHeight * next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (outer.current) observer.observe(outer.current);
    if (inner.current) observer.observe(inner.current);
    return () => observer.disconnect();
  }, [maxScale]);

  return (
    <div ref={outer} style={{ height: height || undefined }} className="w-full overflow-hidden">
      <div
        ref={inner}
        style={{ width: A4_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: "top left", visibility: scale ? "visible" : "hidden" }}
        className="mx-auto shadow-lg ring-1 ring-slate-200"
      >
        <CVPreview cv={cv} template={template} />
      </div>
    </div>
  );
}
