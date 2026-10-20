import { z } from "zod";
export const code = z.string().trim().min(6).max(24).regex(/^[A-Za-z0-9-]+$/);
const uuid = z.string().uuid();
export const studentOp = z.discriminatedUnion("op", [
  z.object({ op: z.literal("get_group"), args: z.object({ code }) }),
  z.object({ op: z.literal("save_identity"), args: z.object({ code, p_name: z.string().trim().min(1).max(80), p_number: z.number().int().min(1).max(99), p_class: z.string().trim().min(1).max(20), p_leader: z.string().trim().min(1).max(80), p_members: z.array(z.string().trim().max(80)).max(10) }) }),
  z.object({ op: z.literal("begin_submission"), args: z.object({ code, vid: uuid }) }),
  z.object({ op: z.literal("get_answers"), args: z.object({ code }) }),
  z.object({ op: z.literal("save_answer"), args: z.object({ code, qid: uuid, val: z.string().max(5000) }) }),
  z.object({ op: z.literal("submit_group"), args: z.object({ code }) })]);
export const mediaReq = z.object({ path: z.string().min(1).max(300).regex(/^[\w\-./]+$/).refine(p => !p.includes(".."), "path"), code: code.optional() });
export const videoForm = z.object({ title: z.string().trim().min(1, "Judul video wajib diisi.").max(150, "Judul maksimal 150 karakter."), category: z.string().max(100).optional(), description: z.string().max(1000, "Deskripsi maksimal 1000 karakter.").optional(), number: z.coerce.number().int().min(1, "Nomor minimal 1.").max(99) });
export const questionForm = z.object({ question_text: z.string().trim().min(1, "Pertanyaan wajib diisi.").max(500, "Pertanyaan maksimal 500 karakter."), category: z.string().trim().min(1, "Kategori wajib diisi.").max(60),
  phase: z.enum(["see", "think", "connect", "act"]).nullable(), question_type: z.enum(["text", "textarea", "multiple_text", "single_select", "multi_select", "scale"]), is_required: z.boolean(), is_active: z.boolean(), placeholder: z.string().max(200).nullable(), description: z.string().max(300).nullable(),
  display_order: z.number().int().min(1, "Urutan minimal 1.").max(999), min_items: z.number().int().min(1).max(10) });
