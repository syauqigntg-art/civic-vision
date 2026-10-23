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
