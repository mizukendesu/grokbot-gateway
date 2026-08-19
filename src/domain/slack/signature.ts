import { SIGNATURE_MAX_AGE_SECONDS } from "../../shared/constants";

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < left.byteLength; i++) {
    mismatch |= left[i]! ^ right[i]!;
  }
  return mismatch === 0;
}

export async function verifySlackSignature(opts: {
  signingSecret: string;
  timestamp: string | undefined;
  signature: string | undefined;
  rawBody: string;
  nowSeconds?: number;
}): Promise<boolean> {
  const { signingSecret, timestamp, signature, rawBody } = opts;
  if (!signingSecret || !timestamp || !signature || !/^\d+$/.test(timestamp)) {
    return false;
  }

  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > SIGNATURE_MAX_AGE_SECONDS) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`v0:${timestamp}:${rawBody}`),
  );
  const expected = `v0=${toHex(mac)}`;
  return timingSafeEqualBytes(
    new TextEncoder().encode(expected),
    new TextEncoder().encode(signature),
  );
}
