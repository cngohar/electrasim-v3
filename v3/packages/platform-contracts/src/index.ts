export interface ReadinessCheck {
  readonly name: string;
  check(): Promise<{ readonly ready: boolean; readonly detail?: string }>;
}

export interface ObjectStore {
  put(key: string, value: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

export interface DurableJob<TPayload = unknown> {
  readonly id: string;
  readonly type: string;
  readonly payload: TPayload;
  readonly createdAt: string;
}

export interface JobQueue {
  enqueue<TPayload>(job: DurableJob<TPayload>): Promise<void>;
}

export type TransactionalEmailTemplate =
  | "verify_email"
  | "reset_password"
  | "workspace_invitation"
  | "security_alert";

export interface TransactionalEmailMessage {
  readonly id: string;
  readonly to: string;
  readonly template: TransactionalEmailTemplate;
  readonly variables: Readonly<Record<string, string>>;
  readonly tags?: Readonly<Record<string, string>>;
}

/** Durable provider-neutral boundary; Resend/SES adapters consume its outbox. */
export interface TransactionalEmailPort {
  enqueue(message: TransactionalEmailMessage): Promise<void>;
}

export interface Clock {
  now(): Date;
}

export interface Logger {
  info(event: string, context?: Readonly<Record<string, unknown>>): void;
  error(event: string, context?: Readonly<Record<string, unknown>>): void;
}

export interface ApplicationDependencies {
  readonly version: string;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly readinessChecks: readonly ReadinessCheck[];
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export function createJsonLogger(sink: Pick<Console, "log" | "error"> = console): Logger {
  return {
    info(event, context = {}) {
      sink.log(JSON.stringify({ level: "info", event, ...context }));
    },
    error(event, context = {}) {
      sink.error(JSON.stringify({ level: "error", event, ...context }));
    },
  };
}
