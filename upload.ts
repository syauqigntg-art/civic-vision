import { sb } from "@/lib/supabase/client";
export const VIDEO_OK = ["video/mp4", "video/webm", "video/quicktime"], IMG_OK = ["image/jpeg", "image/png", "image/webp"];
export const MAX_VIDEO = 50 * 1024 * 1024, MAX_IMG = 2 * 1024 * 1024; // 50 MB = batas default paket gratis Supabase
export const pathOf = (url?: string | null) => url ? (url.includes("/videos/") ? decodeURIComponent(url.split("/videos/")[1]) : url) : "";
export const checkFile = (f: File, kind: "video" | "image") => { const ok = kind === "video" ? VIDEO_OK : IMG_OK, max = kind === "video" ? MAX_VIDEO : MAX_IMG;
  if (!ok.includes(f.type)) return `Format tidak didukung. Gunakan ${ok.map(x => x.split("/")[1]).join(", ")}.`; if (f.size > max) return `Ukuran maksimal ${max / 1048576} MB.`; return ""; };
export async function uploadFile(file: File, path: string, onP: (n: number) => void) {
  const { data } = await sb.auth.getSession();
  return new Promise<string>((res, rej) => { const x = new XMLHttpRequest(); x.open("POST", `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/videos/${path}`);
    x.setRequestHeader("Authorization", `Bearer ${data.session?.access_token}`); x.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); x.setRequestHeader("Content-Type", file.type); x.setRequestHeader("x-upsert", "false");
    x.upload.onprogress = e => e.lengthComputable && onP(Math.round(e.loaded / e.total * 100));
    x.onload = () => x.status < 300 ? res(path) : rej(new Error("Upload gagal. Coba lagi.")); x.onerror = () => rej(new Error("Koneksi terputus. Coba lagi.")); x.send(file); });
}
