
import { getCode } from "@/lib/utils/code";

const cache = new Map<string, { u: string; e: number }>();

export async function signedUrl(path: string) {
  const code = getCode();

  // URL cache dipisahkan berdasarkan kode kelompok dan lokasi file.
  const cacheKey = `${code || "teacher-session"}::${path}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.e > Date.now()) {
    return cached.u;
  }

  const response = await fetch("/api/media", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path,
      code: code || undefined,
    }),
  });

  if (!response.ok) {
    throw new Error("media");
  }

  const { url } = await response.json();

  cache.set(cacheKey, {
    u: url,
    e: Date.now() + 50 * 60 * 1000,
  });

  return url as string;
}
