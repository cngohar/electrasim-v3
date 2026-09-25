import { describe, expect, test } from "bun:test";
import { type StepUpProofRepository, StepUpService } from "@electrasim/authorization";
import { createApplication } from "@electrasim/http-application";
import type { Logger } from "@electrasim/platform-contracts";

const userId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const proofId = "33333333-3333-4333-8333-333333333333";
const now = () => new Date("2026-09-24T12:00:00Z");
const logger: Logger = { info() {}, error() {} };

class RecordingStepUpRepository implements StepUpProofRepository {
  inputs: Array<Parameters<StepUpProofRepository["record"]>[0]> = [];
  async record(input: Parameters<StepUpProofRepository["record"]>[0]) {
    this.inputs.push(input);
    return { id: proofId };
  }
}

describe("explicit high-risk step-up proof", () => {
  test("records a short-lived proof bound to one user and Better Auth session", async () => {
    const repository = new RecordingStepUpRepository();
    const service = new StepUpService(repository, 10 * 60, now);
    const result = await service.recordVerifiedProof({
      userId,
      sessionId,
      method: "password",
      requestId: "step-up-1",
    });
    expect(result).toEqual({ id: proofId, expiresAt: new Date("2026-09-24T12:10:00Z") });
    expect(repository.inputs).toEqual([
      {
        userId,
        sessionId,
        method: "password",
        requestId: "step-up-1",
        verifiedAt: new Date("2026-09-24T12:00:00Z"),
        expiresAt: new Date("2026-09-24T12:10:00Z"),
      },
    ]);
  });

  test("password endpoint verifies through Better Auth before recording proof", async () => {
    const repository = new RecordingStepUpRepository();
    const service = new StepUpService(repository, 10 * 60, now);
    const makeApp = (valid: boolean) =>
      createApplication({
        version: "test",
        clock: { now },
        logger,
        readinessChecks: [],
        resolveIdentity: async () => ({ userId, sessionId }),
        verifyStepUpPassword: async (_request, password) =>
          valid && password === "correct-password",
        stepUp: service,
      });
    const request = () =>
      new Request("https://electrasim.test/api/security/step-up/password", {
        method: "POST",
        headers: { "content-type": "application/json", "x-request-id": "step-up-http-1" },
        body: JSON.stringify({ password: "correct-password" }),
      });

    const denied = await makeApp(false)(request());
    expect(denied.status).toBe(403);
    expect(repository.inputs).toHaveLength(0);

    const accepted = await makeApp(true)(request());
    expect(accepted.status).toBe(200);
    const body = await accepted.text();
    expect(JSON.parse(body)).toEqual({
      verified: true,
      expiresAt: "2026-09-24T12:10:00.000Z",
    });
    expect(body).not.toContain("correct-password");
    expect(repository.inputs).toHaveLength(1);
  });

  test("high-risk admin operations require an unexpired step-up in addition to MFA", async () => {
    const baseActor = {
      userId,
      sessionId,
      emailVerified: true,
      onboardingComplete: true,
      mfaSatisfied: true,
      platformPermissions: new Set(["platform.audit.read"]),
      workspaceMemberships: new Map(),
    };
    const app = (stepUpValidUntil: Date | null) =>
      createApplication({
        version: "test",
        clock: { now },
        logger,
        readinessChecks: [],
        resolvePlatformActor: async () => ({ ...baseActor, stepUpValidUntil }),
        getSystemJobSummary: async () => ({
          pending: 0,
          processing: 0,
          failed: 0,
          oldestPendingAt: null,
          failures: [],
        }),
      });
    const request = new Request("https://electrasim.test/api/admin/jobs");

    const missing = await app(null)(request.clone());
    expect(missing.status).toBe(403);
    expect(await missing.json()).toMatchObject({ error: "step_up_required" });

    const expired = await app(new Date("2026-09-24T12:00:00Z"))(request.clone());
    expect(expired.status).toBe(403);

    const allowed = await app(new Date("2026-09-24T12:10:00Z"))(request.clone());
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toMatchObject({
      context: "platform_jobs",
      summary: { pending: 0, failed: 0 },
    });
  });
});
