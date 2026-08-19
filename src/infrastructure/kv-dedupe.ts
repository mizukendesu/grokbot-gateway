export type ClaimResult = "ok" | "duplicate" | "fail";

export async function claimOnce(
  kv: KVNamespace,
  key: string,
  expirationTtl: number,
): Promise<ClaimResult> {
  try {
    const existing = await kv.get(key);
    if (existing) {
      return "duplicate";
    }
    await kv.put(key, "1", { expirationTtl });
    return "ok";
  } catch {
    return "fail";
  }
}
