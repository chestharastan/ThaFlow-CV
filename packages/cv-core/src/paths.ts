import type { CVDocument } from "./schema";

/**
 * Read/write a text field by dot path. Array items are addressed by their
 * stable id: "experiences.<id>.description", or by numeric index for string
 * lists: "experiences.<id>.achievements.0".
 */
function resolve(root: unknown, segments: string[]): unknown {
  let node: unknown = root;
  for (const seg of segments) {
    if (node == null) return undefined;
    if (Array.isArray(node)) {
      node = /^\d+$/.test(seg)
        ? node[Number(seg)]
        : node.find((item) => item && typeof item === "object" && (item as { id?: string }).id === seg);
    } else if (typeof node === "object") {
      node = (node as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return node;
}

export function getTextAtPath(cv: CVDocument, path: string): string | undefined {
  const value = resolve(cv, path.split("."));
  return typeof value === "string" ? value : undefined;
}

/** Returns a new CV with the text at `path` replaced; unchanged CV if the path does not resolve. */
export function setTextAtPath(cv: CVDocument, path: string, text: string): CVDocument {
  const segments = path.split(".");
  const last = segments.pop();
  if (!last) return cv;
  const clone = structuredClone(cv);
  const parent = resolve(clone, segments);
  if (Array.isArray(parent) && /^\d+$/.test(last) && Number(last) < parent.length) {
    parent[Number(last)] = text;
    return clone;
  }
  if (parent && typeof parent === "object" && !Array.isArray(parent)) {
    (parent as Record<string, unknown>)[last] = text;
    return clone;
  }
  return cv;
}
