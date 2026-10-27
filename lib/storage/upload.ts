import { sb } from "@/lib/supabase/client";
import { readPublicSupabaseConfig } from "@/lib/supabase/public-config";

export const VIDEO_OK = ["video/mp4", "video/webm", "video/quicktime"];
export const IMG_OK = ["image/jpeg", "image/png", "image/webp"];
export const MAX_VIDEO = 50 * 1024 * 1024, MAX_IMG = 2 * 1024 * 1024; // 50 MB = batas default paket gratis Supabase
export const pathOf = (url?: string | null) => url ? (url.includes("/videos/") ? decodeURIComponent(url.split("/videos/")[1]) : url) : "";

export const checkFile = (f: File, kind: "video" | "image") => {
  const ok = kind === "video" ? VIDEO_OK : IMG_OK;
  const max = kind === "video" ? MAX_VIDEO : MAX_IMG;
  if (!ok.includes(f.type)) return `Format tidak didukung. Gunakan ${ok.map(x => x.split("/")[1]).join(", ")}.`;
  if (f.size > max) return `Ukuran maksimal ${max / 1048576} MB.`;
  return "";
};

export async function uploadFile(file: File, path: string, onP: (n: number) => void) {
  const { url, anonKey } = readPublicSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  const { data, error } = await sb.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error(error?.message === "Backend configuration is unavailable."
      ? "Layanan backend belum dikonfigurasi."
      : "Sesi tidak tersedia. Silakan masuk kembali.");
  }

  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${url}/storage/v1/object/videos/${path}`);
    request.setRequestHeader("Authorization", `Bearer ${data.session.access_token}`);
    request.setRequestHeader("apikey", anonKey);
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = event => event.lengthComputable && onP(Math.round(event.loaded / event.total * 100));
    request.onload = () => request.status < 300 ? resolve(path) : reject(new Error("Upload gagal. Coba lagi."));
    request.onerror = () => reject(new Error("Koneksi terputus. Coba lagi."));
    request.send(file);
  });
}
