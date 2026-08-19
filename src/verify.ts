import { hasBotMention } from "./slack";

export type SlackMessage = {
  user: string;
  ts: string;
  text: string;
  thread_ts?: string;
};

type HistoryResponse = {
  ok?: boolean;
  error?: string;
  messages?: Array<{
    user?: string;
    ts?: string;
    text?: string;
    thread_ts?: string;
  }>;
};

export async function fetchVerifiedMention(opts: {
  botToken: string;
  channel: string;
  ts: string;
  allowedUserId: string;
  botUserId: string;
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

  const body = (await res.json()) as HistoryResponse;
  if (!body.ok || !body.messages?.[0]) {
    console.log(
      JSON.stringify({
        msg: "slack_history_miss",
        error: body.error ?? "empty",
      }),
    );
    return null;
  }

  const message = body.messages[0];
  if (
    message.user !== opts.allowedUserId ||
    message.ts !== opts.ts ||
    typeof message.text !== "string" ||
    !hasBotMention(message.text, opts.botUserId)
  ) {
    console.log(JSON.stringify({ msg: "slack_history_mismatch" }));
    return null;
  }

  return {
    user: message.user,
    ts: message.ts,
    text: message.text,
    thread_ts: message.thread_ts,
  };
}
