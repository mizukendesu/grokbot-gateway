import { Hono } from "hono";
import { deliverMention } from "../application/deliver-mention";
import { filterAppMention } from "../domain/slack/filter";
import { parseEnvelope } from "../domain/slack/parse";
import { verifySlackSignature } from "../domain/slack/signature";
import { loadConfig } from "../infrastructure/config";
import { readBodyCapped } from "../infrastructure/http-body";
import { MAX_BODY_BYTES } from "../shared/constants";

export const slackEvents = new Hono<{ Bindings: Env }>();

slackEvents.post("/slack/events", async (c) => {
  const rawBody = await readBodyCapped(c.req.raw, MAX_BODY_BYTES);
  if (rawBody === "too_large") {
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

  c.executionCtx.waitUntil(
    deliverMention({
      env: c.env,
      config,
      eventId: filtered.eventId,
      channel: filtered.channel,
      ts: filtered.ts,
    }),
  );
  return c.body(null, 200);
});
