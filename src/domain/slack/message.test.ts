import { describe, expect, it } from "vitest";
import { isAllowlistedBotMention } from "./message";

const message = {
  user: "U_ALLOW",
  ts: "1.0",
  text: "hey <@U_BOT>",
};

describe("isAllowlistedBotMention", () => {
  it("accepts the allowlisted user mentioning the bot at the given ts", () => {
    expect(
      isAllowlistedBotMention(message, {
        allowedUserId: "U_ALLOW",
        botUserId: "U_BOT",
        ts: "1.0",
      }),
    ).toBe(true);
  });

  it("rejects the wrong user, ts, or a missing mention", () => {
    expect(
      isAllowlistedBotMention(message, {
        allowedUserId: "U_OTHER",
        botUserId: "U_BOT",
        ts: "1.0",
      }),
    ).toBe(false);
    expect(
      isAllowlistedBotMention(message, {
        allowedUserId: "U_ALLOW",
        botUserId: "U_BOT",
        ts: "2.0",
      }),
    ).toBe(false);
    expect(
      isAllowlistedBotMention(
        { ...message, text: "no mention" },
        { allowedUserId: "U_ALLOW", botUserId: "U_BOT", ts: "1.0" },
      ),
    ).toBe(false);
  });
});
