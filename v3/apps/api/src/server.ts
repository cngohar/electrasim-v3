import {
  createAuthenticatedIdentityResolver,
  createElectraSimAuth,
  createPasskeyStepUpVerifier,
  createPasswordStepUpVerifier,
} from "@electrasim/auth";
import { StepUpService } from "@electrasim/authorization";
import {
  ContentMediaService,
  ContentStudioService,
  PublishedContentService,
  PublishedMediaService,
} from "@electrasim/content-studio";
import {
  createDrizzleDatabase,
  createPostgresClient,
  type Database,
  PostgresAccountOnboardingRepository,
  PostgresAuthorizationContextRepository,
  PostgresContentMediaRepository,
  PostgresContentStudioRepository,
  PostgresEntitlementRepository,
  PostgresIdentityProvisioningRepository,
  PostgresInvitationAcceptanceRepository,
  PostgresInvitationManagementRepository,
  PostgresPublishedContentRepository,
  PostgresPublishedMediaRepository,
  PostgresScheduledContentPublisher,
  PostgresSimulatorLessonSubmissionRepository,
  PostgresSimulatorProjectRepository,
  PostgresStepUpProofRepository,
  PostgresSystemJobStore,
  PostgresWorkspaceAdministrationRepository,
  postgresReadiness,
} from "@electrasim/database";
import { createApplication } from "@electrasim/http-application";
import { AccountLifecycleService, AccountOnboardingService } from "@electrasim/identity";
import { InvitationAcceptanceService, InvitationManagementService } from "@electrasim/invitations";
import {
  LocalEmailCaptureProvider,
  QueuedIdentityLifecycleScheduler,
  QueuedTransactionalEmailPort,
  ResendEmailProvider,
  runOneSystemJob,
} from "@electrasim/jobs";
import { LocalObjectStore, S3ObjectStore } from "@electrasim/object-storage";
import { createJsonLogger, type ReadinessCheck, systemClock } from "@electrasim/platform-contracts";
import {
  SimulatorLessonSubmissionService,
  SimulatorProjectService,
  WorkerSimulationJobHost,
} from "@electrasim/simulator-domain";
import { WorkspaceAdministrationService } from "@electrasim/workspace-administration";
import { readRuntimeConfig } from "./config.ts";

const config = readRuntimeConfig(Bun.env);
const logger = createJsonLogger();
const objectStore =
  config.objectStorage.mode === "local"
    ? new LocalObjectStore(config.objectStorage.path)
    : new S3ObjectStore(config.objectStorage);
const databases: Database[] = [];
const readinessChecks: ReadinessCheck[] = [
  {
    name: "foundation",
    async check() {
      return { ready: true, detail: "Bun application boundary initialized" };
    },
  },
];

let workerTimer: ReturnType<typeof setInterval> | undefined;
let workerBusy = false;
const identityDependencies = config.identity ? initializeIdentity() : {};

function initializeIdentity() {
  const identity = config.identity;
  if (!identity) return {};

  const authDatabase = createPostgresClient({ url: identity.authDatabaseUrl, maxConnections: 5 });
  const applicationDatabase = createPostgresClient({
    url: identity.applicationDatabaseUrl,
    maxConnections: 10,
  });
  const workerDatabase = createPostgresClient({
    url: identity.workerDatabaseUrl,
    maxConnections: 5,
  });
  databases.push(authDatabase, applicationDatabase, workerDatabase);
  readinessChecks.push(
    postgresReadiness(authDatabase, "postgres-auth"),
    postgresReadiness(applicationDatabase, "postgres-application"),
    postgresReadiness(workerDatabase, "postgres-worker"),
  );

  const producerQueue = new PostgresSystemJobStore(authDatabase);
  const lifecycleScheduler = new QueuedIdentityLifecycleScheduler(producerQueue);
  const auth = createElectraSimAuth({
    database: createDrizzleDatabase(authDatabase),
    baseURL: identity.baseURL,
    trustedOrigins: identity.trustedOrigins,
    secret: identity.secret,
    production: config.nodeEnv === "production",
    email: new QueuedTransactionalEmailPort(producerQueue),
    lifecycle: lifecycleScheduler,
    socialProviders: {
      ...(identity.google ? { google: identity.google } : {}),
      ...(identity.microsoft ? { microsoft: identity.microsoft } : {}),
    },
  });

  const onboarding = new AccountOnboardingService(
    new PostgresAccountOnboardingRepository(applicationDatabase),
    identity.safetyTermsVersion,
  );
  const accountLifecycle = new AccountLifecycleService(
    new PostgresIdentityProvisioningRepository(applicationDatabase),
  );
  const contentStudio = new ContentStudioService(
    new PostgresContentStudioRepository(applicationDatabase),
  );
  const contentMedia = new ContentMediaService(
    objectStore,
    new PostgresContentMediaRepository(applicationDatabase),
  );
  const publishedContent = new PublishedContentService(
    new PostgresPublishedContentRepository(applicationDatabase),
  );
  const publishedMedia = new PublishedMediaService(
    objectStore,
    new PostgresPublishedMediaRepository(applicationDatabase),
  );
  const simulatorProjects = new SimulatorProjectService(
    new PostgresSimulatorProjectRepository(applicationDatabase),
  );
  const simulatorLessonSubmissions = new SimulatorLessonSubmissionService(
    new PostgresSimulatorLessonSubmissionRepository(applicationDatabase),
  );
  const entitlements = new PostgresEntitlementRepository(applicationDatabase);
  const workspaceAdministration = new WorkspaceAdministrationService(
    new PostgresWorkspaceAdministrationRepository(applicationDatabase),
  );
  const invitationAcceptance = new InvitationAcceptanceService(
    new PostgresInvitationAcceptanceRepository(applicationDatabase),
  );
  const invitationManagement = new InvitationManagementService(
    new PostgresInvitationManagementRepository(applicationDatabase),
    identity.baseURL,
  );
  const stepUp = new StepUpService(new PostgresStepUpProofRepository(applicationDatabase));
  const workerStore = new PostgresSystemJobStore(workerDatabase);
  const scheduledContent = new PostgresScheduledContentPublisher(workerDatabase);
  const localEmail =
    identity.emailDeliveryMode === "capture" ? new LocalEmailCaptureProvider() : undefined;
  if (identity.emailDeliveryMode === "resend" && !identity.resendApiKey) {
    throw new Error("Resend API key missing after configuration validation");
  }
  const emailProvider =
    localEmail ??
    new ResendEmailProvider({
      apiKey: identity.resendApiKey ?? "",
      from: identity.emailFrom,
    });
  const workerDependencies = {
    emailProvider,
    accountLifecycle: new AccountLifecycleService(
      new PostgresIdentityProvisioningRepository(workerDatabase),
    ),
  };
  const runWorker = async () => {
    if (workerBusy) return;
    workerBusy = true;
    try {
      const releasedContent = await scheduledContent.releaseDue();
      if (releasedContent > 0)
        logger.info("content.scheduled_released", { count: releasedContent });
      await runOneSystemJob({
        store: workerStore,
        workerId: `api-${process.pid}`,
        dependencies: workerDependencies,
      });
    } catch (error) {
      logger.error("system_job.worker_error", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
    } finally {
      workerBusy = false;
    }
  };
  workerTimer = setInterval(() => void runWorker(), 1_000);
  void runWorker();

  const resolveIdentity = createAuthenticatedIdentityResolver(auth);
  const authorization = new PostgresAuthorizationContextRepository(applicationDatabase);
  return {
    authHandler: auth.handler,
    resolveIdentity,
    verifyStepUpPassword: createPasswordStepUpVerifier(auth),
    verifyStepUpPasskey: createPasskeyStepUpVerifier(auth),
    stepUp,
    accountOnboarding: onboarding,
    accountLifecycle,
    contentStudio,
    contentMedia,
    publishedContent,
    publishedMedia,
    simulatorProjects,
    simulatorLessonSubmissions,
    hasSimulatorPro: (userId: string) => entitlements.hasActive(userId, "simulator_pro"),
    invitationAcceptance,
    invitationManagement,
    workspaceAdministration,
    ...(localEmail ? { getCapturedEmails: () => localEmail.list() } : {}),
    resolvePlatformActor: async (request: Request) => {
      const identityContext = await resolveIdentity(request);
      return identityContext ? authorization.resolvePlatformActor(identityContext) : null;
    },
    resolveWorkspaceActor: async (request: Request, workspaceId: string) => {
      const identityContext = await resolveIdentity(request);
      return identityContext
        ? authorization.resolveWorkspaceActor(identityContext, workspaceId)
        : null;
    },
    getSystemJobSummary: async () => {
      const summary = await workerStore.summary();
      return {
        pending: summary.pending,
        processing: summary.processing,
        failed: summary.failed,
        oldestPendingAt: summary.oldestPendingAt?.toISOString() ?? null,
        failures: summary.failures.map((failure) => ({
          ...failure,
          createdAt: failure.createdAt.toISOString(),
        })),
      };
    },
  };
}

const simulationWorkerUrl = import.meta.url.endsWith(".ts")
  ? new URL("../../../packages/simulator-domain/src/simulation-worker.ts", import.meta.url)
  : new URL("./simulation-worker.js", import.meta.url);
const simulationJobs = new WorkerSimulationJobHost(simulationWorkerUrl, {
  maximumConcurrent: 2,
  maximumQueued: 16,
  timeoutMs: 5_000,
});

const application = createApplication({
  version: config.version,
  clock: systemClock,
  logger,
  readinessChecks,
  simulationJobs,
  ...identityDependencies,
});

const server = Bun.serve({
  hostname: config.hostname,
  port: config.port,
  fetch: application,
  error(error) {
    logger.error("http.unhandled_error", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return new Response(JSON.stringify({ error: "internal_server_error" }), {
      status: 500,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "private, no-store",
      },
    });
  },
});

logger.info("server.started", {
  hostname: server.hostname,
  port: server.port,
  version: config.version,
  environment: config.nodeEnv,
  trustedProxyHops: config.trustedProxyHops,
  identityEnabled: Boolean(config.identity),
});

let stopping = false;
async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  logger.info("server.stopping", { signal });
  if (workerTimer) clearInterval(workerTimer);
  await server.stop(false);
  await Promise.all(databases.map((database) => database.end({ timeout: 5 })));
  logger.info("server.stopped", { signal });
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
