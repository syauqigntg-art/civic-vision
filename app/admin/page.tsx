"use client";

import Link from "next/link";
import { useAdmin, groupPct } from "@/lib/admin";

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function Overview() {
  const { gs, vs, qs, subs, ans, loading, error } = useAdmin([
    "gs",
    "vs",
    "qs",
    "subs",
    "ans",
  ]);

  const submitted = subs.filter((item: any) => item.status === "submitted");
  const drafts = subs.filter((item: any) => item.status === "draft");
  const activeVideos = vs.filter((item: any) => item.is_active !== false);
  const activeQuestions = qs.filter((item: any) => item.is_active !== false);

  const cards = [
    {
      label: "Kelompok terdaftar",
      value: gs.length,
      note: "Kelompok dalam project",
      icon: "◎",
      tone: "",
    },
    {
      label: "Video aktif",
      value: activeVideos.length,
      note: "Materi kasus tersedia",
      icon: "▷",
      tone: "teal",
    },
    {
      label: "Pertanyaan aktif",
      value: activeQuestions.length,
      note: "Instrumen LKPD",
      icon: "?",
      tone: "purple",
    },
    {
      label: "Sudah dikirim",
      value: submitted.length,
      note: `${drafts.length} draf tersimpan`,
      icon: "✓",
      tone: "orange",
    },
  ];

  const recent = [...subs]
    .sort((a: any, b: any) => {
      const ta = new Date(a.submitted_at || a.updated_at || a.started_at || 0).getTime();
      const tb = new Date(b.submitted_at || b.updated_at || b.started_at || 0).getTime();
      return tb - ta;
    })
    .slice(0, 6);

  return (
    <>
      {error && (
        <div className="admin-inline-error" role="alert">
          Data dashboard belum berhasil dimuat. Muat ulang halaman atau periksa koneksi Supabase.
        </div>
      )}

      <div className="admin-metrics">
        {cards.map((card) => (
          <article className="admin-metric" key={card.label}>
            <span className={"admin-metric-icon " + card.tone} aria-hidden="true">
              {card.icon}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="admin-metric-label">{card.label}</div>
              <div className="admin-metric-value">{loading ? "—" : card.value}</div>
              <div className="admin-metric-note">{card.note}</div>
            </div>
          </article>
        ))}
      </div>

      <section>
        <div className="admin-section-head">
          <div>
            <h2>Mulai dari sini</h2>
            <p>Pintasan ke tugas pengelolaan yang paling sering digunakan.</p>
          </div>
        </div>
        <div className="admin-quick-grid">
          <Link href="/admin/videos" className="admin-quick-card">
            <span aria-hidden="true">＋</span>
            <strong>Tambah video kasus</strong>
            <small>Unggah materi, atur kategori, dan kelola video yang tersedia.</small>
          </Link>
          <Link href="/admin/questions" className="admin-quick-card">
            <span aria-hidden="true">✎</span>
            <strong>Susun pertanyaan LKPD</strong>
            <small>Atur pertanyaan per tahap SEE, THINK, CONNECT, dan ACT.</small>
          </Link>
          <Link href="/admin/groups" className="admin-quick-card">
            <span aria-hidden="true">◎</span>
            <strong>Atur kelompok</strong>
            <small>Kelola kode akses dan penugasan video kelompok.</small>
          </Link>
          <Link href="/admin/submissions" className="admin-quick-card">
            <span aria-hidden="true">↗</span>
            <strong>Tinjau jawaban siswa</strong>
            <small>Buka hasil analisis, pantau status, dan ekspor data.</small>
          </Link>
        </div>
      </section>

      <div className="admin-dashboard-columns">
        <section className="glass">
          <div className="admin-section-head">
            <div>
              <h2>Progress kelompok</h2>
              <p>Ringkasan kelengkapan jawaban wajib berdasarkan data yang tersimpan.</p>
            </div>
            <Link href="/admin/groups" className="admin-outline-action">Kelola kelompok ↗</Link>
          </div>

          {loading ? (
            <div className="admin-empty">Memuat progress kelompok…</div>
          ) : !gs.length ? (
            <div className="admin-empty">
              Belum ada kelompok. Buat kelompok pertama untuk mulai mengatur penugasan.
              <div style={{ marginTop: 12 }}>
                <Link href="/admin/groups" className="btn">Buat kelompok</Link>
              </div>
            </div>
          ) : (
            gs.slice(0, 8).map((group: any) => {
              const pct = groupPct(group, subs, qs, ans);
              const submission = subs.find((item: any) => item.group_id === group.id);
              const status = submission?.status === "submitted"
                ? "Sudah dikirim"
                : submission?.status === "draft"
                  ? "Draf"
                  : "Belum mulai";
              const statusClass = submission?.status === "submitted"
                ? "done"
                : submission?.status === "draft"
                  ? "draft"
                  : "off";

              return (
                <div className="admin-progress-row" key={group.id}>
                  <div className="admin-progress-label">
                    <span>
                      <strong>Kelompok {String(group.group_number ?? "—").padStart(2, "0")}</strong>
                      {group.group_name ? ` · ${group.group_name}` : ""}
                    </span>
                    <span className={"admin-status-pill " + statusClass}>{status}</span>
                  </div>
                  <div className="bar" role="progressbar" aria-label={`Progress Kelompok ${group.group_number ?? ""}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                    <i style={{ width: `${pct}%` }} />
                  </div>
                  <div className="admin-progress-label" style={{ fontSize: 10, paddingBottom: 6 }}>
                    <span>{group.class_name || "Kelas belum diisi"}</span>
                    <strong>{pct}%</strong>
                  </div>
                </div>
              );
            })
          )}
          {gs.length > 8 && (
            <div className="row">
              <Link href="/admin/groups" className="admin-outline-action">
                Lihat semua {gs.length} kelompok ↗
              </Link>
            </div>
          )}
        </section>

        <section className="glass">
          <div className="admin-section-head">
            <div>
              <h2>Aktivitas jawaban</h2>
              <p>Status pengumpulan hasil analisis.</p>
            </div>
            <Link href="/admin/submissions" className="admin-outline-action">Buka jawaban ↗</Link>
          </div>

          <div className="admin-status-summary">
            <div className="admin-summary-row">
              <span><i className="admin-summary-mark blue" /> Sudah dikirim</span>
              <strong>{submitted.length}</strong>
            </div>
            <div className="admin-summary-row">
              <span><i className="admin-summary-mark orange" /> Draf</span>
              <strong>{drafts.length}</strong>
            </div>
            <div className="admin-summary-row">
              <span><i className="admin-summary-mark grey" /> Belum mulai</span>
              <strong>{Math.max(0, gs.length - subs.length)}</strong>
            </div>
          </div>

          <div className="admin-callout">
            <strong>Butuh tindak lanjut?</strong>
            <p>Gunakan filter status di halaman Jawaban Siswa untuk menemukan draft dan hasil yang sudah dikirim.</p>
            <Link href="/admin/submissions" className="btn">Periksa jawaban siswa →</Link>
          </div>
        </section>
      </div>

      <section className="glass" style={{ marginTop: 16 }}>
        <div className="admin-section-head">
          <div>
            <h2>Aktivitas terbaru</h2>
            <p>Pengumpulan terakhir yang tercatat di proyek.</p>
          </div>
          <Link href="/admin/submissions" className="admin-outline-action">Semua pengumpulan ↗</Link>
        </div>

        {loading ? (
          <div className="admin-empty">Memuat aktivitas…</div>
        ) : !recent.length ? (
          <div className="admin-empty">Belum ada aktivitas pengumpulan. Aktivitas akan tampil setelah kelompok memulai pengerjaan.</div>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kelompok</th>
                  <th>Kelas</th>
                  <th>Status</th>
                  <th>Terakhir diperbarui</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recent.map((item: any) => {
                  const group = gs.find((g: any) => g.id === item.group_id);
                  const submittedState = item.status === "submitted";
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>Kelompok {String(group?.group_number ?? "—").padStart(2, "0")}</strong>
                        {group?.group_name && <div style={{ color: "#8a97aa", fontSize: 11 }}>{group.group_name}</div>}
                      </td>
                      <td>{group?.class_name || "—"}</td>
                      <td>
                        <span className={"admin-status-pill " + (submittedState ? "done" : "draft")}>
                          {submittedState ? "Sudah dikirim" : "Draf"}
                        </span>
                      </td>
                      <td>{fmtDate(item.submitted_at || item.updated_at || item.started_at)}</td>
                      <td>
                        <Link href="/admin/submissions" className="admin-outline-action">Buka ↗</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
