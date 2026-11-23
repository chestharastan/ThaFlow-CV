"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { formatDateRange, formatPartialDate, type CVDocument, type SectionKey } from "@thaflow/cv-core";
import { getCVLabels, type CVLabels } from "@thaflow/localization";
import { SIDEBAR_SECTIONS, contactLines, getVisibleSections, parseDescription } from "./sections";
import { getPageCss } from "./styles";
import { FONT_STACKS, getTemplate, resolveAppearance, type CVTemplate } from "./templates";

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
}

function Description({ text, extraBullets = [] }: { text?: string; extraBullets?: string[] }) {
  const { paragraphs, bullets } = parseDescription(text);
  const allBullets = [...bullets, ...extraBullets.map((b) => b.trim()).filter(Boolean)];
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="cv-text">
          {p}
        </p>
      ))}
      {allBullets.length > 0 && (
        <ul className="cv-bullets">
          {allBullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Whether dates sit in a left-hand column (academic style) or inline with the title. */
const DateColumnContext = createContext(false);

function Entry(props: {
  title: ReactNode;
  subtitle?: ReactNode;
  date?: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  const dateColumn = useContext(DateColumnContext);
  return (
    <div className="cv-entry">
      {dateColumn ? <div className="cv-entry-date">{props.date}</div> : null}
      <div className="cv-entry-body">
        <div className="cv-entry-head">
          <div className="cv-entry-title">{props.title}</div>
          {props.date && !dateColumn ? <div className="cv-entry-date-inline">{props.date}</div> : null}
        </div>
        {props.subtitle ? <div className="cv-entry-subtitle">{props.subtitle}</div> : null}
        {props.children}
        {props.meta ? <div className="cv-entry-meta">{props.meta}</div> : null}
      </div>
    </div>
  );
}

const join = (parts: (string | undefined)[], sep = " · ") => parts.filter((p) => p?.trim()).join(sep);

function SectionBody({ ctx, section }: { ctx: Ctx; section: SectionKey }) {
  const { cv, labels, template } = ctx;
  const lang = cv.metadata.language;
  switch (section) {
    case "summary":
      return <Description text={cv.summary} />;
    case "experiences":
      return (
        <>
          {cv.experiences.map((e) => (
            <Entry
              key={e.id}
              title={e.position || e.company}
              subtitle={join([e.position ? e.company : "", e.location])}
              date={formatDateRange(e.startDate, e.endDate, e.isCurrent, lang)}
              meta={e.technologies.length > 0 ? `${labels.technologies}: ${e.technologies.join(", ")}` : null}
            >
              <Description text={e.description} extraBullets={e.achievements} />
            </Entry>
          ))}
        </>
      );
    case "education":
      return (
        <>
          {cv.education.map((e) => (
            <Entry
              key={e.id}
              title={join([e.degree, e.fieldOfStudy], ", ") || e.institution}
              subtitle={join([e.degree || e.fieldOfStudy ? e.institution : "", e.location])}
              date={formatDateRange(e.startDate, e.endDate, false, lang)}
            >
              <Description text={e.description} extraBullets={e.achievements} />
            </Entry>
          ))}
        </>
      );
    case "skills":
      return (
        <div className="cv-skills">
          {cv.skills
            .filter((g) => g.skills.length > 0)
            .map((g) => (
              <div key={g.id} className="cv-skill-group">
                {g.category ? <span className="cv-skill-category">{g.category}</span> : null}
                {template.style.skillPills ? (
                  <span className="cv-pills">
                    {g.skills.map((s) => (
                      <span key={s.id} className="cv-pill">
                        {s.name}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="cv-skill-list">{g.skills.map((s) => s.name).join(", ")}</span>
                )}
              </div>
            ))}
        </div>
      );
    case "projects":
      return (
        <>
          {cv.projects.map((p) => (
            <Entry
              key={p.id}
              title={p.name}
              subtitle={join([p.role, p.url?.replace(/^https?:\/\//i, "")])}
              date={formatDateRange(p.startDate, p.endDate, false, lang)}
              meta={p.technologies.length > 0 ? `${labels.technologies}: ${p.technologies.join(", ")}` : null}
            >
              <Description text={p.description} />
            </Entry>
          ))}
        </>
      );
    case "certifications":
      return (
        <>
          {cv.certifications.map((c) => (
            <Entry key={c.id} title={c.name} subtitle={c.issuer} date={formatPartialDate(c.date, lang)} />
          ))}
        </>
      );
    case "languages":
      return (
        <div className="cv-skills">
          {cv.languages.map((l) => (
            <div key={l.id} className="cv-skill-group">
              <span className="cv-skill-category">{l.name}</span>
              {l.proficiency ? <span className="cv-skill-list">{l.proficiency}</span> : null}
            </div>
          ))}
        </div>
      );
    case "awards":
      return (
        <>
          {cv.awards.map((a) => (
            <Entry key={a.id} title={a.title} subtitle={a.issuer} date={formatPartialDate(a.date, lang)}>
              <Description text={a.description} />
            </Entry>
          ))}
        </>
      );
    case "references":
      return (
        <>
          {cv.references.map((r) => (
            <Entry key={r.id} title={r.name} subtitle={join([r.position, r.company])}>
              <p className="cv-text">{join([r.email, r.phone])}</p>
            </Entry>
          ))}
        </>
      );
    case "customSections":
      return null; // rendered as separate titled sections below
  }
}

function Section({ ctx, section }: { ctx: Ctx; section: SectionKey }) {
  if (section === "customSections") {
    return (
      <>
        {ctx.cv.customSections
          .filter((s) => s.items.length > 0)
          .map((s) => (
            <section key={s.id} className="cv-section">
              <h2 className="cv-heading">{s.title || ctx.labels.sections.customSections}</h2>
              {s.items.map((item) => (
                <Entry
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  date={formatPartialDate(item.date, ctx.cv.metadata.language)}
                >
                  <Description text={item.description} />
                </Entry>
              ))}
            </section>
          ))}
      </>
    );
  }
  return (
    <section className="cv-section">
      <h2 className="cv-heading">{ctx.labels.sections[section]}</h2>
      <SectionBody ctx={ctx} section={section} />
    </section>
  );
}

function Photo({ ctx }: { ctx: Ctx }) {
  const photo = ctx.cv.personal.photo;
  // Only data: image URLs are rendered, so a CV file can never make the page fetch a remote image.
  if (!ctx.template.layout.photo || !photo || !/^data:image\/(png|jpeg|webp);base64,/.test(photo)) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="cv-photo" src={photo} alt="" />;
}

function Contact({ ctx, stacked }: { ctx: Ctx; stacked?: boolean }) {
  const lines = contactLines(ctx.cv);
  if (lines.length === 0) return null;
  return (
    <div className={stacked ? "cv-contact cv-contact--stacked" : "cv-contact"}>
      {lines.map((l) => (
        <span key={l.kind} className="cv-contact-item">
          {l.value}
        </span>
      ))}
    </div>
  );
}

function NameBlock({ ctx }: { ctx: Ctx }) {
  return (
    <div className="cv-name-block">
      <h1 className="cv-name">{ctx.cv.personal.fullName || " "}</h1>
      {ctx.cv.personal.headline ? <div className="cv-headline">{ctx.cv.personal.headline}</div> : null}
    </div>
  );
}

/**
 * Renders a CV document with a template. Pure function of (cv, template): it
 * does not care whether content came from the questionnaire, manual editing or AI.
 */
export function CVPreview({ cv, template: templateProp, className, pageStyle }: CVPreviewProps) {
  const template = templateProp ?? getTemplate(cv.appearance.templateId);
  const look = resolveAppearance(template, cv.appearance);
  const ctx: Ctx = { cv, template, labels: getCVLabels(cv.metadata.language) };
  const sections = getVisibleSections(cv, template);
  const { kind } = template.layout;
  const isSidebar = kind === "sidebar-left" || kind === "sidebar-right";
  const sidebarSections = isSidebar ? sections.filter((s) => SIDEBAR_SECTIONS.includes(s)) : [];
  const mainSections = sections.filter((s) => !sidebarSections.includes(s));

  const style = {
    "--cv-primary": look.primary,
    "--cv-text": template.colors.text,
    "--cv-muted": template.colors.muted,
    "--cv-bg": template.colors.background,
    "--cv-sidebar-bg": template.colors.sidebarBackground ?? template.colors.background,
    "--cv-sidebar-text": template.colors.sidebarText ?? template.colors.text,
    "--cv-font-body": FONT_STACKS[look.bodyFont],
    "--cv-font-heading": FONT_STACKS[look.headingFont],
    "--cv-font-size": `${template.typography.baseFontSize}pt`,
  } as CSSProperties;

  const classes = [
    "cv",
    `cv--${kind}`,
    `cv--heading-${template.style.heading}`,
    `cv--align-${template.style.headerAlign}`,
    template.style.dateColumn ? "cv--date-column" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <DateColumnContext.Provider value={Boolean(template.style.dateColumn)}>
    {pageStyle ? <style>{getPageCss(template)}</style> : null}
    <article className={classes} style={style} lang={cv.metadata.language} data-template={template.id}>
      {isSidebar ? (
        <>
          <aside className="cv-sidebar">
            <Photo ctx={ctx} />
            <section className="cv-section">
              <h2 className="cv-heading">{ctx.labels.contact}</h2>
              <Contact ctx={ctx} stacked />
            </section>
            {sidebarSections.map((s) => (
              <Section key={s} ctx={ctx} section={s} />
            ))}
          </aside>
          <main className="cv-main">
            <header className="cv-header">
              <NameBlock ctx={ctx} />
            </header>
            {mainSections.map((s) => (
              <Section key={s} ctx={ctx} section={s} />
            ))}
          </main>
        </>
      ) : (
        <>
          <header className="cv-header">
            <Photo ctx={ctx} />
            <div className="cv-header-text">
              <NameBlock ctx={ctx} />
              <Contact ctx={ctx} />
            </div>
          </header>
          <main className="cv-main">
            {mainSections.map((s) => (
              <Section key={s} ctx={ctx} section={s} />
            ))}
          </main>
        </>
      )}
    </article>
    </DateColumnContext.Provider>
  );
}
