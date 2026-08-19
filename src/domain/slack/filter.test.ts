import { describe, expect, it } from "vitest";
import { filterAppMention } from "./filter";
import type { Identity } from "./types";

const identity: Identity = {
  allowedUserId: "U_ALLOW",
  botUserId: "U_BOT",
  teamId: "T_TEAM",
};

function mentionEnvelope(
  event: Record<string, unknown> = {},
  extra: Record<string, unknown> = {},
) {
  return {
    type: "event_callback",
    event_id: "Ev1",
    team_id: "T_TEAM",
    event: {
      type: "app_mention",
      user: "U_ALLOW",
      channel: "C123",
      ts: "1.0",
      ...event,
    },
    ...extra,
  };
}

describe("filterAppMention", () => {
  it("forwards an allowlisted channel mention", () => {
    expect(filterAppMention(mentionEnvelope(), identity)).toEqual({
      action: "forward",
      eventId: "Ev1",
      channel: "C123",
      ts: "1.0",
    });
  });

  it("drops the wrong team, user, DMs, and bots", () => {
    expect(
      filterAppMention(mentionEnvelope({}, { team_id: "T_OTHER" }), identity)
        .action,
    ).toBe("ignore");
    expect(
      filterAppMention(mentionEnvelope({ user: "U_OTHER" }), identity).action,
    ).toBe("ignore");
    expect(
      filterAppMention(mentionEnvelope({ channel: "D123" }), identity).action,
    ).toBe("ignore");
    expect(
      filterAppMention(mentionEnvelope({ bot_id: "B1" }), identity).action,
    ).toBe("ignore");
  });
});
