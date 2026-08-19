import { isAllowlistedBotMention } from "../domain/slack/message";
import { buildWebhookPayload } from "../domain/webhook/payload";
import type { GatewayConfig } from "../infrastructure/config";
import { claimOnce } from "../infrastructure/kv-dedupe";
import { fetchSlackMessage } from "../infrastructure/slack-history";
import { postWebhook } from "../infrastructure/webhook-client";
import {
  EVENT_TTL_SECONDS,
  MESSAGE_TTL_SECONDS,
} from "../shared/constants";

export async function deliverMention(opts: {
  env: Env;
  config: GatewayConfig;
  eventId: string;
  channel: string;
  ts: string;
}): Promise<void> {
  const { env, config, eventId, channel, ts } = opts;

  const eventClaim = await claimOnce(
    env.EVENT_DEDUPE,
    `event:${eventId}`,
    EVENT_TTL_SECONDS,
  );
  if (eventClaim === "duplicate") {
    console.log(JSON.stringify({ msg: "dedupe", event_id: eventId }));
    return;
  }
  if (eventClaim === "fail") {
    console.log(JSON.stringify({ msg: "kv_fail_closed", event_id: eventId }));
    return;
  }

  const message = await fetchSlackMessage({
    botToken: config.botToken,
    channel,
    ts,
  });
  if (
    !message ||
    !isAllowlistedBotMention(message, {
      allowedUserId: config.allowedUserId,
      botUserId: config.botUserId,
      ts,
    })
  ) {
    console.log(JSON.stringify({ msg: "verify_failed", event_id: eventId }));
    return;
  }

  const messageClaim = await claimOnce(
    env.EVENT_DEDUPE,
    `msg:${channel}:${ts}`,
    MESSAGE_TTL_SECONDS,
  );
  if (messageClaim === "duplicate") {
    console.log(JSON.stringify({ msg: "dedupe_message", event_id: eventId }));
    return;
  }
  if (messageClaim === "fail") {
    console.log(JSON.stringify({ msg: "kv_fail_closed", event_id: eventId }));
    return;
  }

  try {
    const ok = await postWebhook({
      url: config.webhookUrl,
      key: config.webhookKey,
      headerName: config.webhookKeyHeader,
      payload: buildWebhookPayload({
        eventId,
        channel,
        teamId: config.teamId,
        allowedUserId: config.allowedUserId,
        message,
      }),
    });
    if (!ok) {
      console.log(JSON.stringify({ msg: "webhook_failed", event_id: eventId }));
    }
  } catch {
    console.log(JSON.stringify({ msg: "webhook_error", event_id: eventId }));
  }
}
