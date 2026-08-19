import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSlackMessage } from "./slack-history";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchSlackMessage", () => {
  it("returns a message when Slack JSON is well formed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ok: true,
          messages: [
            { user: "U_ALLOW", ts: "1.0", text: "hey <@U_BOT>", thread_ts: "0.9" },
          ],
        }),
      ),
    );
    await expect(
      fetchSlackMessage({ botToken: "xoxb-test", channel: "C1", ts: "1.0" }),
    ).resolves.toEqual({
      user: "U_ALLOW",
      ts: "1.0",
      text: "hey <@U_BOT>",
      thread_ts: "0.9",
    });
  });

  it("returns null for malformed Slack JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: true, messages: [{ ts: 1 }] })),
    );
    await expect(
      fetchSlackMessage({ botToken: "xoxb-test", channel: "C1", ts: "1.0" }),
    ).resolves.toBeNull();
  });
});
