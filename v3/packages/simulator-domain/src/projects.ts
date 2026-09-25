import { simulatorProductPolicy } from "./catalog.ts";
import { migrateCircuitDocument } from "./migration.ts";
import { type CircuitDocument, SimulatorError, type SupplyFamily } from "./model.ts";

export interface SimulatorProjectSummary {
  readonly id: string;
  readonly title: string;
  readonly supplyFamily: SupplyFamily;
  readonly revisionNumber: number;
  readonly shared: boolean;
  readonly updatedAt: Date;
}

export interface SimulatorProject extends SimulatorProjectSummary {
  readonly circuit: CircuitDocument;
  readonly shareId: string | null;
}

export interface SimulatorProjectRepository {
  list(ownerUserId: string): Promise<readonly SimulatorProjectSummary[]>;
  get(ownerUserId: string, projectId: string): Promise<SimulatorProject | null>;
  save(input: {
    readonly ownerUserId: string;
    readonly projectId: string;
    readonly revisionId: string;
    readonly title: string;
    readonly circuit: CircuitDocument;
    readonly freeLimit: number | null;
  }): Promise<SimulatorProject>;
  setSharing(input: {
    readonly ownerUserId: string;
    readonly projectId: string;
    readonly shareId: string | null;
  }): Promise<{ readonly shareId: string | null }>;
  getShared(shareId: string): Promise<SimulatorProject | null>;
}

export class SimulatorProjectService {
  static readonly freeProjectLimit = simulatorProductPolicy.freeSavedProjectLimit;
  constructor(
    private readonly repository: SimulatorProjectRepository,
    private readonly nextId: () => string = () => crypto.randomUUID(),
  ) {}

  list(ownerUserId: string) {
    return this.repository.list(ownerUserId);
  }

  get(ownerUserId: string, projectId: string) {
    return this.repository.get(ownerUserId, projectId);
  }

  save(input: {
    readonly ownerUserId: string;
    readonly projectId?: string;
    readonly title: string;
    readonly circuit: unknown;
    readonly pro: boolean;
  }) {
    const migration = migrateCircuitDocument(input.circuit);
    const title = input.title.trim();
    if (!title || title.length > 120) throw new SimulatorError("invalid_circuit");
    return this.repository.save({
      ownerUserId: input.ownerUserId,
      projectId: input.projectId ?? this.nextId(),
      revisionId: this.nextId(),
      title,
      circuit: migration.document,
      freeLimit: input.pro ? null : SimulatorProjectService.freeProjectLimit,
    });
  }

  setSharing(input: { ownerUserId: string; projectId: string; enabled: boolean }) {
    return this.repository.setSharing({
      ownerUserId: input.ownerUserId,
      projectId: input.projectId,
      shareId: input.enabled ? this.nextId() : null,
    });
  }

  getShared(shareId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(shareId)) return Promise.resolve(null);
    return this.repository.getShared(shareId);
  }
}
