export function hasBotMention(text: string, botUserId: string): boolean {
  const escaped = botUserId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`<@${escaped}(?:\\|[^>]+)?>`).test(text);
}
