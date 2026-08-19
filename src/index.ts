import { Hono } from "hono";
import { loadConfig } from "./config";
import {
  EVENT_TTL_SECONDS,
  MAX_BODY_BYTES,
  MESSAGE_TTL_SECONDS,
} from "./constants";
import { buildGrokPayload, postGrokWebhook } from "./forward";
import { claimOnce } from "./kv";
import { filterAppMention, parseEnvelope, verifySlackSignature } from "./slack";
import { fetchVerifiedMention } from "./verify";

const app = new Hono<{ Bindings: Env }>();

app.post("/slack/events", async (c) => {
  const rawBody = await c.req.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return c.text("payload too large", 413);
  }

  const envelope = parseEnvelope(rawBody);
  if (!envelope) {
    return c.text("invalid json", 400);
  }

  if (envelope.type === "url_verification" && envelope.challenge) {
    return c.text(envelope.challenge, 200);
  }

  const config = loadConfig(c.env);
  if (!config) {
    console.log(JSON.stringify({ msg: "misconfigured" }));
    return c.text("misconfigured", 500);
  }

  const valid = await verifySlackSignature({
    signingSecret: config.signingSecret,
    timestamp: c.req.header("x-slack-request-timestamp") ?? undefined,
    signature: c.req.header("x-slack-signature") ?? undefined,
    rawBody,
  });
  if (!valid) {
    return c.text("invalid signature", 401);
  }

  const filtered = filterAppMention(envelope, {
    allowedUserId: config.allowedUserId,
    botUserId: config.botUserId,
    teamId: config.teamId,
  });
  if (filtered.action === "ignore") {
    console.log(
      JSON.stringify({
        msg: "drop",
        event_id: envelope.event_id,
        reason: filtered.reason,
      }),
    );
    return c.body(null, 200);
  }

  const event = envelope.event;
  if (!event?.channel || !event.ts || !envelope.event_id) {
    return c.body(null, 200);
  }

  c.executionCtx.waitUntil(
    deliverMention({
      env: c.env,
      config,
      eventId: envelope.event_id,
      channel: event.channel,
      ts: event.ts,
    }),
  );
  return c.body(null, 200);
});

async function deliverMention(opts: {
  env: Env;
  config: NonNullable<ReturnType<typeof loadConfig>>;
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

  const message = await fetchVerifiedMention({
    botToken: config.botToken,
    channel,
    ts,
    allowedUserId: config.allowedUserId,
    botUserId: config.botUserId,
  });
  if (!message) {
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
    await postGrokWebhook({
      url: config.grokWebhookUrl,
      key: config.grokWebhookKey,
      headerName: config.grokWebhookKeyHeader,
      payload: buildGrokPayload({
        eventId,
        channel,
        teamId: config.teamId,
        allowedUserId: config.allowedUserId,
        message,
      }),
    });
  } catch {
    console.log(JSON.stringify({ msg: "grok_webhook_error", event_id: eventId }));
  }
}

export default app;
