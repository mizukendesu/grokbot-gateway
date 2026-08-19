# grokbot-gateway

Generic Cloudflare Worker that accepts Slack Events API `app_mention`s and forwards **one allowlisted user's channel mentions** to an HTTPS webhook (for example a Grok Bot routine).

The Worker never posts back to Slack. It does not call `chat.postMessage`. It only reads `conversations.history` to confirm the message exists, was written by the allowlisted user, and actually mentions the bot.

This repository is meant to be public. Workspace IDs, user IDs, tokens, and webhook URLs belong in secrets/vars, not in source.

## What it does

- Echoes Slack `url_verification` challenge (unsigned, body capped)
- Verifies `v0` HMAC signatures (±5 minutes)
- Ignores everyone except `SLACK_ALLOWED_USER_ID`
- Ignores DMs, bot messages, and other teams
- ACKs Slack immediately, then in `waitUntil`:
  - KV-dedupes `event_id` (1 hour) and `channel+ts` (7 days); KV errors fail closed
  - Reloads the message from Slack
  - Requires `<@BOT_USER_ID>` in the stored text
  - POSTs JSON to the webhook with `redirect: manual`

## Configure

Copy `.dev.vars.example` to `.dev.vars` (gitignored).

### Secrets

| Name | What |
| --- | --- |
| `SLACK_SIGNING_SECRET` | Slack app Signing Secret |
| `SLACK_BOT_TOKEN` | Bot token (`xoxb-`). Needs `channels:history` and `groups:history`. Worker never writes |
| `GROK_WEBHOOK_URL` | HTTPS webhook that should wake the agent |
| `GROK_WEBHOOK_KEY` | Sender key for that webhook |

Optional: `GROK_WEBHOOK_KEY_HEADER`. Default is `Authorization: Bearer <key>`.

### Identity (not hardcoded)

| Name | What |
| --- | --- |
| `SLACK_ALLOWED_USER_ID` | Only this Slack user can trigger the webhook |
| `SLACK_BOT_USER_ID` | Bot user ID used in `<@U…>` mention checks |
| `SLACK_TEAM_ID` | Workspace team ID; other teams are dropped |

Do not commit real IDs. Empty values in `wrangler.jsonc` are placeholders.

## Local

```bash
cp .dev.vars.example .dev.vars
npm install
npx wrangler types
npm run check
npm run dev
```

URL verification:

```bash
curl -sS -X POST http://127.0.0.1:8787/slack/events \
  -H 'Content-Type: application/json' \
  -d '{"type":"url_verification","challenge":"abc123"}'
```

Expect `abc123`.

## Slack app

Use an existing Slack app. Do not create a new one unless you need to.

1. Turn **Socket Mode off**
2. Event Subscriptions on
3. Request URL `https://<worker>.<subdomain>.workers.dev/slack/events`
4. Subscribe to bot events: **app_mention only**
5. Scope `app_mentions:read` plus `channels:history` / `groups:history`
6. Invite the bot into each channel you care about

One Request URL per app. Replacing it disconnects the previous receiver.

## Production (when you choose to deploy)

```bash
npx wrangler kv namespace create EVENT_DEDUPE
# paste the id into wrangler.jsonc

npx wrangler secret put SLACK_SIGNING_SECRET
npx wrangler secret put SLACK_BOT_TOKEN
npx wrangler secret put GROK_WEBHOOK_URL
npx wrangler secret put GROK_WEBHOOK_KEY
npx wrangler secret put SLACK_ALLOWED_USER_ID
npx wrangler secret put SLACK_BOT_USER_ID
npx wrangler secret put SLACK_TEAM_ID

npx wrangler deploy
```

## Payload sent to the webhook

```json
{
  "source": "slack-events",
  "event_id": "Ev…",
  "event_type": "app_mention",
  "user": "U…",
  "channel": "C…",
  "ts": "…",
  "thread_ts": "…",
  "text": "…",
  "team": "T…"
}
```

`text` comes from Slack history, not from the inbound event body.

## Security notes

- Signing secret theft still cannot invent message text
- History text must mention the bot, so a stolen secret cannot replay arbitrary old user messages
- Webhook fetch does not follow redirects (avoids leaking the sender key)
- KV failures skip delivery rather than double-firing
- Logs are `event_id` / reason / status only
