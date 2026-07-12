// Shared client for the admin-api Edge Function (used by admin.html and create_survey.html).
//
// WHY THIS EXISTS: Supabase now unconditionally rejects any request using a secret/
// service-role key that originates from a browser (matched by User-Agent), confirmed
// 2026-07-11 -- this is a hard platform block, not a bug in this project's code, and it
// applies regardless of whether the key is used via supabase-js or a raw fetch call.
// admin.html and create_survey.html previously asked for the service-role key directly in
// the browser, which is exactly what this now blocks. Fixed by moving all service-role-key
// usage into the "admin-api" Supabase Edge Function (server-side, never a browser request),
// and having these pages call that function instead, authenticated with a much
// lower-sensitivity "facilitator key" (a passphrase set as the Edge Function's
// FACILITATOR_KEY secret) rather than the real service_role key.

const ADMIN_API_URL = "https://ookdqnnjrgeyxgjaoyzi.supabase.co/functions/v1/admin-api";
const ADMIN_API_PUBLISHABLE_KEY = "sb_publishable__6BDtcLwR90R4ohXFo_LXA_IdSFnPly";

async function callAdminApi(action, payload, facilitatorKey) {
  const res = await fetch(ADMIN_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ADMIN_API_PUBLISHABLE_KEY}`,
      "apikey": ADMIN_API_PUBLISHABLE_KEY,
      "x-facilitator-key": facilitatorKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
