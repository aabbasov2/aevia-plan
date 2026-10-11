import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const userAEmail = process.env.ALPHA_USER_A_EMAIL;
const userAPassword = process.env.ALPHA_USER_A_PASSWORD;
const userBEmail = process.env.ALPHA_USER_B_EMAIL;
const userBPassword = process.env.ALPHA_USER_B_PASSWORD;

if (!url || !key || !userAEmail || !userAPassword || !userBEmail || !userBPassword) {
  console.error("Set Supabase project variables and credentials for both provisioned alpha users before running this check.");
  process.exit(2);
}

const makeClient = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const owner = makeClient();
const other = makeClient();
const check = (condition, description) => {
  if (!condition) throw new Error(`FAILED: ${description}`);
  console.log(`PASS: ${description}`);
};

let taskId;
try {
  const signupEmail = `aevia-signup-probe-${Date.now()}@example.invalid`;
  const signupResponse = await fetch(`${url.replace(/\/$/, "")}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email: signupEmail, password: `${randomUUID()}Aa1!` }),
  });
  const signupBody = await signupResponse.json().catch(() => ({}));
  if (signupBody?.user?.id) {
    console.error(`Remove the unintended signup probe user ${signupBody.user.id} from Supabase Auth.`);
    throw new Error("FAILED: public Auth signup is enabled; disable it before alpha testing.");
  }
  check(!signupResponse.ok, "public Auth signup is rejected");

  const [signInA, signInB] = await Promise.all([
    owner.auth.signInWithPassword({ email: userAEmail, password: userAPassword }),
    other.auth.signInWithPassword({ email: userBEmail, password: userBPassword }),
  ]);
  check(!signInA.error && !signInB.error, "both provisioned users can sign in");
  const { data: userA } = await owner.auth.getUser();
  const { data: userB } = await other.auth.getUser();
  check(Boolean(userA.user?.id && userB.user?.id && userA.user.id !== userB.user.id), "the two test accounts have distinct identities");
  const invalidLogin = await makeClient().auth.signInWithPassword({ email: userAEmail, password: `${userAPassword}-invalid` });
  check(Boolean(invalidLogin.error), "invalid credentials are rejected");

  taskId = randomUUID();
  const testTask = { user_id: userA.user.id, id: taskId, title: "Alpha RLS verification record", duration_minutes: 15, project: "personal", completed: false, recurrence: { kind: "none" }, data: { id: taskId, title: "Alpha RLS verification record", durationMinutes: 15, project: "personal", recurrence: { kind: "none" } } };
  const inserted = await owner.from("tasks").insert(testTask).select("id").single();
  check(!inserted.error && inserted.data?.id === taskId, "owner can create a private task row");
  await owner.auth.signOut();
  const restoredSession = await owner.auth.signInWithPassword({ email: userAEmail, password: userAPassword });
  check(!restoredSession.error, "a user can sign in again after ending the session");
  const persistedRead = await owner.from("tasks").select("id").eq("id", taskId).maybeSingle();
  check(!persistedRead.error && persistedRead.data?.id === taskId, "the owner’s task remains after a new sign-in");

  const readByOther = await other.from("tasks").select("id").eq("id", taskId);
  check(!readByOther.error && (readByOther.data?.length ?? 0) === 0, "another account cannot read the task");
  const updateByOther = await other.from("tasks").update({ title: "Unauthorized change" }).eq("id", taskId).select("id");
  check(!updateByOther.error && (updateByOther.data?.length ?? 0) === 0, "another account cannot modify the task");

  const foreignInsert = await other.from("tasks").insert({ ...testTask, id: randomUUID() }).select("id");
  check(Boolean(foreignInsert.error) || (foreignInsert.data?.length ?? 0) === 0, "a client cannot insert a row owned by the other account");
} finally {
  if (taskId) {
    const { data } = await owner.auth.getUser();
    if (!data.user) await owner.auth.signInWithPassword({ email: userAEmail, password: userAPassword });
    await owner.from("tasks").delete().eq("id", taskId);
  }
  await Promise.all([owner.auth.signOut(), other.auth.signOut()]);
}
