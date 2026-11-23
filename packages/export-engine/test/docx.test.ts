import { describe, expect, it } from "vitest";
import { templates } from "@thaflow/template-engine";
import { khmerCV, sampleCV } from "../../cv-core/test/fixtures";
import { fileNameFor, generateDOCXBuffer } from "../src";

/** Minimal ZIP reader: find a stored/deflated entry and inflate it. */
async function readZipEntry(zip: Uint8Array, name: string): Promise<string> {
  const { inflateRawSync } = await import("node:zlib");
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  for (let i = 0; i < zip.length - 30; i++) {
    if (view.getUint32(i, true) !== 0x04034b50) continue;
    const method = view.getUint16(i + 8, true);
    const size = view.getUint32(i + 18, true);
    const nameLen = view.getUint16(i + 26, true);
    const extraLen = view.getUint16(i + 28, true);
    const entry = new TextDecoder().decode(zip.subarray(i + 30, i + 30 + nameLen));
    if (entry !== name) continue;
    const start = i + 30 + nameLen + extraLen;
    const data = size > 0 ? zip.subarray(start, start + size) : zip.subarray(start);
    return method === 0 ? new TextDecoder().decode(data) : inflateRawSync(data).toString("utf8");
  }
  throw new Error(`${name} not found`);
}

describe("DOCX export", () => {
  it("produces a Word document containing the CV text as editable runs", async () => {
    const xml = await readZipEntry(await generateDOCXBuffer(sampleCV()), "word/document.xml");
    expect(xml).toContain("Sok Dara");
    expect(xml).toContain("Frontend Developer");
    expect(xml).toContain("Jan 2022 – Jun 2024");
    expect(xml).toContain("Migrated the checkout flow to TypeScript");
    expect(xml).toContain("Experience");
  });

  it("writes Khmer text with a Khmer complex-script font", async () => {
    const xml = await readZipEntry(await generateDOCXBuffer(khmerCV()), "word/document.xml");
    expect(xml).toContain("សុខ ដារ៉ា");
    expect(xml).toContain("បទពិសោធន៍ការងារ");
    expect(xml).toMatch(/w:cs="Noto Sans Khmer"/);
  });

  it("escapes markup in user content", async () => {
    const cv = sampleCV();
    cv.summary = 'Uses <script>alert("x")</script> & more';
    const xml = await readZipEntry(await generateDOCXBuffer(cv), "word/document.xml");
    expect(xml).not.toContain("<script>");
    expect(xml).toContain("&lt;script&gt;");
  });

  it("renders with every template", async () => {
    for (const template of templates) {
      const buffer = await generateDOCXBuffer(sampleCV(), template);
      expect(buffer.length).toBeGreaterThan(1000);
    }
  });

  it("builds safe file names", () => {
    expect(fileNameFor(sampleCV())).toBe("Sok-Dara");
    expect(fileNameFor(khmerCV())).toBe("សុខ-ដារ៉ា");
    const cv = sampleCV();
    cv.personal.fullName = "../..\\evil:name";
    expect(fileNameFor(cv)).not.toMatch(/[\\/:]/);
  });
});
