export type Phase = "see" | "think" | "connect" | "act";
export type Q = { id: string; category: string; phase?: Phase | null; question_text: string; description?: string | null; question_type: string; placeholder?: string | null; is_required: boolean; is_active?: boolean; min_items: number; display_order: number; question_options: { option_text: string; display_order: number }[] };
