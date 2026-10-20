
"use client";

import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useAdmin } from "@/lib/admin";

export default function Panel({
  tab,
}: {
  tab: "project" | "settings";
}) {
  const { P, load, loading, error: loadError } = useAdmin(["P"]);

  const [title, setTitle] = useState("CIVIC VISION");
  const [tagline, setTagline] = useState(
    "Menganalisis Pancasila dalam Kehidupan Sehari-hari"
  );
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (P.id) {
      setTitle(P.title || "");
      setTagline(P.tagline || "");
      setDescription(P.description || "");
    }
  }, [P.id, P.title, P.tagline, P.description]);

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || "");
    });
  }, []);

  const saveProject = async () => {
    if (!title.trim()) {
      setErr("Judul project wajib diisi.");
      setMessage("");
      return;
    }

    setSaving(true);
    setErr("");
    setMessage("");

    try {
      if (P.id) {
        const { data, error } = await sb
          .from("projects")
          .update({
            title: title.trim(),
            tagline: tagline.trim() || null,
            description: description.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", P.id)
          .select("id")
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          throw new Error(
            "Project tidak berubah. Periksa izin admin di database."
          );
        }

        setMessage("Perubahan project berhasil disimpan.");
      } else {
        const { error } = await sb.from("projects").insert({
          title: title.trim(),
          tagline: tagline.trim() || null,
          description: description.trim() || null,
        });

        if (error) throw error;

        setMessage("Project berhasil dibuat.");
      }

      await load();
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Gagal menyimpan project. Coba lagi."
      );
    } finally {
      setSaving(false);
    }
  };

  if (tab === "settings") {
    return (
      <section className="glass">
        <h2>Pengaturan</h2>
        <p>Masuk sebagai {email}</p>
        <button
          className="btn g"
          onClick={() => sb.auth.signOut().then(() => {
            location.href = "/admin/login";
          })}
        >
          Keluar
        </button>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="glass">
        <p>Memuat project...</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="glass">
        <h2>Project</h2>
        <div className="warn">
          Gagal memuat data project. Periksa koneksi dan izin database.
          Muat ulang halaman sebelum mencoba kembali.
        </div>
      </section>
    );
  }

  return (
    <section className="glass">
      <h2>{P.id ? "Project" : "Buat project"}</h2>
      <p>
        Isi informasi project pembelajaran, lalu klik tombol
        simpan di bawah.
      </p>

      {err && (
        <div className="warn" role="alert">
          {err}
        </div>
      )}

      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}

      <label htmlFor="project-title">Judul project</label>
      <input
        id="project-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label htmlFor="project-tagline">Tagline</label>
      <input
        id="project-tagline"
        value={tagline}
        onChange={(e) => setTagline(e.target.value)}
      />

      <label htmlFor="project-description">Deskripsi</label>
      <textarea
        id="project-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="row">
        <button
          className="btn"
          onClick={saveProject}
          disabled={saving}
        >
          {saving
            ? "Menyimpan..."
            : P.id
              ? "Simpan Perubahan"
              : "Buat Project"}
        </button>
      </div>
    </section>
  );
}
