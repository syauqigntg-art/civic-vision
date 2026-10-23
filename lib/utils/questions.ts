import type { Q } from "@/types";

export const opts = (q: Q) =>
  [...(q.question_options || [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map((option) => option.option_text);

/**
 * Parse stored answers defensively. Drafts can outlive schema/UI revisions,
 * so malformed JSON or a JSON value of the wrong shape must not crash the
 * student form while calculating required-answer progress.
 */
export const parse = (q: Q, raw?: string | null): any => {
  const isArrayAnswer =
    q.question_type === "multiple_text" || q.question_type === "multi_select";

  if (raw == null) return isArrayAnswer ? [] : "";
  if (!isArrayAnswer) return raw;

  try {
    const decoded: unknown = JSON.parse(raw);
    if (!Array.isArray(decoded)) return [];
    return decoded.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
};

export const filled = (q: Q, raw?: string | null) => {
  const value = parse(q, raw);

  if (q.question_type === "multiple_text") {
    if (!Array.isArray(value)) return false;
    const minItems = Number.isInteger(q.min_items)
      ? Math.max(1, q.min_items)
      : 1;
    return value.filter((item) => typeof item === "string" && item.trim()).length >= minItems;
  }

  if (q.question_type === "multi_select") {
    return Array.isArray(value) &&
      value.some((item) => typeof item === "string" && item.trim().length > 0);
  }

  return typeof value === "string" ? value.trim() !== "" : String(value).trim() !== "";
};

export const show = (q: Q, raw?: string | null) => {
  const value = parse(q, raw);
  if (Array.isArray(value)) {
    const rows = value.filter(
      (item) => typeof item === "string" && item.trim().length > 0,
    );
    return rows.map((item, index) => `${index + 1}. ${item}`).join("\n") || "—";
  }
  return String(value).trim() || "—";
};

export const catsOf = (qs: Q[]) =>
  [...new Set([...qs].sort((a, b) => a.display_order - b.display_order).map((q) => q.category))];
