import type { SlackMessage } from "./verify";

export type GrokPayload = {
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

export function buildGrokPayload(opts: {
  eventId: string;
  channel: string;
  teamId?: string;
  allowedUserId: string;
  message: SlackMessage;
}): GrokPayload {
  const payload: GrokPayload = {
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

export async function postGrokWebhook(opts: {
  url: string;
  key: string;
  headerName?: string;
  payload: GrokPayload;
}): Promise<void> {
  const headers = new Headers({ "content-type": "application/json" });
  const customHeader = opts.headerName?.trim();
  if (customHeader) {
    headers.set(customHeader, opts.key);
  } else {
    headers.set("Authorization", `Bearer ${opts.key}`);
  }

  const res = await fetch(opts.url, {
    method: "POST",
    headers,
    body: JSON.stringify(opts.payload),
    redirect: "manual",
  });
  console.log(JSON.stringify({ msg: "grok_webhook", status: res.status }));
}
