interface Env {
  EVENT_DEDUPE: KVNamespace;
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
  SLACK_ALLOWED_USER_ID: string;
  SLACK_BOT_USER_ID: string;
  SLACK_TEAM_ID: string;
  GROK_WEBHOOK_URL: string;
  GROK_WEBHOOK_KEY: string;
  GROK_WEBHOOK_KEY_HEADER?: string;
}
