"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CVDocument } from "@thaflow/cv-core";
import { CVPreview, countPages, type CVTemplate } from "@thaflow/template-engine";

const A4_WIDTH_PX = 793.7; // 210mm at 96dpi
/** Space between two sheets, in the sheets' own pixels (it shrinks with them). */
const SHEET_GAP_PX = 28;

/**
 * On-screen preview: the CV on the A4 sheets it prints on, scaled to fit its container.
 * Every sheet is exactly A4. A CV that needs more room gets a second sheet under the first,
 * and so on, broken where the printed pages break; a sheet never grows instead.
 *
 * `bare` shows the first sheet only and drops its border and shadow, for use inside a card
 * that already has them.
 */
export function ScaledPreview({ cv, template, maxScale = 1, bare }: { cv: CVDocument; template?: CVTemplate; maxScale?: number; bare?: boolean }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [height, setHeight] = useState(0);
  const [counted, setCounted] = useState(1);
  // A browser that cannot break the CV into sheets would cut it off at the foot of the first one.
  // Once that is seen, the CV is shown whole, as one long sheet, for as long as this preview lives.
  const [whole, setWhole] = useState(false);
  const sheets = bare ? 1 : counted;

  const recount = useCallback(() => {
    const pages = countPages(inner.current);
    if (pages === 0) setWhole(true);
    else setCounted(pages);
  }, []);

  // After every render, before it is seen: the words or the template may have changed, and with them the number of sheets.
  useLayoutEffect(() => {
    if (!bare && !whole) recount();
  });

  // The CV's fonts arrive after the first render and change where lines, and so pages, break.
  useEffect(() => {
    if (bare || whole) return;
    document.fonts.addEventListener("loadingdone", recount);
    void document.fonts.ready.then(recount);
    return () => document.fonts.removeEventListener("loadingdone", recount);
  }, [bare, whole, recount]);

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

  const sheetLook = bare ? "bg-paper" : "bg-paper shadow-page ring-1 ring-line";
  return (
    <div ref={outer} style={{ height: height || undefined }} className="w-full overflow-hidden">
      <div
        ref={inner}
        style={{ width: A4_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: "top left", visibility: scale ? "visible" : "hidden" }}
        className="mx-auto"
      >
        {whole ? (
          <div className={sheetLook} data-testid="cv-sheet">
            <CVPreview cv={cv} template={template} />
          </div>
        ) : (
          Array.from({ length: sheets }, (_, page) => (
            <div
              key={page}
              style={page > 0 ? { marginTop: SHEET_GAP_PX } : undefined}
              className={sheetLook}
              // Every sheet holds the whole CV and shows one page of it: only the first is read out.
              aria-hidden={page > 0 || undefined}
              data-testid="cv-sheet"
            >
              <CVPreview cv={cv} template={template} page={page} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
