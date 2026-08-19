export type GatewayConfig = {
  signingSecret: string;
  botToken: string;
  allowedUserId: string;
  botUserId: string;
  teamId: string;
  grokWebhookUrl: string;
  grokWebhookKey: string;
  grokWebhookKeyHeader?: string;
};

function required(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function isHeaderName(value: string): boolean {
  return /^[A-Za-z0-9-]+$/.test(value);
}

export function loadConfig(env: Env): GatewayConfig | null {
  const signingSecret = required(env.SLACK_SIGNING_SECRET);
  const botToken = required(env.SLACK_BOT_TOKEN);
  const allowedUserId = required(env.SLACK_ALLOWED_USER_ID);
  const botUserId = required(env.SLACK_BOT_USER_ID);
  const teamId = required(env.SLACK_TEAM_ID);
  const grokWebhookUrl = required(env.GROK_WEBHOOK_URL);
  const grokWebhookKey = required(env.GROK_WEBHOOK_KEY);
  if (
    !signingSecret ||
    !botToken ||
    !allowedUserId ||
    !botUserId ||
    !teamId ||
    !grokWebhookUrl ||
    !grokWebhookKey
  ) {
    return null;
  }
  if (!isHttpsUrl(grokWebhookUrl)) {
    return null;
  }

  const header = env.GROK_WEBHOOK_KEY_HEADER?.trim();
  if (header && !isHeaderName(header)) {
    return null;
  }

  return {
    signingSecret,
    botToken,
    allowedUserId,
    botUserId,
    teamId,
    grokWebhookUrl,
    grokWebhookKey,
    grokWebhookKeyHeader: header || undefined,
  };
}
