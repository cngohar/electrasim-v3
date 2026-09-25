import type { StepUpProofRepository } from "@electrasim/authorization";
import type { Database } from "./index.ts";

export class PostgresStepUpProofRepository implements StepUpProofRepository {
  constructor(
    private readonly database: Database,
    private readonly nextId: () => string = () => crypto.randomUUID(),
  ) {}

  async record(
    input: Parameters<StepUpProofRepository["record"]>[0],
  ): Promise<{ readonly id: string }> {
    const id = this.nextId();
    await this.database.begin(async (transaction) => {
      await transaction`select set_config('app.current_user_id', ${input.userId}, true)`;
      await transaction`
        insert into step_up_sessions (
          id, session_id, user_id, method, verified_at, expires_at, request_id
        ) values (
          ${id}::uuid,
          ${input.sessionId}::uuid,
          ${input.userId}::uuid,
          ${input.method},
          ${input.verifiedAt.toISOString()}::timestamptz,
          ${input.expiresAt.toISOString()}::timestamptz,
          ${input.requestId}
        )
      `;
    });
    return { id };
  }
}
