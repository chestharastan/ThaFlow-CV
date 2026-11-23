import type { CVLanguage } from "@thaflow/cv-core";
import { en } from "./messages/en";
import { km } from "./messages/km";

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;

const catalogs: Record<CVLanguage, Partial<Messages>> = { en, km };

export type Translator = (key: MessageKey, params?: Record<string, string | number>) => string;

/** Missing translations fall back to English, then to the key itself. */
export function createTranslator(language: CVLanguage): Translator {
  return (key, params) => {
    let text: string = catalogs[language][key] ?? en[key] ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };
}

export const SUPPORTED_LANGUAGES: { code: CVLanguage; name: string }[] = [
  { code: "en", name: "English" },
  { code: "km", name: "ភាសាខ្មែរ" },
];
