"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { sb } from "@/lib/supabase/client";
import { useProjectContext } from "@/components/admin/ProjectProvider";
import { versioningErrorMessage } from "@/lib/utils/versioning-error";

type VersionQuestion = {
  id: string;
  category: string;
  question_text: string;
  phase: string | null;
  question_type: string;
  is_active: boolean | null;
  is_required: boolean | null;
  question_options?: Array<{ option_text: string; display_order: number }>;
};

type VersionContent = {
  schema_version: number;
  project: {
    id: string;
    title: string;
    tagline: string | null;
    description: string | null;
    subject: string | null;
    grade: string | null;
    phase: string | null;
    duration: string | null;
  };
  videos: Array<{
    id: string;
    number: number;
    title: string;
    category: string | null;
    description: string | null;
    video_url: string | null;
    thumbnail_url: string | null;
    is_active: boolean | null;
  }>;
  questions: VersionQuestion[];
};

type ProjectVersion = {
  id: string;
  project_id: string;
  version_number: number;
  status: "draft" | "published";
  content: VersionContent;
  based_on_version_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

const PHASES = [
  { id: "see", label: "SEE", description: "Mengamati kasus dan mengumpulkan fakta." },
  { id: "think", label: "THINK", description: "Menganalisis masalah dan bukti." },
  { id: "connect", label: "CONNECT", description: "Menghubungkan masalah dengan konsep yang relevan." },
  { id: "act", label: "ACT", description: "Merancang solusi dan tindakan." },
];

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
};

export default function ProjectVersionsPage() {
  const { project, projectId, refreshProjects } = useProjectContext();
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validatedVersionId, setValidatedVersionId] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const draft = useMemo(
    () => versions.find((version) => version.status === "draft") || null,
    [versions],
  );
  const published = useMemo(
    () => versions.filter((version) => version.status === "published"),
    [versions],
  );
  const activeVersion = useMemo(
    () => published.find((version) => version.id === project?.active_version_id) || null,
    [published, project?.active_version_id],
  );
  const archived = project?.is_active === false;

  const loadVersions = useCallback(async (): Promise<boolean> => {
    if (!projectId) {
      setVersions([]);
      setLoading(false);
      return true;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      const { data, error } = await sb
        .from("project_versions")
        .select("id,project_id,version_number,status,content,based_on_version_id,created_at,updated_at,published_at")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false });

      if (error) {
        setErrorMessage(versioningErrorMessage(error, "load"));
        setVersions([]);
        return false;
      }

      setVersions((data || []) as ProjectVersion[]);
      return true;
    } catch (error) {
      setErrorMessage(versioningErrorMessage(error, "load"));
      setVersions([]);
      return false;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadVersions();
    setValidation(null);
    setValidatedVersionId("");
    setMessage("");
  }, [loadVersions]);

  const saveDraft = async () => {
    if (!projectId || archived) {
      setErrorMessage("Pilih proyek aktif sebelum menyimpan draft versi.");
      return;
    }

    setBusy(true);
    setErrorMessage("");
    setMessage("");
    setValidation(null);
    setValidatedVersionId("");
    try {
      const { data, error } = await sb.rpc("admin_save_project_version_draft", {
        p_project_id: projectId,
      });
      if (error) throw error;
      if (typeof data !== "string" || !data) {
        throw new Error("Server tidak mengembalikan ID versi draft.");
      }
      const refreshed = await loadVersions();
      setShowPreview(true);
      setMessage(refreshed
        ? "Snapshot draft terbaru tersimpan. Versi aktif siswa belum berubah."
        : "Draft tersimpan, tetapi riwayat versi gagal dimuat ulang. Ikuti diagnosis error sebelum mengulangi tindakan.");
    } catch (error) {
      setErrorMessage(versioningErrorMessage(error, "save"));
    } finally {
      setBusy(false);
    }
  };

  const validateDraft = async () => {
    if (!projectId || !draft) return;
    setBusy(true);
    setErrorMessage("");
    setMessage("");
    setValidation(null);
    setValidatedVersionId("");
    try {
      // Resnapshot the current working tables before validation so the teacher
      // cannot accidentally validate an out-of-date draft snapshot.
      const { data: versionId, error: saveError } = await sb.rpc("admin_save_project_version_draft", {
        p_project_id: projectId,
      });
      if (saveError) throw saveError;
      if (typeof versionId !== "string" || !versionId) {
        throw new Error("Server tidak mengembalikan ID versi draft.");
      }

      const { data, error } = await sb.rpc("admin_validate_project_version", {
        p_project_id: projectId,
        p_version_id: versionId,
      });
      if (error) throw error;
      const result = data as ValidationResult;
      if (!result || typeof result.valid !== "boolean" || !Array.isArray(result.errors)) {
        throw new Error("Respons validasi dari server tidak sesuai format.");
      }
      const refreshed = await loadVersions();
      if (!refreshed) {
        setValidation(null);
        setValidatedVersionId("");
        return;
      }
      setShowPreview(true);
      setValidation(result);
      setValidatedVersionId(versionId);
      setMessage(result.valid
        ? "Draft terbaru berhasil disimpan dan validasi lulus. Snapshot ini siap diterbitkan."
        : "Draft terbaru berhasil disimpan, tetapi validasi menemukan masalah. Perbaiki materi kerja, simpan ulang, lalu validasi kembali.");
    } catch (error) {
      setErrorMessage(versioningErrorMessage(error, "validate"));
    } finally {
      setBusy(false);
    }
  };

  const publishDraft = async () => {
    if (!projectId || !draft || !validation?.valid || validatedVersionId !== draft.id || archived) {
      setErrorMessage("Simpan dan validasi draft terbaru sebelum menerbitkan versi.");
      return;
    }

    setBusy(true);
    setErrorMessage("");
    setMessage("");
    try {
      // Refresh the snapshot from the working tables before publication. The
      // SQL RPC only advances updated_at if its content actually changed.
      const { data: currentDraftId, error: saveError } = await sb.rpc("admin_save_project_version_draft", {
        p_project_id: projectId,
      });
      if (saveError) throw saveError;
      if (currentDraftId !== draft.id) {
        throw new Error("Draft berubah selama proses. Muat ulang, pratinjau, dan validasi ulang sebelum menerbitkan.");
      }

      const { data: latestDraft, error: readError } = await sb
        .from("project_versions")
        .select("id,updated_at")
        .eq("project_id", projectId)
        .eq("id", draft.id)
        .maybeSingle();
      if (readError) throw readError;
      if (!latestDraft) throw new Error("Snapshot draft tidak lagi tersedia.");

      if (latestDraft.updated_at !== draft.updated_at) {
        await loadVersions();
        setValidation(null);
        setValidatedVersionId("");
        setShowPreview(true);
        setMessage("Materi kerja berubah sejak validasi. Snapshot draft diperbarui; tinjau pratinjau dan validasi ulang sebelum menerbitkan.");
        return;
      }

      const label = "v" + draft.version_number + " — " + (draft.content?.project?.title || project?.title || "Proyek");
      const confirmation =
        "Terbitkan " + label + "?\n\n" +
        "Versi ini menjadi versi aktif bagi kelompok yang memulai pengerjaan baru. " +
        "Draft/submission yang sudah berjalan tetap terhubung ke versi sebelumnya. " +
        "Publikasi tidak dapat diedit.";
      if (!window.confirm(confirmation)) return;

      const { data, error } = await sb.rpc("admin_publish_project_version", {
        p_project_id: projectId,
        p_version_id: draft.id,
        p_expected_updated_at: latestDraft.updated_at,
      });
      if (error) throw error;
      if (data !== draft.id) {
        throw new Error("Server tidak mengonfirmasi versi yang diterbitkan.");
      }
      await refreshProjects();
      const refreshed = await loadVersions();
      setValidation(null);
      setValidatedVersionId("");
      setShowPreview(false);
      setMessage(refreshed
        ? label + " berhasil diterbitkan. Submission yang sudah ada tidak dipindahkan ke versi baru."
        : label + " berhasil diterbitkan, tetapi riwayat versi gagal dimuat ulang. Ikuti diagnosis error sebelum melanjutkan.");
    } catch (error) {
      const rawMessage = error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "").toLowerCase()
        : "";
      if (rawMessage.includes("project_version_validation_stale")) {
        await loadVersions();
        setValidation(null);
        setValidatedVersionId("");
        setShowPreview(true);
        setErrorMessage("Draft berubah setelah validasi. Pratinjau dan validasi ulang sebelum menerbitkan.");
      } else {
        setErrorMessage(versioningErrorMessage(error, "publish"));
      }
    } finally {
      setBusy(false);
    }
  };

  const snapshot = draft?.content;
  const activeVideos = (snapshot?.videos || []).filter((video) => video.is_active !== false);
  const activeQuestions = (snapshot?.questions || []).filter((question) => question.is_active !== false);
  const questionCounts = PHASES.map((phase) => ({
    ...phase,
    count: activeQuestions.filter((question) => question.phase === phase.id).length,
  }));

  if (!projectId) {
    return (
      <section className="glass">
        <h2>Versi proyek dan LKPD</h2>
        <p>Pilih proyek pada pemilih di bagian atas sebelum mengelola versi.</p>
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="glass">
        <div className="admin-section-head">
          <div>
            <h2>Draft, pratinjau, validasi, terbitkan</h2>
            <p>
              Materi yang diedit di menu Proyek, Video Kasus, dan Pertanyaan LKPD adalah ruang kerja. Simpan snapshot draft di sini untuk meninjau dan menerbitkannya.
            </p>
          </div>
          <span className={"admin-status-pill " + (activeVersion ? "active" : "off")}>
            {activeVersion ? "Versi aktif v" + activeVersion.version_number : "Belum ada versi aktif"}
          </span>
        </div>

        <div className="qrow" style={{ marginTop: 12 }}>
          <strong>{project?.title || "Proyek terpilih"}</strong>
          <p style={{ margin: "6px 0 0" }}>
            {activeVersion
              ? "Siswa yang memulai pengerjaan baru menggunakan snapshot v" + activeVersion.version_number + " sejak " + formatDate(activeVersion.published_at) + "."
              : "Proyek belum memiliki versi terbit. Siswa belum dapat memulai pengerjaan sampai versi pertama diterbitkan."}
          </p>
          {archived && (
            <div className="warn" role="alert" style={{ marginTop: 10 }}>
              Proyek diarsipkan. Versi historis tetap dapat ditinjau, tetapi draft baru dan publikasi dinonaktifkan.
            </div>
          )}
        </div>

        {errorMessage && <div className="warn" role="alert" style={{ marginTop: 12 }}>{errorMessage}</div>}
        {message && <div className="admin-success-message" role="status" aria-live="polite" style={{ marginTop: 12 }}>✓ {message}</div>}

        <div className="admin-form-actions" style={{ flexWrap: "wrap", marginTop: 16 }}>
          <button className="btn" type="button" onClick={() => void saveDraft()} disabled={busy || loading || archived}>
            {busy ? "Memproses…" : draft ? "Simpan snapshot draft terbaru" : "Buat snapshot draft"}
          </button>
          <button className="btn g" type="button" onClick={() => setShowPreview((current) => !current)} disabled={!draft}>
            {showPreview ? "Tutup pratinjau" : "Pratinjau draft"}
          </button>
          <button className="btn g" type="button" onClick={() => void validateDraft()} disabled={busy || loading || !draft}>
            Validasi draft
          </button>
          <button className="btn" type="button" onClick={() => void publishDraft()} disabled={busy || loading || archived || !draft || !validation?.valid || validatedVersionId !== draft.id}>
            Terbitkan versi
          </button>
          <button className="btn g" type="button" onClick={() => void loadVersions()} disabled={busy || loading}>
            Muat ulang
          </button>
        </div>

        {draft && (
          <p style={{ marginTop: 10, opacity: .8 }}>
            Draft v{draft.version_number} diperbarui {formatDate(draft.updated_at)}. Draft tidak mengubah versi aktif siswa. Jika materi kerja berubah lagi, simpan ulang snapshot dan jalankan validasi baru.
          </p>
        )}

        {validation && validatedVersionId === draft?.id && (
          <div className="qrow" role="status" style={{ marginTop: 14, borderColor: validation.valid ? "rgba(16,185,129,.5)" : "rgba(248,113,113,.55)" }}>
            <strong>{validation.valid ? "Validasi lulus" : "Draft belum dapat diterbitkan"}</strong>
            {validation.errors.length > 0 && (
              <ul>{validation.errors.map((item, index) => <li key={index + "-" + item}>{item}</li>)}</ul>
            )}
            {validation.warnings?.length > 0 && (
              <div><strong>Catatan:</strong><ul>{validation.warnings.map((item, index) => <li key={index + "-" + item}>{item}</li>)}</ul></div>
            )}
          </div>
        )}
      </section>

      {showPreview && draft && snapshot && (
        <section className="glass" aria-label="Pratinjau snapshot draft">
          <div className="admin-section-head">
            <div>
              <h2>Pratinjau v{draft.version_number}</h2>
              <p>Konten yang ditampilkan berasal dari snapshot draft yang akan diterbitkan, bukan dari perubahan selanjutnya pada editor.</p>
            </div>
            <span className="admin-status-pill off">DRAFT</span>
          </div>
          <div className="qrow">
            <h3>{snapshot.project?.title || "Proyek tanpa judul"}</h3>
            {snapshot.project?.tagline && <p>{snapshot.project.tagline}</p>}
            {snapshot.project?.description && <p>{snapshot.project.description}</p>}
            <p style={{ marginBottom: 0 }}>
              {snapshot.project?.subject || "Mata pelajaran belum diisi"}
              {snapshot.project?.grade ? " · " + snapshot.project.grade : ""}
              {snapshot.project?.duration ? " · " + snapshot.project.duration : ""}
            </p>
          </div>
          <div className="admin-metrics" style={{ marginTop: 12 }}>
            <article className="admin-metric"><div><div className="admin-metric-label">Video aktif</div><div className="admin-metric-value">{activeVideos.length}</div></div></article>
            <article className="admin-metric"><div><div className="admin-metric-label">Pertanyaan aktif</div><div className="admin-metric-value">{activeQuestions.length}</div></div></article>
          </div>
          <h3 style={{ marginTop: 18 }}>Video dalam snapshot</h3>
          {!activeVideos.length ? <div className="admin-empty">Belum ada video aktif.</div> : (
            <div className="grid">
              {activeVideos.map((video) => (
                <article key={video.id} className="qrow">
                  <strong>{"Video " + String(video.number ?? "—").padStart(2, "0") + " · " + video.title}</strong>
                  {video.category && <p>{video.category}</p>}
                  {video.description && <p>{video.description}</p>}
                </article>
              ))}
            </div>
          )}
          <h3 style={{ marginTop: 18 }}>Pertanyaan per tahap PBL</h3>
          <div className="grid">
            {questionCounts.map((phase) => (
              <article key={phase.id} className="qrow">
                <strong>{phase.label} · {phase.count} pertanyaan aktif</strong>
                <p>{phase.description}</p>
                {activeQuestions.filter((question) => question.phase === phase.id).map((question) => (
                  <div key={question.id} style={{ paddingTop: 8 }}>
                    <span>{question.is_required ? "Wajib · " : "Opsional · "}{question.category || "Tanpa kategori"}</span>
                    <div>{question.question_text}</div>
                    {question.question_options?.length ? <small>Opsi: {question.question_options.map((option) => option.option_text).join(" · ")}</small> : null}
                  </div>
                ))}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="glass">
        <div className="admin-section-head">
          <div>
            <h2>Riwayat versi diterbitkan</h2>
            <p>Versi yang sudah diterbitkan hanya bisa dibaca. Publikasi baru membuat snapshot baru dan tidak memindahkan submission lama.</p>
          </div>
        </div>
        {loading ? (
          <div className="admin-empty">Memuat riwayat versi…</div>
        ) : !published.length ? (
          <div className="admin-empty">Belum ada versi diterbitkan. Simpan, pratinjau, dan validasi draft terlebih dahulu.</div>
        ) : (
          <div className="grid">
            {published.map((version) => {
              const content = version.content;
              const videoCount = (content?.videos || []).filter((video) => video.is_active !== false).length;
              const questionCount = (content?.questions || []).filter((question) => question.is_active !== false).length;
              const isActive = project?.active_version_id === version.id;
              return (
                <article className="qrow" key={version.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <strong>{"v" + version.version_number + " · " + (content?.project?.title || project?.title || "Proyek")}</strong>
                    <span className={"admin-status-pill " + (isActive ? "active" : "off")}>
                      {isActive ? "VERSI AKTIF" : "HISTORIS"}
                    </span>
                  </div>
                  <p style={{ margin: "8px 0" }}>
                    Diterbitkan: {formatDate(version.published_at)} · {videoCount} video aktif · {questionCount} pertanyaan aktif
                  </p>
                  <small>ID versi: {version.id}</small>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
