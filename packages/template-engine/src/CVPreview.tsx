"use client";

import type { CSSProperties, ReactNode } from "react";
import { formatDateRange, formatPartialDate, type CVDocument, type CVLanguage, type SectionKey } from "@thaflow/cv-core";
import { getCVLabels, type CVLabels } from "@thaflow/localization";
import {
  contactLines,
  contactRows,
  educationLines,
  experienceLines,
  initialsOf,
  joinParts,
  langOf,
  parseDescription,
  placeSections,
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
  /**
   * Show one A4 sheet instead of the whole CV: 0 for the first page, 1 for the
   * second, and so on (see countPages for how many there are). The sheet is
   * exactly 210 x 297mm whatever the CV holds. Leave it out for the one copy
   * that is printed: paper is cut into pages by the browser.
   */
  page?: number;
}

interface Ctx {
  cv: CVDocument;
  template: CVTemplate;
  labels: CVLabels;
  lang: CVLanguage;
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
    <div className="cv-entry">
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
    <div className="cv-skill-group">
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
      ) : style === "columns" ? (
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

function SectionBody({ ctx, section }: { ctx: Ctx; section: SectionKey }) {
  const { cv, labels, template, lang } = ctx;
  const lead = template.style.entryLead;
  switch (section) {
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

function Contact({ ctx, stacked }: { ctx: Ctx; stacked?: boolean }) {
  const lines = contactLines(ctx.cv);
  if (lines.length === 0) return null;
  if (stacked) {
    return (
      <div className={`cv-contact cv-contact--stacked${lines.length > 3 ? " cv-contact--many" : ""}`}>
        {lines.map((l) => (
          <span key={l.kind} className="cv-contact-item" {...lg(ctx, l.value)}>
            {l.value}
          </span>
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
              <span className="cv-contact-item" {...lg(ctx, l.value)}>
                {l.value}
              </span>
              {i < row.length - 1 ? <span className="cv-contact-sep">{separator}</span> : null}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function NameBlock({ ctx }: { ctx: Ctx }) {
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
    </div>
  );
}

function Header({ ctx, photo, contact }: { ctx: Ctx; photo: string | null; contact: boolean }) {
  const { header } = ctx.template.style;
  const initials = header === "monogram" ? initialsOf(ctx.cv.personal.fullName) : "";
  return (
    <header className="cv-header">
      <div className="cv-header-main">
        {initials ? (
          <span className="cv-monogram" aria-hidden="true" {...lg(ctx, initials)}>
            {initials}
          </span>
        ) : null}
        <Photo src={photo} />
        <NameBlock ctx={ctx} />
      </div>
      {contact ? <Contact ctx={ctx} stacked={header === "split"} /> : null}
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
export function CVPreview({ cv, template: templateProp, className, pageStyle, page }: CVPreviewProps) {
  const template = templateProp ?? getTemplate(cv.appearance.templateId);
  const look = resolveAppearance(template, cv.appearance);
  const lang = cv.metadata.language;
  const ctx: Ctx = { cv, template, labels: getCVLabels(lang), lang };
  const { layout, typography: type, style: design, colors } = template;
  const placed = placeSections(cv, template);
  const density = DENSITY[design.density];
  const photo = photoSource(cv, template);
  const photoInSidebar = layout.sidebar && layout.headerPlacement !== "full";

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
    ...(page === undefined ? {} : { "--cv-page": Math.max(0, Math.floor(page)) }),
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
    photo ? "cv--has-photo" : "",
    `cv--fill-${design.fill}`,
    `cv--edge-${design.edge}`,
    isFullBleed(template) ? "cv--bleed" : "cv--flow",
    `cv--rules-${design.rules}`,
    `cv--bullet-${design.bullet}`,
    `cv--contact-${design.contactSeparator}`,
    design.subtitleItalic ? "cv--sub-italic" : "",
    ...design.accent.map((target) => `cv--accent-${target}`),
    page === undefined ? "" : "cv--paged",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  let content: ReactNode;
  if (layout.sidebar) {
    const { headerPlacement } = layout;
    content = (
      <>
        {headerPlacement === "full" ? <Header ctx={ctx} photo={photo} contact={false} /> : null}
        <div className="cv-body">
          <aside className="cv-sidebar">
            {photoInSidebar ? <Photo src={photo} /> : null}
            {headerPlacement === "sidebar" ? <Header ctx={ctx} photo={null} contact={false} /> : null}
            {contactLines(cv).length > 0 ? (
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
        {page === undefined ? content : <div className="cv-flow">{content}</div>}
      </article>
    </>
  );
}
