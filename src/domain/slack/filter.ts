import type { FilterResult, Identity, SlackEnvelope } from "./types";

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
  return {
    action: "forward",
    eventId: envelope.event_id,
    channel: event.channel,
    ts: event.ts,
  };
}
