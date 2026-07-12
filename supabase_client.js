// VeriSeed elicitation tool: Supabase connection layer
//
// Drop-in replacement for the localStorage stand-in used in elicitation_form.html /
// admin.html during the prototype phase. Requires the Supabase JS client (loaded via
// CDN in the HTML head, see the comment at the bottom of this file) and the project's
// URL + anon key filled in below once Akhil has created the Supabase project.
//
// SECURITY NOTE (PLAN section 9/7#1): the anon key is safe to embed in client-side code
// ONLY because Row Level Security is enabled with insert-only policies for the anon role
// (see tool/db/schema.sql). Do NOT use the service_role key here -- that key bypasses
// RLS entirely and must never appear in client-side/browser code.

const SUPABASE_URL = "https://ookdqnnjrgeyxgjaoyzi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable__6BDtcLwR90R4ohXFo_LXA_IdSFnPly";

const supabaseClient = (SUPABASE_URL.startsWith("REPLACE"))
? null
  : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
* Insert one expert row and return its id.
*
* ROOT-CAUSED BUG (2026-07-11): this used to do `.insert(...).select("id").single()`,
* which failed under RLS with "new row violates row-level security policy" even though
* the INSERT itself was allowed. Root cause, confirmed directly in SQL (not guessed):
* `INSERT ... RETURNING` -- which `.select()` triggers under the hood -- requires SELECT
* permission on the row being returned, not just INSERT permission. The anon role has an
* INSERT policy on `experts` but deliberately no SELECT policy (insert-only design, section 9).
* Fix: generate the id client-side with crypto.randomUUID() and pass it explicitly, so we
* never need Postgres to hand a row back -- consistent with the insert-only, no-read-back
* security model, not a workaround that weakens it.
*
* Still not idempotent across repeat visits from the same expert link (each call inserts
* a fresh row) -- that was already flagged as an open decision (dedupe at analysis time,
* vs. a service-key-backed lookup function) and remains open; not addressed by this fix.
*/
async function ensureExpert(surveyId, expertAlias) {
  if (!supabaseClient) throw new Error("Supabase not configured yet -- fill in SUPABASE_URL/ANON_KEY.");
  const id = crypto.randomUUID();
  const { error } = await supabaseClient
  .from("experts")
  .insert({ id, survey_id: surveyId, expert_alias: expertAlias });
  if (error) throw error;
  return id;
}

async function recordConsent(expertRowId, consentText) {
  if (!supabaseClient) throw new Error("Supabase not configured yet.");
  const { error } = await supabaseClient
  .from("consent_records")
  .insert({ expert_id: expertRowId, consent_text: consentText });
  if (error) throw error;
}

/**
* Submit all of one expert's answers as one batch of response rows.
* @param {string} surveyId
* @param {string} expertRowId - the experts.id returned by ensureExpert()
* @param {object} responses - the same `responses` object elicitation_form.html builds,
*   keyed by question id (e.g. {q1: {...}, q2: {...}})
*/
async function submitResponsesToSupabase(surveyId, expertRowId, responses) {
  if (!supabaseClient) throw new Error("Supabase not configured yet.");
  const rows = Object.entries(responses).map(([questionId, answer]) => ({
    survey_id: surveyId,
    expert_id: expertRowId,
    question_id: questionId,
    answer
  }));
  const { error } = await supabaseClient.from("responses").insert(rows);
  if (error) throw error;
}

// To use this in elicitation_form.html:
// 1. Add to head: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// 2. Add: <script src="supabase_client.js"></script> (after the CDN script, before the
//    form's own inline <script>)
// 3. Fill in SUPABASE_URL / SUPABASE_ANON_KEY above.
// 4. Replace submitResponses()'s localStorage.setItem(...) body with:
//      const expertRowId = await ensureExpert(surveyId, expertId);
//      await recordConsent(expertRowId, CONSENT_TEXT);   // only if consent was shown+checked
//      await submitResponsesToSupabase(surveyId, expertRowId, responses);
//    (submitResponses() will need to become `async function submitResponses()`)
// NOT YET DONE: this wiring has not been applied to elicitation_form.html itself -- do
// that once a real Supabase project exists and steps 1-3 above are filled in for real.
