import { SIGNATURE_MAX_AGE_SECONDS } from "./constants";

export type SlackEnvelope = {
  type?: string;
  challenge?: string;
  event_id?: string;
  team_id?: string;
  event?: SlackInnerEvent;
};

export type SlackInnerEvent = {
  type?: string;
  user?: string;
  channel?: string;
  channel_type?: string;
  ts?: string;
  thread_ts?: string;
  text?: string;
  bot_id?: string;
  subtype?: string;
};

export type FilterResult =
  | { action: "forward" }
  | { action: "ignore"; reason: string };

export type Identity = {
  allowedUserId: string;
  botUserId: string;
  teamId: string;
};

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualString(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.byteLength !== right.byteLength) {
    return false;
  }
  return crypto.subtle.timingSafeEqual(left, right);
}

export async function verifySlackSignature(opts: {
  signingSecret: string;
  timestamp: string | undefined;
  signature: string | undefined;
  rawBody: string;
  nowSeconds?: number;
}): Promise<boolean> {
  const { signingSecret, timestamp, signature, rawBody } = opts;
  if (!signingSecret || !timestamp || !signature || !/^\d+$/.test(timestamp)) {
    return false;
  }

  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > SIGNATURE_MAX_AGE_SECONDS) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`v0:${timestamp}:${rawBody}`),
  );
  const expected = `v0=${toHex(mac)}`;
  return timingSafeEqualString(expected, signature);
}

export function parseEnvelope(rawBody: string): SlackEnvelope | null {
  try {
    return JSON.parse(rawBody) as SlackEnvelope;
  } catch {
    return null;
  }
}

export function hasBotMention(text: string, botUserId: string): boolean {
  const escaped = botUserId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`<@${escaped}(?:\\|[^>]+)?>`).test(text);
}

export function filterAppMention(
  envelope: SlackEnvelope,
  identity: Identity,
): FilterResult {
  if (envelope.type !== "event_callback") {
    return { action: "ignore", reason: "not_event_callback" };
  }
  if (envelope.team_id !== identity.teamId) {
    return { action: "ignore", reason: "wrong_team" };
  }
  const event = envelope.event;
  if (!event || event.type !== "app_mention") {
    return { action: "ignore", reason: "not_app_mention" };
  }
  if (
    event.bot_id ||
    event.subtype === "bot_message" ||
    event.user === identity.botUserId
  ) {
    return { action: "ignore", reason: "bot_message" };
  }
  if (!event.user) {
    return { action: "ignore", reason: "missing_user" };
  }
  if (event.user !== identity.allowedUserId) {
    return { action: "ignore", reason: "not_allowed_user" };
  }
  const channelType = event.channel_type;
  if (channelType === "im" || channelType === "mpim") {
    return { action: "ignore", reason: "dm" };
  }
  if (!event.channel || event.channel.startsWith("D")) {
    return { action: "ignore", reason: "dm" };
  }
  if (!event.ts) {
    return { action: "ignore", reason: "missing_ts" };
  }
  if (!envelope.event_id) {
    return { action: "ignore", reason: "missing_event_id" };
  }
  return { action: "forward" };
}
