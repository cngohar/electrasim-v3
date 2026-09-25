import type { DurableJob, JobQueue } from "@electrasim/platform-contracts";
import type { Database } from "./index.ts";

export interface ClaimedSystemJob<TPayload = unknown> extends DurableJob<TPayload> {
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly leaseOwner: string;
}

export interface SystemJobSummary {
  readonly pending: number;
  readonly processing: number;
  readonly failed: number;
  readonly oldestPendingAt: Date | null;
  readonly failures: readonly {
    readonly type: string;
    readonly attempts: number;
    readonly errorType: string | null;
    readonly createdAt: Date;
  }[];
}

export interface SystemJobStore extends JobQueue {
  claim(workerId: string, leaseSeconds: number): Promise<ClaimedSystemJob | null>;
  complete(jobId: string, workerId: string): Promise<boolean>;
  fail(jobId: string, workerId: string, error: string, retryAt: Date): Promise<boolean>;
}

export class PostgresSystemJobStore implements SystemJobStore {
  constructor(private readonly database: Database) {}

  async summary(): Promise<SystemJobSummary> {
    const counts = await this.database<
      { status: "pending" | "processing" | "failed" | "completed"; count: string }[]
    >`
      select status, count(*)::text as count
      from durable_system_jobs
      where status in ('pending', 'processing', 'failed')
      group by status
    `;
    const [oldest] = await this.database<{ created_at: Date }[]>`
      select created_at from durable_system_jobs
      where status = 'pending'
      order by available_at, created_at
      limit 1
    `;
    const failures = await this.database<
      { type: string; attempts: number; last_error: string | null; created_at: Date }[]
    >`
      select type, attempts, last_error, created_at
      from durable_system_jobs
      where status = 'failed'
      order by created_at desc
      limit 20
    `;
    const count = (status: string) =>
      Number(counts.find((row) => row.status === status)?.count ?? 0);
    return {
      pending: count("pending"),
      processing: count("processing"),
      failed: count("failed"),
      oldestPendingAt: oldest?.created_at ?? null,
      failures: failures.map((row) => ({
        type: row.type,
        attempts: row.attempts,
        errorType: row.last_error,
        createdAt: row.created_at,
      })),
    };
  }

  async enqueue<TPayload>(job: DurableJob<TPayload>): Promise<void> {
    await this.database`
      insert into durable_system_jobs (id, type, payload, created_at)
      values (${job.id}, ${job.type}, ${JSON.stringify(job.payload)}::jsonb, ${job.createdAt}::timestamptz)
      on conflict (id) do nothing
    `;
  }

  async claim(workerId: string, leaseSeconds: number): Promise<ClaimedSystemJob | null> {
    if (!workerId.trim()) throw new Error("workerId is required");
    if (!Number.isInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 3_600) {
      throw new Error("leaseSeconds must be an integer between 1 and 3600");
    }

    const result = await this.database.begin(async (transaction) => {
      await transaction`
        update durable_system_jobs
        set status = case when attempts >= max_attempts then 'failed' else 'pending' end,
            lease_owner = null,
            lease_expires_at = null,
            last_error = case
              when attempts >= max_attempts then coalesce(last_error, 'lease expired after final attempt')
              else last_error
            end
        where status = 'processing' and lease_expires_at <= now()
      `;

      const [row] = await transaction<
        {
          id: string;
          type: string;
          payload: unknown;
          created_at: Date;
          attempts: number;
          max_attempts: number;
        }[]
      >`
        with candidate as (
          select id
          from durable_system_jobs
          where status = 'pending'
            and available_at <= now()
            and attempts < max_attempts
          order by available_at, created_at
          for update skip locked
          limit 1
        )
        update durable_system_jobs jobs
        set status = 'processing',
            attempts = attempts + 1,
            lease_owner = ${workerId},
            lease_expires_at = now() + (${leaseSeconds} * interval '1 second')
        from candidate
        where jobs.id = candidate.id
        returning jobs.id, jobs.type, jobs.payload, jobs.created_at, jobs.attempts, jobs.max_attempts
      `;
      return row;
    });

    if (!result) return null;
    return {
      id: result.id,
      type: result.type,
      payload: result.payload,
      createdAt: result.created_at.toISOString(),
      attempts: result.attempts,
      maxAttempts: result.max_attempts,
      leaseOwner: workerId,
    };
  }

  async complete(jobId: string, workerId: string): Promise<boolean> {
    const result = await this.database`
      update durable_system_jobs
      set status = 'completed', completed_at = now(), lease_owner = null, lease_expires_at = null,
          last_error = null
      where id = ${jobId} and status = 'processing' and lease_owner = ${workerId}
      returning id
    `;
    return result.length === 1;
  }

  async fail(jobId: string, workerId: string, error: string, retryAt: Date): Promise<boolean> {
    const result = await this.database`
      update durable_system_jobs
      set status = case when attempts >= max_attempts then 'failed' else 'pending' end,
          available_at = ${retryAt.toISOString()}::timestamptz,
          lease_owner = null,
          lease_expires_at = null,
          last_error = ${error.slice(0, 2_000)}
      where id = ${jobId} and status = 'processing' and lease_owner = ${workerId}
      returning id
    `;
    return result.length === 1;
  }
}
