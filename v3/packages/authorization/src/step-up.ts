export type StepUpMethod = "password" | "passkey";

export interface StepUpProofRepository {
  record(input: {
    readonly userId: string;
    readonly sessionId: string;
    readonly method: StepUpMethod;
    readonly verifiedAt: Date;
    readonly expiresAt: Date;
    readonly requestId: string;
  }): Promise<{ readonly id: string }>;
}

export class StepUpService {
  constructor(
    private readonly repository: StepUpProofRepository,
    private readonly validitySeconds = 10 * 60,
    private readonly now: () => Date = () => new Date(),
  ) {
    if (!Number.isInteger(validitySeconds) || validitySeconds < 60 || validitySeconds > 15 * 60) {
      throw new Error("Step-up validity must be between 60 and 900 seconds");
    }
  }

  async recordVerifiedProof(input: {
    readonly userId: string;
    readonly sessionId: string;
    readonly method: StepUpMethod;
    readonly requestId: string;
  }): Promise<{ readonly id: string; readonly expiresAt: Date }> {
    const verifiedAt = this.now();
    const expiresAt = new Date(verifiedAt.getTime() + this.validitySeconds * 1_000);
    const result = await this.repository.record({ ...input, verifiedAt, expiresAt });
    return { id: result.id, expiresAt };
  }
}
