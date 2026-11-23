"use client";

import { useState, type ReactNode } from "react";
import type { RewriteKind } from "@thaflow/ai-engine";
import {
  createAward,
  createCertification,
  createCustomSection,
  createEducation,
  createExperience,
  createId,
  createLanguageSkill,
  createProject,
  createReference,
  createSkillGroup,
  type CVDocument,
  type SectionKey,
} from "@thaflow/cv-core";
import type { MessageKey } from "@thaflow/localization";
import { useApp } from "@/lib/app-context";
import { useEditor } from "@/lib/editor-store";
import { AIAssist } from "./ai-assist";
import { Button, Card, Field, Select, TagInput, TextArea, TextInput } from "./ui";
import { useWorkspace } from "./workspace-context";

type FieldType = "text" | "email" | "tel" | "url" | "date" | "textarea" | "lines" | "tags" | "checkbox" | "select";

interface FieldDef {
  key: string;
  label: MessageKey;
  type?: FieldType;
  hint?: MessageKey;
  placeholder?: string;
  wide?: boolean;
  ai?: RewriteKind;
  options?: { value: string; label: MessageKey }[];
  hiddenWhen?(item: Record<string, unknown>): boolean;
  autoComplete?: string;
}

type Item = Record<string, unknown> & { id?: string };

/** Renders a set of fields for one object and reports changes by key. */
function Fields(props: {
  item: Item;
  fields: FieldDef[];
  /** Dot path of the object inside the CV, e.g. "experiences.<id>" or "personal". */
  path: string;
  section: SectionKey | "personal";
  cvLanguage: "en" | "km";
  onChange(key: string, value: unknown): void;
}) {
  const { t } = useApp();
  const { issues } = useWorkspace();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {props.fields.map((f) => {
        if (f.hiddenWhen?.(props.item)) return null;
        const type = f.type ?? "text";
        const fieldPath = `${props.path}.${f.key}`;
        const issue = issues.find((i) => i.field === fieldPath && i.severity !== "info");
        const raw = props.item[f.key];
        const wide = f.wide || type === "textarea" || type === "lines" || type === "tags";
        if (type === "checkbox") {
          return (
            <label key={f.key} className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
              <input type="checkbox" checked={Boolean(raw)} onChange={(e) => props.onChange(f.key, e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[var(--color-brand-600)]" />
              {t(f.label)}
            </label>
          );
        }
        return (
          <Field key={f.key} label={t(f.label)} hint={f.hint ? t(f.hint) : undefined} error={issue?.message} className={wide ? "sm:col-span-2" : undefined}>
            {(id) => {
              if (type === "textarea") {
                const text = (raw as string) ?? "";
                return (
                  <>
                    <TextArea id={id} value={text} invalid={Boolean(issue)} onChange={(e) => props.onChange(f.key, e.target.value)} />
                    {f.ai && (
                      <AIAssist
                        field={fieldPath}
                        section={props.section}
                        text={text}
                        kind={f.ai}
                        position={typeof props.item.position === "string" ? props.item.position : undefined}
                        cvLanguage={props.cvLanguage}
                      />
                    )}
                  </>
                );
              }
              if (type === "lines") {
                return (
                  <TextArea
                    id={id}
                    rows={3}
                    value={((raw as string[]) ?? []).join("\n")}
                    onChange={(e) => props.onChange(f.key, e.target.value.split("\n"))}
                    onBlur={(e) => props.onChange(f.key, e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))}
                  />
                );
              }
              if (type === "tags") {
                return <TagInput id={id} values={(raw as string[]) ?? []} onChange={(v) => props.onChange(f.key, v)} removeLabel={t("action.remove")} />;
              }
              if (type === "select") {
                return (
                  <Select id={id} value={(raw as string) ?? ""} onChange={(e) => props.onChange(f.key, e.target.value || undefined)}>
                    <option value="">—</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {t(o.label)}
                      </option>
                    ))}
                  </Select>
                );
              }
              return (
                <TextInput
                  id={id}
                  type={type === "date" ? "text" : type}
                  inputMode={type === "date" ? "numeric" : undefined}
                  placeholder={type === "date" ? "YYYY-MM" : f.placeholder}
                  autoComplete={f.autoComplete ?? "off"}
                  value={(raw as string) ?? ""}
                  invalid={Boolean(issue)}
                  onChange={(e) => props.onChange(f.key, e.target.value)}
                />
              );
            }}
          </Field>
        );
      })}
    </div>
  );
}

/* ---------- Field definitions per section ---------- */

const personalFields: FieldDef[] = [
  { key: "fullName", label: "field.fullName", autoComplete: "name" },
  { key: "headline", label: "field.headline", hint: "hint.headline" },
  { key: "email", label: "field.email", type: "email", autoComplete: "email" },
  { key: "phone", label: "field.phone", type: "tel", autoComplete: "tel" },
  { key: "location", label: "field.location", hint: "hint.location" },
  { key: "website", label: "field.website", type: "url" },
  { key: "linkedin", label: "field.linkedin" },
  { key: "github", label: "field.github" },
];

const dateRange: FieldDef[] = [
  { key: "startDate", label: "field.startDate", type: "date" },
  { key: "endDate", label: "field.endDate", type: "date", hiddenWhen: (i) => Boolean(i.isCurrent) },
];

type ListKey = Exclude<SectionKey, "summary" | "skills" | "customSections">;

const listConfig: Record<ListKey, { fields: FieldDef[]; create(): Item; title(item: Item): string; add: MessageKey }> = {
  experiences: {
    create: createExperience,
    add: "add.experience",
    title: (i) => [i.position, i.company].filter(Boolean).join(" — "),
    fields: [
      { key: "position", label: "field.position" },
      { key: "company", label: "field.company" },
      { key: "location", label: "field.location" },
      {
        key: "employmentType",
        label: "field.employmentType",
        type: "select",
        options: [
          { value: "full-time", label: "employment.full-time" },
          { value: "part-time", label: "employment.part-time" },
          { value: "contract", label: "employment.contract" },
          { value: "internship", label: "employment.internship" },
          { value: "freelance", label: "employment.freelance" },
        ],
      },
      ...dateRange,
      { key: "isCurrent", label: "field.isCurrent", type: "checkbox" },
      { key: "description", label: "field.description", type: "textarea", ai: "experience", hint: "hint.description" },
      { key: "achievements", label: "field.achievements", type: "lines", hint: "hint.onePerLine" },
      { key: "technologies", label: "field.technologies", type: "tags", hint: "hint.tags" },
    ],
  },
  education: {
    create: createEducation,
    add: "add.education",
    title: (i) => [i.degree || i.fieldOfStudy, i.institution].filter(Boolean).join(" — "),
    fields: [
      { key: "institution", label: "field.institution", wide: true },
      { key: "degree", label: "field.degree", hint: "hint.degree" },
      { key: "fieldOfStudy", label: "field.fieldOfStudy" },
      ...dateRange,
      { key: "location", label: "field.location" },
      { key: "description", label: "field.description", type: "textarea", ai: "education" },
      { key: "achievements", label: "field.achievements", type: "lines", hint: "hint.onePerLine" },
    ],
  },
  projects: {
    create: createProject,
    add: "add.project",
    title: (i) => String(i.name ?? ""),
    fields: [
      { key: "name", label: "field.projectName" },
      { key: "role", label: "field.role" },
      { key: "url", label: "field.url", type: "url" },
      ...dateRange,
      { key: "description", label: "field.description", type: "textarea", ai: "project" },
      { key: "technologies", label: "field.technologies", type: "tags", hint: "hint.tags" },
    ],
  },
  certifications: {
    create: createCertification,
    add: "add.certification",
    title: (i) => String(i.name ?? ""),
    fields: [
      { key: "name", label: "field.certificationName", wide: true },
      { key: "issuer", label: "field.issuer" },
      { key: "date", label: "field.date", type: "date" },
    ],
  },
  languages: {
    create: createLanguageSkill,
    add: "add.language",
    title: (i) => [i.name, i.proficiency].filter(Boolean).join(" — "),
    fields: [
      { key: "name", label: "field.languageName" },
      { key: "proficiency", label: "field.proficiency", hint: "hint.proficiency" },
    ],
  },
  awards: {
    create: createAward,
    add: "add.award",
    title: (i) => String(i.title ?? ""),
    fields: [
      { key: "title", label: "field.awardTitle", wide: true },
      { key: "issuer", label: "field.issuer" },
      { key: "date", label: "field.date", type: "date" },
      { key: "description", label: "field.description", type: "textarea" },
    ],
  },
  references: {
    create: createReference,
    add: "add.reference",
    title: (i) => String(i.name ?? ""),
    fields: [
      { key: "name", label: "field.fullName" },
      { key: "position", label: "field.position" },
      { key: "company", label: "field.company" },
      { key: "email", label: "field.email", type: "email" },
      { key: "phone", label: "field.phone", type: "tel" },
    ],
  },
};

/* ---------- Generic list editing ---------- */

function ItemCard(props: {
  title: string;
  open: boolean;
  onToggle(): void;
  onRemove(): void;
  onMove(delta: -1 | 1): void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  children: ReactNode;
}) {
  const { t } = useApp();
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-1 px-3 py-2">
        <button type="button" onClick={props.onToggle} aria-expanded={props.open} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-slate-800">
          <span aria-hidden className={`text-slate-400 transition-transform ${props.open ? "rotate-90" : ""}`}>▸</span>
          <span className="truncate">{props.title || t("item.untitled")}</span>
        </button>
        <Button small variant="ghost" disabled={!props.canMoveUp} onClick={() => props.onMove(-1)} aria-label={t("action.moveUp")}>↑</Button>
        <Button small variant="ghost" disabled={!props.canMoveDown} onClick={() => props.onMove(1)} aria-label={t("action.moveDown")}>↓</Button>
        <Button small variant="ghost" onClick={props.onRemove} aria-label={t("action.remove")} className="hover:text-red-600">✕</Button>
      </div>
      {props.open && <div className="border-t border-slate-100 p-3">{props.children}</div>}
    </Card>
  );
}

function move<T>(list: T[], index: number, delta: number): void {
  const target = index + delta;
  if (target < 0 || target >= list.length) return;
  const [item] = list.splice(index, 1);
  list.splice(target, 0, item!);
}

function ListSection({ cv, section }: { cv: CVDocument; section: ListKey }) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  const config = listConfig[section];
  const items = cv[section] as unknown as Item[];
  const [openId, setOpenId] = useState<string | null>(items.length === 1 ? (items[0]!.id ?? null) : null);
  const list = (draft: CVDocument) => draft[section] as unknown as Item[];

  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">{t("list.empty")}</p>}
      {items.map((item, index) => (
        <ItemCard
          key={item.id}
          title={config.title(item)}
          open={openId === item.id}
          onToggle={() => setOpenId(openId === item.id ? null : item.id!)}
          onRemove={() => update((d) => void list(d).splice(index, 1))}
          onMove={(delta) => update((d) => move(list(d), index, delta))}
          canMoveUp={index > 0}
          canMoveDown={index < items.length - 1}
        >
          <Fields
            item={item}
            fields={config.fields}
            path={`${section}.${item.id}`}
            section={section}
            cvLanguage={cv.metadata.language}
            onChange={(key, value) =>
              update((d) => {
                const target = list(d).find((x) => x.id === item.id);
                if (!target) return;
                target[key] = value;
                if (key === "isCurrent" && value) target.endDate = undefined;
              }, `${section}.${item.id}.${key}`)
            }
          />
        </ItemCard>
      ))}
      <Button
        onClick={() => {
          const item = config.create();
          update((d) => void list(d).push(item));
          setOpenId(item.id!);
        }}
        data-testid={`add-${section}`}
      >
        + {t(config.add)}
      </Button>
    </div>
  );
}

/* ---------- Special sections ---------- */

async function readPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  // Re-encoding through a canvas also strips EXIF metadata such as GPS location.
  return canvas.toDataURL("image/jpeg", 0.88);
}

function PersonalForm({ cv }: { cv: CVDocument }) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  const [photoError, setPhotoError] = useState("");
  return (
    <div className="space-y-4">
      <Fields
        item={cv.personal}
        fields={personalFields}
        path="personal"
        section="personal"
        cvLanguage={cv.metadata.language}
        onChange={(key, value) => update((d) => void ((d.personal as Item)[key] = value), `personal.${key}`)}
      />
      <div>
        <p className="mb-1 text-xs font-medium text-slate-600">{t("field.photo")}</p>
        <div className="flex items-center gap-3">
          {cv.personal.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cv.personal.photo} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-slate-100" aria-hidden />
          )}
          <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 focus-within:outline focus-within:outline-2 focus-within:outline-brand-500">
            {t("photo.choose")}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) {
                  setPhotoError(t("photo.invalid"));
                  return;
                }
                try {
                  const photo = await readPhoto(file);
                  setPhotoError("");
                  update((d) => void (d.personal.photo = photo));
                } catch {
                  setPhotoError(t("photo.invalid"));
                }
              }}
            />
          </label>
          {cv.personal.photo && (
            <Button small variant="ghost" onClick={() => update((d) => void (d.personal.photo = undefined))}>
              {t("action.remove")}
            </Button>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">{photoError ? <span className="text-red-600">{photoError}</span> : t("photo.hint")}</p>
      </div>
    </div>
  );
}

function SummaryForm({ cv }: { cv: CVDocument }) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  return (
    <Field label={t("section.summary")} hint={t("hint.summary")}>
      {(id) => (
        <>
          <TextArea id={id} rows={6} value={cv.summary} onChange={(e) => update((d) => void (d.summary = e.target.value), "summary")} />
          <AIAssist field="summary" section="summary" text={cv.summary} kind="summary" cvLanguage={cv.metadata.language} />
        </>
      )}
    </Field>
  );
}

function SkillsForm({ cv }: { cv: CVDocument }) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  return (
    <div className="space-y-2">
      {cv.skills.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">{t("skills.empty")}</p>}
      {cv.skills.map((group, index) => (
        <Card key={group.id} className="space-y-2 p-3">
          <div className="flex items-end gap-2">
            <Field label={t("field.skillCategory")} className="flex-1">
              {(id) => (
                <TextInput
                  id={id}
                  value={group.category}
                  placeholder={t("placeholder.skillCategory")}
                  onChange={(e) => update((d) => void (d.skills[index]!.category = e.target.value), `skills.${group.id}.category`)}
                />
              )}
            </Field>
            <Button variant="ghost" onClick={() => update((d) => void d.skills.splice(index, 1))} aria-label={t("action.remove")} className="hover:text-red-600">✕</Button>
          </div>
          <Field label={t("field.skills")} hint={t("hint.tags")}>
            {(id) => (
              <TagInput
                id={id}
                values={group.skills.map((s) => s.name)}
                removeLabel={t("action.remove")}
                onChange={(names) =>
                  update((d) => {
                    const current = d.skills[index]!;
                    current.skills = names.map((name) => current.skills.find((s) => s.name === name) ?? { id: createId(), name });
                  })
                }
              />
            )}
          </Field>
        </Card>
      ))}
      <Button onClick={() => update((d) => void d.skills.push(createSkillGroup()))} data-testid="add-skills">
        + {t("add.skillGroup")}
      </Button>
    </div>
  );
}

const customItemFields: FieldDef[] = [
  { key: "title", label: "field.title" },
  { key: "subtitle", label: "field.subtitle" },
  { key: "date", label: "field.date", type: "date" },
  { key: "description", label: "field.description", type: "textarea" },
];

function CustomSectionsForm({ cv }: { cv: CVDocument }) {
  const { t } = useApp();
  const update = useEditor((s) => s.update);
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">{t("custom.help")}</p>
      {cv.customSections.map((section, si) => (
        <Card key={section.id} className="space-y-3 p-3">
          <div className="flex items-end gap-2">
            <Field label={t("field.sectionTitle")} className="flex-1">
              {(id) => (
                <TextInput id={id} value={section.title} placeholder={t("placeholder.customSection")} onChange={(e) => update((d) => void (d.customSections[si]!.title = e.target.value), `custom.${section.id}.title`)} />
              )}
            </Field>
            <Button variant="ghost" onClick={() => update((d) => void d.customSections.splice(si, 1))} aria-label={t("action.remove")} className="hover:text-red-600">✕</Button>
          </div>
          {section.items.map((item, ii) => (
            <div key={item.id} className="rounded-lg border border-slate-200 p-3">
              <Fields
                item={item}
                fields={customItemFields}
                path={`customSections.${section.id}.items.${item.id}`}
                section="customSections"
                cvLanguage={cv.metadata.language}
                onChange={(key, value) => update((d) => void ((d.customSections[si]!.items[ii] as Item)[key] = value), `custom.${item.id}.${key}`)}
              />
              <div className="mt-2 text-right">
                <Button small variant="ghost" onClick={() => update((d) => void d.customSections[si]!.items.splice(ii, 1))}>
                  {t("action.remove")}
                </Button>
              </div>
            </div>
          ))}
          <Button small onClick={() => update((d) => void d.customSections[si]!.items.push({ id: createId(), title: "" }))}>
            + {t("add.item")}
          </Button>
        </Card>
      ))}
      <Button onClick={() => update((d) => void d.customSections.push(createCustomSection()))}>+ {t("add.customSection")}</Button>
    </div>
  );
}

/** The form for one questionnaire step / editor section. */
export function SectionForm({ cv, section }: { cv: CVDocument; section: SectionKey | "personal" }) {
  switch (section) {
    case "personal":
      return <PersonalForm cv={cv} />;
    case "summary":
      return <SummaryForm cv={cv} />;
    case "skills":
      return <SkillsForm cv={cv} />;
    case "customSections":
      return <CustomSectionsForm cv={cv} />;
    default:
      return <ListSection key={section} cv={cv} section={section} />;
  }
}
