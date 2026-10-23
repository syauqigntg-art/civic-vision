import assert from "node:assert/strict";
import test from "node:test";

import {
  mediaReq,
  questionForm,
  studentContentReq,
  studentOp,
  videoForm,
} from "../lib/validation/schemas.ts";
import { catsOf, filled, opts, parse, show } from "../lib/utils/questions.ts";
import { rpcS } from "../lib/api/student.ts";
import { studentContent } from "../lib/api/student-content.ts";
import { createIdentitySaveController } from "../lib/utils/identity-save-controller.ts";
import { loadStudentCaseList } from "../lib/student/load-case-list.ts";
import { loadAnalysisSnapshot } from "../lib/student/load-analysis-snapshot.ts";


const makeQuestion = (overrides = {}) => ({
  id: "q-1",
  category: "Bukti",
  phase: "think",
  question_text: "Apa bukti yang mendukung pendapatmu?",
  question_type: "text",
  placeholder: "",
  description: "",
  is_required: true,
  is_active: true,
  min_items: 2,
  display_order: 1,
  question_options: [],
  ...overrides,
});

test("text answers reject whitespace-only values", () => {
  const question = makeQuestion();
  assert.equal(filled(question, "   "), false);
  assert.equal(filled(question, "Ada bukti"), true);
});

test("multiple_text counts only non-empty string answers", () => {
  const question = makeQuestion({ question_type: "multiple_text", min_items: 2 });
  assert.equal(filled(question, JSON.stringify(["fakta A", "  ", "fakta B"])), true);
  assert.equal(filled(question, JSON.stringify(["fakta A", "  "])), false);
  assert.equal(filled(question, JSON.stringify([null, 3, "fakta A"])), false);
});

test("malformed or wrong-shaped structured drafts do not throw", () => {
  const question = makeQuestion({ question_type: "multiple_text", min_items: 1 });
  for (const raw of ["{bad json", JSON.stringify({ answer: "x" }), JSON.stringify(null), JSON.stringify(3)]) {
    assert.deepEqual(parse(question, raw), []);
    assert.equal(filled(question, raw), false);
    assert.equal(show(question, raw), "—");
  }
});

test("multi_select requires at least one non-empty string option", () => {
  const question = makeQuestion({ question_type: "multi_select" });
  assert.equal(filled(question, JSON.stringify(["", "  "])), false);
  assert.equal(filled(question, JSON.stringify(["keadilan"])), true);
  assert.equal(filled(question, JSON.stringify({ option: "keadilan" })), false);
});

test("question options are presented in display order without mutating source data", () => {
  const question = makeQuestion({
    question_type: "single_select",
    question_options: [
      { option_text: "Pilihan C", display_order: 3 },
      { option_text: "Pilihan A", display_order: 1 },
      { option_text: "Pilihan B", display_order: 2 },
    ],
  });
  assert.deepEqual(opts(question), ["Pilihan A", "Pilihan B", "Pilihan C"]);
  assert.deepEqual(question.question_options.map((o) => o.display_order), [3, 1, 2]);
});

test("result summaries omit blank array answers and use a safe empty marker", () => {
  const question = makeQuestion({ question_type: "multiple_text" });
  assert.equal(show(question, JSON.stringify(["Fakta", "", "  ", "Dampak"])), "1. Fakta\n2. Dampak");
  assert.equal(show(question, JSON.stringify(["", "  "])), "—");
  assert.equal(show(makeQuestion(), "   "), "—");
});

test("category list is unique and follows question display order", () => {
  const questions = [
    makeQuestion({ category: "ACT", display_order: 3 }),
    makeQuestion({ category: "SEE", display_order: 1 }),
    makeQuestion({ category: "THINK", display_order: 2 }),
    makeQuestion({ category: "SEE", display_order: 4 }),
  ];
  assert.deepEqual(catsOf(questions), ["SEE", "THINK", "ACT"]);
});

test("student operation schema trims access codes and rejects malformed input", () => {
  const valid = studentOp.safeParse({ op: "get_group", args: { code: " CV-12345 " } });
  assert.equal(valid.success, true);
  if (valid.success) assert.equal(valid.data.args.code, "CV-12345");

  assert.equal(studentOp.safeParse({ op: "get_group", args: { code: "ab" } }).success, false);
  assert.equal(studentOp.safeParse({ op: "save_answer", args: {
    code: "CV-12345",
    qid: "not-a-uuid",
    val: "jawaban",
  } }).success, false);
  assert.equal(studentOp.safeParse({ op: "save_answer", args: {
    code: "CV-12345",
    qid: "b7e28bd9-3f62-4a73-ae31-bfb8e15bfbed",
    val: "x".repeat(5001),
  } }).success, false);
});

test("student content requests require a valid UUID and a supported operation", () => {
  assert.equal(studentContentReq.safeParse({
    op: "video_detail",
    args: { code: "CV-12345", vid: "b7e28bd9-3f62-4a73-ae31-bfb8e15bfbed" },
  }).success, true);
  assert.equal(studentContentReq.safeParse({
    op: "video_detail",
    args: { code: "CV-12345", vid: "../../other-project" },
  }).success, false);
  assert.equal(studentContentReq.safeParse({
    op: "delete_all",
    args: { code: "CV-12345" },
  }).success, false);
});

test("media path validation rejects traversal and accepts a normal storage path", () => {
  assert.equal(mediaReq.safeParse({ path: "videos/case-01.mp4", code: "CV-12345" }).success, true);
  assert.equal(mediaReq.safeParse({ path: "../secrets.env" }).success, false);
  assert.equal(mediaReq.safeParse({ path: "videos/../../private.mp4" }).success, false);
});

test("video form validates required title and numeric range", () => {
  assert.equal(videoForm.safeParse({ title: "  Video kasus  ", number: "3" }).success, true);
  assert.equal(videoForm.safeParse({ title: "  ", number: "3" }).success, false);
  assert.equal(videoForm.safeParse({ title: "Video kasus", number: "0" }).success, false);
  assert.equal(videoForm.safeParse({ title: "V".repeat(151), number: "3" }).success, false);
});

test("question form accepts only PBL phases and required shape", () => {
  const valid = {
    question_text: "Identifikasi masalah utama.",
    category: "Analisis",
    phase: "think",
    question_type: "textarea",
    is_required: true,
    is_active: true,
    placeholder: null,
    description: null,
    display_order: 1,
    min_items: 1,
  };
  assert.equal(questionForm.safeParse(valid).success, true);
  assert.equal(questionForm.safeParse({ ...valid, phase: "observe" }).success, false);
  assert.equal(questionForm.safeParse({ ...valid, question_text: " " }).success, false);
  assert.equal(questionForm.safeParse({ ...valid, display_order: 0 }).success, false);
});


const identityDraft = (overrides = {}) => ({
  name: "  Kelompok 2  ",
  number: "2",
  class_name: "  XII-2 ",
  leader: " Ketua ",
  members: [" Anggota A ", "", "Anggota B"],
  ...overrides,
});

const ok = (data) => ({ data, error: null });
const failed = (message = "server gagal") => ({ data: null, error: { message } });

test("identity save validates input and never calls persistence for invalid drafts", async () => {
  let calls = 0;
  const controller = createIdentitySaveController(async () => {
    calls += 1;
    return ok(true);
  });

  const missing = await controller.save(identityDraft({ name: "   " }));
  const numberOutOfRange = await controller.save(identityDraft({ number: "100" }));
  const numberNotInteger = await controller.save(identityDraft({ number: "2.5" }));
  const malformedMembers = await controller.save(identityDraft({ members: [7] }));

  assert.equal(missing.kind, "invalid");
  assert.match(missing.message, /wajib diisi/);
  assert.equal(numberOutOfRange.kind, "invalid");
  assert.equal(numberNotInteger.kind, "invalid");
  assert.equal(malformedMembers.kind, "invalid");
  assert.equal(calls, 0);
});

test("identity save trims payload and rejects a duplicate call while persistence is pending", async () => {
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const controller = createIdentitySaveController(async (payload) => {
    calls += 1;
    assert.deepEqual(payload, {
      p_name: "Kelompok 2",
      p_number: 2,
      p_class: "XII-2",
      p_leader: "Ketua",
      p_members: ["Anggota A", "", "Anggota B"],
    });
    return gate;
  });
  const pendingTransitions = [];

  const first = controller.save(identityDraft(), (pending) => pendingTransitions.push(pending));
  assert.equal(controller.isPending, true);
  const second = await controller.save(identityDraft(), (pending) => pendingTransitions.push(pending));
  assert.deepEqual(second, { kind: "busy" });
  assert.equal(calls, 1);
  assert.deepEqual(pendingTransitions, [true]);

  release({ error: null });
  assert.deepEqual(await first, { kind: "saved" });
  assert.equal(controller.isPending, false);
  assert.deepEqual(pendingTransitions, [true, false]);
});

test("identity save displays server failure, preserves input, and permits a retry", async () => {
  let attempts = 0;
  const controller = createIdentitySaveController(async () => {
    attempts += 1;
    return attempts === 1 ? failed("jawaban ditolak") : ok(true);
  });
  const draft = identityDraft();
  const before = structuredClone(draft);

  assert.deepEqual(await controller.save(draft), {
    kind: "failed",
    message: "jawaban ditolak",
  });
  assert.deepEqual(draft, before);
  assert.deepEqual(await controller.save(draft), { kind: "saved" });
  assert.equal(attempts, 2);
});

test("identity save converts thrown network errors into recoverable outcomes", async () => {
  const controller = createIdentitySaveController(async () => {
    throw new Error("simulated offline request");
  });
  const outcome = await controller.save(identityDraft());

  assert.equal(outcome.kind, "failed");
  assert.match(outcome.message, /Koneksi gagal/);
  assert.equal(controller.isPending, false);
});

test("student case list distinguishes missing code, invalid group, empty assignment, and assigned videos", async () => {
  let calls = 0;
  const never = async () => {
    calls += 1;
    return ok([]);
  };
  assert.deepEqual(await loadStudentCaseList("", never, never), { kind: "missing-code" });
  assert.equal(calls, 0);

  const invalidGroup = await loadStudentCaseList(
    "CV-12345",
    async () => ok([{ id: "v1", number: 1, title: "Kasus", category: null }]),
    async () => ok({ id: "" }),
  );
  assert.deepEqual(invalidGroup, { kind: "invalid-group" });

  const empty = await loadStudentCaseList("CV-12345", async () => ok([]), async () => ok({ id: "g1", video_ids: [] }));
  assert.deepEqual(empty, { kind: "loaded", videos: [] });

  const assigned = await loadStudentCaseList(
    "CV-12345",
    async () => ok([
      { id: "v1", number: 1, title: "Kasus 1", category: null },
      { id: "v2", number: 2, title: "Kasus 2", category: "Etika digital" },
    ]),
    async () => ok({ id: "g1", video_ids: ["v2"] }),
  );
  assert.deepEqual(assigned, {
    kind: "loaded",
    videos: [{ id: "v2", number: 2, title: "Kasus 2", category: "Etika digital" }],
  });
});

test("student case list returns a visible failure for API errors and thrown network failures", async () => {
  const rejected = await loadStudentCaseList("CV-12345", async () => failed("HTTP 503"), async () => ok({ id: "g1" }));
  assert.deepEqual(rejected, { kind: "failed", message: "HTTP 503" });

  const offline = await loadStudentCaseList("CV-12345", async () => { throw new Error("offline"); }, async () => ok({ id: "g1" }));
  assert.equal(offline.kind, "failed");
  if (offline.kind === "failed") assert.match(offline.message, /Periksa koneksi/);
});

test("analysis snapshot overlays pending answers onto drafts and requests one flush", async () => {
  const snapshot = await loadAnalysisSnapshot({
    code: "CV-12345",
    videoId: "video-1",
    pending: { q1: "new local answer", q3: "pending answer" },
    fetchQuestions: async () => ok([{ id: "q1", question_text: "Bukti?" }]),
    getAnswers: async () => ok({ q1: "older server answer", q2: "server answer" }),
    getGroup: async () => ok({ id: "g1", submission: { status: "draft" } }),
  });

  assert.equal(snapshot.kind, "ready");
  if (snapshot.kind !== "ready") return;
  assert.deepEqual(snapshot.answers, {
    q1: "new local answer",
    q2: "server answer",
    q3: "pending answer",
  });
  assert.equal(snapshot.isSubmitted, false);
  assert.equal(snapshot.shouldFlushPending, true);
});

test("analysis snapshot treats submitted server answers as authoritative", async () => {
  const snapshot = await loadAnalysisSnapshot({
    code: "CV-12345",
    videoId: "video-1",
    pending: { q1: "stale local value" },
    fetchQuestions: async () => ok([{ id: "q1" }]),
    getAnswers: async () => ok({ q1: "final submitted value" }),
    getGroup: async () => ok({ id: "g1", submission: { status: "submitted" } }),
  });

  assert.equal(snapshot.kind, "ready");
  if (snapshot.kind !== "ready") return;
  assert.deepEqual(snapshot.answers, { q1: "final submitted value" });
  assert.equal(snapshot.isSubmitted, true);
  assert.equal(snapshot.shouldFlushPending, false);
});

test("analysis snapshot distinguishes missing code, missing group, API errors, and thrown network errors", async () => {
  let calls = 0;
  const noOp = async () => { calls += 1; return ok([]); };
  const input = {
    code: "CV-12345",
    videoId: "video-1",
    pending: {},
    fetchQuestions: noOp,
    getAnswers: noOp,
    getGroup: noOp,
  };

  assert.deepEqual(await loadAnalysisSnapshot({ ...input, code: null }), { kind: "missing-code" });
  assert.equal(calls, 0);

  assert.deepEqual(await loadAnalysisSnapshot({
    ...input,
    getGroup: async () => ok(null),
  }), { kind: "missing-group" });

  const serverError = await loadAnalysisSnapshot({
    ...input,
    fetchQuestions: async () => failed("questions unavailable"),
  });
  assert.deepEqual(serverError, { kind: "failed", message: "questions unavailable" });

  const offline = await loadAnalysisSnapshot({
    ...input,
    getAnswers: async () => { throw new Error("offline"); },
  });
  assert.equal(offline.kind, "failed");
  if (offline.kind === "failed") assert.match(offline.message, /Periksa koneksi/);
});

async function withMockFetch(mockFetch, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("student RPC client posts the requested operation and normalizes a success response", async () => {
  await withMockFetch(async (url, init) => {
    assert.equal(url, "/api/student");
    assert.equal(init.method, "POST");
    assert.equal(init.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(init.body), { op: "get_group", args: { code: "CV-12345" } });
    return new Response(JSON.stringify({ data: { id: "g1" } }), { status: 200 });
  }, async () => {
    assert.deepEqual(await rpcS("get_group", { code: "CV-12345" }), {
      data: { id: "g1" },
      error: null,
    });
  });
});

test("student RPC client and content client normalize HTTP and network errors without throwing", async () => {
  await withMockFetch(async () => new Response(JSON.stringify({ error: "HTTP 503" }), { status: 503 }), async () => {
    assert.deepEqual(await rpcS("save_identity", { code: "CV-12345" }), {
      data: null,
      error: { message: "HTTP 503" },
    });
    assert.deepEqual(await studentContent("list_videos", { code: "CV-12345" }), {
      data: null,
      error: { message: "HTTP 503" },
    });
  });

  await withMockFetch(async () => { throw new Error("offline"); }, async () => {
    const rpcError = await rpcS("get_answers", { code: "CV-12345" });
    const contentError = await studentContent("list_videos", { code: "CV-12345" });
    assert.equal(rpcError.data, null);
    assert.match(rpcError.error.message, /Periksa koneksi/);
    assert.equal(contentError.data, null);
    assert.match(contentError.error.message, /Periksa koneksi/);
  });
});
