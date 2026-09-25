import type { TransactionalEmailMessage } from "@electrasim/platform-contracts";
import type { TransactionalEmailProvider } from "./index.ts";

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ResendEmailProviderConfig {
  readonly apiKey: string;
  readonly from: string;
  readonly fetch?: FetchImplementation;
}

export class ResendEmailProvider implements TransactionalEmailProvider {
  private readonly fetchImplementation: FetchImplementation;

  constructor(private readonly config: ResendEmailProviderConfig) {
    this.fetchImplementation = config.fetch ?? fetch;
  }

  async send(message: TransactionalEmailMessage): Promise<void> {
    const content = renderEmail(message);
    const response = await this.fetchImplementation("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        "content-type": "application/json",
        "idempotency-key": message.id,
      },
      body: JSON.stringify({
        from: this.config.from,
        to: [message.to],
        subject: content.subject,
        text: content.text,
        html: content.html,
        tags: Object.entries(message.tags ?? {}).map(([name, value]) => ({ name, value })),
      }),
    });
    if (!response.ok) throw new ResendDeliveryError(response.status);
  }
}

export class ResendDeliveryError extends Error {
  constructor(readonly status: number) {
    super("Transactional email provider rejected delivery");
    this.name = "ResendDeliveryError";
  }
}

function renderEmail(message: TransactionalEmailMessage): {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
} {
  switch (message.template) {
    case "verify_email":
      return actionEmail(
        "Verify your ElectraSim email",
        "Verify email",
        "Confirm your email to continue setting up your ElectraSim account.",
        requiredUrl(message),
      );
    case "reset_password":
      return actionEmail(
        "Reset your ElectraSim password",
        "Reset password",
        "Use this secure link to reset your ElectraSim password. If you did not request it, ignore this email.",
        requiredUrl(message),
      );
    case "workspace_invitation":
      return actionEmail(
        "You have been invited to an ElectraSim workspace",
        "Review invitation",
        "Review this workspace invitation after signing in with the invited email address.",
        requiredUrl(message),
      );
    case "security_alert": {
      const action = message.variables.action ?? "A security-sensitive account change occurred.";
      return {
        subject: "ElectraSim security alert",
        text: `${action}\n\nIf this was not you, secure your account and contact support.`,
        html: `<h1>ElectraSim security alert</h1><p>${escapeHtml(action)}</p><p>If this was not you, secure your account and contact support.</p>`,
      };
    }
  }
}

function actionEmail(subject: string, label: string, introduction: string, url: string) {
  const safeUrl = escapeHtml(url);
  return {
    subject,
    text: `${introduction}\n\n${label}: ${url}\n\nThis link expires and can be used only as described.`,
    html: `<h1>${escapeHtml(subject)}</h1><p>${escapeHtml(introduction)}</p><p><a href="${safeUrl}">${escapeHtml(label)}</a></p><p>This link expires and can be used only as described.</p>`,
  };
}

function requiredUrl(message: TransactionalEmailMessage): string {
  const url = message.variables.url;
  if (!url) throw new TypeError(`Email template ${message.template} requires a URL`);
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new TypeError("Email action URL must use HTTPS");
  }
  return parsed.toString();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
