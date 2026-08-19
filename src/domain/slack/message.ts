import { hasBotMention } from "./mention";
import type { SlackMessage } from "./types";

export function isAllowlistedBotMention(
  message: SlackMessage,
  opts: { allowedUserId: string; botUserId: string; ts: string },
): boolean {
  return (
    message.user === opts.allowedUserId &&
    message.ts === opts.ts &&
    hasBotMention(message.text, opts.botUserId)
  );
}
