import type { SlackMessage } from "../slack/types";

export type WebhookPayload = {
  source: "slack-events";
  event_id: string;
  event_type: "app_mention";
  user: string;
  channel: string;
  ts: string;
  thread_ts?: string;
  text: string;
  team?: string;
};

export function buildWebhookPayload(opts: {
  eventId: string;
  channel: string;
  teamId?: string;
  allowedUserId: string;
  message: SlackMessage;
}): WebhookPayload {
  const payload: WebhookPayload = {
    source: "slack-events",
    event_id: opts.eventId,
    event_type: "app_mention",
    user: opts.allowedUserId,
    channel: opts.channel,
    ts: opts.message.ts,
    text: opts.message.text,
  };
  const threadTs = opts.message.thread_ts;
  if (threadTs) {
    payload.thread_ts = threadTs;
  }
  if (opts.teamId) {
    payload.team = opts.teamId;
  }
  return payload;
}
