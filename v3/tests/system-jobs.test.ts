import { describe, expect, test } from "bun:test";
import type { ClaimedSystemJob, SystemJobStore } from "@electrasim/database";
import { AccountLifecycleService } from "@electrasim/identity";
import {
  LocalEmailCaptureProvider,
  QueuedIdentityLifecycleScheduler,
  QueuedTransactionalEmailPort,
  ResendEmailProvider,
  runOneSystemJob,
} from "@electrasim/jobs";
import type {
  DurableJob,
  JobQueue,
  TransactionalEmailMessage,
} from "@electrasim/platform-contracts";

class RecordingQueue implements JobQueue {
  jobs: DurableJob[] = [];
  async enqueue(job: DurableJob): Promise<void> {
    if (!this.jobs.some((item) => item.id === job.id)) this.jobs.push(job);
  }
}

class FakeStore implements SystemJobStore {
  claimed: ClaimedSystemJob | null = null;
  completed: string[] = [];
  failures: Array<{ id: string; error: string; retryAt: Date }> = [];
  async enqueue(): Promise<void> {}
  async claim(): Promise<ClaimedSystemJob | null> {
    const job = this.claimed;
    this.claimed = null;
    return job;
  }
  async complete(jobId: string): Promise<boolean> {
    this.completed.push(jobId);
    return true;
  }
  async fail(jobId: string, _workerId: string, error: string, retryAt: Date): Promise<boolean> {
    this.failures.push({ id: jobId, error, retryAt });
    return true;
  }
}

const now = () => new Date("2026-09-24T12:00:00Z");

describe("durable system jobs", () => {
  test("maps transactional email to an idempotent provider-neutral job", async () => {
    const queue = new RecordingQueue();
    const port = new QueuedTransactionalEmailPort(queue, now);
    const message: TransactionalEmailMessage = {
      id: "message-1",
      to: "alex@example.test",
      template: "verify_email",
      variables: { url: "https://electrasim.test/verify/token" },
      tags: { userId: "user-1" },
    };
    await port.enqueue(message);
    await port.enqueue(message);
    expect(queue.jobs).toEqual([
      {
        id: "email.transactional:message-1",
        type: "email.transactional",
        payload: message,
        createdAt: "2026-09-24T12:00:00.000Z",
      },
    ]);
  });

  test("captures local email idempotently for end-to-end development", async () => {
    const provider = new LocalEmailCaptureProvider(now);
    const message: TransactionalEmailMessage = {
      id: "local-message-1",
      to: "alex@example.test",
      template: "verify_email",
      variables: { url: "http://localhost:3000/api/auth/verify-email?token=secret" },
    };
    await provider.send(message);
    await provider.send(message);
    expect(provider.list()).toEqual([{ ...message, capturedAt: "2026-09-24T12:00:00.000Z" }]);
  });

  test("delivers rendered email through Resend with provider idempotency", async () => {
    let captured: { url: string; init?: RequestInit } | undefined;
    const provider = new ResendEmailProvider({
      apiKey: "re_secret",
      from: "ElectraSim <account@example.test>",
      fetch: async (url, init) => {
        captured = { url: String(url), ...(init ? { init } : {}) };
        return new Response(JSON.stringify({ id: "provider-1" }), { status: 200 });
      },
    });
    await provider.send({
      id: "message-1",
      to: "alex@example.test",
      template: "verify_email",
      variables: { url: "https://electrasim.test/verify/token" },
    });
    expect(captured?.url).toBe("https://api.resend.com/emails");
    expect(new Headers(captured?.init?.headers).get("idempotency-key")).toBe("message-1");
    const body = JSON.parse(String(captured?.init?.body)) as { html: string; subject: string };
    expect(body.subject).toBe("Verify your ElectraSim email");
    expect(body.html).toContain("https://electrasim.test/verify/token");
  });

  test("deduplicates a delivery request while allowing later reconciliation", async () => {
    const queue = new RecordingQueue();
    const scheduler = new QueuedIdentityLifecycleScheduler(queue, now);
    const userId = "11111111-1111-4111-8111-111111111111";
    await scheduler.ensurePersonalWorkspace(userId, "request-1");
    await scheduler.ensurePersonalWorkspace(userId, "request-1");
    await scheduler.ensurePersonalWorkspace(userId, "reconciliation-1");
    expect(queue.jobs).toHaveLength(2);
    expect(queue.jobs[0]?.id).toBe(`identity.personal_workspace.ensure:${userId}:request-1`);
    expect(queue.jobs[1]?.id).toBe(`identity.personal_workspace.ensure:${userId}:reconciliation-1`);
  });

  test("dispatches email and completes the claimed lease", async () => {
    const store = new FakeStore();
    store.claimed = {
      id: "email.transactional:message-1",
      type: "email.transactional",
      payload: {
        id: "message-1",
        to: "alex@example.test",
        template: "security_alert",
        variables: { action: "new sign-in" },
      },
      createdAt: now().toISOString(),
      attempts: 1,
      maxAttempts: 8,
      leaseOwner: "worker-1",
    };
    const delivered: TransactionalEmailMessage[] = [];
    const result = await runOneSystemJob({
      store,
      workerId: "worker-1",
      now,
      dependencies: {
        emailProvider: { send: async (message) => void delivered.push(message) },
        accountLifecycle: new AccountLifecycleService({
          async ensurePersonalWorkspace() {
            return { workspaceId: "unused", created: false };
          },
          async createIndependentInstructorWorkspace() {
            return { workspaceId: "unused", created: false };
          },
        }),
      },
    });
    expect(result).toBe("completed");
    expect(delivered[0]?.template).toBe("security_alert");
    expect(store.completed).toEqual(["email.transactional:message-1"]);
  });

  test("stores only a safe error class and schedules bounded retry", async () => {
    const store = new FakeStore();
    store.claimed = {
      id: "email.transactional:message-2",
      type: "email.transactional",
      payload: {
        id: "message-2",
        to: "alex@example.test",
        template: "reset_password",
        variables: { url: "https://electrasim.test/reset/secret-token" },
      },
      createdAt: now().toISOString(),
      attempts: 2,
      maxAttempts: 8,
      leaseOwner: "worker-1",
    };
    const result = await runOneSystemJob({
      store,
      workerId: "worker-1",
      now,
      dependencies: {
        emailProvider: {
          async send() {
            throw new Error("provider rejected secret-token");
          },
        },
        accountLifecycle: new AccountLifecycleService({
          async ensurePersonalWorkspace() {
            return { workspaceId: "unused", created: false };
          },
          async createIndependentInstructorWorkspace() {
            return { workspaceId: "unused", created: false };
          },
        }),
      },
    });
    expect(result).toBe("retry_scheduled");
    expect(store.failures[0]?.error).toBe("Error");
    expect(store.failures[0]?.error).not.toContain("secret-token");
    expect(store.failures[0]?.retryAt.toISOString()).toBe("2026-09-24T12:00:04.000Z");
  });
});
