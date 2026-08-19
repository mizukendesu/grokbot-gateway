import type { WebhookPayload } from "../domain/webhook/payload";

export async function postWebhook(opts: {
  url: string;
  key: string;
  headerName?: string;
  payload: WebhookPayload;
}): Promise<boolean> {
  const headers = new Headers({ "content-type": "application/json" });
  const customHeader = opts.headerName?.trim();
  if (customHeader) {
    headers.set(customHeader, opts.key);
  } else {
    headers.set("Authorization", `Bearer ${opts.key}`);
  }

  const res = await fetch(opts.url, {
    method: "POST",
    headers,
    body: JSON.stringify(opts.payload),
    redirect: "manual",
  });
  console.log(JSON.stringify({ msg: "webhook", status: res.status }));
  return res.status >= 200 && res.status < 300;
}
