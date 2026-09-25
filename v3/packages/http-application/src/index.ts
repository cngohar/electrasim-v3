import {
  authorizePlatformAdmin,
  authorizeWorkspace,
  type SessionActor,
  type StepUpService,
} from "@electrasim/authorization";
import {
  type ContentDraftInput,
  type ContentMediaService,
  type ContentRevisionInput,
  ContentStudioError,
  type ContentStudioService,
  type PublishedContentService,
  type PublishedMediaService,
  renderBody,
} from "@electrasim/content-studio";
import {
  type AccountLifecycleService,
  type AccountOnboardingService,
  IdentityLifecycleError,
  type OnboardingCommand,
  OnboardingError,
} from "@electrasim/identity";
import {
  type InvitationAcceptanceService,
  InvitationError,
  type InvitationManagementService,
} from "@electrasim/invitations";
import type {
  ApplicationDependencies,
  TransactionalEmailMessage,
} from "@electrasim/platform-contracts";
import {
  applyCircuitCommand,
  applyDiagnosticAction,
  type CircuitCommand,
  type CircuitDocument,
  createDiagnosticFaultFixture,
  createFaultLoopFixture,
  createItFixture,
  createNorthAmericanGroundedFixture,
  createTncsFixture,
  createVerticalSliceCircuit,
  type DiagnosticAction,
  evaluateInstallationRules,
  evaluateSimulatorLesson,
  migrateCircuitDocument,
  runSimulation,
  type SimulationJobHost,
  SimulatorError,
  type SimulatorLessonId,
  type SimulatorLessonSubmissionService,
  type SimulatorProjectService,
  type SupplyFamily,
  simulatorLessons,
  simulatorProductPolicy,
} from "@electrasim/simulator-domain";
import {
  appShellCss,
  appShellHtml,
  appShellJs,
  contentStudioCss,
  contentStudioHtml,
  contentStudioJs,
  securityCss,
  securityHtml,
  securityJs,
  simulatorCss,
  simulatorHtml,
  simulatorJs,
  workspacesCss,
  workspacesHtml,
  workspacesJs,
} from "@electrasim/web-ui";
import {
  WorkspaceAdministrationError,
  type WorkspaceAdministrationService,
} from "@electrasim/workspace-administration";

export type Application = (request: Request) => Promise<Response>;

export interface HttpApplicationDependencies extends ApplicationDependencies {
  readonly authHandler?: Application;
  readonly resolveIdentity?: (
    request: Request,
  ) => Promise<{ readonly userId: string; readonly sessionId?: string } | null>;
  readonly verifyStepUpPassword?: (request: Request, password: string) => Promise<boolean>;
  readonly verifyStepUpPasskey?: (
    request: Request,
    response: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly stepUp?: StepUpService;
  readonly accountOnboarding?: AccountOnboardingService;
  readonly accountLifecycle?: AccountLifecycleService;
  readonly contentStudio?: ContentStudioService;
  readonly contentMedia?: ContentMediaService;
  readonly publishedContent?: PublishedContentService;
  readonly publishedMedia?: PublishedMediaService;
  readonly simulatorProjects?: SimulatorProjectService;
  readonly simulationJobs?: SimulationJobHost;
  readonly simulatorLessonSubmissions?: SimulatorLessonSubmissionService;
  readonly hasSimulatorPro?: (userId: string) => Promise<boolean>;
  readonly invitationAcceptance?: InvitationAcceptanceService;
  readonly invitationManagement?: InvitationManagementService;
  readonly workspaceAdministration?: WorkspaceAdministrationService;
  readonly resolvePlatformActor?: (request: Request) => Promise<SessionActor | null>;
  readonly resolveWorkspaceActor?: (
    request: Request,
    workspaceId: string,
  ) => Promise<SessionActor | null>;
  readonly getCapturedEmails?: () => readonly (TransactionalEmailMessage & {
    readonly capturedAt: string;
  })[];
  readonly getSystemJobSummary?: () => Promise<{
    readonly pending: number;
    readonly processing: number;
    readonly failed: number;
    readonly oldestPendingAt: string | null;
    readonly failures: readonly {
      readonly type: string;
      readonly attempts: number;
      readonly errorType: string | null;
      readonly createdAt: string;
    }[];
  }>;
}

const SENSITIVE_CACHE_CONTROL = "private, no-store";
const PUBLIC_VERSION_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=60";

function json(
  body: Readonly<Record<string, unknown>>,
  init: ResponseInit = {},
  cacheControl = SENSITIVE_CACHE_CONTROL,
): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", cacheControl);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function staticResponse(
  body: string,
  contentType: string,
  cacheControl: string,
  html = false,
): Response {
  const headers = new Headers({
    "content-type": contentType,
    "cache-control": cacheControl,
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  });
  if (html) {
    headers.set(
      "content-security-policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
  }
  return new Response(body, { headers });
}

function requestId(request: Request): string {
  const supplied = request.headers.get("x-request-id")?.trim();
  if (supplied && /^[a-zA-Z0-9._:-]{1,100}$/.test(supplied)) return supplied;
  return crypto.randomUUID();
}

async function readiness(dependencies: ApplicationDependencies): Promise<Response> {
  const checks = await Promise.all(
    dependencies.readinessChecks.map(async (check) => {
      try {
        return { name: check.name, ...(await check.check()) };
      } catch (error) {
        return {
          name: check.name,
          ready: false,
          detail: error instanceof Error ? error.message : "unknown readiness failure",
        };
      }
    }),
  );
  const ready = checks.every((check) => check.ready);
  return json({ status: ready ? "ready" : "not_ready", checks }, { status: ready ? 200 : 503 });
}

async function accountOnboardingResponse(
  request: Request,
  requestIdValue: string,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (!dependencies.resolveIdentity || !dependencies.accountOnboarding) {
    return json({ error: "identity_not_configured", requestId: requestIdValue }, { status: 503 });
  }
  const identity = await dependencies.resolveIdentity(request);
  if (!identity) {
    return json({ error: "unauthenticated", requestId: requestIdValue }, { status: 401 });
  }

  try {
    if (request.method === "GET") {
      const result = await dependencies.accountOnboarding.getGate(identity.userId);
      return json({
        gate: result.gate,
        onboarding: publicOnboardingState(result.state),
        requirements: { safetyTermsVersion: dependencies.accountOnboarding.safetyTermsVersion },
      });
    }
    if (request.method === "POST") {
      const command = await parseOnboardingCommand(request);
      if (!command) {
        return json(
          { error: "invalid_onboarding_step", requestId: requestIdValue },
          { status: 400 },
        );
      }
      const result = await dependencies.accountOnboarding.submit(
        identity.userId,
        command,
        requestIdValue,
      );
      return json({
        gate: result.gate,
        onboarding: publicOnboardingState(result.state),
        requirements: { safetyTermsVersion: dependencies.accountOnboarding.safetyTermsVersion },
      });
    }
    const response = json(
      { error: "method_not_allowed", requestId: requestIdValue },
      { status: 405 },
    );
    response.headers.set("allow", "GET, POST");
    return response;
  } catch (error) {
    if (error instanceof OnboardingError) {
      const status =
        error.code === "account_not_found" ? 404 : error.code === "account_disabled" ? 403 : 409;
      return json(
        { error: error.code, currentGate: error.currentGate, requestId: requestIdValue },
        { status },
      );
    }
    throw error;
  }
}

async function teachingWorkspaceResponse(
  request: Request,
  requestIdValue: string,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (request.method !== "POST") {
    const response = json(
      { error: "method_not_allowed", requestId: requestIdValue },
      { status: 405 },
    );
    response.headers.set("allow", "POST");
    return response;
  }
  if (
    !dependencies.resolveIdentity ||
    !dependencies.accountOnboarding ||
    !dependencies.accountLifecycle
  ) {
    return json({ error: "identity_not_configured", requestId: requestIdValue }, { status: 503 });
  }
  const identity = await dependencies.resolveIdentity(request);
  if (!identity)
    return json({ error: "unauthenticated", requestId: requestIdValue }, { status: 401 });
  const body = await parseBoundedRecord(request);
  if (
    !body ||
    (body.type !== "independent_instructor" && body.type !== "institution") ||
    !shortString(body.name, 120) ||
    !shortString(body.slug, 100)
  ) {
    return json({ error: "invalid_workspace" }, { status: 400 });
  }
  try {
    const { state } = await dependencies.accountOnboarding.getGate(identity.userId);
    const idempotencyKey =
      request.headers.get("idempotency-key") ?? `workspace-create:${identity.userId}:${body.slug}`;
    const result =
      body.type === "independent_instructor"
        ? await dependencies.accountLifecycle.createIndependentInstructorWorkspace({
            lifecycle: state,
            name: body.name,
            slug: body.slug,
            requestId: requestIdValue,
            idempotencyKey,
          })
        : await dependencies.accountLifecycle.createInstitutionWorkspace({
            lifecycle: state,
            name: body.name,
            slug: body.slug,
            countryCode: shortString(body.countryCode, 2) ? body.countryCode : "",
            timezone: shortString(body.timezone, 100) ? body.timezone : "",
            requestId: requestIdValue,
            idempotencyKey,
          });
    return json(result as unknown as Record<string, unknown>, {
      status: result.created ? 201 : 200,
    });
  } catch (error) {
    if (error instanceof IdentityLifecycleError) {
      return json({ error: error.code, requestId: requestIdValue }, { status: 409 });
    }
    throw error;
  }
}

function publicOnboardingState(state: {
  readonly emailVerified: boolean;
  readonly personalWorkspaceReady: boolean;
  readonly adultEligibilityConfirmedAt: Date | null;
  readonly primaryGoal: string | null;
  readonly experienceLevel: string | null;
  readonly supplyFamily: string | null;
  readonly accessibilityPresentedAt: Date | null;
  readonly safetyTermsVersion: string | null;
  readonly onboardingCompletedAt: Date | null;
}) {
  return {
    emailVerified: state.emailVerified,
    personalWorkspaceReady: state.personalWorkspaceReady,
    adultEligibilityConfirmed: state.adultEligibilityConfirmedAt !== null,
    primaryGoal: state.primaryGoal,
    experienceLevel: state.experienceLevel,
    supplyFamily: state.supplyFamily,
    accessibilityPresented: state.accessibilityPresentedAt !== null,
    safetyTermsVersion: state.safetyTermsVersion,
    complete: state.onboardingCompletedAt !== null,
  };
}

async function parseOnboardingCommand(request: Request): Promise<OnboardingCommand | null> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 16_384) return null;
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  switch (input.type) {
    case "confirm_adult":
      return input.confirmed === true ? { type: "confirm_adult", confirmed: true } : null;
    case "set_primary_goal":
      return input.value === "learn" ||
        input.value === "teach_independently" ||
        input.value === "join_or_manage_institution"
        ? { type: "set_primary_goal", value: input.value }
        : null;
    case "set_experience":
      return input.value === "new" ||
        input.value === "student_or_apprentice" ||
        input.value === "working_professional"
        ? { type: "set_experience", value: input.value }
        : null;
    case "set_supply_family":
      return input.value === "us_110_120" || input.value === "international_230_240"
        ? { type: "set_supply_family", value: input.value }
        : null;
    case "acknowledge_accessibility":
      return { type: "acknowledge_accessibility" };
    case "accept_safety_terms":
      return typeof input.version === "string" && input.version.length <= 100
        ? { type: "accept_safety_terms", version: input.version }
        : null;
    case "complete_onboarding":
      return { type: "complete_onboarding" };
    default:
      return null;
  }
}

function capturedEmailsResponse(
  request: Request,
  requestIdValue: string,
  dependencies: HttpApplicationDependencies,
): Response {
  if (request.method !== "GET" && request.method !== "HEAD") {
    const response = json(
      { error: "method_not_allowed", requestId: requestIdValue },
      { status: 405 },
    );
    response.headers.set("allow", "GET, HEAD");
    return response;
  }
  if (!dependencies.getCapturedEmails) {
    return json({ error: "not_found", requestId: requestIdValue }, { status: 404 });
  }
  return json({
    developmentOnly: true,
    messages: dependencies.getCapturedEmails().map((message) => ({
      id: message.id,
      to: message.to,
      template: message.template,
      variables: message.variables,
      capturedAt: message.capturedAt,
    })),
  });
}

async function passwordStepUpResponse(
  request: Request,
  requestIdValue: string,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (request.method !== "POST") {
    const response = json(
      { error: "method_not_allowed", requestId: requestIdValue },
      { status: 405 },
    );
    response.headers.set("allow", "POST");
    return response;
  }
  if (!dependencies.resolveIdentity || !dependencies.verifyStepUpPassword || !dependencies.stepUp) {
    return json({ error: "identity_not_configured", requestId: requestIdValue }, { status: 503 });
  }
  const identity = await dependencies.resolveIdentity(request);
  if (!identity?.sessionId) {
    return json({ error: "unauthenticated", requestId: requestIdValue }, { status: 401 });
  }
  const password = await parsePasswordBody(request);
  if (!password) {
    return json({ error: "invalid_request", requestId: requestIdValue }, { status: 400 });
  }
  if (!(await dependencies.verifyStepUpPassword(request, password))) {
    return json(
      { error: "step_up_verification_failed", requestId: requestIdValue },
      { status: 403 },
    );
  }
  const result = await dependencies.stepUp.recordVerifiedProof({
    userId: identity.userId,
    sessionId: identity.sessionId,
    method: "password",
    requestId: requestIdValue,
  });
  return json({ verified: true, expiresAt: result.expiresAt.toISOString() });
}

async function passkeyStepUpResponse(
  request: Request,
  requestIdValue: string,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, { status: 405 });
  if (!dependencies.resolveIdentity || !dependencies.verifyStepUpPasskey || !dependencies.stepUp) {
    return json({ error: "identity_not_configured" }, { status: 503 });
  }
  const identity = await dependencies.resolveIdentity(request);
  if (!identity?.sessionId) return json({ error: "unauthenticated" }, { status: 401 });
  const body = await parseBoundedRecord(request);
  if (!body || !isRecord(body.response)) return json({ error: "invalid_request" }, { status: 400 });
  const verifiedUserId = await dependencies.verifyStepUpPasskey(request, body.response);
  if (verifiedUserId !== identity.userId) {
    return json({ error: "step_up_verification_failed" }, { status: 403 });
  }
  const result = await dependencies.stepUp.recordVerifiedProof({
    userId: identity.userId,
    sessionId: identity.sessionId,
    method: "passkey",
    requestId: requestIdValue,
  });
  return json({ verified: true, expiresAt: result.expiresAt.toISOString() });
}

async function parsePasswordBody(request: Request): Promise<string | null> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 4_096) return null;
  try {
    const value = (await request.json()) as unknown;
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const password = (value as Record<string, unknown>).password;
    return typeof password === "string" && password.length >= 8 && password.length <= 256
      ? password
      : null;
  } catch {
    return null;
  }
}

async function invitationAcceptanceResponse(
  request: Request,
  requestIdValue: string,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (request.method !== "POST") {
    const response = json(
      { error: "method_not_allowed", requestId: requestIdValue },
      { status: 405 },
    );
    response.headers.set("allow", "POST");
    return response;
  }
  if (!dependencies.resolveIdentity || !dependencies.invitationAcceptance) {
    return json({ error: "identity_not_configured", requestId: requestIdValue }, { status: 503 });
  }
  const identity = await dependencies.resolveIdentity(request);
  if (!identity) {
    return json({ error: "unauthenticated", requestId: requestIdValue }, { status: 401 });
  }
  const rawToken = await parseInvitationTokenBody(request);
  if (!rawToken) {
    return json({ error: "invalid_token", requestId: requestIdValue }, { status: 400 });
  }
  try {
    const result = await dependencies.invitationAcceptance.accept({
      rawToken,
      userId: identity.userId,
      requestId: requestIdValue,
    });
    return json({
      workspaceId: result.workspaceId,
      membershipId: result.membershipId,
      alreadyAccepted: result.alreadyAccepted,
    });
  } catch (error) {
    if (!(error instanceof InvitationError)) throw error;
    const status = invitationErrorStatus(error.code);
    return json({ error: error.code, requestId: requestIdValue }, { status });
  }
}

async function parseInvitationTokenBody(request: Request): Promise<string | null> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 2_048) return null;
  try {
    const value = (await request.json()) as unknown;
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const token = (value as Record<string, unknown>).token;
    return typeof token === "string" && token.length <= 512 ? token : null;
  } catch {
    return null;
  }
}

function invitationErrorStatus(code: InvitationError["code"]): number {
  switch (code) {
    case "invalid_token":
    case "invalid_invited_email":
      return 400;
    case "invitation_not_found":
      return 404;
    case "invitation_management_denied":
      return 403;
    case "verified_onboarded_account_required":
    case "invited_email_mismatch":
    case "membership_suspended":
      return 403;
    default:
      return 409;
  }
}

async function contentMediaResponse(
  request: Request,
  requestIdValue: string,
  mediaId: string | null,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  const expectedMethod = mediaId ? "GET" : "POST";
  if (request.method !== expectedMethod) {
    const response = json(
      { error: "method_not_allowed", requestId: requestIdValue },
      { status: 405 },
    );
    response.headers.set("allow", expectedMethod);
    return response;
  }
  const actor = dependencies.resolvePlatformActor
    ? await dependencies.resolvePlatformActor(request)
    : null;
  const decision = authorizePlatformAdmin(actor, {
    permission: mediaId ? "platform.content.read" : "platform.content.edit",
    requireMfa: true,
    now: dependencies.clock.now(),
  });
  if (!decision.allowed || !actor) {
    return json(
      { error: decision.allowed ? "unauthenticated" : decision.reason, requestId: requestIdValue },
      { status: !decision.allowed && decision.reason === "unauthenticated" ? 401 : 403 },
    );
  }
  if (!dependencies.contentMedia) {
    return json(
      { error: "content_media_not_configured", requestId: requestIdValue },
      { status: 503 },
    );
  }
  try {
    if (mediaId) {
      const media = await dependencies.contentMedia.getPreview({
        id: mediaId,
        actorUserId: actor.userId,
      });
      if (!media)
        return json(
          { error: "content_media_not_found", requestId: requestIdValue },
          { status: 404 },
        );
      const responseBytes = new Uint8Array(media.bytes.byteLength);
      responseBytes.set(media.bytes);
      return new Response(responseBytes.buffer, {
        headers: {
          "content-type": media.contentType,
          "content-length": String(media.bytes.byteLength),
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
          "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
        },
      });
    }
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(contentLength) || contentLength < 16 || contentLength > 5 * 1024 * 1024) {
      return json({ error: "invalid_content", requestId: requestIdValue }, { status: 400 });
    }
    const filename = request.headers.get("x-file-name") ?? "";
    const altText = request.headers.get("x-alt-text") ?? "";
    const declaredContentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim() ?? "";
    const result = await dependencies.contentMedia.upload({
      bytes: new Uint8Array(await request.arrayBuffer()),
      filename,
      declaredContentType,
      altText,
      actorUserId: actor.userId,
      requestId: requestIdValue,
    });
    return json({ ...result }, { status: 201 });
  } catch (error) {
    if (!(error instanceof ContentStudioError)) throw error;
    return json(
      { error: error.code, requestId: requestIdValue },
      { status: error.code === "content_permission_denied" ? 403 : 400 },
    );
  }
}

async function simulatorCommandResponse(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    const response = json({ error: "method_not_allowed" }, { status: 405 });
    response.headers.set("allow", "POST");
    return response;
  }
  const body = await parseBoundedRecord(request);
  if (!body || !isRecord(body.circuit) || !isRecord(body.command))
    return json({ error: "invalid_command" }, { status: 400 });
  try {
    const migration = migrateCircuitDocument(body.circuit);
    const result = applyCircuitCommand(
      migration.document,
      body.command as unknown as CircuitCommand,
    );
    return json({ circuit: result.circuit, inverse: result.inverse });
  } catch (error) {
    if (error instanceof SimulatorError)
      return json({ error: error.code, detail: error.detail }, { status: 400 });
    return json({ error: "invalid_command" }, { status: 400 });
  }
}

async function simulatorDiagnosticResponse(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    const response = json({ error: "method_not_allowed" }, { status: 405 });
    response.headers.set("allow", "POST");
    return response;
  }
  const body = await parseBoundedRecord(request);
  if (!body || !isRecord(body.circuit) || !isRecord(body.action))
    return json({ error: "invalid_diagnostic" }, { status: 400 });
  try {
    const migration = migrateCircuitDocument(body.circuit);
    return json(
      applyDiagnosticAction(
        migration.document,
        body.action as unknown as DiagnosticAction,
      ) as unknown as Record<string, unknown>,
    );
  } catch (error) {
    if (error instanceof SimulatorError)
      return json({ error: error.code, detail: error.detail }, { status: 400 });
    return json({ error: "invalid_diagnostic" }, { status: 400 });
  }
}

async function simulatorLessonsResponse(request: Request): Promise<Response> {
  if (request.method === "GET") return json({ lessons: simulatorLessons });
  if (request.method !== "POST") {
    const response = json({ error: "method_not_allowed" }, { status: 405 });
    response.headers.set("allow", "GET, POST");
    return response;
  }
  const body = await parseBoundedRecord(request);
  if (!body || !isRecord(body.circuit) || typeof body.lessonId !== "string")
    return json({ error: "invalid_lesson_submission" }, { status: 400 });
  const lesson = simulatorLessons.find((entry) => entry.id === body.lessonId);
  if (!lesson) return json({ error: "lesson_not_found" }, { status: 404 });
  try {
    const migration = migrateCircuitDocument(body.circuit);
    return json({
      lesson,
      evaluation: evaluateSimulatorLesson(body.lessonId as SimulatorLessonId, migration.document),
      circuitRevision: migration.document.revision,
    });
  } catch (error) {
    if (error instanceof SimulatorError)
      return json({ error: error.code, detail: error.detail }, { status: 400 });
    return json({ error: "invalid_lesson_submission" }, { status: 400 });
  }
}

async function simulatorLessonSubmissionsResponse(
  request: Request,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (!dependencies.resolveIdentity || !dependencies.simulatorLessonSubmissions)
    return json({ error: "identity_not_configured" }, { status: 503 });
  const identity = await dependencies.resolveIdentity(request);
  if (!identity) return json({ error: "authentication_required" }, { status: 401 });
  if (request.method === "GET") {
    const submissions = await dependencies.simulatorLessonSubmissions.listForLearner(
      identity.userId,
    );
    return json({ submissions } as unknown as Record<string, unknown>);
  }
  if (request.method !== "POST") {
    const response = json({ error: "method_not_allowed" }, { status: 405 });
    response.headers.set("allow", "GET, POST");
    return response;
  }
  const body = await parseBoundedRecord(request);
  if (!body || typeof body.lessonId !== "string" || !isRecord(body.circuit))
    return json({ error: "invalid_lesson_submission" }, { status: 400 });
  try {
    const submission = await dependencies.simulatorLessonSubmissions.submit({
      learnerUserId: identity.userId,
      lessonId: body.lessonId,
      circuit: body.circuit,
    });
    return json({ submission } as unknown as Record<string, unknown>, { status: 201 });
  } catch (error) {
    if (error instanceof SimulatorError)
      return json({ error: error.code, detail: error.detail }, { status: 400 });
    throw error;
  }
}

async function simulatorRunResponse(
  request: Request,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (request.method !== "POST") {
    const response = json({ error: "method_not_allowed" }, { status: 405 });
    response.headers.set("allow", "POST");
    return response;
  }
  const body = await parseBoundedRecord(request);
  if (!body) return json({ error: "invalid_simulation" }, { status: 400 });
  const scenario = body.scenario;
  const supplyFamily = body.supplyFamily;
  const durationMs = Number(body.durationMs);
  const stepMs = Number(body.stepMs);
  if (!Number.isInteger(durationMs) || !Number.isInteger(stepMs))
    return json({ error: "invalid_simulation" }, { status: 400 });
  if (isRecord(body.circuit)) {
    try {
      const migration = migrateCircuitDocument(body.circuit);
      const run = dependencies.simulationJobs
        ? await dependencies.simulationJobs.run(
            migration.document,
            durationMs,
            stepMs,
            request.signal,
          )
        : runSimulation(migration.document, durationMs, stepMs);
      return json({
        ...run,
        circuit: migration.document,
        installationRules: evaluateInstallationRules(migration.document, run),
        migration: { migratedFrom: migration.migratedFrom, warnings: migration.warnings },
      } as unknown as Record<string, unknown>);
    } catch (error) {
      if (!(error instanceof SimulatorError)) throw error;
      return json({ error: error.code }, { status: 400 });
    }
  }
  const supportedScenarios = new Set([
    "normal",
    "overload",
    "failed",
    "line_neutral_fault",
    "tt_rcd_fault",
    "high_impedance_earth",
    "open_pe",
    "earth_fault_failed",
    "tncs_fault",
    "open_pen",
    "it_first_fault",
    "it_second_fault",
    "na_ground_fault",
    "na_open_egc",
    "diagnostic_open_cpc",
    "diagnostic_high_resistance_joint",
    "diagnostic_neutral_earth_bond",
    "diagnostic_insulation_damage",
    "diagnostic_parallel_path",
  ]);
  if (
    typeof scenario !== "string" ||
    !supportedScenarios.has(scenario) ||
    (supplyFamily !== "us_110_120" && supplyFamily !== "international_230_240")
  ) {
    return json({ error: "invalid_simulation" }, { status: 400 });
  }
  const resistance =
    scenario === "normal"
      ? supplyFamily === "us_110_120"
        ? 12
        : 23
      : scenario === "overload"
        ? 3
        : 1.2;
  try {
    const circuit = scenario.startsWith("diagnostic_")
      ? createDiagnosticFaultFixture(
          scenario.slice("diagnostic_".length) as Parameters<
            typeof createDiagnosticFaultFixture
          >[0],
        )
      : scenario === "normal" || scenario === "overload" || scenario === "failed"
        ? createVerticalSliceCircuit({
            supplyFamily: supplyFamily as SupplyFamily,
            loadResistanceOhms: resistance,
            breakerFailure: scenario === "failed",
          })
        : scenario === "tncs_fault" || scenario === "open_pen"
          ? createTncsFixture({ openPen: scenario === "open_pen" })
          : scenario === "it_first_fault" || scenario === "it_second_fault"
            ? createItFixture({ secondFault: scenario === "it_second_fault" })
            : scenario === "na_ground_fault" || scenario === "na_open_egc"
              ? createNorthAmericanGroundedFixture({
                  openEquipmentGround: scenario === "na_open_egc",
                })
              : createFaultLoopFixture({
                  arrangement: scenario === "line_neutral_fault" ? "TN-S" : "TT",
                  fault:
                    scenario === "line_neutral_fault"
                      ? "line_neutral"
                      : scenario === "high_impedance_earth"
                        ? "high_impedance_earth"
                        : "line_earth",
                  openProtectiveEarth: scenario === "open_pe",
                  failedBreaker: scenario === "earth_fault_failed",
                  residualProtection:
                    scenario !== "line_neutral_fault" && scenario !== "earth_fault_failed",
                });
    const run = dependencies.simulationJobs
      ? await dependencies.simulationJobs.run(circuit, durationMs, stepMs, request.signal)
      : runSimulation(circuit, durationMs, stepMs);
    return json({
      ...run,
      circuit,
      installationRules: evaluateInstallationRules(circuit, run),
    } as unknown as Record<string, unknown>);
  } catch (error) {
    if (!(error instanceof SimulatorError)) throw error;
    return json({ error: error.code }, { status: 400 });
  }
}

async function simulatorProjectsResponse(
  request: Request,
  projectId: string | null,
  action: "project" | "share",
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (!dependencies.resolveIdentity || !dependencies.simulatorProjects) {
    return json({ error: "identity_not_configured" }, { status: 503 });
  }
  const identity = await dependencies.resolveIdentity(request);
  if (!identity) return json({ error: "unauthenticated" }, { status: 401 });
  try {
    if (!projectId && request.method === "GET") {
      const projects = await dependencies.simulatorProjects.list(identity.userId);
      return json({
        projects: projects.map((project) => ({
          ...project,
          updatedAt: project.updatedAt.toISOString(),
        })),
        quota: {
          free: simulatorProductPolicy.freeSavedProjectLimit,
          unlimited: dependencies.hasSimulatorPro
            ? await dependencies.hasSimulatorPro(identity.userId)
            : false,
        },
      });
    }
    if (projectId && action === "project" && request.method === "GET") {
      const project = await dependencies.simulatorProjects.get(identity.userId, projectId);
      return project
        ? json({ project: { ...project, updatedAt: project.updatedAt.toISOString() } })
        : json({ error: "project_not_found" }, { status: 404 });
    }
    const body = await parseBoundedRecord(request);
    if (!body) return json({ error: "invalid_circuit" }, { status: 400 });
    if (projectId && action === "share" && request.method === "POST") {
      if (typeof body.enabled !== "boolean")
        return json({ error: "invalid_request" }, { status: 400 });
      const result = await dependencies.simulatorProjects.setSharing({
        ownerUserId: identity.userId,
        projectId,
        enabled: body.enabled,
      });
      return json({
        shareId: result.shareId,
        url: result.shareId ? `/simulator/shared/${result.shareId}` : null,
      });
    }
    if ((!projectId && request.method === "POST") || (projectId && request.method === "PUT")) {
      if (!shortString(body.title, 120) || !isRecord(body.circuit)) {
        return json({ error: "invalid_circuit" }, { status: 400 });
      }
      const pro = dependencies.hasSimulatorPro
        ? await dependencies.hasSimulatorPro(identity.userId)
        : false;
      const project = await dependencies.simulatorProjects.save({
        ownerUserId: identity.userId,
        ...(projectId ? { projectId } : {}),
        title: body.title,
        circuit: body.circuit as unknown as CircuitDocument,
        pro,
      });
      return json(
        { project: { ...project, updatedAt: project.updatedAt.toISOString() } },
        { status: projectId ? 200 : 201 },
      );
    }
    const response = json({ error: "method_not_allowed" }, { status: 405 });
    response.headers.set("allow", projectId ? "GET, PUT" : "GET, POST");
    return response;
  } catch (error) {
    if (!(error instanceof SimulatorError)) throw error;
    return json(
      { error: error.code },
      { status: error.code === "project_limit_reached" ? 409 : 400 },
    );
  }
}

async function sharedSimulatorProjectResponse(
  request: Request,
  shareId: string,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "method_not_allowed" }, { status: 405 });
  }
  if (!dependencies.simulatorProjects)
    return json({ error: "simulator_not_configured" }, { status: 503 });
  const project = await dependencies.simulatorProjects.getShared(shareId);
  return project
    ? json(
        { project: { ...project, updatedAt: project.updatedAt.toISOString() } },
        {},
        "public, max-age=60, s-maxage=300",
      )
    : json({ error: "project_not_found" }, { status: 404 });
}

async function publishedMediaResponse(
  request: Request,
  mediaId: string,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    const response = json({ error: "method_not_allowed" }, { status: 405 });
    response.headers.set("allow", "GET, HEAD");
    return response;
  }
  if (!dependencies.publishedMedia)
    return json({ error: "content_not_configured" }, { status: 503 });
  const media = await dependencies.publishedMedia.get(mediaId);
  if (!media) return json({ error: "content_media_not_found" }, { status: 404 });
  const etag = `"${media.sha256}"`;
  const cacheHeaders = {
    "cache-control": "public, max-age=31536000, immutable",
    etag,
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  };
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: cacheHeaders });
  }
  const bytes = new Uint8Array(media.bytes.byteLength);
  bytes.set(media.bytes);
  return new Response(bytes.buffer, {
    headers: {
      "content-type": media.contentType,
      "content-length": String(bytes.byteLength),
      ...cacheHeaders,
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function publicContentPageResponse(
  request: Request,
  slug: string,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    const response = json({ error: "method_not_allowed" }, { status: 405 });
    response.headers.set("allow", "GET, HEAD");
    return response;
  }
  if (!dependencies.publishedContent)
    return json({ error: "content_not_configured" }, { status: 503 });
  const content = await dependencies.publishedContent.get(slug, "en");
  if (!content) return json({ error: "content_not_found" }, { status: 404 });
  const canonical = content.canonicalUrl ?? `/blog/${content.slug}`;
  const html = `<!doctype html><html lang="${escapeHtml(content.locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(content.title)} · ElectraSim</title><meta name="description" content="${escapeHtml(content.description)}"><link rel="canonical" href="${escapeHtml(canonical)}"><link rel="stylesheet" href="/assets/public-content.css"></head><body><header><a href="/">ϟ ElectraSim</a><a href="/app">Open learning lab</a></header><main><article><p class="category">${escapeHtml(content.category ?? "Article")}</p><h1>${escapeHtml(content.title)}</h1><p class="description">${escapeHtml(content.description)}</p><p class="byline">By ${escapeHtml(content.authorDisplayName)} · <time datetime="${content.publishedAt.toISOString()}">${content.publishedAt.toLocaleDateString("en", { dateStyle: "long", timeZone: "UTC" })}</time></p>${content.html}</article></main></body></html>`;
  return staticResponse(
    html,
    "text/html; charset=utf-8",
    "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
    true,
  );
}

async function publishedContentResponse(
  request: Request,
  slug: string,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    const response = json({ error: "method_not_allowed" }, { status: 405 });
    response.headers.set("allow", "GET, HEAD");
    return response;
  }
  if (!dependencies.publishedContent) {
    return json({ error: "content_not_configured" }, { status: 503 });
  }
  const locale = new URL(request.url).searchParams.get("locale") ?? "en";
  const content = await dependencies.publishedContent.get(slug, locale);
  if (!content) return json({ error: "content_not_found" }, { status: 404 });
  return json(
    {
      ...content,
      publishedAt: content.publishedAt.toISOString(),
      updatedAt: content.updatedAt.toISOString(),
    },
    {},
    "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
  );
}

async function contentDraftResponse(
  request: Request,
  requestIdValue: string,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (request.method !== "POST" && request.method !== "GET") {
    const response = json(
      { error: "method_not_allowed", requestId: requestIdValue },
      { status: 405 },
    );
    response.headers.set("allow", "GET, POST");
    return response;
  }
  const actor = dependencies.resolvePlatformActor
    ? await dependencies.resolvePlatformActor(request)
    : null;
  const decision = authorizePlatformAdmin(actor, {
    permission: request.method === "GET" ? "platform.content.read" : "platform.content.edit",
    requireMfa: true,
    now: dependencies.clock.now(),
  });
  if (!decision.allowed || !actor) {
    return json(
      { error: decision.allowed ? "unauthenticated" : decision.reason, requestId: requestIdValue },
      { status: !decision.allowed && decision.reason === "unauthenticated" ? 401 : 403 },
    );
  }
  if (!dependencies.contentStudio) {
    return json(
      { error: "content_studio_not_configured", requestId: requestIdValue },
      { status: 503 },
    );
  }
  if (request.method === "GET") {
    const items = await dependencies.contentStudio.list(actor.userId);
    return json({
      items: items.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() })),
    });
  }
  const content = await parseContentDraftBody(request);
  if (!content) {
    return json({ error: "invalid_content", requestId: requestIdValue }, { status: 400 });
  }
  try {
    const result = await dependencies.contentStudio.createDraft({
      actorUserId: actor.userId,
      requestId: requestIdValue,
      content,
    });
    return json(
      {
        itemId: result.itemId,
        revisionId: result.revisionId,
        revisionNumber: result.revisionNumber,
        status: result.status,
      },
      { status: 201 },
    );
  } catch (error) {
    if (!(error instanceof ContentStudioError)) throw error;
    const status =
      error.code === "content_permission_denied"
        ? 403
        : error.code === "content_slug_exists"
          ? 409
          : 400;
    return json({ error: error.code, requestId: requestIdValue }, { status });
  }
}

async function parseContentDraftBody(request: Request): Promise<ContentDraftInput | null> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 524_288) return null;
  try {
    const value = (await request.json()) as unknown;
    if (!isRecord(value) || !isRecord(value.body)) return null;
    if (value.kind !== "article" && value.kind !== "marketing_page") return null;
    if (value.body.format !== "markdown" && value.body.format !== "blocks") return null;
    const body =
      value.body.format === "markdown"
        ? typeof value.body.markdown === "string" && value.body.markdown.length <= 400_000
          ? { format: "markdown" as const, markdown: value.body.markdown }
          : null
        : isRecord(value.body.document)
          ? { format: "blocks" as const, document: value.body.document }
          : null;
    if (!body || !shortString(value.slug, 180) || !shortString(value.title, 180)) return null;
    if (!shortString(value.description, 500) || !shortString(value.authorDisplayName, 120))
      return null;
    if (!shortString(value.changeSummary, 500)) return null;
    const tags = value.tags === undefined ? [] : value.tags;
    if (!Array.isArray(tags) || tags.length > 50 || !tags.every((tag) => shortString(tag, 80)))
      return null;
    return {
      kind: value.kind,
      slug: value.slug,
      title: value.title,
      description: value.description,
      body,
      authorDisplayName: value.authorDisplayName,
      changeSummary: value.changeSummary,
      tags: tags as string[],
      ...(shortString(value.locale, 35) ? { locale: value.locale } : {}),
      ...(shortString(value.category, 100) ? { category: value.category } : {}),
      ...(shortString(value.featuredImage, 500) ? { featuredImage: value.featuredImage } : {}),
      ...(shortString(value.seoTitle, 180) ? { seoTitle: value.seoTitle } : {}),
      ...(shortString(value.canonicalUrl, 500) ? { canonicalUrl: value.canonicalUrl } : {}),
    };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shortString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

async function contentRevisionPreviewResponse(
  request: Request,
  requestIdValue: string,
  itemId: string,
  revisionId: string,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (request.method !== "GET") {
    const response = json(
      { error: "method_not_allowed", requestId: requestIdValue },
      { status: 405 },
    );
    response.headers.set("allow", "GET");
    return response;
  }
  const actor = dependencies.resolvePlatformActor
    ? await dependencies.resolvePlatformActor(request)
    : null;
  const decision = authorizePlatformAdmin(actor, {
    permission: "platform.content.read",
    requireMfa: true,
    requireStepUp: false,
    now: dependencies.clock.now(),
  });
  if (!decision.allowed || !actor) {
    return json(
      { error: decision.allowed ? "unauthenticated" : decision.reason, requestId: requestIdValue },
      { status: !decision.allowed && decision.reason === "unauthenticated" ? 401 : 403 },
    );
  }
  if (!dependencies.contentStudio) {
    return json(
      { error: "content_studio_not_configured", requestId: requestIdValue },
      { status: 503 },
    );
  }
  try {
    const revision = await dependencies.contentStudio.getRevision(actor.userId, itemId, revisionId);
    return json({
      revision: {
        ...revision,
        reviewedAt: revision.reviewedAt?.toISOString() ?? null,
        createdAt: revision.createdAt.toISOString(),
      },
      html: renderBody(revision.body),
    });
  } catch (error) {
    if (!(error instanceof ContentStudioError)) throw error;
    return json(
      { error: error.code, requestId: requestIdValue },
      { status: error.code === "content_permission_denied" ? 403 : 404 },
    );
  }
}

async function contentItemResponse(
  request: Request,
  requestIdValue: string,
  itemId: string,
  action:
    | "get"
    | "revisions"
    | "review"
    | "publish"
    | "archive"
    | "restore"
    | "unpublish"
    | "cancel-schedule"
    | "redirects",
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  const expectedMethod = action === "get" ? "GET" : action === "revisions" ? "GET, POST" : "POST";
  if (
    (action === "get" && request.method !== "GET") ||
    (action === "revisions" && request.method !== "GET" && request.method !== "POST") ||
    (action !== "get" && action !== "revisions" && request.method !== "POST")
  ) {
    const response = json(
      { error: "method_not_allowed", requestId: requestIdValue },
      { status: 405 },
    );
    response.headers.set("allow", expectedMethod);
    return response;
  }
  const actor = dependencies.resolvePlatformActor
    ? await dependencies.resolvePlatformActor(request)
    : null;
  const publishing =
    action === "review" ||
    action === "publish" ||
    action === "archive" ||
    action === "restore" ||
    action === "unpublish" ||
    action === "cancel-schedule" ||
    action === "redirects";
  const decision = authorizePlatformAdmin(actor, {
    permission:
      action === "get" || (action === "revisions" && request.method === "GET")
        ? "platform.content.read"
        : publishing
          ? "platform.content.publish"
          : "platform.content.edit",
    requireMfa: true,
    requireStepUp: publishing,
    now: dependencies.clock.now(),
  });
  if (!decision.allowed || !actor) {
    return json(
      { error: decision.allowed ? "unauthenticated" : decision.reason, requestId: requestIdValue },
      { status: !decision.allowed && decision.reason === "unauthenticated" ? 401 : 403 },
    );
  }
  if (!dependencies.contentStudio) {
    return json(
      { error: "content_studio_not_configured", requestId: requestIdValue },
      { status: 503 },
    );
  }
  try {
    if (action === "get") {
      const item = await dependencies.contentStudio.get(actor.userId, itemId);
      return json({
        item: { ...item, updatedAt: item.updatedAt.toISOString() },
      });
    }
    if (action === "revisions" && request.method === "GET") {
      const revisions = await dependencies.contentStudio.listRevisions(actor.userId, itemId);
      return json({
        revisions: revisions.map((revision) => ({
          ...revision,
          createdAt: revision.createdAt.toISOString(),
        })),
      });
    }
    const body = await parseBoundedRecord(request);
    if (!body)
      return json({ error: "invalid_content", requestId: requestIdValue }, { status: 400 });
    if (action === "revisions") {
      const revision = parseContentRevision(body);
      if (!revision)
        return json({ error: "invalid_content", requestId: requestIdValue }, { status: 400 });
      const result = await dependencies.contentStudio.createRevision({
        itemId,
        actorUserId: actor.userId,
        requestId: requestIdValue,
        revision,
      });
      return json(result as unknown as Record<string, unknown>, { status: 201 });
    }
    if (action === "redirects") {
      if (
        !shortString(body.sourcePath, 500) ||
        !shortString(body.destinationPath, 500) ||
        !shortString(body.reason, 500)
      ) {
        return json({ error: "invalid_content", requestId: requestIdValue }, { status: 400 });
      }
      const result = await dependencies.contentStudio.createRedirect({
        itemId,
        sourcePath: body.sourcePath,
        destinationPath: body.destinationPath,
        reason: body.reason,
        actorUserId: actor.userId,
        requestId: requestIdValue,
      });
      return json(result as unknown as Record<string, unknown>, { status: 201 });
    }
    if (
      action === "archive" ||
      action === "restore" ||
      action === "unpublish" ||
      action === "cancel-schedule"
    ) {
      if (!shortString(body.reason, 500)) {
        return json({ error: "invalid_content", requestId: requestIdValue }, { status: 400 });
      }
      const result = await dependencies.contentStudio.transition({
        itemId,
        action: action === "cancel-schedule" ? "cancel_schedule" : action,
        reason: body.reason,
        actorUserId: actor.userId,
        requestId: requestIdValue,
      });
      return json(result as unknown as Record<string, unknown>);
    }
    if (!shortString(body.revisionId, 36) || !shortString(body.reason, 500)) {
      return json({ error: "invalid_content", requestId: requestIdValue }, { status: 400 });
    }
    if (action === "review") {
      if (typeof body.approved !== "boolean")
        return json({ error: "invalid_content" }, { status: 400 });
      const result = await dependencies.contentStudio.review({
        itemId,
        revisionId: body.revisionId,
        approved: body.approved,
        reason: body.reason,
        actorUserId: actor.userId,
        requestId: requestIdValue,
      });
      return json(result as unknown as Record<string, unknown>);
    }
    const scheduledFor =
      body.scheduledFor === undefined || body.scheduledFor === null
        ? null
        : new Date(String(body.scheduledFor));
    if (scheduledFor && Number.isNaN(scheduledFor.valueOf())) {
      return json({ error: "invalid_content", requestId: requestIdValue }, { status: 400 });
    }
    const result = await dependencies.contentStudio.publish({
      itemId,
      revisionId: body.revisionId,
      reason: body.reason,
      scheduledFor,
      actorUserId: actor.userId,
      requestId: requestIdValue,
    });
    return json({ status: result.status, publishedAt: result.publishedAt?.toISOString() ?? null });
  } catch (error) {
    if (!(error instanceof ContentStudioError)) throw error;
    const status =
      error.code === "content_permission_denied"
        ? 403
        : error.code === "content_not_found" || error.code === "content_revision_not_found"
          ? 404
          : error.code === "content_review_required" ||
              error.code === "content_self_review_denied" ||
              error.code === "content_transition_denied"
            ? 409
            : 400;
    return json({ error: error.code, requestId: requestIdValue }, { status });
  }
}

async function parseBoundedRecord(request: Request): Promise<Record<string, unknown> | null> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 524_288) return null;
  try {
    const value = (await request.json()) as unknown;
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function parseContentRevision(value: Record<string, unknown>): ContentRevisionInput | null {
  if (!isRecord(value.body) || (value.body.format !== "markdown" && value.body.format !== "blocks"))
    return null;
  const body =
    value.body.format === "markdown"
      ? typeof value.body.markdown === "string" && value.body.markdown.length <= 400_000
        ? { format: "markdown" as const, markdown: value.body.markdown }
        : null
      : isRecord(value.body.document)
        ? { format: "blocks" as const, document: value.body.document }
        : null;
  if (
    !body ||
    !shortString(value.title, 180) ||
    !shortString(value.description, 500) ||
    !shortString(value.authorDisplayName, 120) ||
    !shortString(value.changeSummary, 500)
  )
    return null;
  const tags = value.tags ?? [];
  if (!Array.isArray(tags) || tags.length > 50 || !tags.every((tag) => shortString(tag, 80)))
    return null;
  return {
    title: value.title,
    description: value.description,
    body,
    authorDisplayName: value.authorDisplayName,
    changeSummary: value.changeSummary,
    tags: tags as string[],
    ...(shortString(value.locale, 35) ? { locale: value.locale } : {}),
    ...(shortString(value.category, 100) ? { category: value.category } : {}),
    ...(shortString(value.featuredImage, 500) ? { featuredImage: value.featuredImage } : {}),
    ...(shortString(value.seoTitle, 180) ? { seoTitle: value.seoTitle } : {}),
    ...(shortString(value.canonicalUrl, 500) ? { canonicalUrl: value.canonicalUrl } : {}),
  };
}

async function platformAdminAccessResponse(
  request: Request,
  requestIdValue: string,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    const response = json(
      { error: "method_not_allowed", requestId: requestIdValue },
      { status: 405 },
    );
    response.headers.set("allow", "GET, HEAD");
    return response;
  }
  const actor = dependencies.resolvePlatformActor
    ? await dependencies.resolvePlatformActor(request)
    : null;
  const decision = authorizePlatformAdmin(actor, {
    permission: "platform.admin.access",
    requireMfa: true,
    now: dependencies.clock.now(),
  });
  if (!decision.allowed) {
    return json(
      { error: decision.reason, requestId: requestIdValue },
      { status: decision.reason === "unauthenticated" ? 401 : 403 },
    );
  }
  return json({ allowed: true, context: "platform_admin" });
}

async function platformAdminJobsResponse(
  request: Request,
  requestIdValue: string,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    const response = json(
      { error: "method_not_allowed", requestId: requestIdValue },
      { status: 405 },
    );
    response.headers.set("allow", "GET, HEAD");
    return response;
  }
  const actor = dependencies.resolvePlatformActor
    ? await dependencies.resolvePlatformActor(request)
    : null;
  const decision = authorizePlatformAdmin(actor, {
    permission: "platform.audit.read",
    requireMfa: true,
    requireStepUp: true,
    now: dependencies.clock.now(),
  });
  if (!decision.allowed) {
    return json(
      { error: decision.reason, requestId: requestIdValue },
      { status: decision.reason === "unauthenticated" ? 401 : 403 },
    );
  }
  if (!dependencies.getSystemJobSummary) {
    return json(
      { error: "job_operations_not_configured", requestId: requestIdValue },
      { status: 503 },
    );
  }
  return json({
    allowed: true,
    context: "platform_jobs",
    summary: await dependencies.getSystemJobSummary(),
  });
}

async function invitationManagementResponse(
  request: Request,
  requestIdValue: string,
  workspaceId: string,
  invitationId: string | null,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  const expectedMethod = invitationId ? "DELETE" : "POST";
  if (request.method !== expectedMethod) {
    const response = json(
      { error: "method_not_allowed", requestId: requestIdValue },
      { status: 405 },
    );
    response.headers.set("allow", expectedMethod);
    return response;
  }
  if (!dependencies.resolveWorkspaceActor || !dependencies.invitationManagement) {
    return json({ error: "identity_not_configured", requestId: requestIdValue }, { status: 503 });
  }
  const actor = await dependencies.resolveWorkspaceActor(request, workspaceId);
  const decision = authorizeWorkspace(actor, workspaceId, {
    permission: "workspace.membership.manage",
    now: dependencies.clock.now(),
  });
  if (!decision.allowed || !actor) {
    return json(
      { error: decision.allowed ? "unauthenticated" : decision.reason, requestId: requestIdValue },
      { status: !decision.allowed && decision.reason === "unauthenticated" ? 401 : 403 },
    );
  }
  try {
    if (invitationId) {
      const result = await dependencies.invitationManagement.revoke({
        invitationId,
        workspaceId,
        actorUserId: actor.userId,
        requestId: requestIdValue,
      });
      return json({ invitationId, revoked: true, alreadyRevoked: result.alreadyRevoked });
    }
    const body = await parseInvitationIssueBody(request);
    if (!body) {
      return json({ error: "invalid_invitation", requestId: requestIdValue }, { status: 400 });
    }
    const result = await dependencies.invitationManagement.issue({
      workspaceId,
      actorUserId: actor.userId,
      email: body.email,
      roleKeys: body.roleKeys,
      requestId: requestIdValue,
    });
    return json(
      {
        invitationId: result.invitationId,
        workspaceId: result.workspaceId,
        expiresAt: result.expiresAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    if (!(error instanceof InvitationError)) throw error;
    return json(
      { error: error.code, requestId: requestIdValue },
      { status: invitationErrorStatus(error.code) },
    );
  }
}

async function parseInvitationIssueBody(
  request: Request,
): Promise<{ readonly email: string; readonly roleKeys: readonly string[] } | null> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 8_192) return null;
  try {
    const value = (await request.json()) as unknown;
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const input = value as Record<string, unknown>;
    if (typeof input.email !== "string" || !Array.isArray(input.roleKeys)) return null;
    if (!input.roleKeys.every((role) => typeof role === "string" && role.length <= 80)) return null;
    return { email: input.email, roleKeys: input.roleKeys as string[] };
  } catch {
    return null;
  }
}

async function accountWorkspacesResponse(
  request: Request,
  requestIdValue: string,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed(requestIdValue, "GET");
  if (!dependencies.resolveIdentity || !dependencies.workspaceAdministration) {
    return json({ error: "identity_not_configured", requestId: requestIdValue }, { status: 503 });
  }
  const identity = await dependencies.resolveIdentity(request);
  if (!identity)
    return json({ error: "unauthenticated", requestId: requestIdValue }, { status: 401 });
  const workspaces = await dependencies.workspaceAdministration.listForUser(identity.userId);
  return json({ workspaces });
}

async function workspaceOrganizationResponse(
  request: Request,
  requestIdValue: string,
  workspaceId: string,
  action: "organization" | "campuses" | "departments",
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  const expectedMethod = action === "organization" ? "GET" : "POST";
  if (request.method !== expectedMethod) return methodNotAllowed(requestIdValue, expectedMethod);
  if (!dependencies.resolveWorkspaceActor || !dependencies.workspaceAdministration) {
    return json({ error: "identity_not_configured", requestId: requestIdValue }, { status: 503 });
  }
  const actor = await dependencies.resolveWorkspaceActor(request, workspaceId);
  const decision = authorizeWorkspace(actor, workspaceId, {
    permission: "workspace.settings.manage",
    requireMfa: action !== "organization",
    requireStepUp: action !== "organization",
    now: dependencies.clock.now(),
  });
  if (!decision.allowed || !actor) return authorizationResponse(decision, requestIdValue);
  try {
    if (action === "organization") {
      return json(
        await dependencies.workspaceAdministration.getOrganization(workspaceId, actor.userId),
      );
    }
    const body = await parseBoundedRecord(request);
    if (!body || !shortString(body.name, 120)) {
      return json(
        { error: "invalid_organization_name", requestId: requestIdValue },
        { status: 400 },
      );
    }
    const common = {
      workspaceId,
      actorUserId: actor.userId,
      name: body.name,
      code: typeof body.code === "string" ? body.code : null,
      requestId: requestIdValue,
    };
    const result =
      action === "campuses"
        ? await dependencies.workspaceAdministration.createCampus(common)
        : await dependencies.workspaceAdministration.createDepartment({
            ...common,
            campusId: typeof body.campusId === "string" ? body.campusId : null,
            parentDepartmentId:
              typeof body.parentDepartmentId === "string" ? body.parentDepartmentId : null,
          });
    return json(result as unknown as Record<string, unknown>, { status: 201 });
  } catch (error) {
    return workspaceAdministrationErrorResponse(error, requestIdValue);
  }
}

async function workspaceMembersResponse(
  request: Request,
  requestIdValue: string,
  workspaceId: string,
  membershipId: string | null,
  dependencies: HttpApplicationDependencies,
): Promise<Response> {
  const expectedMethod = membershipId ? "PUT" : "GET";
  if (request.method !== expectedMethod) return methodNotAllowed(requestIdValue, expectedMethod);
  if (!dependencies.resolveWorkspaceActor || !dependencies.workspaceAdministration) {
    return json({ error: "identity_not_configured", requestId: requestIdValue }, { status: 503 });
  }
  const actor = await dependencies.resolveWorkspaceActor(request, workspaceId);
  const decision = authorizeWorkspace(actor, workspaceId, {
    permission: membershipId ? "workspace.membership.manage" : "workspace.membership.read",
    requireMfa: Boolean(membershipId),
    requireStepUp: Boolean(membershipId),
    now: dependencies.clock.now(),
  });
  if (!decision.allowed || !actor) return authorizationResponse(decision, requestIdValue);
  try {
    if (!membershipId) {
      const members = await dependencies.workspaceAdministration.listMembers(
        workspaceId,
        actor.userId,
      );
      return json({
        members: members.map((member) => ({
          ...member,
          joinedAt: member.joinedAt?.toISOString() ?? null,
        })),
      });
    }
    const body = await parseBoundedRecord(request);
    if (!body || (body.status !== "active" && body.status !== "suspended")) {
      return json(
        { error: "invalid_membership_status", requestId: requestIdValue },
        { status: 400 },
      );
    }
    const member = await dependencies.workspaceAdministration.setMemberStatus({
      workspaceId,
      actorUserId: actor.userId,
      membershipId,
      status: body.status,
      requestId: requestIdValue,
    });
    return json({ member: { ...member, joinedAt: member.joinedAt?.toISOString() ?? null } });
  } catch (error) {
    return workspaceAdministrationErrorResponse(error, requestIdValue);
  }
}

function methodNotAllowed(requestIdValue: string, allow: string): Response {
  const response = json(
    { error: "method_not_allowed", requestId: requestIdValue },
    { status: 405 },
  );
  response.headers.set("allow", allow);
  return response;
}

function authorizationResponse(
  decision: ReturnType<typeof authorizeWorkspace>,
  requestIdValue: string,
): Response {
  const reason = decision.allowed ? "unauthenticated" : decision.reason;
  return json(
    { error: reason, requestId: requestIdValue },
    { status: reason === "unauthenticated" ? 401 : 403 },
  );
}

function workspaceAdministrationErrorResponse(error: unknown, requestIdValue: string): Response {
  if (!(error instanceof WorkspaceAdministrationError)) throw error;
  const notFound =
    error.code === "member_not_found" || error.code === "organization_parent_not_found";
  const status = error.code === "workspace_administration_denied" ? 403 : notFound ? 404 : 409;
  return json({ error: error.code, requestId: requestIdValue }, { status });
}

export function createApplication(dependencies: HttpApplicationDependencies): Application {
  return async (request) => {
    const startedAt = performance.now();
    const id = requestId(request);
    const url = new URL(request.url);
    const publishedMediaMatch = url.pathname.match(/^\/api\/public\/media\/([0-9a-f-]{36})$/i);
    const simulatorProjectMatch = url.pathname.match(
      /^\/api\/simulator\/projects\/([0-9a-f-]{36})(?:\/(share))?$/i,
    );
    const sharedSimulatorMatch = url.pathname.match(
      /^\/api\/public\/simulator\/projects\/([0-9a-f-]{36})$/i,
    );
    const sharedSimulatorPageMatch = url.pathname.match(/^\/simulator\/shared\/([0-9a-f-]{36})$/i);
    const contentMediaMatch = url.pathname.match(
      /^\/api\/admin\/content\/media\/([0-9a-f-]{36})$/i,
    );
    const publishedContentMatch = url.pathname.match(
      /^\/api\/public\/content\/([a-z0-9]+(?:-[a-z0-9]+)*)$/,
    );
    const publicArticleMatch = url.pathname.match(
      /^\/(?:blog|pages)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/,
    );
    const contentRevisionPreviewMatch = url.pathname.match(
      /^\/api\/admin\/content\/([0-9a-f-]{36})\/revisions\/([0-9a-f-]{36})\/preview$/i,
    );
    const contentItemMatch = url.pathname.match(
      /^\/api\/admin\/content\/([0-9a-f-]{36})(?:\/(revisions|review|publish|archive|restore|unpublish|cancel-schedule|redirects))?$/i,
    );
    const workspaceMembersMatch = url.pathname.match(
      /^\/api\/workspaces\/([0-9a-f-]{36})\/members(?:\/([0-9a-f-]{36})\/status)?$/i,
    );
    const workspaceOrganizationMatch = url.pathname.match(
      /^\/api\/workspaces\/([0-9a-f-]{36})\/(organization|campuses|departments)$/i,
    );
    const workspaceInvitationsMatch = url.pathname.match(
      /^\/api\/workspaces\/([0-9a-f-]{36})\/invitations$/i,
    );
    const workspaceInvitationMatch = url.pathname.match(
      /^\/api\/workspaces\/([0-9a-f-]{36})\/invitations\/([0-9a-f-]{36})$/i,
    );
    let response: Response;

    if (
      url.pathname === "/account/security" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(
        securityHtml,
        "text/html; charset=utf-8",
        "private, no-store",
        true,
      );
    } else if (
      url.pathname === "/assets/security.css" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(securityCss, "text/css; charset=utf-8", "public, max-age=300");
    } else if (
      url.pathname === "/assets/security.js" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(
        securityJs,
        "text/javascript; charset=utf-8",
        "public, max-age=300",
      );
    } else if (
      sharedSimulatorPageMatch?.[1] &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(
        simulatorHtml,
        "text/html; charset=utf-8",
        "public, max-age=60",
        true,
      );
    } else if (
      url.pathname === "/simulator" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(
        simulatorHtml,
        "text/html; charset=utf-8",
        "private, no-store",
        true,
      );
    } else if (
      url.pathname === "/assets/simulator.css" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(simulatorCss, "text/css; charset=utf-8", "public, max-age=300");
    } else if (
      url.pathname === "/assets/simulator.js" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(
        simulatorJs,
        "text/javascript; charset=utf-8",
        "public, max-age=300",
      );
    } else if (url.pathname === "/api/simulator/run") {
      response = await simulatorRunResponse(request, dependencies);
    } else if (url.pathname === "/api/simulator/command") {
      response = await simulatorCommandResponse(request);
    } else if (url.pathname === "/api/simulator/diagnostic") {
      response = await simulatorDiagnosticResponse(request);
    } else if (url.pathname === "/api/simulator/lessons") {
      response = await simulatorLessonsResponse(request);
    } else if (url.pathname === "/api/simulator/lesson-submissions") {
      response = await simulatorLessonSubmissionsResponse(request, dependencies);
    } else if (url.pathname === "/api/simulator/projects") {
      response = await simulatorProjectsResponse(request, null, "project", dependencies);
    } else if (simulatorProjectMatch?.[1]) {
      response = await simulatorProjectsResponse(
        request,
        simulatorProjectMatch[1],
        simulatorProjectMatch[2] === "share" ? "share" : "project",
        dependencies,
      );
    } else if (sharedSimulatorMatch?.[1]) {
      response = await sharedSimulatorProjectResponse(
        request,
        sharedSimulatorMatch[1],
        dependencies,
      );
    } else if (
      url.pathname === "/admin/content" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(
        contentStudioHtml,
        "text/html; charset=utf-8",
        "private, no-store",
        true,
      );
    } else if (
      url.pathname === "/assets/content-studio.css" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(contentStudioCss, "text/css; charset=utf-8", "public, max-age=300");
    } else if (
      url.pathname === "/assets/content-studio.js" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(
        contentStudioJs,
        "text/javascript; charset=utf-8",
        "public, max-age=300",
      );
    } else if (
      url.pathname === "/workspaces" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(
        workspacesHtml,
        "text/html; charset=utf-8",
        "private, no-store",
        true,
      );
    } else if (
      url.pathname === "/assets/workspaces.css" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(workspacesCss, "text/css; charset=utf-8", "public, max-age=300");
    } else if (
      url.pathname === "/assets/workspaces.js" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(
        workspacesJs,
        "text/javascript; charset=utf-8",
        "public, max-age=300",
      );
    } else if (url.pathname === "/app" && (request.method === "GET" || request.method === "HEAD")) {
      response = staticResponse(
        appShellHtml,
        "text/html; charset=utf-8",
        "public, max-age=60, s-maxage=60",
        true,
      );
    } else if (
      url.pathname === "/assets/app.css" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(appShellCss, "text/css; charset=utf-8", "public, max-age=300");
    } else if (
      url.pathname === "/assets/app.js" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(
        appShellJs,
        "text/javascript; charset=utf-8",
        "public, max-age=300",
      );
    } else if (
      url.pathname === "/assets/public-content.css" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      response = staticResponse(
        "body{margin:0;font:18px/1.7 Inter,system-ui;color:#172b3d;background:#f7fafc}header{display:flex;justify-content:space-between;padding:1rem 5vw;background:#062b55}header a{color:white;text-decoration:none;font-weight:800}main{max-width:860px;margin:auto;padding:5vw 1.4rem}article{background:white;padding:clamp(1.3rem,5vw,4rem);box-shadow:0 8px 30px #1232}h1{font-size:clamp(2.2rem,6vw,4.5rem);line-height:1.05;color:#082f59}.category{color:#0767c8;font-weight:800;text-transform:uppercase;letter-spacing:.1em}.description{font-size:1.25rem;color:#526a7c}.byline{border-bottom:1px solid #d8e2ea;padding-bottom:1.4rem;color:#526a7c}img{max-width:100%;height:auto}pre{overflow:auto;background:#09243e;color:#e9f5ff;padding:1rem}table{border-collapse:collapse;display:block;overflow:auto}td,th{border:1px solid #b7c9d8;padding:.5rem}",
        "text/css; charset=utf-8",
        "public, max-age=300",
      );
    } else if (publicArticleMatch?.[1]) {
      response = await publicContentPageResponse(request, publicArticleMatch[1], dependencies);
    } else if (publishedMediaMatch?.[1]) {
      response = await publishedMediaResponse(request, publishedMediaMatch[1], dependencies);
    } else if (publishedContentMatch?.[1]) {
      response = await publishedContentResponse(request, publishedContentMatch[1], dependencies);
    } else if (url.pathname.startsWith("/api/auth/")) {
      if (!dependencies.authHandler) {
        response = json({ error: "auth_not_configured", requestId: id }, { status: 503 });
      } else {
        response = await dependencies.authHandler(request);
        response.headers.set("cache-control", SENSITIVE_CACHE_CONTROL);
        response.headers.set("x-content-type-options", "nosniff");
        response.headers.set("referrer-policy", "no-referrer");
      }
    } else if (url.pathname === "/api/dev/emails") {
      response = capturedEmailsResponse(request, id, dependencies);
    } else if (url.pathname === "/api/account/onboarding") {
      response = await accountOnboardingResponse(request, id, dependencies);
    } else if (url.pathname === "/api/account/teaching-workspaces") {
      response = await teachingWorkspaceResponse(request, id, dependencies);
    } else if (url.pathname === "/api/account/workspaces") {
      response = await accountWorkspacesResponse(request, id, dependencies);
    } else if (url.pathname === "/api/security/step-up/password") {
      response = await passwordStepUpResponse(request, id, dependencies);
    } else if (url.pathname === "/api/security/step-up/passkey") {
      response = await passkeyStepUpResponse(request, id, dependencies);
    } else if (url.pathname === "/api/invitations/accept") {
      response = await invitationAcceptanceResponse(request, id, dependencies);
    } else if (url.pathname === "/api/admin/content/media") {
      response = await contentMediaResponse(request, id, null, dependencies);
    } else if (contentMediaMatch?.[1]) {
      response = await contentMediaResponse(request, id, contentMediaMatch[1], dependencies);
    } else if (url.pathname === "/api/admin/content") {
      response = await contentDraftResponse(request, id, dependencies);
    } else if (contentRevisionPreviewMatch?.[1] && contentRevisionPreviewMatch[2]) {
      response = await contentRevisionPreviewResponse(
        request,
        id,
        contentRevisionPreviewMatch[1],
        contentRevisionPreviewMatch[2],
        dependencies,
      );
    } else if (contentItemMatch?.[1]) {
      const routeAction = contentItemMatch[2];
      response = await contentItemResponse(
        request,
        id,
        contentItemMatch[1],
        routeAction === "revisions" ||
          routeAction === "review" ||
          routeAction === "publish" ||
          routeAction === "archive" ||
          routeAction === "restore" ||
          routeAction === "unpublish" ||
          routeAction === "cancel-schedule" ||
          routeAction === "redirects"
          ? routeAction
          : "get",
        dependencies,
      );
    } else if (url.pathname === "/api/admin/jobs") {
      response = await platformAdminJobsResponse(request, id, dependencies);
    } else if (url.pathname === "/api/admin/access") {
      response = await platformAdminAccessResponse(request, id, dependencies);
    } else if (workspaceOrganizationMatch?.[1] && workspaceOrganizationMatch[2]) {
      const organizationAction = workspaceOrganizationMatch[2];
      response = await workspaceOrganizationResponse(
        request,
        id,
        workspaceOrganizationMatch[1],
        organizationAction === "campuses" || organizationAction === "departments"
          ? organizationAction
          : "organization",
        dependencies,
      );
    } else if (workspaceInvitationsMatch?.[1]) {
      response = await invitationManagementResponse(
        request,
        id,
        workspaceInvitationsMatch[1],
        null,
        dependencies,
      );
    } else if (workspaceInvitationMatch?.[1] && workspaceInvitationMatch[2]) {
      response = await invitationManagementResponse(
        request,
        id,
        workspaceInvitationMatch[1],
        workspaceInvitationMatch[2],
        dependencies,
      );
    } else if (workspaceMembersMatch?.[1]) {
      response = await workspaceMembersResponse(
        request,
        id,
        workspaceMembersMatch[1],
        workspaceMembersMatch[2] ?? null,
        dependencies,
      );
    } else if (request.method !== "GET" && request.method !== "HEAD") {
      response = json({ error: "method_not_allowed", requestId: id }, { status: 405 });
      response.headers.set("allow", "GET, HEAD");
    } else {
      switch (url.pathname) {
        case "/health":
          response = json({ status: "ok", version: dependencies.version });
          break;
        case "/ready":
          response = await readiness(dependencies);
          break;
        case "/public/version":
          response = json(
            { version: dependencies.version, generatedAt: dependencies.clock.now().toISOString() },
            {},
            PUBLIC_VERSION_CACHE_CONTROL,
          );
          break;
        case "/v1/session-probe":
          response = json({ authenticated: false, requestId: id });
          break;
        case "/":
          response = json({ service: "ElectraSim v3 foundation", status: "running" });
          break;
        default:
          response = json({ error: "not_found", requestId: id }, { status: 404 });
      }
    }

    response.headers.set("x-request-id", id);
    response.headers.set("x-electrasim-runtime", "bun");
    dependencies.logger.info("http.request.completed", {
      requestId: id,
      method: request.method,
      path: url.pathname,
      status: response.status,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    });

    if (request.method === "HEAD") {
      return new Response(null, { status: response.status, headers: response.headers });
    }
    return response;
  };
}

export const cachePolicy = {
  sensitive: SENSITIVE_CACHE_CONTROL,
  publicVersion: PUBLIC_VERSION_CACHE_CONTROL,
} as const;
