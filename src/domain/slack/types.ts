export type SlackEnvelope = {
  type?: string;
  challenge?: string;
  event_id?: string;
  team_id?: string;
  event?: SlackInnerEvent;
};

export type SlackInnerEvent = {
  type?: string;
  user?: string;
  channel?: string;
  channel_type?: string;
  ts?: string;
  thread_ts?: string;
  text?: string;
  bot_id?: string;
  subtype?: string;
};

export type SlackMessage = {
  user: string;
  ts: string;
  text: string;
  thread_ts?: string;
};

export type Identity = {
  allowedUserId: string;
  botUserId: string;
  teamId: string;
};

export type FilterResult =
  | { action: "forward"; eventId: string; channel: string; ts: string }
  | { action: "ignore"; reason: string };
