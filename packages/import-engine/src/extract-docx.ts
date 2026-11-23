import JSZip from "jszip";
import { ImportError } from "./types";
import { tidy, type Line } from "./lines";

/** Refuse to inflate more than this from one archive entry (zip-bomb guard). */
const MAX_XML_CHARS = 8 * 1024 * 1024;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decode(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENTITIES[code] ?? whole;
  });
}

const on = (xml: string, tag: string) => new RegExp(`<w:${tag}(?:\\s[^>]*)?/>|<w:${tag}(?:\\s[^>]*)?>`).test(xml) && !new RegExp(`<w:${tag}\\s[^>]*w:val="(?:0|false)"`).test(xml);

/** Read the paragraphs of a .docx file. Runs entirely in memory; nothing is fetched. */
export async function extractDocxLines(bytes: Uint8Array): Promise<Line[]> {
  let xml: string;
  try {
    const zip = await JSZip.loadAsync(bytes);
    const entry = zip.file("word/document.xml");
    if (!entry) throw new ImportError("unsupported-type");
    const declared = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
    if (typeof declared === "number" && declared > MAX_XML_CHARS) throw new ImportError("too-large");
    xml = await entry.async("string");
    if (xml.length > MAX_XML_CHARS) throw new ImportError("too-large");
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError("corrupt");
  }

  const lines: Line[] = [];
  for (const [paragraph] of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const props = /<w:pPr>[\s\S]*?<\/w:pPr>/.exec(paragraph)?.[0] ?? "";
    const style = /<w:pStyle w:val="([^"]+)"/.exec(props)?.[1] ?? "";
    const heading = /^(heading|title)/i.test(style);
    const bullet = /<w:numPr>/.test(props) || /list/i.test(style);
    let text = "";
    let sized = 0;
    let boldChars = 0;
    let chars = 0;
    for (const [run] of paragraph.matchAll(/<w:r[ >][\s\S]*?<\/w:r>/g)) {
      const runProps = /<w:rPr>[\s\S]*?<\/w:rPr>/.exec(run)?.[0] ?? "";
      const bold = on(runProps, "b");
      const size = Number(/<w:sz w:val="(\d+)"/.exec(runProps)?.[1] ?? 0) / 2;
      for (const token of run.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<w:cr\/>/g)) {
        if (token[1] !== undefined) {
          const piece = decode(token[1]);
          text += piece;
          const n = piece.trim().length;
          chars += n;
          if (bold) boldChars += n;
          if (n && size > sized) sized = size;
        } else text += token[0] === "<w:tab/>" ? "\t" : "\n";
      }
    }
    for (const part of text.split("\n")) {
      const [left = "", ...rest] = part.split("\t");
      const main = tidy(left);
      const right = tidy(rest.join(" "));
      if (!main && !right) continue;
      lines.push({
        text: main || right,
        ...(main && right ? { right } : {}),
        ...(sized ? { size: sized } : {}),
        ...(chars > 0 && boldChars / chars > 0.6 ? { emph: true } : {}),
        ...(heading ? { heading: true } : {}),
        ...(bullet ? { bullet: true } : {}),
      });
    }
  }
  return lines;
}
