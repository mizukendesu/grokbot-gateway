import type { SlackEnvelope, SlackInnerEvent } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseInnerEvent(
  value: unknown,
): SlackInnerEvent | undefined | "invalid" {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    return "invalid";
  }
  return {
    type: optionalString(value.type),
    user: optionalString(value.user),
    channel: optionalString(value.channel),
    channel_type: optionalString(value.channel_type),
    ts: optionalString(value.ts),
    thread_ts: optionalString(value.thread_ts),
    text: optionalString(value.text),
    bot_id: optionalString(value.bot_id),
    subtype: optionalString(value.subtype),
  };
}

export function parseEnvelope(rawBody: string): SlackEnvelope | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }

  const event = parseInnerEvent(parsed.event);
  if (event === "invalid") {
    return null;
  }

  return {
    type: optionalString(parsed.type),
    challenge: optionalString(parsed.challenge),
    event_id: optionalString(parsed.event_id),
    team_id: optionalString(parsed.team_id),
    event,
  };
}
