import en from "./en";
import ar from "./ar";

export type Locale = "en" | "ar";

export const dictionaries = { en, ar } satisfies Record<Locale, typeof en>;

export const LOCALE_STORAGE_KEY = "hr_locale";

export function isRtl(locale: Locale): boolean {
  return locale === "ar";
}

// Dot-path string lookup (e.g. "nav.today") typed against the English
// dictionary's shape, restricted to string leaves — function-valued
// entries like employees.deactivateConfirm are accessed directly off the
// dictionary object instead of through t().
type PathsToStrings<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends Record<string, unknown>
      ? PathsToStrings<T[K], `${Prefix}${K}.`>
      : never;
}[keyof T & string];

export type TranslationKey = PathsToStrings<typeof en>;

export function lookup(dict: typeof en, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : path;
}
