import { evaluateSimulatorLesson, type SimulatorLessonId, simulatorLessons } from "./lessons.ts";
import { migrateCircuitDocument } from "./migration.ts";
import { SimulatorError } from "./model.ts";

export interface SimulatorLessonSubmission {
  readonly id: string;
  readonly learnerUserId: string;
  readonly lessonId: SimulatorLessonId;
  readonly circuitRevision: number;
  readonly completed: boolean;
  readonly evidence: ReturnType<typeof evaluateSimulatorLesson>;
  readonly submittedAt: Date;
}

export interface SimulatorLessonSubmissionRepository {
  save(input: SimulatorLessonSubmission): Promise<SimulatorLessonSubmission>;
  listForLearner(learnerUserId: string): Promise<readonly SimulatorLessonSubmission[]>;
}

export class SimulatorLessonSubmissionService {
  constructor(
    private readonly repository: SimulatorLessonSubmissionRepository,
    private readonly nextId: () => string = () => crypto.randomUUID(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  listForLearner(learnerUserId: string) {
    return this.repository.listForLearner(learnerUserId);
  }

  submit(input: { learnerUserId: string; lessonId: string; circuit: unknown }) {
    const lesson = simulatorLessons.find((entry) => entry.id === input.lessonId);
    if (!lesson) throw new SimulatorError("invalid_circuit", "Unknown simulator lesson.");
    const circuit = migrateCircuitDocument(input.circuit).document;
    const evidence = evaluateSimulatorLesson(lesson.id, circuit);
    return this.repository.save({
      id: this.nextId(),
      learnerUserId: input.learnerUserId,
      lessonId: lesson.id,
      circuitRevision: circuit.revision,
      completed: evidence.completed,
      evidence,
      submittedAt: this.now(),
    });
  }
}
