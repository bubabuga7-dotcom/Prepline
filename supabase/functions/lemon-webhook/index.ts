// Prepline: Lemon Squeezy → Supabase. Turns a paid subscription into Premium (table public.premium, stage9.sql).
//
// Deploy: Supabase → Edge Functions → "Deploy a new function" → name it lemon-webhook → paste this file → Deploy.
// In the function's settings turn OFF "Verify JWT" (Lemon Squeezy does not send one; the signature below protects it).
// Secret: Supabase → Edge Functions → Secrets → LEMON_SIGNING_SECRET = the signing secret of your Lemon Squeezy webhook.
// Webhook in Lemon Squeezy: Settings → Webhooks → URL https://<project>.supabase.co/functions/v1/lemon-webhook,
// events: subscription_created, subscription_updated, subscription_cancelled, subscription_resumed,
//         subscription_expired, subscription_payment_success.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = Deno.env.get("LEMON_SIGNING_SECRET") ?? "";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

async function validSignature(body: string, signature: string | null): Promise<boolean> {
  if (!SECRET || !signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  const hex = Array.from(mac).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

async function userIdByEmail(email: string): Promise<string | null> {
  const want = email.trim().toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) return null;
    const u = data.users.find((x) => (x.email ?? "").toLowerCase() === want);
    if (u) return u.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const body = await req.text();
  if (!(await validSignature(body, req.headers.get("x-signature")))) return new Response("bad signature", { status: 401 });

  const ev = JSON.parse(body);
  const name: string = ev?.meta?.event_name ?? "";
  const a = ev?.data?.attributes ?? {};
  const subId = String(ev?.data?.type === "subscriptions" ? ev.data.id : a.subscription_id ?? "");

  // which Prepline account: user_id passed at checkout (premium.html), otherwise the buyer's e-mail
  let userId: string | null = ev?.meta?.custom_data?.user_id ?? null;
  if (!userId && a.user_email) userId = await userIdByEmail(a.user_email);
  if (!userId && subId) {
    const { data } = await db.from("premium").select("user_id").eq("ls_subscription", subId).maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) return new Response("no matching Prepline account", { status: 200 });

  let until: Date;
  let status: string = a.status ?? "";
  if (name === "subscription_payment_success") {
    // a renewal was paid: one more month from today or from the current end, whichever is later
    const { data } = await db.from("premium").select("until").eq("user_id", userId).maybeSingle();
    const from = Math.max(Date.now(), data?.until ? Date.parse(data.until) : 0);
    until = new Date(from + 31 * 864e5);
    status = "active";
  } else if (name === "subscription_expired" || status === "expired" || status === "unpaid") {
    until = new Date();
  } else {
    // created / updated / cancelled / resumed: Premium lasts until the paid period ends (+1 day grace)
    const end = a.ends_at ?? a.renews_at;
    until = new Date((end ? Date.parse(end) : Date.now() + 31 * 864e5) + 864e5);
  }

  const { error } = await db.from("premium").upsert({
    user_id: userId, until: until.toISOString(), source: "lemon",
    ls_subscription: subId || null, status, updated_at: new Date().toISOString(),
  });
  if (error) return new Response("db error: " + error.message, { status: 500 });
  return new Response("ok");
});
