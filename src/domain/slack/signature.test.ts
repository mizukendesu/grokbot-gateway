import { describe, expect, it } from "vitest";
import { verifySlackSignature } from "./signature";

describe("verifySlackSignature", () => {
  it("accepts a fresh matching HMAC and rejects skew or a bad mac", async () => {
    const secret = "signing-secret";
    const timestamp = "1000";
    const rawBody = '{"ok":true}';
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`v0:${timestamp}:${rawBody}`),
    );
    const signature = `v0=${[...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;

    await expect(
      verifySlackSignature({
        signingSecret: secret,
        timestamp,
        signature,
        rawBody,
        nowSeconds: 1000,
      }),
    ).resolves.toBe(true);

    await expect(
      verifySlackSignature({
        signingSecret: secret,
        timestamp,
        signature,
        rawBody,
        nowSeconds: 1000 + 301,
      }),
    ).resolves.toBe(false);

    await expect(
      verifySlackSignature({
        signingSecret: secret,
        timestamp,
        signature: "v0=deadbeef",
        rawBody,
        nowSeconds: 1000,
      }),
    ).resolves.toBe(false);
  });
});
