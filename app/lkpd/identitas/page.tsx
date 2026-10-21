
"use client";

import { rpcS } from "@/lib/api/student";
import { useEffect, useState } from "react";
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
  const [project, setProject] = useState<Project | null>(null);

  const [f, setF] = useState<any>({
    name: "",
    number: "",
    class_name: "",
    leader: "",
    members: ["", "", "", "", ""],
  });

  const load = async (c: string) => {
    setErr("");

    const { data, error } = await rpcS("get_group", {
      code: c,
    });

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
  };

  useEffect(() => {
    const c = getCode();

    if (c) {
      setC(c);
      load(c);
    }
  }, []);

  const save = async () => {
    if (
      !f.name.trim() ||
      !f.number ||
      !f.class_name.trim() ||
      !f.leader.trim()
    ) {
      setErr("Nama kelompok, nomor, kelas, dan nama ketua wajib diisi.");
      return;
    }

    const { error } = await rpcS("save_identity", {
      code: getCode(),
      p_name: f.name,
      p_number: +f.number,
      p_class: f.class_name,
      p_leader: f.leader,
      p_members: f.members,
    });

    if (error) {
      setErr(error.message);
      return;
    }

    r.push("/lkpd/kasus");
  };

  const set = (k: string, v: any) => {
    setF({ ...f, [k]: v });
  };

  if (!ok) {
    return (
      <section className="glass">
        <h2>Masuk dengan kode kelompok</h2>
        <p>Guru membagikan kode, misalnya K3-7QX2.</p>

        {err && <div className="warn" role="alert">{err}</div>}

        <input
          value={code}
          onChange={(e) => setC(e.target.value)}
          placeholder="Kode kelompok"
          aria-label="Kode kelompok"
          autoComplete="off"
        />

        <div className="row">
          <button className="btn" onClick={() => load(code)}>
            LANJUTKAN →
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="glass">
      <button
  type="button"
  className="btn g"
  onClick={() => {
    localStorage.removeItem("cv_code");
    setC("");
    setOk(false);
    setErr("");
    setProject(null);
    setF({
      name: "",
      number: "",
      class_name: "",
      leader: "",
      members: ["", "", "", "", ""],
    });
  }}
>
  Ganti Kelompok
</button>

      {project ? (
        <div className="glass" style={{ padding: 20, marginBottom: 24 }}>
          <h2>{project.title}</h2>

          {project.tagline && (
            <p style={{ fontWeight: 600 }}>{project.tagline}</p>
          )}

          {project.description && <p>{project.description}</p>}
        </div>
      ) : (
        <div className="warn" role="alert">
          Project belum ditemukan untuk kelompok ini. Hubungi gurumu.
        </div>
      )}

      <h2>Identitas kelompok</h2>

      {err && <div className="warn" role="alert">{err}</div>}

      <label htmlFor="f-name">Nama kelompok</label>
      <input
        id="f-name"
        value={f.name}
        onChange={(e) => set("name", e.target.value)}
      />

      <label htmlFor="f-no">Nomor kelompok</label>
      <input
        id="f-no"
        type="number"
        min={1}
        value={f.number}
        onChange={(e) => set("number", e.target.value)}
      />

      <label htmlFor="f-class">Kelas</label>
      <input
        id="f-class"
        value={f.class_name}
        onChange={(e) => set("class_name", e.target.value)}
        placeholder="mis. X-3"
      />

    <label>Nomor kelompok</label>
<p className="hint">
  {f.number || "Belum ditetapkan"} — ditetapkan oleh guru
</p>

      {f.members.map((m: string, i: number) => (
        <div key={i}>
          <label htmlFor={`f-m${i}`}>Anggota {i + 1}</label>
          <input
            id={`f-m${i}`}
            value={m}
            onChange={(e) => {
              const a = [...f.members];
              a[i] = e.target.value;
              set("members", a);
            }}
          />
        </div>
      ))}

      <div className="row">
        <button className="btn" onClick={save}>
          LANJUTKAN →
        </button>
      </div>
    </section>
  );
}
