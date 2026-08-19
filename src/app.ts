import { Hono } from "hono";
import { slackEvents } from "./routes/slack-events";

export function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/", slackEvents);
  return app;
}
