export const guard = (s: string) => /^[=+\-@\t\r]/.test(s) ? "'" + s : s; // cegah formula injection di Excel
export const toCsv = (rows: string[][]) => "\ufeff" + rows.map(r => r.map(c => `"${guard(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
export const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");
export const saveBlob = (name: string, blob: Blob) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href); };
export const toXlsx = async (rows: string[][], fileName: string) => { const w = (await import("write-excel-file")).default;
  await w(rows.map((r, i) => r.map(v => ({ value: v, ...(i === 0 ? { fontWeight: "bold" as const } : {}) }))), { fileName }); };
