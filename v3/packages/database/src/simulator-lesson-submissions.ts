import type {
  SimulatorLessonSubmission,
  SimulatorLessonSubmissionRepository,
} from "@electrasim/simulator-domain";
import type { Database } from "./index.ts";

export class PostgresSimulatorLessonSubmissionRepository
  implements SimulatorLessonSubmissionRepository
{
  constructor(private readonly database: Database) {}

  async save(input: SimulatorLessonSubmission): Promise<SimulatorLessonSubmission> {
    const result = await this.database.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${input.learnerUserId}, true)`;
      await tx`
        insert into simulator_lesson_submissions (
          id, learner_user_id, lesson_id, circuit_revision, completed, evidence, submitted_at
        ) values (
          ${input.id}::uuid, ${input.learnerUserId}::uuid, ${input.lessonId},
          ${input.circuitRevision}, ${input.completed}, ${JSON.stringify(input.evidence)}::jsonb,
          ${input.submittedAt.toISOString()}::timestamptz
        )
      `;
      return { value: input };
    });
    return result.value;
  }

  async listForLearner(learnerUserId: string): Promise<readonly SimulatorLessonSubmission[]> {
    const result = await this.database.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${learnerUserId}, true)`;
      const rows = await tx<SubmissionRow[]>`
        select id, learner_user_id, lesson_id, circuit_revision, completed, evidence, submitted_at
        from simulator_lesson_submissions
        where learner_user_id = ${learnerUserId}::uuid
        order by submitted_at desc, id
      `;
      return {
        value: rows.map((row) => ({
          id: row.id,
          learnerUserId: row.learner_user_id,
          lessonId: row.lesson_id,
          circuitRevision: row.circuit_revision,
          completed: row.completed,
          evidence: row.evidence,
          submittedAt: row.submitted_at,
        })),
      };
    });
    return result.value;
  }
}

type SubmissionRow = {
  id: string;
  learner_user_id: string;
  lesson_id: SimulatorLessonSubmission["lessonId"];
  circuit_revision: number;
  completed: boolean;
  evidence: SimulatorLessonSubmission["evidence"];
  submitted_at: Date;
};
