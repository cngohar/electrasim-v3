import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const DIST = new URL('../dist/', import.meta.url);
const distPath = fileURLToPath(DIST);
// Performance limits: see docs/PERFORMANCE.md for background on React 19 / Tailwind 4 baseline floors.
const limits = {
  initialJsGzip: 250_000,
  initialCssGzip: 30_000,
  generatedTagPages: 80,
  totalHtmlBytes: 10 * 1024 * 1024,
  homePriorityImageBytes: 200_000,
};

function fail(message) {
  console.error(`FAIL  ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`PASS  ${message}`);
}

function filesRecursively(directory, predicate) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesRecursively(path, predicate);
    return predicate(path) ? [path] : [];
  });
}

const appHtmlPath = join(distPath, 'app/index.html');
if (!existsSync(appHtmlPath)) {
  console.error('Build output is missing. Run `npm run build` before `npm run check:perf`.');
  process.exit(1);
}

const appHtml = readFileSync(appHtmlPath, 'utf8');
const initialScripts = [...appHtml.matchAll(/<script\b[^>]*\bsrc="([^"]+\.js)"[^>]*>/gi)].map(
  ([tag, url]) => ({ url, isModule: /\btype="module"/i.test(tag) }),
);
const entryStyle = appHtml.match(/<link[^>]+href="([^"]+\.css)"/)?.[1];

if (initialScripts.length === 0) {
  fail('initial JS entries were not found in app/index.html');
} else if (!initialScripts.some((script) => script.isModule)) {
  fail('the initial JS assets do not include a module entry');
} else {
  const gzipBytes = initialScripts.reduce((total, { url }) => {
    const file = join(distPath, url.replace(/^\//, ''));
    return total + gzipSync(readFileSync(file), { level: 9 }).byteLength;
  }, 0);
  const urls = initialScripts.map(({ url }) => url).join(', ');
  if (gzipBytes > limits.initialJsGzip) {
    fail(`initial JS is ${gzipBytes} B gzip; budget is ${limits.initialJsGzip} B (${urls})`);
  } else {
    pass(`initial JS is ${gzipBytes} B gzip; budget is ${limits.initialJsGzip} B (${urls})`);
  }
}

if (!entryStyle) {
  fail('initial CSS entry was not found in app/index.html');
} else {
  const file = join(distPath, entryStyle.replace(/^\//, ''));
  const gzipBytes = gzipSync(readFileSync(file), { level: 9 }).byteLength;
  if (gzipBytes > limits.initialCssGzip) {
    fail(`initial CSS is ${gzipBytes} B gzip; budget is ${limits.initialCssGzip} B`);
  } else {
    pass(`initial CSS is ${gzipBytes} B gzip; budget is ${limits.initialCssGzip} B`);
  }
}

const htmlFiles = filesRecursively(distPath, (file) => file.endsWith('.html'));
const totalHtmlBytes = htmlFiles.reduce((sum, file) => sum + statSync(file).size, 0);
if (totalHtmlBytes > limits.totalHtmlBytes) {
  fail(`generated HTML is ${totalHtmlBytes} B; budget is ${limits.totalHtmlBytes} B`);
} else {
  pass(`generated HTML is ${totalHtmlBytes} B across ${htmlFiles.length} pages`);
}

const tagRoot = join(distPath, 'blog/tags');
const tagPages = existsSync(tagRoot)
  ? readdirSync(tagRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length
  : 0;
if (tagPages > limits.generatedTagPages) {
  fail(`generated tag pages: ${tagPages}; budget is ${limits.generatedTagPages}`);
} else {
  pass(`generated tag pages: ${tagPages}; budget is ${limits.generatedTagPages}`);
}

const homeHtml = readFileSync(join(distPath, 'index.html'), 'utf8');
const priorityImage = homeHtml
  .match(
    /<img[^>]+(?:fetchpriority="high"[^>]+src="([^"]+)"|src="([^"]+)"[^>]+fetchpriority="high")/,
  )
  ?.slice(1)
  .find(Boolean);
if (!priorityImage) {
  fail('home priority image was not found');
} else if (priorityImage.startsWith('data:')) {
  fail('home priority image must be a cacheable file, not a data URL');
} else {
  const imagePath = join(distPath, priorityImage.replace(/^\//, ''));
  if (!existsSync(imagePath)) {
    fail(`home priority image is missing: ${priorityImage}`);
  } else {
    const bytes = statSync(imagePath).size;
    if (bytes > limits.homePriorityImageBytes) {
      fail(`home priority image is ${bytes} B; budget is ${limits.homePriorityImageBytes} B`);
    } else {
      pass(`home priority image is ${bytes} B; budget is ${limits.homePriorityImageBytes} B`);
    }
  }
}
