import test from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-session-secret";

const {
  createGroupSession,
  readGroupSession,
  GROUP_SESSION_COOKIE,
} = await import("../lib/auth/group-session.ts");

function requestWithCookie(token) {
  return new Request("https://civic-vision.test/api/student", {
    headers: { cookie: `${GROUP_SESSION_COOKIE}=${token}` },
  });
}

test("group session signs and verifies the normalized group code", () => {
  const token = createGroupSession(" cv-abcd1234 ");
  assert.equal(readGroupSession(requestWithCookie(token)), "CV-ABCD1234");
});

test("group session rejects a tampered token", () => {
  const token = createGroupSession("CV-ABCD1234");
  const tampered = token.replace(/.$/, token.endsWith("a") ? "b" : "a");
  assert.equal(readGroupSession(requestWithCookie(tampered)), null);
});

test("group session rejects missing and malformed cookies", () => {
  assert.equal(readGroupSession(new Request("https://civic-vision.test")), null);
  assert.equal(readGroupSession(requestWithCookie("not-a-token")), null);
});
