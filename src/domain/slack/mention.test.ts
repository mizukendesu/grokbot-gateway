import { describe, expect, it } from "vitest";
import { hasBotMention } from "./mention";

describe("hasBotMention", () => {
  it("matches a plain mention", () => {
    expect(hasBotMention("hey <@U123BOT> please", "U123BOT")).toBe(true);
  });

  it("matches a labeled mention", () => {
    expect(hasBotMention("<@U123BOT|robo> hi", "U123BOT")).toBe(true);
  });

  it("ignores other users", () => {
    expect(hasBotMention("hey <@U999OTHER>", "U123BOT")).toBe(false);
  });

  it("does not treat a prefix as the bot id", () => {
    expect(hasBotMention("<@U123BOTX>", "U123BOT")).toBe(false);
  });
});
