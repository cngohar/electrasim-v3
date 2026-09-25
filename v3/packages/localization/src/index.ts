export const supportedLocales = ["en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export type TextDirection = "ltr" | "rtl";

export interface LocaleResolution {
  readonly locale: SupportedLocale;
  readonly requestedLocale: string | null;
  readonly direction: TextDirection;
  readonly fellBack: boolean;
}

export function resolveLocale(input: {
  readonly userLocale?: string | null;
  readonly workspaceLocale?: string | null;
  readonly acceptLanguage?: string | null;
}): LocaleResolution {
  const candidates = [
    input.userLocale,
    input.workspaceLocale,
    ...parseAcceptLanguage(input.acceptLanguage ?? null),
  ].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate);
    const supported = supportedLocales.find(
      (locale) => normalized === locale || normalized.startsWith(`${locale}-`),
    );
    if (supported) {
      return {
        locale: supported,
        requestedLocale: normalized,
        direction: directionForLocale(supported),
        fellBack: normalized !== supported,
      };
    }
  }
  const requestedLocale = candidates[0] ? normalizeLocale(candidates[0]) : null;
  return {
    locale: "en",
    requestedLocale,
    direction: "ltr",
    fellBack: requestedLocale !== null && requestedLocale !== "en",
  };
}

export function directionForLocale(locale: string): TextDirection {
  const language = normalizeLocale(locale).split("-")[0];
  return language && ["ar", "fa", "he", "ps", "ur"].includes(language) ? "rtl" : "ltr";
}

export function formatList(locale: SupportedLocale, values: readonly string[]): string {
  return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(values);
}

export function formatNumber(locale: SupportedLocale, value: number): string {
  return new Intl.NumberFormat(locale).format(value);
}

function parseAcceptLanguage(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [locale, ...parameters] = part.trim().split(";");
      const quality = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith("q="));
      return { locale: locale ?? "", quality: quality ? Number(quality.slice(2)) : 1 };
    })
    .filter((item) => item.locale && item.locale !== "*" && Number.isFinite(item.quality))
    .sort((left, right) => right.quality - left.quality)
    .map((item) => item.locale);
}

function normalizeLocale(locale: string): string {
  try {
    return Intl.getCanonicalLocales(locale.replaceAll("_", "-"))[0]?.toLowerCase() ?? "en";
  } catch {
    return locale.trim().toLowerCase();
  }
}
