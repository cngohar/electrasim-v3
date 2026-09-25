import { Application, Container, Graphics, Text } from "pixi.js";

type RendererKind = "svg" | "pixi";

interface BenchmarkResult {
  renderer: RendererKind;
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
}

declare global {
  interface Window {
    benchmarkReady: boolean;
    benchmarkResult?: BenchmarkResult;
  }
}

const query = new URLSearchParams(location.search);
const renderer = query.get("renderer") === "pixi" ? "pixi" : "svg";
const count = Math.max(1, Math.min(500, Number(query.get("count") ?? 100)));
const host = document.querySelector<HTMLElement>("#scene");
const status = document.querySelector<HTMLElement>("#status");
if (!host || !status) throw new Error("Benchmark host is missing.");

const columns = Math.ceil(Math.sqrt(count * 1.7));
const spacingX = 135;
const spacingY = 100;
const positions = Array.from({ length: count }, (_, index) => ({
  x: 90 + (index % columns) * spacingX,
  y: 75 + Math.floor(index / columns) * spacingY,
}));
const worldWidth = columns * spacingX + 100;
const worldHeight = Math.ceil(count / columns) * spacingY + 100;
const start = performance.now();
let animate: (elapsedSeconds: number) => void;
let sceneObjects = 0;
let accessibleObjects = 0;
let rendererBackend = "SVG DOM";

const makeAccessibleButton = (index: number, x: number, y: number) => {
  const button = document.createElement("button");
  button.className = "pixi-accessible-object";
  button.style.left = `${(x / worldWidth) * 100}%`;
  button.style.top = `${(y / worldHeight) * 100}%`;
  button.setAttribute(
    "aria-label",
    `Component ${index + 1}, ${index % 6 === 0 ? "energized load" : "distribution device"}`,
  );
  button.textContent = String(index + 1);
  host.append(button);
  accessibleObjects += 1;
};

if (renderer === "svg") {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", `0 0 ${worldWidth} ${worldHeight}`);
  svg.setAttribute("role", "application");
  svg.setAttribute("aria-label", `${count} component SVG circuit benchmark`);
  const world = document.createElementNS(namespace, "g");
  svg.append(world);
  const wires = document.createElementNS(namespace, "g");
  wires.setAttribute("class", "wires");
  world.append(wires);
  const particles: SVGCircleElement[] = [];
  for (let index = 1; index < positions.length; index += 1) {
    const from = positions[index - 1];
    const to = positions[index];
    if (!from || !to) continue;
    const path = document.createElementNS(namespace, "path");
    path.setAttribute("d", `M${from.x + 46} ${from.y} H${to.x - 46} V${to.y}`);
    path.setAttribute("class", "wire");
    wires.append(path);
    for (let particleIndex = 0; particleIndex < 2; particleIndex += 1) {
      const particle = document.createElementNS(namespace, "circle");
      particle.setAttribute("r", "3");
      particle.setAttribute("class", "particle");
      particle.dataset.fromX = String(from.x + 46);
      particle.dataset.fromY = String(from.y);
      particle.dataset.toX = String(to.x - 46);
      particle.dataset.toY = String(to.y);
      particle.dataset.offset = String(particleIndex / 2);
      wires.append(particle);
      particles.push(particle);
    }
    sceneObjects += 3;
  }
  const animatedBodies: SVGRectElement[] = [];
  for (let index = 0; index < positions.length; index += 1) {
    const position = positions[index];
    if (!position) continue;
    const component = document.createElementNS(namespace, "g");
    component.setAttribute("class", "component");
    component.setAttribute("transform", `translate(${position.x - 46} ${position.y - 30})`);
    component.setAttribute("tabindex", "0");
    component.setAttribute("role", "button");
    component.setAttribute(
      "aria-label",
      `Component ${index + 1}, ${index % 6 === 0 ? "energized load" : "distribution device"}`,
    );
    const body = document.createElementNS(namespace, "rect");
    body.setAttribute("width", "92");
    body.setAttribute("height", "60");
    body.setAttribute("rx", "8");
    body.setAttribute("class", index % 6 === 0 ? "body energized" : "body");
    component.append(body);
    if (index % 6 === 0) animatedBodies.push(body);
    for (const terminalX of [0, 92]) {
      const terminal = document.createElementNS(namespace, "circle");
      terminal.setAttribute("cx", String(terminalX));
      terminal.setAttribute("cy", "30");
      terminal.setAttribute("r", "6");
      terminal.setAttribute("class", "terminal");
      component.append(terminal);
    }
    const label = document.createElementNS(namespace, "text");
    label.setAttribute("x", "46");
    label.setAttribute("y", "25");
    label.textContent = index % 6 === 0 ? `LOAD ${index + 1}` : `MCB ${index + 1}`;
    component.append(label);
    const rating = document.createElementNS(namespace, "text");
    rating.setAttribute("x", "46");
    rating.setAttribute("y", "43");
    rating.setAttribute("class", "rating");
    rating.textContent = index % 6 === 0 ? "230 V" : "B16 A";
    component.append(rating);
    world.append(component);
    accessibleObjects += 1;
    sceneObjects += 6;
  }
  host.append(svg);
  animate = (elapsedSeconds) => {
    const scale = 0.88 + Math.sin(elapsedSeconds * 0.65) * 0.035;
    const x = 18 + Math.sin(elapsedSeconds * 0.4) * 16;
    const y = 12 + Math.cos(elapsedSeconds * 0.33) * 10;
    world.setAttribute("transform", `translate(${x} ${y}) scale(${scale})`);
    for (let index = 0; index < animatedBodies.length; index += 1) {
      const body = animatedBodies[index];
      if (body) body.style.opacity = String(0.74 + 0.26 * Math.sin(elapsedSeconds * 4 + index));
    }
    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      if (!particle) continue;
      const progress = (elapsedSeconds * 0.8 + Number(particle.dataset.offset)) % 1;
      const fromX = Number(particle.dataset.fromX);
      const fromY = Number(particle.dataset.fromY);
      const toX = Number(particle.dataset.toX);
      const toY = Number(particle.dataset.toY);
      particle.setAttribute("cx", String(fromX + (toX - fromX) * progress));
      particle.setAttribute("cy", String(fromY + (toY - fromY) * progress));
    }
  };
} else {
  const app = new Application();
  await app.init({
    resizeTo: host,
    antialias: true,
    background: "#dce9f4",
    preference: "webgl",
    autoStart: false,
  });
  app.canvas.setAttribute("aria-hidden", "true");
  host.append(app.canvas);
  rendererBackend = app.renderer.constructor.name;
  const world = new Container();
  app.stage.addChild(world);
  const wires = new Graphics();
  for (let index = 1; index < positions.length; index += 1) {
    const from = positions[index - 1];
    const to = positions[index];
    if (!from || !to) continue;
    wires
      .moveTo(from.x + 46, from.y)
      .lineTo(to.x - 46, from.y)
      .lineTo(to.x - 46, to.y);
    sceneObjects += 1;
  }
  wires.stroke({ color: 0x426b8a, width: 5, alpha: 0.8 });
  world.addChild(wires);
  const animatedBodies: Graphics[] = [];
  for (let index = 0; index < positions.length; index += 1) {
    const position = positions[index];
    if (!position) continue;
    const component = new Container();
    component.position.set(position.x, position.y);
    const body = new Graphics()
      .roundRect(-46, -30, 92, 60, 8)
      .fill(index % 6 === 0 ? 0xffd45a : 0xf7fbff)
      .stroke({ color: 0x14558a, width: 2 });
    if (index % 6 === 0) animatedBodies.push(body);
    const terminals = new Graphics()
      .circle(-46, 0, 6)
      .circle(46, 0, 6)
      .fill(0xc2392f)
      .stroke({ color: 0xffffff, width: 2 });
    const label = new Text({
      text: index % 6 === 0 ? `LOAD ${index + 1}\n230 V` : `MCB ${index + 1}\nB16 A`,
      style: {
        fill: 0x133b5b,
        fontFamily: "system-ui",
        fontSize: 11,
        fontWeight: "600",
        align: "center",
      },
    });
    label.anchor.set(0.5);
    component.addChild(body, terminals, label);
    world.addChild(component);
    makeAccessibleButton(index, position.x, position.y);
    sceneObjects += 5;
  }
  const particles = new Graphics();
  world.addChild(particles);
  animate = (elapsedSeconds) => {
    world.scale.set(0.88 + Math.sin(elapsedSeconds * 0.65) * 0.035);
    world.position.set(
      18 + Math.sin(elapsedSeconds * 0.4) * 16,
      12 + Math.cos(elapsedSeconds * 0.33) * 10,
    );
    for (let index = 0; index < animatedBodies.length; index += 1) {
      const body = animatedBodies[index];
      if (body) body.alpha = 0.74 + 0.26 * Math.sin(elapsedSeconds * 4 + index);
    }
    particles.clear();
    for (let index = 1; index < positions.length; index += 1) {
      const from = positions[index - 1];
      const to = positions[index];
      if (!from || !to) continue;
      for (let particleIndex = 0; particleIndex < 2; particleIndex += 1) {
        const progress = (elapsedSeconds * 0.8 + particleIndex / 2) % 1;
        particles
          .circle(
            from.x + 46 + (to.x - 92 - from.x) * progress,
            from.y + (to.y - from.y) * progress,
            3,
          )
          .fill(0x13a8ff);
      }
    }
    app.renderer.render(app.stage);
  };
}

const buildMs = performance.now() - start;
status.textContent = `${renderer.toUpperCase()} · ${count} components · animating`;
window.benchmarkReady = true;
const frameTimes: number[] = [];
let longTasks = 0;
if ("PerformanceObserver" in window) {
  try {
    new PerformanceObserver((entries) => {
      longTasks += entries.getEntries().length;
    }).observe({ type: "longtask", buffered: true });
  } catch {
    // Long Task API is optional in test browsers.
  }
}
let previous = performance.now();
const animationStartedAt = previous;
let frames = 0;
const targetDurationMs = 3_000;
const tick = (now: number) => {
  const delta = now - previous;
  previous = now;
  if (frames > 5) frameTimes.push(delta);
  animate(now / 1_000);
  frames += 1;
  if (now - animationStartedAt < targetDurationMs) {
    requestAnimationFrame(tick);
    return;
  }
  const sorted = [...frameTimes].sort((left, right) => left - right);
  const percentile = (fraction: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
  window.benchmarkResult = {
    renderer,
    count,
    buildMs,
    medianFrameMs: percentile(0.5),
    p95FrameMs: percentile(0.95),
    slowFramePercent:
      (frameTimes.filter((value) => value > 20).length / Math.max(1, frameTimes.length)) * 100,
    measuredFrames: frameTimes.length,
    averageFps: frameTimes.length / (frameTimes.reduce((total, value) => total + value, 0) / 1_000),
    domNodes: document.querySelectorAll("*").length,
    sceneObjects,
    accessibleObjects,
    rendererBackend,
    longTasks,
  };
  status.textContent += " · complete";
};
requestAnimationFrame(tick);
