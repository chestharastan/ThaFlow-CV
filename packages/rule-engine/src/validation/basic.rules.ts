import { dateToMonths, isValidPartialDate } from "@thaflow/cv-core";
import { msg, type Rule } from "../core/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s().-]{6,20}$/;

function looksLikeUrl(value: string): boolean {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

export const nameRequiredRule: Rule = {
  id: "REQ-001",
  description: "Full name cannot be empty.",
  category: "required",
  severity: "error",
  evaluate: (ctx) =>
    ctx.cv.personal.fullName.trim()
      ? []
      : [
          {
            message: msg(ctx, { en: "Add your full name.", km: "សូមបញ្ចូលឈ្មោះពេញរបស់អ្នក។" }),
            field: "personal.fullName",
            section: "personal",
          },
        ],
};

export const contactRequiredRule: Rule = {
  id: "REQ-002",
  description: "At least one contact method (email or phone) should be present.",
  category: "required",
  severity: "warning",
  evaluate: (ctx) =>
    ctx.cv.personal.email?.trim() || ctx.cv.personal.phone?.trim()
      ? []
      : [
          {
            message: msg(ctx, {
              en: "Add an email address or phone number so employers can contact you.",
              km: "សូមបញ្ចូលអ៊ីមែល ឬលេខទូរស័ព្ទ ដើម្បីឱ្យនិយោជកអាចទាក់ទងអ្នកបាន។",
            }),
            field: "personal.email",
            section: "personal",
          },
        ],
};

export const emailFormatRule: Rule = {
  id: "VAL-001",
  description: "Email must have a valid format.",
  category: "validation",
  severity: "error",
  evaluate: (ctx) => {
    const out: ReturnType<Rule["evaluate"]> = [];
    const check = (value: string | undefined, field: string, section: "personal" | "references") => {
      if (value?.trim() && !EMAIL.test(value.trim())) {
        out.push({
          message: msg(ctx, {
            en: `"${value}" is not a valid email address.`,
            km: `"${value}" មិនមែនជាអាសយដ្ឋានអ៊ីមែលត្រឹមត្រូវទេ។`,
          }),
          field,
          section,
        });
      }
    };
    check(ctx.cv.personal.email, "personal.email", "personal");
    for (const ref of ctx.cv.references) check(ref.email, `references.${ref.id}.email`, "references");
    return out;
  },
};

export const phoneFormatRule: Rule = {
  id: "VAL-002",
  description: "Phone number should contain only digits and common separators.",
  category: "validation",
  severity: "warning",
  evaluate: (ctx) => {
    const phone = ctx.cv.personal.phone?.trim();
    if (!phone || PHONE.test(phone)) return [];
    return [
      {
        message: msg(ctx, {
          en: "The phone number looks unusual. Check it for typos.",
          km: "លេខទូរស័ព្ទមើលទៅមិនប្រក្រតី។ សូមពិនិត្យម្តងទៀត។",
        }),
        field: "personal.phone",
        section: "personal",
      },
    ];
  },
};

export const urlFormatRule: Rule = {
  id: "VAL-003",
  description: "Links should be valid URLs.",
  category: "validation",
  severity: "warning",
  evaluate: (ctx) => {
    const out = [];
    for (const key of ["website", "linkedin", "github"] as const) {
      const value = ctx.cv.personal[key]?.trim();
      if (value && !looksLikeUrl(value)) {
        out.push({
          message: msg(ctx, {
            en: `The ${key} link does not look like a valid URL.`,
            km: `តំណ ${key} មិនមែនជា URL ត្រឹមត្រូវទេ។`,
          }),
          field: `personal.${key}`,
          section: "personal" as const,
        });
      }
    }
    return out;
  },
};

type Dated = { id: string; startDate?: string; endDate?: string; isCurrent?: boolean };

function datedEntries(ctx: Parameters<Rule["evaluate"]>[0]) {
  const list: { section: "experiences" | "education" | "projects"; item: Dated }[] = [];
  for (const item of ctx.cv.experiences) list.push({ section: "experiences", item });
  for (const item of ctx.cv.education) list.push({ section: "education", item });
  for (const item of ctx.cv.projects) list.push({ section: "projects", item });
  return list;
}

export const dateFormatRule: Rule = {
  id: "DATE-001",
  description: "Dates must be YYYY or YYYY-MM.",
  category: "date",
  severity: "error",
  evaluate: (ctx) => {
    const out = [];
    for (const { section, item } of datedEntries(ctx)) {
      for (const key of ["startDate", "endDate"] as const) {
        if (!isValidPartialDate(item[key])) {
          out.push({
            message: msg(ctx, {
              en: `"${item[key]}" is not a valid date. Use YYYY or YYYY-MM.`,
              km: `"${item[key]}" មិនមែនជាកាលបរិច្ឆេទត្រឹមត្រូវទេ។ សូមប្រើ YYYY ឬ YYYY-MM។`,
            }),
            field: `${section}.${item.id}.${key}`,
            section,
          });
        }
      }
    }
    return out;
  },
};

export const dateOrderRule: Rule = {
  id: "DATE-002",
  description: "Start date must not be after end date.",
  category: "date",
  severity: "error",
  evaluate: (ctx) => {
    const out = [];
    for (const { section, item } of datedEntries(ctx)) {
      if (item.isCurrent) continue;
      const start = dateToMonths(item.startDate);
      const end = dateToMonths(item.endDate, true);
      if (start !== null && end !== null && start > end) {
        out.push({
          message: msg(ctx, {
            en: "End date cannot be before start date.",
            km: "កាលបរិច្ឆេទបញ្ចប់មិនអាចនៅមុនកាលបរិច្ឆេទចាប់ផ្តើមបានទេ។",
          }),
          field: `${section}.${item.id}.endDate`,
          section,
        });
      }
    }
    return out;
  },
};

export const futureDateRule: Rule = {
  id: "DATE-003",
  description: "Start dates should not be in the future.",
  category: "consistency",
  severity: "warning",
  evaluate: (ctx) => {
    const nowMonths = ctx.now.getFullYear() * 12 + ctx.now.getMonth();
    const out = [];
    for (const { section, item } of datedEntries(ctx)) {
      if (section === "education") continue; // expected graduation dates are legitimate
      const start = dateToMonths(item.startDate);
      if (start !== null && start > nowMonths) {
        out.push({
          message: msg(ctx, {
            en: "This start date is in the future.",
            km: "កាលបរិច្ឆេទចាប់ផ្តើមនេះស្ថិតនៅក្នុងអនាគត។",
          }),
          field: `${section}.${item.id}.startDate`,
          section,
        });
      }
    }
    return out;
  },
};

export const basicRules: Rule[] = [
  nameRequiredRule,
  contactRequiredRule,
  emailFormatRule,
  phoneFormatRule,
  urlFormatRule,
  dateFormatRule,
  dateOrderRule,
  futureDateRule,
];
