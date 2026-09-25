import chromium from "@sparticuz/chromium";
import { type Page, chromium as playwright } from "playwright-core";

interface BenchmarkResult {
  renderer: "svg" | "pixi";
  count: number;
  buildMs: number;
  medianFrameMs: number;
  p95FrameMs: number;
  slowFramePercent: number;
  measuredFrames: number;
  averageFps: number;
  domNodes: number;
  sceneObjects: number;
  accessibleObjects: number;
  rendererBackend: string;
  longTasks: number;
  viewport: "desktop" | "mobile";
  keyboardFocus: boolean;
  pageErrors: readonly string[];
}

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

const build = await Bun.build({
  entrypoints: [new URL("./renderer-benchmark-client.ts", import.meta.url).pathname],
  target: "browser",
  minify: true,
  sourcemap: "none",
});
if (!build.success || !build.outputs[0])
  throw new Error(`Renderer benchmark client build failed: ${build.logs.join("\n")}`);
const client = await build.outputs[0].text();
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ElectraSim renderer benchmark</title><style>
:root{font:15px/1.4 system-ui;color:#102d48;background:#eef5fb}*{box-sizing:border-box}body{margin:0;padding:12px}header{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:10px}h1{font-size:18px;margin:0}#status{font:600 13px ui-monospace,monospace;color:#075fce}#scene{height:calc(100vh - 72px);min-height:420px;position:relative;overflow:hidden;border:1px solid #8eb1ce;border-radius:12px;background:#dce9f4;background-image:radial-gradient(#9db9cf 1px,transparent 1px);background-size:24px 24px}svg,canvas{width:100%;height:100%;display:block}.wire{fill:none;stroke:#426b8a;stroke-width:5}.particle{fill:#13a8ff}.body{fill:#f7fbff;stroke:#14558a;stroke-width:2}.body.energized{fill:#ffd45a}.terminal{fill:#c2392f;stroke:#fff;stroke-width:2}.component text{text-anchor:middle;font:600 11px system-ui;fill:#133b5b}.component .rating{font-size:10px}.component:focus{outline:none}.component:focus .body{stroke:#ff8a00;stroke-width:5}.pixi-accessible-object{position:absolute;width:7.5%;height:8%;min-width:30px;min-height:26px;transform:translate(-50%,-50%);opacity:0;border:0;background:transparent}.pixi-accessible-object:focus{opacity:1;background:#ffcf3344;outline:4px solid #ff8a00;z-index:3;color:#052d55;font-weight:800}@media(max-width:600px){body{padding:6px}header{display:block}#scene{height:calc(100vh - 80px)}}
</style></head><body><header><h1>Technical-hybrid circuit scene benchmark</h1><output id="status">Preparing…</output></header><main id="scene"></main><script type="module" src="/client.js"></script></body></html>`;

const server = Bun.serve({
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/client.js")
      return new Response(client, {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      });
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  },
});

const browser = await playwright.launch({
  executablePath: await chromium.executablePath(),
  headless: true,
  args: chromium.args.filter((argument) => argument !== "--single-process"),
});

async function runCase(
  page: Page,
  renderer: "svg" | "pixi",
  count: number,
  viewport: "desktop" | "mobile",
): Promise<BenchmarkResult> {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}/?renderer=${renderer}&count=${count}`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(() => window.benchmarkReady === true);
  await page.keyboard.press("Tab");
  const keyboardFocus = await page.evaluate(() => {
    const active = document.activeElement;
    return active?.getAttribute("role") === "button" || active?.tagName === "BUTTON";
  });
  await page.waitForFunction(() => Boolean(window.benchmarkResult), undefined, { timeout: 30_000 });
  const result = await page.evaluate(() => window.benchmarkResult);
  if (!result) throw new Error(`${renderer} ${count} did not produce a result`);
  return { ...result, viewport, keyboardFocus, pageErrors };
}

const results: BenchmarkResult[] = [];
try {
  for (const viewport of [
    { name: "desktop" as const, width: 1440, height: 900 },
    { name: "mobile" as const, width: 390, height: 844 },
  ]) {
    for (const count of viewport.name === "desktop" ? [50, 100, 250, 500] : [100, 250]) {
      for (const renderer of ["svg", "pixi"] as const) {
        console.log(`Running ${viewport.name} ${renderer} with ${count} components…`);
        const page = await browser.newPage({
          viewport: { width: viewport.width, height: viewport.height },
        });
        results.push(await runCase(page, renderer, count, viewport.name));
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  server.stop(true);
}

const failed = results.filter(
  (result) =>
    result.pageErrors.length > 0 ||
    !result.keyboardFocus ||
    result.accessibleObjects !== result.count,
);
if (failed.length > 0)
  throw new Error(`Renderer benchmark acceptance failed: ${JSON.stringify(failed, null, 2)}`);

const output = new URL("../docs/renderer-benchmark-results.json", import.meta.url);
await Bun.write(
  output,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      environment: {
        runtime: `Bun ${Bun.version}`,
        browser: "npm-registry @sparticuz/chromium 153",
        graphics: "ANGLE SwiftShader software rendering",
        pixi: "8.21.0",
        note: "Headless software-rendered measurements are comparative, not production device guarantees.",
      },
      results,
    },
    null,
    2,
  )}\n`,
);
console.log(JSON.stringify(results, null, 2));
