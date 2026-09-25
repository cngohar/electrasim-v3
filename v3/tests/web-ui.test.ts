import { describe, expect, test } from "bun:test";
import { createApplication } from "@electrasim/http-application";
import type { Logger } from "@electrasim/platform-contracts";
import {
  appShellHtml,
  appShellJs,
  contentStudioHtml,
  contentStudioJs,
  securityHtml,
  securityJs,
  simulatorHtml,
  simulatorJs,
  workspacesHtml,
  workspacesJs,
} from "@electrasim/web-ui";

const logger: Logger = { info() {}, error() {} };
const app = createApplication({
  version: "test",
  clock: { now: () => new Date("2026-09-24T12:00:00Z") },
  logger,
  readinessChecks: [],
});

describe("integrated electrical-blue application shell", () => {
  test("serves an accessible sidebar shell without a classic dashboard grid", async () => {
    const response = await app(new Request("https://electrasim.test/app"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    const html = await response.text();
    expect(html).toContain('class="sidebar"');
    expect(html).toContain('id="main-content"');
    expect(html).toContain("Free sandbox");
    expect(html).toContain("110–120 V");
    expect(html.toLowerCase()).not.toContain("dashboard");
  });

  test("ships external cache-bounded CSS and JavaScript with reduced-motion support", async () => {
    const css = await app(new Request("https://electrasim.test/assets/app.css"));
    expect(css.headers.get("cache-control")).toBe("public, max-age=300");
    expect(await css.text()).toContain("prefers-reduced-motion");

    const script = await app(new Request("https://electrasim.test/assets/app.js"));
    expect(script.headers.get("content-type")).toContain("text/javascript");
    const source = await script.text();
    expect(() => new Function(source)).not.toThrow();
  });

  test("serves the horizontal Switchboard and executable hybrid Content Studio", async () => {
    const response = await app(new Request("https://electrasim.test/admin/content"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const html = await response.text();
    expect(html).toContain("Platform Switchboard");
    expect(html).toContain('class="bus"');
    expect(html).toContain('data-mode="visual"');
    expect(html).toContain('data-mode="markdown"');
    expect(html).toContain('data-mode="history"');
    expect(contentStudioHtml.toLowerCase()).not.toContain("sidebar");

    const script = await app(new Request("https://electrasim.test/assets/content-studio.js"));
    const source = await script.text();
    expect(() => new Function(source)).not.toThrow();
    expect(contentStudioJs).toContain("/api/admin/content");
  });

  test("ships account security and the mandatory animated simulator workbench", async () => {
    const simulator = await app(new Request("https://electrasim.test/simulator"));
    expect(simulator.status).toBe(200);
    expect(simulatorHtml).toContain("Free simulator sandbox");
    expect(simulatorHtml).toContain("Evidence & timeline");
    expect(simulatorJs).toContain("/api/simulator/run");
    expect(simulatorJs).toContain("/api/simulator/command");
    expect(simulatorJs).toContain("/api/simulator/diagnostic");
    expect(simulatorHtml).toContain("prove–isolate–lock–test–re-prove");
    expect(simulatorHtml).toContain('id="component-layer"');
    expect(simulatorHtml).toContain("Neutral bar");
    expect(simulatorHtml).toContain("Digital voltmeter");
    expect(simulatorJs).toContain("meter-reading");
    expect(simulatorHtml).toContain("Generic, dimensionally credible educational equipment");
    expect(simulatorJs).toContain("set_component_position");
    expect(simulatorHtml).toContain('id="selection-rectangle"');
    expect(simulatorHtml).toContain("Distribute ↔");
    expect(simulatorJs).toContain("containedPosition");
    expect(simulatorJs).toContain("copySelection");
    expect(simulatorJs).toContain("rotateSelection");
    expect(simulatorHtml).toContain('id="visual-style"');
    expect(simulatorJs).toContain("iconEquipmentSvg");
    expect(simulatorJs).toContain("updateLiveWires");
    expect(simulatorJs).toContain("Convert compatible existing equipment");
    expect(simulatorJs).toContain("controlsContactIds");
    expect(simulatorJs).toContain("repairRequired");
    expect(() => new Function(simulatorJs)).not.toThrow();

    const security = await app(new Request("https://electrasim.test/account/security"));
    expect(security.headers.get("cache-control")).toBe("private, no-store");
    expect(securityHtml).toContain("Passkeys and account access");
    expect(securityHtml).toContain("Create a teaching workspace");
    expect(securityJs).toContain("navigator.credentials.create");
    expect(() => new Function(securityJs)).not.toThrow();
  });

  test("serves a horizontal workspace switchboard with executable organization and roster tools", async () => {
    const response = await app(new Request("https://electrasim.test/workspaces"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(workspacesHtml).toContain("Campuses and departments");
    expect(workspacesHtml).toContain("People and roles");
    expect(workspacesHtml.toLowerCase()).not.toContain("sidebar");
    expect(workspacesJs).toContain("/api/account/workspaces");
    expect(() => new Function(workspacesJs)).not.toThrow();
  });

  test("contains real signup, session, onboarding, and local mailbox integrations", () => {
    expect(appShellHtml).toContain("/assets/app.js");
    expect(appShellJs).toContain("/api/auth/sign-up/email");
    expect(appShellJs).toContain("/api/auth/get-session");
    expect(appShellJs).toContain("/api/account/onboarding");
    expect(appShellJs).toContain("/api/dev/emails");
  });

  test("keeps captured email unavailable unless local capture is explicitly wired", async () => {
    const missing = await app(new Request("https://electrasim.test/api/dev/emails"));
    expect(missing.status).toBe(404);

    const localApp = createApplication({
      version: "test",
      clock: { now: () => new Date(0) },
      logger,
      readinessChecks: [],
      getCapturedEmails: () => [
        {
          id: "message-1",
          to: "alex@example.test",
          template: "verify_email",
          variables: { url: "http://localhost:3000/verify/secret" },
          capturedAt: "2026-09-24T12:00:00.000Z",
        },
      ],
    });
    const response = await localApp(new Request("https://electrasim.test/api/dev/emails"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ developmentOnly: true });
  });
});
