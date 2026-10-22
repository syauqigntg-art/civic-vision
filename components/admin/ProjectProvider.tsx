"use client";

import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { sb } from "@/lib/supabase/client";

export type AdminProject = {
  id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  subject?: string | null;
  grade?: string | null;
  phase?: string | null;
  duration?: string | null;
  is_active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProjectContextValue = {
  projects: AdminProject[];
  project: AdminProject | null;
  projectId: string;
  loading: boolean;
  error: string;
  selectProject: (id: string) => void;
  refreshProjects: () => Promise<boolean>;
};

const STORAGE_KEY = "cv_admin_project_id";
const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshProjects = useCallback(async () => {
    setError("");
    const { data, error: queryError } = await sb
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });

    if (queryError) {
      setError("Daftar proyek tidak dapat dimuat. Periksa koneksi dan izin admin.");
      setLoading(false);
      return false;
    }

    const rows = (data || []) as AdminProject[];
    setProjects(rows);
    const stored = typeof window !== "undefined"
      ? window.sessionStorage.getItem(STORAGE_KEY) || ""
      : "";

    setProjectId((current) => {
      const candidate = current || stored;
      if (candidate && rows.some((project) => project.id === candidate)) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(STORAGE_KEY, candidate);
        }
        return candidate;
      }
      if (typeof window !== "undefined") window.sessionStorage.removeItem(STORAGE_KEY);
      return "";
    });
    setLoading(false);
    return true;
  }, []);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const selectProject = useCallback(
    (id: string) => {
      if (!id) {
        setProjectId("");
        if (typeof window !== "undefined") window.sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      // IDs normally come from the selector or a just-created project.
      // Allow selecting immediately after refreshProjects(), before React has
      // committed the refreshed list state.
      setProjectId(id);
      setError("");
      if (typeof window !== "undefined") window.sessionStorage.setItem(STORAGE_KEY, id);
    },
    [projects],
  );

  const project = useMemo(
    () => projects.find((item) => item.id === projectId) || null,
    [projects, projectId],
  );

  const value = useMemo(
    () => ({ projects, project, projectId, loading, error, selectProject, refreshProjects }),
    [projects, project, projectId, loading, error, selectProject, refreshProjects],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProjectContext harus digunakan di dalam ProjectProvider.");
  return context;
}

export function ProjectSwitcher() {
  const { projects, project, projectId, loading, error, selectProject } = useProjectContext();

  return (
    <div style={{ minWidth: 220, maxWidth: 340, flex: "1 1 240px" }}>
      <label htmlFor="admin-project-switcher" style={{ margin: "0 0 5px", fontSize: 11, color: "#b7c8e4" }}>
        PROYEK TERPILIH
      </label>
      <select
        id="admin-project-switcher"
        aria-label="Pilih proyek yang dikelola"
        value={projectId}
        onChange={(event) => selectProject(event.target.value)}
        disabled={loading || projects.length === 0}
        style={{ width: "100%", minHeight: 42, fontSize: 13 }}
      >
        <option value="">— Pilih proyek —</option>
        {projects.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title || "Proyek tanpa judul"}{item.is_active === false ? " · DIARSIPKAN" : " · AKTIF"}
          </option>
        ))}
      </select>
      {error && <small role="alert" style={{ display: "block", color: "#fecaca", marginTop: 4 }}>{error}</small>}
      {!loading && projects.length === 0 && !error && (
        <small style={{ display: "block", color: "#e2e8f0", marginTop: 4 }}>Belum ada proyek. Buat proyek dari menu Project.</small>
      )}
      {project && (
        <small style={{ display: "block", color: project.is_active === false ? "#fde68a" : "#bbf7d0", marginTop: 4 }}>
          {project.is_active === false ? "Arsip: data tetap tersedia dan hanya dapat ditinjau." : "Data admin dibatasi ke proyek ini."}
        </small>
      )}
    </div>
  );
}

export function ProjectPageScope({ children, path }: { children: React.ReactNode; path: string }) {
  const { project, projectId, loading, error } = useProjectContext();

  if (path === "/admin/project" || path === "/admin/settings") return <>{children}</>;
  if (loading) return <section className="glass"><p>Memuat daftar proyek…</p></section>;
  if (error) return <section className="glass"><div className="warn" role="alert">{error}</div><p>Periksa koneksi Supabase, lalu muat ulang halaman.</p></section>;
  if (!projectId || !project) {
    return (
      <section className="glass">
        <h2>Pilih proyek terlebih dahulu</h2>
        <p>Halaman video, pertanyaan, kelompok, dashboard, dan hasil siswa selalu dibatasi ke satu proyek terpilih. Tidak ada proyek yang dipilih otomatis.</p>
        <p>Pilih proyek melalui pemilih <strong>Proyek Aktif</strong> di bagian atas, atau buka menu Project untuk membuat proyek baru.</p>
      </section>
    );
  }

  if (project.is_active === false) {
    return (
      <>
        <section className="warn" role="status">
          Proyek ini diarsipkan. Data dan hasil siswa tetap dipertahankan dan masih dapat ditinjau. Perubahan konten/kelompok serta pengerjaan siswa dinonaktifkan; aktifkan kembali proyek dari menu Project untuk melanjutkan.
        </section>
        <Fragment key={projectId}>{children}</Fragment>
      </>
    );
  }

  return <Fragment key={projectId}>{children}</Fragment>;
}
