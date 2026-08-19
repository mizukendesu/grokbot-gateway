import type { SlackMessage } from "../domain/slack/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseHistoryMessage(body: unknown): SlackMessage | null {
  if (!isRecord(body) || body.ok !== true || !Array.isArray(body.messages)) {
    return null;
  }
  const first = body.messages[0];
  if (!isRecord(first)) {
    return null;
  }
  if (
    typeof first.user !== "string" ||
    typeof first.ts !== "string" ||
    typeof first.text !== "string"
  ) {
    return null;
  }
  return {
    user: first.user,
    ts: first.ts,
    text: first.text,
    thread_ts: typeof first.thread_ts === "string" ? first.thread_ts : undefined,
  };
}

export async function fetchSlackMessage(opts: {
  botToken: string;
  channel: string;
  ts: string;
}): Promise<SlackMessage | null> {
  const url = new URL("https://slack.com/api/conversations.history");
  url.searchParams.set("channel", opts.channel);
  url.searchParams.set("latest", opts.ts);
  url.searchParams.set("oldest", opts.ts);
  url.searchParams.set("inclusive", "true");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${opts.botToken}` },
  });
  if (!res.ok) {
    console.log(
      JSON.stringify({
        msg: "slack_history_http",
        status: res.status,
      }),
    );
    return null;
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }

  const message = parseHistoryMessage(body);
  if (!message) {
    const error =
      isRecord(body) && typeof body.error === "string" ? body.error : "empty";
    console.log(JSON.stringify({ msg: "slack_history_miss", error }));
    return null;
  }
  return message;
}
