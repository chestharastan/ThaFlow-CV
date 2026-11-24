"use client";

import type { CSSProperties, ReactNode } from "react";
import { formatDateRange, formatPartialDate, type CVDocument, type CVLanguage, type SectionKey } from "@thaflow/cv-core";
import { getCVLabels, type CVLabels } from "@thaflow/localization";
import {
  CONTACT_FIELD,
  contactInHeader,
  contactLines,
  contactRows,
  educationLines,
  experienceLines,
  identityRows,
  initialsOf,
  joinParts,
  langOf,
  parseDescription,
  personalDetailRows,
  placeSections,
  type ContactKind,
  type FieldRow,
  type SectionPlacement,
} from "./sections";
import { getPageCss } from "./styles";
import { DENSITY, FONT_STACKS, getTemplate, isFullBleed, resolveAppearance, type CVTemplate } from "./templates";

export interface CVPreviewProps {
  cv: CVDocument;
  /** Defaults to the template referenced by the CV. */
  template?: CVTemplate;
  className?: string;
  /**
   * Emit the @page rule for this template alongside the CV. Set it on the one
   * copy that is printed, so "Save as PDF" gets the right paper size and margins.
   */
  pageStyle?: boolean;
}

interface Ctx {
  cv: CVDocument;
  template: CVTemplate;
  labels: CVLabels;
  lang: CVLanguage;
  placed: SectionPlacement;
}

const SEPARATORS = { space: " ", dot: "·", pipe: "|", slash: "/" } as const;

const join = joinParts;

/** `lang="km"` for Khmer text inside a non-Khmer CV, so the Khmer type rules reach it. */
const lg = (ctx: Ctx, text: string | undefined) => {
  const lang = langOf(text, ctx.lang);
  return lang ? { lang } : {};
};

function Description({ ctx, text, extraBullets = [] }: { ctx: Ctx; text?: string; extraBullets?: string[] }) {
  const { paragraphs, bullets } = parseDescription(text);
  const allBullets = [...bullets, ...extraBullets.map((b) => b.trim()).filter(Boolean)];
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="cv-text" {...lg(ctx, p)}>
          {p}
        </p>
      ))}
      {allBullets.length > 0 && (
        <ul className="cv-bullets">
          {allBullets.map((b, i) => (
            <li key={i} {...lg(ctx, b)}>
              {b}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * One dated item. The markup is the same for every template (title, subtitle,
 * date, content, in reading order); the entry style places the parts with CSS grid.
 */
function Entry(props: { ctx: Ctx; title: string; subtitle?: string; date?: string; meta?: string | null; children?: ReactNode }) {
  const { ctx, title, subtitle, date, meta, children } = props;
  return (
    <div className={date ? "cv-entry" : "cv-entry cv-entry--undated"}>
      <div className="cv-entry-title" {...lg(ctx, title)}>
        {title}
      </div>
      {subtitle ? (
        <div className="cv-entry-subtitle" {...lg(ctx, subtitle)}>
          {subtitle}
        </div>
      ) : null}
      {date ? <div className="cv-entry-date">{date}</div> : null}
      <div className="cv-entry-content">
        {children}
        {meta ? (
          <div className="cv-entry-meta" {...lg(ctx, meta)}>
            {meta}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** A labelled group of short items: a skill category, or a language and its level. */
function SkillGroup({ ctx, category, items, plain }: { ctx: Ctx; category?: string; items: string[]; plain?: boolean }) {
  const style = plain ? "list" : ctx.template.style.skills;
  const text = items.join(", ");
  return (
    <div className={category ? "cv-skill-group" : "cv-skill-group cv-skill-group--plain"}>
      {category ? (
        <span className="cv-skill-category" {...lg(ctx, category)}>
          {category}
          <span className="cv-skill-colon">:</span>
        </span>
      ) : null}{" "}
      {style === "pills" ? (
        <span className="cv-pills">
          {items.map((item, i) => (
            <span key={i} className="cv-pill" {...lg(ctx, item)}>
              {item}
            </span>
          ))}
        </span>
      ) : style === "columns" || style === "bullets" ? (
        <ul className="cv-skill-items">
          {items.map((item, i) => (
            <li key={i} {...lg(ctx, item)}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <span className="cv-skill-list" {...lg(ctx, text)}>
          {text}
        </span>
      )}
    </div>
  );
}

/**
 * Rows of "label : value": the personal details, and the whole header of the
 * templates that print one as a form. The name row holds the page's <h1>.
 */
function Fields({ ctx, rows }: { ctx: Ctx; rows: FieldRow[] }) {
  return (
    <div className="cv-fields">
      {rows.map((row, i) => (
        <div key={`${row.key}-${i}`} className={`cv-field cv-field--${row.key}`}>
          <span className="cv-field-label">{row.label}</span>
          <span className="cv-field-colon">:</span>
          {row.key === "name" ? (
            <div className="cv-field-value">
              <h1 className="cv-name" {...lg(ctx, row.value)}>
                {row.value || " "}
              </h1>
            </div>
          ) : (
            <span className="cv-field-value" {...lg(ctx, row.value)}>
              {row.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function SectionBody({ ctx, section }: { ctx: Ctx; section: SectionKey }) {
  const { cv, labels, template, lang } = ctx;
  const lead = template.style.entryLead;
  switch (section) {
    case "personalDetails":
      return <Fields ctx={ctx} rows={personalDetailRows(cv, labels)} />;
    case "summary":
      return <Description ctx={ctx} text={cv.summary} />;
    case "experiences":
      return (
        <>
          {cv.experiences.map((e) => {
            const { title, subtitle } = experienceLines(e, lead);
            return (
              <Entry
                key={e.id}
                ctx={ctx}
                title={title}
                subtitle={subtitle}
                date={formatDateRange(e.startDate, e.endDate, e.isCurrent, lang)}
                meta={e.technologies.length > 0 ? `${labels.technologies}: ${e.technologies.join(", ")}` : null}
              >
                <Description ctx={ctx} text={e.description} extraBullets={e.achievements} />
              </Entry>
            );
          })}
        </>
      );
    case "education":
      return (
        <>
          {cv.education.map((e) => {
            const { title, subtitle } = educationLines(e, lead);
            return (
              <Entry
                key={e.id}
                ctx={ctx}
                title={title}
                subtitle={subtitle}
                date={formatDateRange(e.startDate, e.endDate, false, lang)}
              >
                <Description ctx={ctx} text={e.description} extraBullets={e.achievements} />
              </Entry>
            );
          })}
        </>
      );
    case "skills":
      return (
        <div className="cv-skills">
          {cv.skills
            .filter((g) => g.skills.length > 0)
            .map((g) => (
              <SkillGroup key={g.id} ctx={ctx} category={g.category} items={g.skills.map((s) => s.name)} />
            ))}
        </div>
      );
    case "projects":
      return (
        <>
          {cv.projects.map((p) => (
            <Entry
              key={p.id}
              ctx={ctx}
              title={p.name}
              subtitle={join([p.role, p.url?.replace(/^https?:\/\//i, "")])}
              date={formatDateRange(p.startDate, p.endDate, false, lang)}
              meta={p.technologies.length > 0 ? `${labels.technologies}: ${p.technologies.join(", ")}` : null}
            >
              <Description ctx={ctx} text={p.description} />
            </Entry>
          ))}
        </>
      );
    case "certifications":
      return (
        <>
          {cv.certifications.map((c) => (
            <Entry key={c.id} ctx={ctx} title={c.name} subtitle={c.issuer} date={formatPartialDate(c.date, lang)} />
          ))}
        </>
      );
    case "languages":
      return (
        <div className="cv-skills cv-skills--languages">
          {cv.languages.map((l) => (
            <SkillGroup key={l.id} ctx={ctx} category={l.name} items={l.proficiency ? [l.proficiency] : []} plain />
          ))}
        </div>
      );
    case "awards":
      return (
        <>
          {cv.awards.map((a) => (
            <Entry key={a.id} ctx={ctx} title={a.title} subtitle={a.issuer} date={formatPartialDate(a.date, lang)}>
              <Description ctx={ctx} text={a.description} />
            </Entry>
          ))}
        </>
      );
    case "references":
      return (
        <>
          {cv.references.map((r) => (
            <Entry key={r.id} ctx={ctx} title={r.name} subtitle={join([r.position, r.company])}>
              {r.email || r.phone ? <p className="cv-text">{join([r.email, r.phone])}</p> : null}
            </Entry>
          ))}
        </>
      );
    case "customSections":
      return null; // rendered as separate titled sections below
  }
}

function Heading({ ctx, children }: { ctx: Ctx; children: string }) {
  return (
    <h2 className="cv-heading" {...lg(ctx, children)}>
      <span className="cv-heading-text">{children}</span>
    </h2>
  );
}

function Section({ ctx, section }: { ctx: Ctx; section: SectionKey }) {
  if (section === "customSections") {
    return (
      <>
        {ctx.cv.customSections
          .filter((s) => s.items.length > 0)
          .map((s) => (
            <section key={s.id} className="cv-section cv-section--custom">
              <Heading ctx={ctx}>{s.title || ctx.labels.sections.customSections}</Heading>
              <div className="cv-section-body">
                {s.items.map((item) => (
                  <Entry
                    key={item.id}
                    ctx={ctx}
                    title={item.title}
                    subtitle={item.subtitle}
                    date={formatPartialDate(item.date, ctx.lang)}
                  >
                    <Description ctx={ctx} text={item.description} />
                  </Entry>
                ))}
              </div>
            </section>
          ))}
      </>
    );
  }
  return (
    <section className={`cv-section cv-section--${section}`}>
      <Heading ctx={ctx}>{ctx.labels.sections[section]}</Heading>
      <div className="cv-section-body">
        <SectionBody ctx={ctx} section={section} />
      </div>
    </section>
  );
}

function Sections({ ctx, keys }: { ctx: Ctx; keys: SectionKey[] }) {
  return (
    <>
      {keys.map((s) => (
        <Section key={s} ctx={ctx} section={s} />
      ))}
    </>
  );
}

/** The photo, when the template has a slot for one and the CV has a usable image. */
function photoSource(cv: CVDocument, template: CVTemplate): string | null {
  const photo = cv.personal.photo;
  // Only data: image URLs are rendered, so a CV file can never make the page fetch a remote image.
  if (template.layout.photo === "none" || !photo || !/^data:image\/(png|jpeg|webp);base64,/.test(photo)) return null;
  return photo;
}

function Photo({ src }: { src: string | null }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="cv-photo" src={src} alt="" />;
}

/** Small line icons for contact details, drawn here so nothing is fetched. Links share one icon. */
const ICON_PATHS: Record<ContactKind, ReactNode> = {
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <path d="M11 18.2h2" />
    </>
  ),
  email: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m4 7.6 8 6 8-6" />
    </>
  ),
  location: (
    <>
      <path d="M12 21.2s-6.6-5.7-6.6-11.1a6.6 6.6 0 0 1 13.2 0c0 5.4-6.6 11.1-6.6 11.1z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  website: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.4 12h17.2M12 3.4c2.6 2.4 3.9 5.3 3.9 8.6s-1.3 6.2-3.9 8.6c-2.6-2.4-3.9-5.3-3.9-8.6s1.3-6.2 3.9-8.6z" />
    </>
  ),
  linkedin: null,
  github: null,
};
const LINK_ICON = (
  <>
    <path d="M10.2 13.8a4 4 0 0 0 5.7 0l3.2-3.2a4 4 0 0 0-5.7-5.7l-1.2 1.2" />
    <path d="M13.8 10.2a4 4 0 0 0-5.7 0l-3.2 3.2a4 4 0 0 0 5.7 5.7l1.2-1.2" />
  </>
);

function ContactItem({ ctx, kind, value }: { ctx: Ctx; kind: ContactKind; value: string }) {
  const mark = ctx.template.style.contact;
  if (mark === "plain") {
    return (
      <span className="cv-contact-item" {...lg(ctx, value)}>
        {value}
      </span>
    );
  }
  return (
    <span className="cv-contact-item" {...lg(ctx, value)}>
      {mark === "icons" ? (
        <svg className="cv-icon" viewBox="0 0 24 24" aria-hidden="true">
          {ICON_PATHS[kind] ?? LINK_ICON}
        </svg>
      ) : (
        <span className="cv-contact-label">{ctx.labels.fields[CONTACT_FIELD[kind]]}</span>
      )}
      <span className="cv-contact-value">{value}</span>
    </span>
  );
}

function Contact({ ctx, stacked }: { ctx: Ctx; stacked?: boolean }) {
  const lines = contactLines(ctx.cv);
  if (lines.length === 0) return null;
  if (stacked) {
    return (
      <div className={`cv-contact cv-contact--stacked${lines.length > 3 ? " cv-contact--many" : ""}`}>
        {lines.map((l) => (
          <ContactItem key={l.kind} ctx={ctx} kind={l.kind} value={l.value} />
        ))}
      </div>
    );
  }
  const separator = SEPARATORS[ctx.template.style.contactSeparator];
  return (
    <div className="cv-contact">
      {contactRows(ctx.cv).map((row, r) => (
        <div key={r} className="cv-contact-line">
          {row.map((l, i) => (
            <span key={l.kind} className="cv-contact-part">
              <ContactItem ctx={ctx} kind={l.kind} value={l.value} />
              {i < row.length - 1 ? <span className="cv-contact-sep">{separator}</span> : null}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function NameBlock({ ctx, children }: { ctx: Ctx; children?: ReactNode }) {
  const { fullName, headline } = ctx.cv.personal;
  return (
    <div className="cv-name-block">
      <h1 className="cv-name" {...lg(ctx, fullName)}>
        {fullName || " "}
      </h1>
      {headline ? (
        <div className="cv-headline" {...lg(ctx, headline)}>
          {headline}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** What stands above the header on formal sheets: the national motto, and the document's title. */
function Masthead({ ctx }: { ctx: Ctx }) {
  const { masthead } = ctx.template.layout;
  if (masthead === "none") return null;
  const { nation, documentTitle } = ctx.labels;
  return (
    <div className="cv-masthead">
      {masthead === "national" ? (
        <>
          <div className="cv-nation">
            <span>{nation[0]}</span>
            <span>{nation[1]}</span>
          </div>
          <svg className="cv-ornament" viewBox="0 0 120 10" aria-hidden="true">
            <path d="M6 5h38M76 5h38" />
            <path className="cv-ornament-fill" d="M60 1 64 5 60 9 56 5zM50.5 5l2.5-2 2.5 2-2.5 2zM64.5 5l2.5-2 2.5 2-2.5 2z" />
          </svg>
        </>
      ) : null}
      <div className="cv-doc-title">{documentTitle}</div>
    </div>
  );
}

function Header({ ctx, photo, contact }: { ctx: Ctx; photo: string | null; contact: boolean }) {
  const { cv, labels, template, placed } = ctx;
  const { header } = template.style;

  // The headers that are a form: the name, the position and the contact details are rows.
  if (header === "form" || header === "lines" || header === "sheet") {
    const details = placed.header.includes("personalDetails") ? personalDetailRows(cv, labels) : [];
    const rows = <Fields ctx={ctx} rows={identityRows(cv, labels, details)} />;
    return (
      <header className="cv-header">
        <Masthead ctx={ctx} />
        {header === "sheet" ? (
          <>
            <Photo src={photo} />
            <section className="cv-section cv-section--personalDetails">
              <Heading ctx={ctx}>{labels.sections.personalDetails}</Heading>
              <div className="cv-section-body">{rows}</div>
            </section>
          </>
        ) : (
          <div className="cv-header-main">
            <Photo src={photo} />
            {rows}
          </div>
        )}
      </header>
    );
  }

  const initials = header === "monogram" ? initialsOf(cv.personal.fullName) : "";
  // A profile header keeps the contact details beside the photo, under the name.
  const inside = contact && header === "profile";
  return (
    <header className="cv-header">
      <Masthead ctx={ctx} />
      <div className="cv-header-main">
        {initials ? (
          <span className="cv-monogram" aria-hidden="true" {...lg(ctx, initials)}>
            {initials}
          </span>
        ) : null}
        <Photo src={photo} />
        <NameBlock ctx={ctx}>{inside ? <Contact ctx={ctx} /> : null}</NameBlock>
      </div>
      {contact && !inside ? <Contact ctx={ctx} stacked={header === "split"} /> : null}
    </header>
  );
}

const mm = (value: number) => `${value}mm`;

/**
 * Renders a CV document with a template. Pure function of (cv, template): it
 * does not care whether content came from the questionnaire, manual editing or AI.
 * Every template goes through this one renderer; a template only chooses
 * modifier classes and CSS variables.
 */
export function CVPreview({ cv, template: templateProp, className, pageStyle }: CVPreviewProps) {
  const template = templateProp ?? getTemplate(cv.appearance.templateId);
  const look = resolveAppearance(template, cv.appearance);
  const lang = cv.metadata.language;
  const placed = placeSections(cv, template);
  const ctx: Ctx = { cv, template, labels: getCVLabels(lang), lang, placed };
  const { layout, typography: type, style: design, colors } = template;
  const density = DENSITY[design.density];
  const photo = photoSource(cv, template);
  const photoInSidebar = layout.sidebar && layout.headerPlacement !== "full";
  const headerContact = contactInHeader(template);

  const style = {
    "--cv-primary": look.primary,
    "--cv-on-primary": look.onPrimary,
    "--cv-text": colors.text,
    "--cv-muted": colors.muted,
    "--cv-bg": colors.background,
    "--cv-rule": colors.rule,
    "--cv-fill-bg": look.fill.background,
    "--cv-fill-text": look.fill.text,
    "--cv-fill-muted": look.fill.muted,
    "--cv-fill-rule": look.fill.rule,
    "--cv-plate-bg": look.plate.background,
    "--cv-plate-text": look.plate.text,
    "--cv-font-body": FONT_STACKS[look.bodyFont],
    "--cv-font-heading": FONT_STACKS[look.headingFont],
    "--cv-font-name": FONT_STACKS[look.nameFont],
    "--cv-font-size": `${type.baseFontSize}pt`,
    "--cv-km-scale": type.khmerScale,
    "--cv-name-size": type.nameSize,
    "--cv-name-weight": type.nameWeight,
    "--cv-name-tracking": `${type.nameTracking}em`,
    "--cv-heading-size": type.headingSize,
    "--cv-heading-weight": type.headingWeight,
    "--cv-title-weight": type.titleWeight,
    "--cv-date-col": type.dateColumn,
    "--cv-pad-y": mm(density.padY),
    "--cv-pad-x": mm(density.padX),
    "--cv-gap-section": mm(density.gapSection),
    "--cv-gap-entry": mm(density.gapEntry),
    "--cv-gap-header": mm(density.gapHeader),
    "--cv-leading": density.leading,
    "--cv-leading-km": density.leadingKm,
    "--cv-sidebar-w": mm(layout.sidebarWidth),
  } as CSSProperties;

  const classes = [
    "cv",
    `cv--layout-${layout.kind}`,
    layout.sidebar ? `cv--placement-${layout.headerPlacement}` : "",
    placed.twoColumn ? "cv--two-column" : "cv--one-column",
    layout.divider ? "cv--divider" : "",
    `cv--header-${design.header}`,
    `cv--heading-${design.heading}`,
    `cv--halign-${design.headingAlign}`,
    `cv--hcase-${type.headingCase}`,
    `cv--name-${type.nameCase}`,
    `cv--entry-${design.entry}`,
    `cv--skills-${design.skills}`,
    `cv--density-${design.density}`,
    `cv--photo-${layout.photo}`,
    layout.photoSize === "large" ? "cv--photo-large" : "",
    photo ? "cv--has-photo" : "",
    `cv--masthead-${layout.masthead}`,
    `cv--cstyle-${design.contact}`,
    `cv--fill-${design.fill}`,
    `cv--edge-${design.edge}`,
    isFullBleed(template) ? "cv--bleed" : "cv--flow",
    `cv--rules-${design.rules}`,
    `cv--bullet-${design.bullet}`,
    `cv--contact-${design.contactSeparator}`,
    design.subtitleItalic ? "cv--sub-italic" : "",
    ...design.accent.map((target) => `cv--accent-${target}`),
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  let content: ReactNode;
  if (layout.sidebar) {
    const { headerPlacement } = layout;
    content = (
      <>
        {headerPlacement === "full" ? <Header ctx={ctx} photo={photo} contact={headerContact} /> : null}
        <div className="cv-body">
          <aside className="cv-sidebar">
            {photoInSidebar ? <Photo src={photo} /> : null}
            {headerPlacement === "sidebar" ? <Header ctx={ctx} photo={null} contact={false} /> : null}
            {!headerContact && contactLines(cv).length > 0 ? (
              <section className="cv-section cv-section--contact">
                <Heading ctx={ctx}>{ctx.labels.contact}</Heading>
                <div className="cv-section-body">
                  <Contact ctx={ctx} stacked />
                </div>
              </section>
            ) : null}
            <Sections ctx={ctx} keys={placed.side} />
          </aside>
          <div className="cv-main">
            {headerPlacement === "main" ? <Header ctx={ctx} photo={null} contact={false} /> : null}
            <Sections ctx={ctx} keys={placed.main} />
          </div>
        </div>
      </>
    );
  } else if (placed.twoColumn) {
    content = (
      <>
        <Header ctx={ctx} photo={photo} contact />
        <div className="cv-body">
          {placed.lead.length > 0 ? (
            <div className="cv-lead">
              <Sections ctx={ctx} keys={placed.lead} />
            </div>
          ) : null}
          <div className="cv-columns">
            <div className="cv-col cv-col--main">
              <Sections ctx={ctx} keys={placed.main} />
            </div>
            <div className="cv-col cv-col--side">
              <Sections ctx={ctx} keys={placed.side} />
            </div>
          </div>
        </div>
      </>
    );
  } else {
    content = (
      <>
        <Header ctx={ctx} photo={photo} contact />
        <div className="cv-body">
          <div className="cv-main">
            <Sections ctx={ctx} keys={placed.main} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {pageStyle ? <style>{getPageCss(template)}</style> : null}
      <article className={classes} style={style} lang={lang} data-template={template.id}>
        {content}
      </article>
    </>
  );
}
