import { describe, expect, it } from "vitest";
import { readBodyCapped } from "./http-body";

describe("readBodyCapped", () => {
  it("returns the body when it is under the cap", async () => {
    const request = new Request("https://example.com", {
      method: "POST",
      body: "hello",
    });
    await expect(readBodyCapped(request, 100)).resolves.toBe("hello");
  });

  it("rejects a body larger than the cap", async () => {
    const request = new Request("https://example.com", {
      method: "POST",
      body: "abcdefghijklmnop",
    });
    await expect(readBodyCapped(request, 8)).resolves.toBe("too_large");
  });
});
