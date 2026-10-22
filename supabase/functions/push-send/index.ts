// Prepline push reminders. Called by pg_cron with the x-cron-secret header.
// POST {"kind":"streak"|"challenge"}  — optional "test": {endpoint,p256dh,auth} sends to one subscription only.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SITE = "https://bubabuga7-dotcom.github.io/Prepline/";

function message(kind: string, days: number) {
  if (kind === "streak") return {
    title: `Your ${days}-day streak ends tonight`,
    body: "One short practice keeps it alive — a Quick 10 takes five minutes.",
    url: SITE + "dashboard.html", tag: "streak",
  };
  return {
    title: "New challenge of the week",
    body: "Fresh questions are up. See how you compare with everyone else.",
    url: SITE + "index.html#challenge", tag: "challenge",
  };
}

Deno.serve(async (req) => {
  const { data: sec } = await db.from("app_secrets").select("name,value");
  const S: Record<string, string> = Object.fromEntries((sec || []).map((r) => [r.name, r.value]));
  if (!S.cron_secret || req.headers.get("x-cron-secret") !== S.cron_secret) return new Response("forbidden", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "challenge" ? "challenge" : "streak";
  webpush.setVapidDetails("mailto:bubabuga7@gmail.com", S.vapid_public, S.vapid_private);

  let targets: { endpoint: string; p256dh: string; auth: string; days: number }[];
  if (body.test) targets = [{ ...body.test, days: 3 }];
  else {
    const { data, error } = await db.rpc("push_targets", { p_kind: kind });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    targets = data || [];
  }

  let sent = 0, gone = 0, failed = 0;
  const errors: string[] = [];
  await Promise.all(targets.map(async (t) => {
    try {
      await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
        JSON.stringify(message(kind, t.days)), { TTL: 6 * 3600, urgency: "normal" });
      sent++;
      if (!body.test) await db.from("push_subs").update({ last_sent_at: new Date().toISOString(), fails: 0 }).eq("endpoint", t.endpoint);
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) { gone++; if (!body.test) await db.from("push_subs").delete().eq("endpoint", t.endpoint); }
      else {
        failed++; errors.push(String((e as Error).message || e).slice(0, 200));
        if (!body.test) {
          const { data: row } = await db.from("push_subs").select("fails").eq("endpoint", t.endpoint).maybeSingle();
          await db.from("push_subs").update({ fails: (row?.fails || 0) + 1 }).eq("endpoint", t.endpoint);
        }
      }
    }
  }));
  return new Response(JSON.stringify({ kind, targets: targets.length, sent, gone, failed, errors: errors.slice(0, 3) }),
    { headers: { "Content-Type": "application/json" } });
});
