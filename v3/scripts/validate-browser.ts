import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";

const chromiumEntry = import.meta.resolve("@sparticuz/chromium");
const inflateModule = new URL("./lambdafs.js", chromiumEntry).href;
const librariesArchive = new URL("../bin/al2023.tar.br", chromiumEntry).pathname;
if (!(await Bun.file("/tmp/al2023/lib/libnss3.so").exists())) {
  const extraction = Bun.spawn([
    "node",
    "-e",
    `import('${inflateModule}').then(module => module.inflate('${librariesArchive}'))`,
  ]);
  if ((await extraction.exited) !== 0) throw new Error("Could not extract npm Chromium libraries");
}
process.env.LD_LIBRARY_PATH = `/tmp/al2023/lib:${process.env.LD_LIBRARY_PATH ?? ""}`;

const baseURL = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3000";
const output = new URL("../../docs/audits/images/v3-ui/", import.meta.url);
const browser = await playwright.launch({
  executablePath: await chromium.executablePath(),
  headless: true,
  args: chromium.args.filter((argument) => argument !== "--single-process"),
});
const results: Record<string, unknown>[] = [];
try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseURL}/simulator`, { waitUntil: "networkidle" });
    await page.selectOption("#scenario", "overload");
    await page.selectOption("#speed", "5");
    await page.click("#run");
    await page.waitForTimeout(4_000);
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    const protection = await page.locator("#protection").textContent();
    let authoring: Record<string, unknown> | undefined;
    if (viewport.name === "desktop") {
      const before = await page.locator(".equipment").count();
      const wiresBefore = await page.locator(".wire-group").count();
      await page.locator(".wire-group").first().focus();
      await page.keyboard.press("Enter");
      await page.click("#add-bend");
      await page.locator(".bend-handle").first().waitFor();
      const routed = await page.locator(".bend-handle").count();
      await page.click("#delete-wire");
      await page.waitForFunction(
        (count) => document.querySelectorAll(".wire-group").length === count - 1,
        wiresBefore,
      );
      const wiresAfterDelete = await page.locator(".wire-group").count();
      await page.click("#undo");
      await page.waitForFunction(
        (count) => document.querySelectorAll(".wire-group").length === count,
        wiresBefore,
      );
      await page.selectOption("#diagnostic-isolation", "breaker");
      await page.selectOption("#diagnostic-work", "load");
      for (const [button, expected] of [
        ["#diagnostic-begin", "Isolation point"],
        ["#diagnostic-prove", "indicator proved"],
        ["#diagnostic-lock", "is open and locked"],
        ["#diagnostic-dead", "below the 30 V"],
        ["#diagnostic-reprove", "ready for bounded dead testing"],
      ] as const) {
        await page.click(button);
        await page.locator("#diagnostic-status").filter({ hasText: expected }).waitFor();
      }
      await page.selectOption("#probe-from", "conductor:in");
      await page.selectOption("#probe-to", "conductor:out");
      await page.click("#attach-probes");
      await page.locator("#diagnostic-status").filter({ hasText: "probes attached" }).waitFor();
      await page.click("#null-leads");
      await page.locator("#diagnostic-status").filter({ hasText: "leads nulled" }).waitFor();
      await page.click("#run-continuity");
      await page
        .locator("#diagnostic-status")
        .filter({ hasText: "Continuity test measured" })
        .waitFor();
      const diagnosticReady = await page.locator("#diagnostic-status").textContent();
      await page.click("#new-circuit");
      const blank = await page.locator(".equipment").count();
      await page.locator('#bench button[data-part="supply"]').click();
      await page.locator(".equipment").first().waitFor();
      const afterAdd = await page.locator(".equipment").count();
      const customScenario = await page.locator("#scenario").inputValue();
      await page.click("#undo");
      await page.waitForFunction(() => document.querySelectorAll(".equipment").length === 0);
      const afterUndo = await page.locator(".equipment").count();
      await page.click("#redo");
      await page.locator(".equipment").first().waitFor();
      const afterRedo = await page.locator(".equipment").count();
      for (const part of [
        "junction",
        "neutral_bar",
        "earth_bar",
        "enclosure",
        "voltmeter",
        "ammeter",
        "clamp_meter",
      ]) {
        const count = await page.locator(".equipment").count();
        await page.locator(`#bench button[data-part="${part}"]`).click();
        await page.waitForFunction(
          (expected) => document.querySelectorAll(".equipment").length === expected,
          count + 1,
        );
      }
      const assemblyToolCount = await page.locator(".equipment").count();
      await page.locator(".equipment").nth(1).click();
      await page
        .locator(".equipment")
        .nth(2)
        .click({ modifiers: ["Shift"] });
      const multiSelected = await page.locator(".equipment.selected").count();
      await page.click("#align-top");
      await page.waitForTimeout(150);
      authoring = {
        before,
        wiresBefore,
        routed,
        wiresAfterDelete,
        diagnosticReady,
        blank,
        afterAdd,
        afterUndo,
        afterRedo,
        assemblyToolCount,
        multiSelected,
        customScenario,
      };
      if (
        before !== 4 ||
        wiresBefore !== 4 ||
        routed < 1 ||
        wiresAfterDelete !== 3 ||
        !diagnosticReady?.includes("0.080") ||
        blank !== 0 ||
        afterAdd !== 1 ||
        afterUndo !== 0 ||
        afterRedo !== 1 ||
        assemblyToolCount !== 8 ||
        multiSelected !== 2 ||
        customScenario !== "custom"
      ) {
        errors.push("Free-form blank/add/undo/redo authoring journey failed");
      }
    }
    await page.screenshot({
      path: new URL(`simulator-${viewport.name}.png`, output).pathname,
      fullPage: true,
    });
    results.push({
      page: "simulator",
      viewport: viewport.name,
      errors,
      horizontalOverflow,
      protection,
      ...(authoring ? { authoring } : {}),
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.selectOption("#scenario", "open_pen");
    await page.waitForTimeout(200);
    await page.click("#run");
    await page.waitForTimeout(1_600);
    const persistentDanger = await page.locator("#canvas").evaluate((element) => ({
      classApplied: element.classList.contains("persistent-danger"),
      faultVisible: document.querySelector("#fault-layer")?.childElementCount ? "1" : "0",
      status: document.querySelector("#hazard")?.textContent,
      ruleEvidence: document.querySelector("#rules")?.textContent,
    }));
    await page.screenshot({
      path: new URL(`simulator-fault-${viewport.name}.png`, output).pathname,
      fullPage: true,
    });
    results.push({
      page: "simulator-fault-reduced-motion",
      viewport: viewport.name,
      errors,
      horizontalOverflow,
      persistentDanger,
    });
    await page.close();
  }
  for (const route of ["/admin/content", "/account/security", "/workspaces"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    await page.screenshot({
      path: new URL(`${route.slice(1).replaceAll("/", "-")}.png`, output).pathname,
      fullPage: true,
    });
    results.push({ page: route, viewport: "desktop", errors, horizontalOverflow });
    await page.close();
  }
  const workspaceMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const workspaceErrors: string[] = [];
  workspaceMobile.on("pageerror", (error) => workspaceErrors.push(error.message));
  await workspaceMobile.goto(`${baseURL}/workspaces`, { waitUntil: "networkidle" });
  const workspaceOverflow = await workspaceMobile.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  await workspaceMobile.screenshot({
    path: new URL("workspaces-mobile.png", output).pathname,
    fullPage: true,
  });
  results.push({
    page: "/workspaces",
    viewport: "mobile",
    errors: workspaceErrors,
    horizontalOverflow: workspaceOverflow,
  });
  await workspaceMobile.close();
} finally {
  await browser.close();
}
if (results.some((result) => (result.errors as string[]).length > 0 || result.horizontalOverflow)) {
  throw new Error(JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results, null, 2));
