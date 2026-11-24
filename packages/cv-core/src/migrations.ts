import { CV_SCHEMA_VERSION, SECTION_KEYS, cvDocumentSchema, type CVDocument } from "./schema";

type Migration = (doc: Record<string, unknown>) => Record<string, unknown>;

/**
 * Migrations keyed by the version they upgrade FROM. Add an entry here every
 * time CV_SCHEMA_VERSION is bumped; never mutate old migrations.
 */
const migrations: Record<number, Migration> = {
  // v2 added the personal details section. It leads, as it does in a new CV.
  1: (doc) => {
    const appearance = doc.appearance as { sectionOrder?: unknown } | undefined;
    const order = appearance?.sectionOrder;
    if (!appearance || !Array.isArray(order) || order.includes("personalDetails")) return doc;
    return { ...doc, appearance: { ...appearance, sectionOrder: ["personalDetails", ...order] } };
  },
};

export class CVValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: string[] = [],
  ) {
    super(message);
    this.name = "CVValidationError";
  }
}

/**
 * Upgrade an unknown stored/imported value to the current schema and validate
 * it. Throws CVValidationError when the value is not a usable CV.
 */
export function migrateCV(raw: unknown): CVDocument {
  if (!raw || typeof raw !== "object") {
    throw new CVValidationError("Not a CV document.");
  }
  let doc = raw as Record<string, unknown>;
  const meta = (doc.metadata ?? {}) as Record<string, unknown>;
  let version = typeof meta.version === "number" ? meta.version : 1;
  if (version > CV_SCHEMA_VERSION) {
    throw new CVValidationError(
      `This CV was created with a newer version of ThaFlow CV (schema v${version}).`,
    );
  }
  while (version < CV_SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) throw new CVValidationError(`No migration from schema v${version}.`);
    doc = step(doc);
    version += 1;
  }
  const parsed = cvDocumentSchema.safeParse({
    ...doc,
    metadata: { ...(doc.metadata as object), version: CV_SCHEMA_VERSION },
  });
  if (!parsed.success) {
    throw new CVValidationError(
      "CV data is invalid.",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    );
  }
  const cv = parsed.data;
  // Keep sectionOrder complete so newly added section types always render.
  const order = cv.appearance.sectionOrder.filter((k, i, a) => a.indexOf(k) === i);
  for (const key of SECTION_KEYS) if (!order.includes(key)) order.push(key);
  cv.appearance.sectionOrder = order;
  return cv;
}
