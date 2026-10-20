import type { SaveState } from "@/hooks/useAutosave";
const L: Record<SaveState, string> = { idle: "", saving: "Menyimpan...", saved: "✓ Tersimpan", offline: "Jawaban belum berhasil disimpan. Periksa koneksi internet kalian." };
export function SaveStatus({ st }: { st: SaveState }) { return <span role="status" aria-live="polite">{L[st]}</span>; }
