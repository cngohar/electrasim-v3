import { describe, expect, test } from "bun:test";
import {
  directionForLocale,
  formatList,
  formatNumber,
  resolveLocale,
} from "@electrasim/localization";

describe("localization foundation", () => {
  test("resolves user, workspace, browser, then English fallback", () => {
    expect(
      resolveLocale({
        userLocale: "en-US",
        workspaceLocale: "ur-PK",
        acceptLanguage: "ar;q=0.9,en;q=0.8",
      }),
    ).toMatchObject({ locale: "en", requestedLocale: "en-us" });
    expect(
      resolveLocale({ workspaceLocale: null, acceptLanguage: "fr-FR;q=0.7,en-GB;q=0.9" }),
    ).toMatchObject({ locale: "en", requestedLocale: "en-gb" });
    expect(resolveLocale({ userLocale: "ur-PK" })).toEqual({
      locale: "en",
      requestedLocale: "ur-pk",
      direction: "ltr",
      fellBack: true,
    });
  });

  test("detects RTL readiness independently of enabled production catalogs", () => {
    expect(directionForLocale("ur-PK")).toBe("rtl");
    expect(directionForLocale("ar-SA")).toBe("rtl");
    expect(directionForLocale("en-PK")).toBe("ltr");
  });

  test("uses standards-based list and number formatting", () => {
    expect(formatList("en", ["voltage", "current", "power"])).toBe("voltage, current, and power");
    expect(formatNumber("en", 12_000)).toContain("12");
  });

  test("handles malformed language input without failing a request", () => {
    expect(() => resolveLocale({ acceptLanguage: "@@@;q=oops,*;q=1" })).not.toThrow();
    expect(resolveLocale({ acceptLanguage: "@@@;q=oops,*;q=1" }).locale).toBe("en");
  });
});
