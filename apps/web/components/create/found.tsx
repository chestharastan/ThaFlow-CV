"use client";

import type { ReactNode } from "react";
import { formatDateRange, formatPartialDate } from "@thaflow/cv-core";
import type { ImportedCV } from "@thaflow/import-engine";
import type { MessageKey } from "@thaflow/localization";
import { useApp } from "@/lib/app-context";

const has = (text: string | undefined): text is string => Boolean(text && text.trim());
const joined = (...parts: (string | undefined | false)[]) => parts.filter((part): part is string => typeof part === "string" && has(part)).join(" · ");

function Section({ title, name, children }: { title: string; name: string; children: ReactNode }) {
  return (
    <section className="py-4" data-testid={`create-found-${name}`}>
      <h2 className="mb-2 text-sm font-medium text-muted">{title}</h2>
      {children}
    </section>
  );
}

/** One thing that was found: what it is, a quiet line of where and when, then the words that came with it. */
function Item({ title, meta, text, points = [], tags = [] }: { title: string; meta?: string; text?: string; points?: string[]; tags?: string[] }) {
  const listed = points.filter(has);
  const tagged = tags.filter(has);
  return (
    <li className="break-words">
      {has(title) && <p className="font-medium text-ink">{title}</p>}
      {has(meta) && <p className="text-muted">{meta}</p>}
      {has(text) && <p className="mt-1 whitespace-pre-line leading-relaxed text-ink-soft">{text.trim()}</p>}
      {listed.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-5 leading-relaxed text-ink-soft">
          {listed.map((point, at) => (
            <li key={at}>{point}</li>
          ))}
        </ul>
      )}
      {tagged.length > 0 && <p className="mt-1 text-sm text-muted">{tagged.join(", ")}</p>}
    </li>
  );
}

const ITEMS = "space-y-4";

/**
 * Everything that was read from the file, section by section, exactly as it
 * will go into the CV. Nothing can be changed here: every part is asked about
 * again on the screens that follow. This is only for seeing what was found.
 */
export function FoundDetails({ data }: { data: ImportedCV }) {
  const { t, settings } = useApp();
  const language = settings.uiLanguage;
  const { personal } = data;

  const fields: [MessageKey, string | undefined][] = [
    ["field.headline", personal.headline],
    ["field.email", personal.email],
    ["field.phone", personal.phone],
    ["field.location", personal.location],
    ["field.website", personal.website],
    ["field.linkedin", personal.linkedin],
    ["field.github", personal.github],
  ];
  const about = fields.filter((row): row is [MessageKey, string] => has(row[1]));
  const skills = data.skills.map((group) => ({ ...group, skills: group.skills.filter((skill) => has(skill.name)) })).filter((group) => group.skills.length > 0);

  const sections: ReactNode[] = [];

  if (about.length > 0) {
    sections.push(
      <Section key="personal" name="personal" title={t("section.personal")}>
        <dl className="grid grid-cols-1 items-baseline gap-x-4 gap-y-2 sm:grid-cols-[9rem_1fr] sm:gap-y-1">
          {about.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="-mb-2 text-sm text-muted sm:mb-0 sm:text-base">{t(label)}</dt>
              <dd className="min-w-0 break-words text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>,
    );
  }

  if (has(data.summary)) {
    sections.push(
      <Section key="summary" name="summary" title={t("section.summary")}>
        <p className="whitespace-pre-line break-words leading-relaxed text-ink-soft">{data.summary.trim()}</p>
      </Section>,
    );
  }

  if (data.experiences.length > 0) {
    sections.push(
      <Section key="experiences" name="experiences" title={t("section.experiences")}>
        <ul className={ITEMS}>
          {data.experiences.map((job) => {
            const dates = formatDateRange(job.startDate, job.endDate, job.isCurrent, language);
            const named = has(job.position);
            return (
              <Item
                key={job.id}
                title={named ? job.position : job.company}
                meta={joined(named && job.company, job.location, dates)}
                text={job.description}
                points={job.achievements}
                tags={job.technologies}
              />
            );
          })}
        </ul>
      </Section>,
    );
  }

  if (data.education.length > 0) {
    sections.push(
      <Section key="education" name="education" title={t("section.education")}>
        <ul className={ITEMS}>
          {data.education.map((school) => {
            const dates = formatDateRange(school.startDate, school.endDate, false, language);
            const study = [school.degree, school.fieldOfStudy].filter(has).join(", ");
            const named = has(school.institution);
            return (
              <Item
                key={school.id}
                title={named ? school.institution : study}
                meta={joined(named && study, school.location, dates)}
                text={school.description}
                points={school.achievements}
              />
            );
          })}
        </ul>
      </Section>,
    );
  }

  if (data.projects.length > 0) {
    sections.push(
      <Section key="projects" name="projects" title={t("section.projects")}>
        <ul className={ITEMS}>
          {data.projects.map((project) => (
            <Item
              key={project.id}
              title={project.name}
              meta={joined(project.role, formatDateRange(project.startDate, project.endDate, false, language), project.url)}
              text={project.description}
              tags={project.technologies}
            />
          ))}
        </ul>
      </Section>,
    );
  }

  if (skills.length > 0) {
    sections.push(
      <Section key="skills" name="skills" title={t("section.skills")}>
        <div className="space-y-3">
          {skills.map((group) => (
            <div key={group.id}>
              {has(group.category) && <p className="mb-1.5 break-words font-medium text-ink">{group.category}</p>}
              <ul className="flex flex-wrap gap-1.5">
                {group.skills.map((skill) => (
                  <li key={skill.id} className="max-w-full break-words rounded-lg border border-line bg-paper px-2.5 py-1 text-sm text-ink">
                    {skill.name}
                    {has(skill.level) && <span className="text-muted"> · {skill.level}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>,
    );
  }

  if (data.languages.length > 0) {
    sections.push(
      <Section key="languages" name="languages" title={t("section.languages")}>
        <ul className="space-y-1">
          {data.languages.map((spoken) => (
            <li key={spoken.id} className="break-words">
              <span className="font-medium text-ink">{spoken.name}</span>
              {has(spoken.proficiency) && <span className="text-muted"> · {spoken.proficiency}</span>}
            </li>
          ))}
        </ul>
      </Section>,
    );
  }

  if (data.certifications.length > 0) {
    sections.push(
      <Section key="certifications" name="certifications" title={t("section.certifications")}>
        <ul className={ITEMS}>
          {data.certifications.map((certificate) => (
            <Item key={certificate.id} title={certificate.name} meta={joined(certificate.issuer, formatPartialDate(certificate.date, language), certificate.url)} />
          ))}
        </ul>
      </Section>,
    );
  }

  if (data.awards.length > 0) {
    sections.push(
      <Section key="awards" name="awards" title={t("section.awards")}>
        <ul className={ITEMS}>
          {data.awards.map((award) => (
            <Item key={award.id} title={award.title} meta={joined(award.issuer, formatPartialDate(award.date, language))} text={award.description} />
          ))}
        </ul>
      </Section>,
    );
  }

  if (sections.length === 0) return null;
  return (
    <div className="mt-6 divide-y divide-line border-y border-line" data-testid="create-found-details">
      {sections}
    </div>
  );
}
