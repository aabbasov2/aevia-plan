import assert from "node:assert/strict";
import test from "node:test";
import {
  completeFocusSession,
  endFocusSession,
  focusedMilliseconds,
  pauseFocusSession,
  remainingMilliseconds,
  resumeFocusSession,
  type FocusSession,
} from "./focus-time.ts";

function session(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: "focus-test",
    kind: "focus",
    durationMinutes: 15,
    startedAt: 1_000,
    status: "running",
    targetEndAt: 901_000,
    lastResumedAt: 1_000,
    remainingMs: null,
    focusedMs: 0,
    ...overrides,
  };
}

test("remaining time is derived from the saved target end, not tick count", () => {
  const saved = session();
  assert.equal(remainingMilliseconds(saved, 121_000), 780_000);
  assert.equal(remainingMilliseconds({ ...saved }, 901_000), 0);
});

test("pause freezes remaining time and resume starts a new timestamp window", () => {
  const paused = pauseFocusSession(session(), 301_000);
  assert.equal(paused.status, "paused");
  assert.equal(paused.remainingMs, 600_000);
  assert.equal(paused.focusedMs, 300_000);
  const resumed = resumeFocusSession(paused, 50_000_000);
  assert.equal(resumed.targetEndAt, 50_600_000);
  assert.equal(remainingMilliseconds(resumed, 50_100_000), 500_000);
  assert.equal(focusedMilliseconds(resumed, 50_100_000), 400_000);
});

test("completion is idempotent and records only the planned focus duration", () => {
  const done = completeFocusSession(session(), 950_000);
  assert.equal(done.status, "completed");
  assert.equal(done.focusedMs, 900_000);
  assert.equal(done.endedAt, 901_000);
  assert.equal(completeFocusSession(done, 1_000_000), done);
});

test("ending early records actual focus and excludes paused time", () => {
  const paused = pauseFocusSession(session(), 121_000);
  const ended = endFocusSession(paused, 10_000_000);
  assert.equal(ended.status, "ended");
  assert.equal(ended.focusedMs, 120_000);
  assert.equal(ended.endedAt, 10_000_000);
});

test("break sessions never add to focused work", () => {
  const activeBreak = session({ id: "break-test", kind: "break", durationMinutes: 5, targetEndAt: 301_000 });
  assert.equal(focusedMilliseconds(activeBreak, 200_000), 0);
  assert.equal(completeFocusSession(activeBreak, 301_000).focusedMs, 0);
});
