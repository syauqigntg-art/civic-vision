
"use client";

import "@/app/lkpd/identitas/identitas.css";
import { rpcS } from "@/lib/api/student";
import { useEffect, useRef, useState } from "react";
import { createIdentitySaveController } from "@/lib/utils/identity-save-controller";
import { useRouter } from "next/navigation";
import { getCode, setCode } from "@/lib/supabase";

type Project = {
  title: string;
  tagline: string | null;
  description: string | null;
};

export default function Identitas() {
  const r = useRouter();

  const [code, setC] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const identitySaveRef = useRef<ReturnType<typeof createIdentitySaveController> | null>(null);

  if (!identitySaveRef.current) {
    identitySaveRef.current = createIdentitySaveController((payload) =>
      rpcS("save_identity", { code: getCode(), ...payload }),
    );
  }

  const [f, setF] = useState<any>({
    name: "",
    number: "",
    class_name: "",
    leader: "",
    members: ["", "", "", "", ""],
  });

  const load = async (c: string) => {
    setErr("");
    setChecking(true);

    try {
      const { data, error } = await rpcS("get_group", { code: c });

      if (error) {
        setErr(error.message);
        return;
      }

      if (!data?.id) {
        setErr("Kode akses tidak ditemukan. Tanyakan kode kelompok ke gurumu.");
        return;
      }

      setCode(c);
      setProject(data.project ?? null);
      setOk(true);
      setF({
        name: data.group_name || "",
        number: data.group_number ?? "",
        class_name: data.class_name || "",
        leader: data.leader_name || "",
        members: [...(data.members || []), "", "", "", "", ""].slice(0, 5),
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const c = getCode();

    if (c) {
      setC(c);
      load(c);
    }
  }, []);

  const save = async () => {
    setErr("");
    const outcome = await identitySaveRef.current!.save(f, setSaving);

    if (outcome.kind === "busy") return;
    if (outcome.kind === "invalid" || outcome.kind === "failed") {
      setErr(outcome.message);
      return;
    }

    r.push("/lkpd/kasus");
  };

  const set = (k: string, v: any) => {
    setF({ ...f, [k]: v });
  };

  if (!ok) {
    return (
      <div className="cv-group-access-page">
        <section className="cv-group-access-panel" aria-labelledby="group-access-title">
          <div className="cv-group-access-emblem" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <rect x="8" y="7" width="25" height="32" rx="5" stroke="currentColor" strokeWidth="2.2" />
              <path d="M15 16h11M15 22h11M15 28h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="34" cy="31" r="8" fill="#0b3970" stroke="#8cecff" strokeWidth="2" />
              <path d="M31 31h6M34 28v6" stroke="#dffaff" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span className="cv-group-access-eyebrow">AKSES PEMBELAJARAN</span>
          <h1 id="group-access-title">Masuk dengan <span>Kode Kelompok</span></h1>
          <p className="cv-group-access-description">Guru membagikan kode akses kelompok. Masukkan kode persis seperti yang diberikan guru.</p>
          {err && <div className="cv-group-access-error" role="alert">{err}</div>}
          <form className="cv-group-access-form" onSubmit={(event) => {
            event.preventDefault();
            if (!checking && code.trim()) void load(code);
          }}>
            <label className="cv-group-access-label" htmlFor="group-code">KODE AKSES KELOMPOK</label>
            <div className="cv-group-code-field">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 11a3.5 3.5 0 0 0 0-7M18 14.5a4 4 0 0 1 4 4V20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input id="group-code" value={code} onChange={(e) => setC(e.target.value)} placeholder="Kode kelompok" aria-label="Kode kelompok" autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={checking} />
            </div>
            <button className="cv-group-access-submit" type="submit" disabled={!code.trim() || checking}>
              {checking ? <><span className="cv-group-access-spinner" aria-hidden="true" /> MEMERIKSA KODE...</> : <>LANJUTKAN <span aria-hidden="true">→</span></>}
            </button>
          </form>
          <div className="cv-group-access-footnote"><span aria-hidden="true">⌁</span>Pastikan kode sesuai dengan yang dibagikan oleh guru.</div>
        </section>
      </div>
    );
  }

  return (
    <div className="cv-identity-page">
      <section className="cv-identity-project" aria-labelledby="cv-project-title">
        <div className="cv-identity-project-topline">
          <span className="cv-identity-kicker">PROYEK PEMBELAJARAN</span>
          <button type="button" className="cv-identity-change-group" onClick={() => {
            localStorage.removeItem("cv_code");
            setC("");
            setOk(false);
            setErr("");
            setProject(null);
            setF({ name: "", number: "", class_name: "", leader: "", members: ["", "", "", "", ""] });
          }}>
            <span aria-hidden="true">↶</span> Ganti Kelompok
          </button>
        </div>
        {project ? (
          <div className="cv-identity-project-copy">
            <h1 id="cv-project-title">{project.title}</h1>
            {project.tagline && <p className="cv-identity-tagline">{project.tagline}</p>}
            {project.description && <p className="cv-identity-project-description">{project.description}</p>}
          </div>
        ) : (
          <div className="cv-group-access-error" role="alert">Project belum ditemukan untuk kelompok ini. Hubungi gurumu.</div>
        )}
      </section>

      <section className="cv-identity-form-panel" aria-labelledby="cv-identity-title">
        <div className="cv-identity-form-heading">
          <span className="cv-identity-kicker">DATA KELOMPOK</span>
          <h2 id="cv-identity-title">Identitas <span>Kelompok</span></h2>
          <p>Lengkapi informasi kelompok sebelum memulai aktivitas pembelajaran.</p>
        </div>

        {err && <div className="cv-group-access-error" role="alert">{err}</div>}

        <div className="cv-identity-fields">
          <div className="cv-identity-field">
            <label htmlFor="f-name">Nama kelompok</label>
            <input id="f-name" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Masukkan nama kelompok" />
          </div>
          <div className="cv-identity-field">
            <label>Nomor kelompok</label>
            <div className="cv-identity-readonly" aria-label="Nomor kelompok ditetapkan oleh guru">
              <span className="cv-identity-readonly-value">{f.number || "Belum ditetapkan"}</span>
              <span className="cv-identity-readonly-note"><span aria-hidden="true">◈</span> Ditetapkan oleh guru</span>
            </div>
          </div>
          <div className="cv-identity-field">
            <label htmlFor="f-class">Kelas</label>
            <input id="f-class" value={f.class_name} onChange={(e) => set("class_name", e.target.value)} placeholder="mis. XII-2" />
          </div>
          <div className="cv-identity-field">
            <label htmlFor="f-leader">Nama Ketua Kelompok</label>
            <input id="f-leader" value={f.leader} onChange={(e) => set("leader", e.target.value)} placeholder="Masukkan nama ketua kelompok" />
          </div>
        </div>

        <div className="cv-identity-members-heading">
          <div>
            <span className="cv-identity-kicker">KOMPOSISI TIM</span>
            <h3>Anggota Kelompok</h3>
          </div>
          <span className="cv-identity-members-count">{f.members.length} kolom anggota</span>
        </div>

        <div className="cv-identity-members-grid">
          {f.members.map((m: string, i: number) => (
            <div className="cv-identity-field" key={i}>
              <label htmlFor={`f-m${i}`}>Anggota {i + 1}</label>
              <input id={`f-m${i}`} value={m} onChange={(e) => {
                const a = [...f.members];
                a[i] = e.target.value;
                set("members", a);
              }} placeholder={`Nama anggota ${i + 1}`} />
            </div>
          ))}
        </div>

        <div className="cv-identity-form-footer">
          <p>Periksa kembali data kelompok sebelum melanjutkan.</p>
          <button className="cv-group-access-submit cv-identity-save" type="button" onClick={save} disabled={saving}>
            {saving ? "Menyimpan identitas..." : <>SIMPAN &amp; LANJUTKAN <span aria-hidden="true">→</span></>}
          </button>
        </div>
      </section>
    </div>
  );
