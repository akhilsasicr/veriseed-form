// Shared Supabase Auth client for the logged-in facilitator dashboard pages
// (create_survey.html, admin.html). Replaces the old shared-facilitator-key +
// admin-api Edge Function pattern for these two pages: with real per-user login,
// Postgres RLS (see tool/db/schema.sql section 24) enforces that each account only
// ever sees its own surveys, so there's no shared secret to hand out anymore.
// The admin-api Edge Function is still used for send_due_reminders (the cron job) --
// that's a system action, never a browser one, so it keeps using the service_role key.

const SUPABASE_URL = "https://ookdqnnjrgeyxgjaoyzi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable__6BDtcLwR90R4ohXFo_LXA_IdSFnPly";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Call at the top of any page that requires a logged-in user. Redirects to login.html
// if there's no session, otherwise resolves with the session's user.
async function requireAuth() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    location.href = "login.html";
    return null;
  }
  return data.session.user;
}

async function signOut() {
  await supabaseClient.auth.signOut();
  location.href = "login.html";
}
