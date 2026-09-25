export * from "./local-capture.ts";
export * from "./resend.ts";

import type { SystemJobStore } from "@electrasim/database";
import type { AccountLifecycleService } from "@electrasim/identity";
import type {
  JobQueue,
  TransactionalEmailMessage,
  TransactionalEmailPort,
} from "@electrasim/platform-contracts";

export const systemJobTypes = {
  transactionalEmail: "email.transactional",
  ensurePersonalWorkspace: "identity.personal_workspace.ensure",
} as const;

export class QueuedTransactionalEmailPort implements TransactionalEmailPort {
  constructor(
    private readonly queue: JobQueue,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async enqueue(message: TransactionalEmailMessage): Promise<void> {
    await this.queue.enqueue({
      id: `email.transactional:${message.id}`,
      type: systemJobTypes.transactionalEmail,
      payload: message,
      createdAt: this.now().toISOString(),
    });
  }
}

export class QueuedIdentityLifecycleScheduler {
  constructor(
    private readonly queue: JobQueue,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async ensurePersonalWorkspace(userId: string, requestId: string): Promise<void> {
    await this.queue.enqueue({
      id: `identity.personal_workspace.ensure:${userId}:${requestId}`,
      type: systemJobTypes.ensurePersonalWorkspace,
      payload: { userId, requestId },
      createdAt: this.now().toISOString(),
    });
  }
}

export interface TransactionalEmailProvider {
  send(message: TransactionalEmailMessage): Promise<void>;
}

export interface SystemJobProcessorDependencies {
  readonly emailProvider: TransactionalEmailProvider;
  readonly accountLifecycle: AccountLifecycleService;
}

export async function processSystemJob(
  type: string,
  payload: unknown,
  dependencies: SystemJobProcessorDependencies,
): Promise<void> {
  switch (type) {
    case systemJobTypes.transactionalEmail:
      await dependencies.emailProvider.send(parseEmailMessage(payload));
      return;
    case systemJobTypes.ensurePersonalWorkspace: {
      const input = parsePersonalWorkspacePayload(payload);
      await dependencies.accountLifecycle.ensurePersonalWorkspace(input.userId, input.requestId);
      return;
    }
    default:
      throw new UnsupportedSystemJobError(type);
  }
}

export class UnsupportedSystemJobError extends Error {
  constructor(readonly jobType: string) {
    super(`Unsupported system job type: ${jobType}`);
    this.name = "UnsupportedSystemJobError";
  }
}

export async function runOneSystemJob(input: {
  readonly store: SystemJobStore;
  readonly workerId: string;
  readonly leaseSeconds?: number;
  readonly now?: () => Date;
  readonly dependencies: SystemJobProcessorDependencies;
}): Promise<"idle" | "completed" | "retry_scheduled"> {
  const now = input.now ?? (() => new Date());
  const job = await input.store.claim(input.workerId, input.leaseSeconds ?? 60);
  if (!job) return "idle";

  try {
    await processSystemJob(job.type, job.payload, input.dependencies);
    if (!(await input.store.complete(job.id, input.workerId))) {
      throw new Error("job lease was lost before completion");
    }
    return "completed";
  } catch (error) {
    const delaySeconds = Math.min(15 * 60, 2 ** Math.min(job.attempts, 9));
    const retryAt = new Date(now().getTime() + delaySeconds * 1_000);
    const safeError = error instanceof Error ? error.name : "UnknownJobError";
    if (!(await input.store.fail(job.id, input.workerId, safeError, retryAt))) {
      throw new Error("job lease was lost before failure handling");
    }
    return "retry_scheduled";
  }
}

function parsePersonalWorkspacePayload(payload: unknown): {
  readonly userId: string;
  readonly requestId: string;
} {
  if (!isRecord(payload) || !isUuid(payload.userId) || !isSafeRequestId(payload.requestId)) {
    throw new TypeError("Invalid personal-workspace job payload");
  }
  return { userId: payload.userId, requestId: payload.requestId };
}

function parseEmailMessage(payload: unknown): TransactionalEmailMessage {
  if (
    !isRecord(payload) ||
    typeof payload.id !== "string" ||
    typeof payload.to !== "string" ||
    !payload.to.includes("@") ||
    !isEmailTemplate(payload.template) ||
    !isStringRecord(payload.variables)
  ) {
    throw new TypeError("Invalid transactional-email job payload");
  }
  return {
    id: payload.id,
    to: payload.to,
    template: payload.template,
    variables: payload.variables,
    ...(isStringRecord(payload.tags) ? { tags: payload.tags } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

function isEmailTemplate(value: unknown): value is TransactionalEmailMessage["template"] {
  return (
    value === "verify_email" ||
    value === "reset_password" ||
    value === "workspace_invitation" ||
    value === "security_alert"
  );
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function isSafeRequestId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9._:-]{1,100}$/.test(value);
}
