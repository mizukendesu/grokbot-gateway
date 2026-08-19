# grokbot-gateway

Slack Events API の `app_mention` を受け、**許可した 1 ユーザーのチャンネルメンションだけ**を HTTPS webhook（例: Grok Bot の巡回）へ中継する Cloudflare Worker です。

Worker は Slack に返信しません。`chat.postMessage` は呼びません。確認に使うのは `conversations.history` だけです（メッセージが実在すること、許可ユーザーが書いたこと、本文が bot をメンションしていること）。

このリポジトリは公開する前提です。ワークスペース ID・ユーザー ID・token・webhook URL はソースに書かず、secret / 環境変数に置きます。

## 構成

```
src/
  index.ts                 # Worker の入口
  app.ts                   # Hono アプリ
  routes/                  # HTTP（Slack Events）
  application/             # ユースケース（メンション転送）
  domain/slack/            # 署名・パース・フィルタ・メンション判定
  domain/webhook/          # 転送 JSON
  infrastructure/          # KV, Slack API, webhook HTTP, config
  shared/                  # TTL などの定数
```

ドメインは I/O を持たない。Slack / KV / 外部 HTTP は infrastructure。Hono は routes だけ。

## できること

- Slack の `url_verification` challenge をエコーする（署名なし。body サイズ制限あり）
- `v0` HMAC 署名を検証する（±5 分）
- `SLACK_ALLOWED_USER_ID` 以外は無視する
- DM・bot メッセージ・別チームは無視する
- Slack にはすぐ 200 を返し、`waitUntil` で次を行う
  - KV で `event_id`（1 時間）と `channel+ts`（7 日）を重複排除。KV エラー時は送らない
  - Slack からメッセージを再取得する
  - 保存されている本文に `<@BOT_USER_ID>` が必要
  - webhook へ JSON を POST する（`redirect: manual`。リダイレクトは追わない）

## 設定

`.dev.vars.example` を `.dev.vars` にコピーします（`.dev.vars` は gitignore）。

### Secrets

| 名前 | 内容 |
| --- | --- |
| `SLACK_SIGNING_SECRET` | Slack アプリの Signing Secret |
| `SLACK_BOT_TOKEN` | Bot token（`xoxb-`）。`channels:history` と `groups:history` が必要。Worker は書き込まない |
| `GROK_WEBHOOK_URL` | エージェントを起こす HTTPS webhook |
| `GROK_WEBHOOK_KEY` | その webhook の sender key |

任意: `GROK_WEBHOOK_KEY_HEADER`。未設定なら `Authorization: Bearer <key>`。

### 識別子（ソースには直書きしない）

| 名前 | 内容 |
| --- | --- |
| `SLACK_ALLOWED_USER_ID` | webhook を起こしてよい Slack ユーザー |
| `SLACK_BOT_USER_ID` | `<@U…>` のメンション判定に使う bot の user ID |
| `SLACK_TEAM_ID` | ワークスペースの team ID。他チームは捨てる |

実 ID を commit しないでください。

## ローカル

```bash
cp .dev.vars.example .dev.vars
npm install
npx wrangler types
npm run check
npm test
npm run dev
```

URL 確認:

```bash
curl -sS -X POST http://127.0.0.1:8787/slack/events \
  -H 'Content-Type: application/json' \
  -d '{"type":"url_verification","challenge":"abc123"}'
```

応答は `abc123` です。

## Slack アプリ

既存アプリを使ってください。不要なら新規作成しないでください。

1. **Socket Mode をオフ**
2. Event Subscriptions をオン
3. Request URL を `https://<worker>.<subdomain>.workers.dev/slack/events` にする
4. Subscribe to bot events は **app_mention のみ**
5. スコープは `app_mentions:read` に加え `channels:history` / `groups:history`
6. 使うチャンネルに bot を invite する

Request URL はアプリあたり 1 本です。差し替えると以前の受信先は切れます。

## 本番（デプロイするとき）

```bash
npx wrangler kv namespace create EVENT_DEDUPE
# 返った id を wrangler.jsonc に貼る

npx wrangler secret put SLACK_SIGNING_SECRET
npx wrangler secret put SLACK_BOT_TOKEN
npx wrangler secret put GROK_WEBHOOK_URL
npx wrangler secret put GROK_WEBHOOK_KEY
npx wrangler secret put SLACK_ALLOWED_USER_ID
npx wrangler secret put SLACK_BOT_USER_ID
npx wrangler secret put SLACK_TEAM_ID

npx wrangler deploy
```

## webhook に送る JSON

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

`text` は受信イベントの本文ではなく、Slack history の値です。

## セキュリティ

- Signing secret を盗まれても、メッセージ本文は捏造できない
- history の本文が bot をメンションしていない投稿は送れない
- webhook の fetch はリダイレクトを追わない（sender key を外に出さない）
- KV 失敗時は送らず、二重送信より欠送を選ぶ
- ログは `event_id` / 理由 / status のみ
