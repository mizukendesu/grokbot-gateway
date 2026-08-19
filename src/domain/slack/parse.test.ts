import { describe, expect, it } from "vitest";
import { parseEnvelope } from "./parse";

describe("parseEnvelope", () => {
  it("parses a url verification payload", () => {
    const parsed = parseEnvelope(
      JSON.stringify({ type: "url_verification", challenge: "abc" }),
    );
    expect(parsed).toEqual({
      type: "url_verification",
      challenge: "abc",
      event_id: undefined,
      team_id: undefined,
      event: undefined,
    });
  });

  it("rejects non-objects and invalid event values", () => {
    expect(parseEnvelope("[]")).toBeNull();
    expect(parseEnvelope("nope")).toBeNull();
    expect(parseEnvelope(JSON.stringify({ event: "x" }))).toBeNull();
  });
});
