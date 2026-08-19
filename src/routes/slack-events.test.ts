import { describe, expect, it } from "vitest";
import { createApp } from "../app";

const env = {
  EVENT_DEDUPE: {
    get: async () => null,
    put: async () => undefined,
  },
  SLACK_SIGNING_SECRET: "sig",
  SLACK_BOT_TOKEN: "xoxb-test",
  SLACK_ALLOWED_USER_ID: "U_ALLOW",
  SLACK_BOT_USER_ID: "U_BOT",
  SLACK_TEAM_ID: "T_TEAM",
  GROK_WEBHOOK_URL: "https://example.com/hook",
  GROK_WEBHOOK_KEY: "key",
} as unknown as Env;

describe("POST /slack/events", () => {
  const app = createApp();

  it("echoes a url verification challenge", async () => {
    const res = await app.request(
      "/slack/events",
      {
        method: "POST",
        body: JSON.stringify({
          type: "url_verification",
          challenge: "abc123",
        }),
      },
      env,
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("abc123");
  });

  it("rejects invalid json and oversized bodies", async () => {
    const bad = await app.request(
      "/slack/events",
      { method: "POST", body: "not-json" },
      env,
    );
    expect(bad.status).toBe(400);

    const huge = await app.request(
      "/slack/events",
      {
        method: "POST",
        headers: { "content-length": "999999" },
        body: "tiny",
      },
      env,
    );
    expect(huge.status).toBe(413);
  });

  it("rejects a missing signature on event callbacks", async () => {
    const res = await app.request(
      "/slack/events",
      {
        method: "POST",
        body: JSON.stringify({
          type: "event_callback",
          event_id: "Ev1",
          team_id: "T_TEAM",
          event: { type: "app_mention", user: "U_ALLOW", channel: "C1", ts: "1.0" },
        }),
      },
      env,
    );
    expect(res.status).toBe(401);
  });
});
