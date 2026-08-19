import { afterEach, describe, expect, it, vi } from "vitest";
import { deliverMention } from "./deliver-mention";
import type { GatewayConfig } from "../infrastructure/config";

const config: GatewayConfig = {
  signingSecret: "sig",
  botToken: "xoxb-test",
  allowedUserId: "U_ALLOW",
  botUserId: "U_BOT",
  teamId: "T_TEAM",
  webhookUrl: "https://example.com/hook",
  webhookKey: "hook-key",
};

function memoryKv() {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  } as KVNamespace;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("deliverMention", () => {
  it("posts the webhook for an allowlisted history mention", async () => {
    const posted: string[] = [];
    vi.stubGlobal("fetch", async (input: string, init?: { body?: string }) => {
      if (String(input).startsWith("https://slack.com/")) {
        return Response.json({
          ok: true,
          messages: [{ user: "U_ALLOW", ts: "1.0", text: "hi <@U_BOT>" }],
        });
      }
      posted.push(String(init?.body ?? ""));
      return new Response(null, { status: 204 });
    });

    await deliverMention({
      env: { EVENT_DEDUPE: memoryKv() } as Env,
      config,
      eventId: "Ev1",
      channel: "C1",
      ts: "1.0",
    });

    expect(posted).toHaveLength(1);
    expect(JSON.parse(posted[0]!)).toMatchObject({
      event_id: "Ev1",
      user: "U_ALLOW",
      text: "hi <@U_BOT>",
    });
  });

  it("does not post when history has no bot mention", async () => {
    let webhookCalls = 0;
    vi.stubGlobal("fetch", async (input: string) => {
      if (String(input).startsWith("https://slack.com/")) {
        return Response.json({
          ok: true,
          messages: [{ user: "U_ALLOW", ts: "1.0", text: "no mention" }],
        });
      }
      webhookCalls += 1;
      return new Response(null, { status: 204 });
    });

    await deliverMention({
      env: { EVENT_DEDUPE: memoryKv() } as Env,
      config,
      eventId: "Ev1",
      channel: "C1",
      ts: "1.0",
    });

    expect(webhookCalls).toBe(0);
  });
});
