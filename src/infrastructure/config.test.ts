import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

const valid = {
  EVENT_DEDUPE: {} as KVNamespace,
  SLACK_SIGNING_SECRET: "sig",
  SLACK_BOT_TOKEN: "xoxb-test",
  SLACK_ALLOWED_USER_ID: "U_ALLOW",
  SLACK_BOT_USER_ID: "U_BOT",
  SLACK_TEAM_ID: "T_TEAM",
  GROK_WEBHOOK_URL: "https://example.com/hook",
  GROK_WEBHOOK_KEY: "key",
} satisfies Env;

describe("loadConfig", () => {
  it("accepts a complete https config", () => {
    expect(loadConfig(valid)?.allowedUserId).toBe("U_ALLOW");
  });

  it("rejects missing fields, http webhooks, and bad header names", () => {
    expect(loadConfig({ ...valid, SLACK_TEAM_ID: "" })).toBeNull();
    expect(
      loadConfig({ ...valid, GROK_WEBHOOK_URL: "http://example.com/hook" }),
    ).toBeNull();
    expect(
      loadConfig({ ...valid, GROK_WEBHOOK_KEY_HEADER: "Bad Header" }),
    ).toBeNull();
  });
});
