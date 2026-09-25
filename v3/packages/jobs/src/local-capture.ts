import type { TransactionalEmailMessage } from "@electrasim/platform-contracts";
import type { TransactionalEmailProvider } from "./index.ts";

export interface CapturedEmail extends TransactionalEmailMessage {
  readonly capturedAt: string;
}

/** Development-only provider used for complete local account-flow testing. */
export class LocalEmailCaptureProvider implements TransactionalEmailProvider {
  private readonly messages: CapturedEmail[] = [];

  constructor(private readonly now: () => Date = () => new Date()) {}

  async send(message: TransactionalEmailMessage): Promise<void> {
    if (this.messages.some((item) => item.id === message.id)) return;
    this.messages.unshift({ ...message, capturedAt: this.now().toISOString() });
    if (this.messages.length > 100) this.messages.length = 100;
  }

  list(): readonly CapturedEmail[] {
    return this.messages.map((message) => ({
      ...message,
      variables: { ...message.variables },
      ...(message.tags ? { tags: { ...message.tags } } : {}),
    }));
  }
}
