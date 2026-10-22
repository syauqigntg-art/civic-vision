
"use client";

import { useState } from "react";
import { sb } from "@/lib/supabase";
import { useAdmin, upd } from "@/lib/admin";

function Members({
  init,
  onSave,
  readOnly = false,
}: {
  init: string[];
  onSave: (a: string[]) => void;
  readOnly?: boolean;
}) {
  const [m, setM] = useState(
    [...init, "", "", "", "", ""].slice(
      0,
      Math.max(5, init.length)
    )
  );

  return (
    <>
      <label>Anggota</label>
      {m.map((x, i) => (
        <input
          key={i}
          style={{ marginTop: 6 }}
          value={x}
          disabled={readOnly}
          placeholder={`Anggota ${i + 1}`}
          onChange={(e) => {
            const a = [...m];
            a[i] = e.target.value;
            setM(a);
          }}
        />
      ))}
      <div className="row">
        <button
          className="btn g"
          disabled={readOnly}
          onClick={() => setM([...m, ""])}
        >
          + Anggota
        </button>
        <button
          className="btn g"
          disabled={readOnly}
          onClick={() => onSave(m)}
        >
          Simpan anggota
        </button>
      </div>
    </>
  );
}

export default function Groups() {
  const { P, gs, vs, gv, gm, subs, load } = useAdmin([
    "P",
    "gs",
    "vs",
    "gv",
    "gm",
    "subs",
  ]);

  const [bulkVideoId, setBulkVideoId] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] =
    useState<string[]>([]);
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignMessage, setAssignMessage] = useState("");
  const archived = P.is_active === false;
  const readOnlyNotice = "Project ini sedang diarsipkan. Aktifkan project terlebih dahulu untuk mengubah data.";

  const selectedVideo = vs.find(
    (v: any) => v.id === bulkVideoId
  );

  // Hanya kelompok dari proyek video yang dipilih.
  const eligibleGroups = selectedVideo
    ? gs.filter(
        (g: any) =>
          g.project_id === selectedVideo.project_id
      )
    : [];

  const allSelected =
    eligibleGroups.length > 0 &&
    eligibleGroups.every((g: any) =>
      selectedGroupIds.includes(g.id)
    );

  const chooseVideo = (id: string) => {
    setBulkVideoId(id);
    setSelectedGroupIds([]);
    setAssignMessage("");
  };

  const toggleGroup = (id: string, checked: boolean) => {
    setSelectedGroupIds((prev) =>
      checked
        ? prev.includes(id)
          ? prev
          : [...prev, id]
        : prev.filter((x) => x !== id)
    );
  };

  // Menugaskan satu video ke sebanyak mungkin kelompok.
  // Setiap kelompok tetap mempunyai satu video tugas aktif
  // dalam alur penugasan ini.
  const assignMany = async () => {
    if (archived) { setAssignMessage(readOnlyNotice); return; }
    setAssignMessage("");

    if (!selectedVideo) {
      setAssignMessage("Pilih video yang akan ditugaskan.");
      return;
    }

    if (!selectedVideo.is_active) {
      setAssignMessage(
        "Video ini nonaktif. Aktifkan video terlebih dahulu."
      );
      return;
    }

    const targets = eligibleGroups.filter((g: any) =>
      selectedGroupIds.includes(g.id)
    );

    if (!targets.length) {
      setAssignMessage(
        "Pilih minimal satu kelompok terlebih dahulu."
      );
      return;
    }

    if (targets.length !== selectedGroupIds.length) {
      setAssignMessage(
        "Periksa kembali pilihan kelompok dan proyek video."
      );
      return;
    }

    const ids = targets.map((g: any) => g.id);

    // Simpan penugasan lama supaya bisa dipulihkan
    // jika penyimpanan penugasan baru gagal.
    const previousRows = gv
      .filter((x: any) => ids.includes(x.group_id))
      .map((x: any) => ({
        group_id: x.group_id,
        video_id: x.video_id,
      }));

    setAssignBusy(true);

    try {
      const { error: deleteError } = await sb
        .from("group_videos")
        .delete()
        .in("group_id", ids);

      if (deleteError) {
        throw new Error(
          "Penugasan lama gagal diperbarui. Coba lagi."
        );
      }

      const { error: insertError } = await sb
        .from("group_videos")
        .insert(
          ids.map((group_id: string) => ({
            group_id,
            video_id: selectedVideo.id,
          }))
        );

      if (insertError) {
        // Pulihkan penugasan sebelumnya jika penyimpanan gagal.
        if (previousRows.length) {
          const { error: restoreError } = await sb
            .from("group_videos")
            .insert(previousRows);

          if (restoreError) {
            throw new Error(
              "Penugasan baru gagal dan pemulihan penugasan lama " +
                "juga gagal. Periksa kembali Dashboard Kelompok."
            );
          }
        }

        throw new Error(
          "Penugasan gagal disimpan. Penugasan sebelumnya " +
            "telah dipulihkan jika tersedia."
        );
      }

      await load();

      setAssignMessage(
        `Berhasil! Video ${selectedVideo.number} ditugaskan ` +
          `kepada ${ids.length} kelompok.`
      );
    } catch (e) {
      setAssignMessage(
        e instanceof Error
          ? e.message
          : "Penugasan gagal disimpan. Silakan coba lagi."
      );
    } finally {
      setAssignBusy(false);
    }
  };

  const setVideo = async (
    gid: string,
    vid: string
  ) => {
    if (archived) { alert(readOnlyNotice); return; }
    const group = gs.find((g: any) => g.id === gid);
    const video = vs.find((v: any) => v.id === vid);

    if (
      vid &&
      group &&
      video &&
      group.project_id !== video.project_id
    ) {
      alert("Kelompok dan video harus berasal dari proyek yang sama.");
      return;
    }

    const { error: deleteError } = await sb
      .from("group_videos")
      .delete()
      .eq("group_id", gid);

    if (deleteError) {
      alert("Gagal memperbarui penugasan video.");
      return;
    }

    if (vid) {
      const { error: insertError } = await sb
        .from("group_videos")
        .insert({
          group_id: gid,
          video_id: vid,
        });

      if (insertError) {
        alert("Video gagal ditugaskan ke kelompok ini.");
        await load();
        return;
      }
    }

    await load();
  };

  const members = async (
    gid: string,
    a: string[]
  ) => {
    if (archived) { alert(readOnlyNotice); return; }
    const { error: deleteError } = await sb
      .from("group_members")
      .delete()
      .eq("group_id", gid);

    if (deleteError) {
      alert("Gagal memperbarui anggota.");
      return;
    }

    const rows = a
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name, i) => ({
        group_id: gid,
        name,
        member_order: i + 1,
      }));

    if (rows.length) {
      const { error } = await sb
        .from("group_members")
        .insert(rows);

      if (error) {
        alert("Sebagian perubahan anggota mungkin belum tersimpan.");
      }
    }

    await load();
  };

  const auto = async () => {
    if (archived) { alert(readOnlyNotice); return; }
    if (
      !confirm(
        "Tetapkan Kelompok n → Video n untuk semua kelompok? " +
          "Penugasan yang ada akan diganti."
      )
    ) {
      return;
    }

    for (const g of gs) {
      const v = vs.find(
        (x: any) =>
          x.number === g.group_number &&
          x.project_id === g.project_id
      );

      await setVideo(g.id, v?.id || "");
    }

    await load();
  };

  const add = async () => {
    if (archived) { alert(readOnlyNotice); return; }
    if (!P.id) {
      alert("Buat atau pilih proyek terlebih dahulu.");
      return;
    }

    const n =
      Math.max(
        0,
        ...gs.map((g: any) => g.group_number || 0)
      ) + 1;

    const { error } = await sb.from("groups").insert({
      project_id: P.id,
      group_number: n,
      access_code:
        `CV-` +
        crypto
          .randomUUID()
          .replace(/-/g, "")
          .slice(0, 20)
          .toUpperCase(),
    });

    if (error) {
      alert("Kelompok gagal dibuat.");
      return;
    }

    await load();
  };

  const del = async (g: any) => {
    if (archived) { alert(readOnlyNotice); return; }
    const has = subs.some(
      (s: any) => s.group_id === g.id
    );

    if (
      confirm(
        has
          ? "Kelompok ini sudah punya hasil analisis. Menghapusnya " +
              "ikut menghapus semua jawabannya secara permanen. Lanjutkan?"
          : "Hapus kelompok ini?"
      )
    ) {
      const { error } = await sb
        .from("groups")
        .delete()
        .eq("id", g.id);

      if (error) {
        alert("Kelompok gagal dihapus.");
        return;
      }

      await load();
    }
  };

  return (
    <>
      {archived && <section className="glass" role="alert" style={{border:"1px solid #d97706",background:"#fff7ed",color:"#9a3412"}}><strong>Project diarsipkan — halaman Kelompok dalam mode baca saja.</strong><p>{readOnlyNotice}</p></section>}
      <section className="glass" style={archived ? {opacity:0.7} : undefined}>
        <h2>Penugasan Video ke Banyak Kelompok</h2>
        <p>
          Unggah video satu kali di menu Video Kasus, lalu
          tugaskan video tersebut kepada sebanyak mungkin
          kelompok. Tidak ada batas 8 kelompok pada formulir ini.
        </p>
        <p>
          Kelompok yang dipilih akan menggunakan video tersebut
          sebagai tugasnya. Penugasan video sebelumnya untuk
          kelompok terpilih akan diganti.
        </p>

        <label htmlFor="bulk-video">
          Pilih video tugas
        </label>
        <select
          id="bulk-video"
          value={bulkVideoId}
          disabled={archived}
          onChange={(e) => chooseVideo(e.target.value)}
        >
          <option value="">— Pilih video —</option>
          {vs.map((v: any) => (
            <option
              key={v.id}
              value={v.id}
              disabled={!v.is_active}
            >
              Video {String(v.number).padStart(2, "0")} —{" "}
              {v.title}
              {!v.is_active ? " (nonaktif)" : ""}
            </option>
          ))}
        </select>

        {selectedVideo && (
          <>
            <p>
              Kelompok yang tersedia: {eligibleGroups.length}
            </p>

            {eligibleGroups.length === 0 ? (
              <div className="warn">
                Belum ada kelompok dalam proyek video ini.
                Periksa proyek video dan proyek kelompok di dashboard.
              </div>
            ) : (
              <>
                <div className="row">
                  <button
                    className="btn g"
                    type="button"
                    disabled={archived}
                    onClick={() =>
                      setSelectedGroupIds(
                        allSelected
                          ? []
                          : eligibleGroups.map(
                              (g: any) => g.id
                            )
                      )
                    }
                  >
                    {allSelected
                      ? "Batalkan Semua Pilihan"
                      : "Pilih Semua Kelompok"}
                  </button>
                </div>

                <div className="qrow">
                  {eligibleGroups.map((g: any) => (
                    <label
                      key={g.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        margin: "10px 0",
                      }}
                    >
                      <input
                        type="checkbox"
                        style={{
                          width: "auto",
                          margin: 0,
                        }}
                        disabled={archived}
                        checked={selectedGroupIds.includes(g.id)}
                        onChange={(e) =>
                          toggleGroup(
                            g.id,
                            e.target.checked
                          )
                        }
                      />
                      <span>
                        Kelompok {g.group_number}
                        {g.group_name
                          ? ` — ${g.group_name}`
                          : ""}
                        {g.class_name
                          ? ` (${g.class_name})`
                          : ""}
                      </span>
                    </label>
                  ))}
                </div>

                <p>
                  Dipilih: {selectedGroupIds.filter((id) =>
                    eligibleGroups.some(
                      (g: any) => g.id === id
                    )
                  ).length} kelompok
                </p>

                <div className="row">
                  <button
                    className="btn"
                    type="button"
                    disabled={
                      archived ||
                      assignBusy ||
                      selectedGroupIds.length === 0
                    }
                    onClick={assignMany}
                  >
                    {assignBusy
                      ? "Menyimpan Penugasan..."
                      : "Tugaskan Video ke Kelompok Terpilih"}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {assignMessage && (
          <p role="status" aria-live="polite">
            {assignMessage}
          </p>
        )}
      </section>

      <section className="glass">
        <h2>Kelompok</h2>
        <div className="row" style={{ marginTop: 0 }}>
          <button className="btn" disabled={archived} onClick={add}>
            + Buat Kelompok
          </button>
          <button className="btn g" disabled={archived} onClick={auto}>
            Kelompok n → Video n
          </button>
        </div>

        {gs.map((g: any) => {
          const cur = gv.find(
            (x: any) => x.group_id === g.id
          );

          const groupVideos = vs.filter(
            (v: any) => v.project_id === g.project_id
          );

          return (
            <div
              className="qrow"
              key={g.id}
              style={{ marginTop: 14 }}
            >
              <p style={{ margin: "0 0 8px" }}>
                Kode akses:{" "}
                <b style={{ color: "#fff" }}>
                  {g.access_code}
                </b>
              </p>

              <div className="mini">
                <input
                  type="number"
                  placeholder="Nomor"
                  defaultValue={g.group_number ?? ""}
                  disabled={archived}
                  onBlur={(e) =>
                    upd("groups", g.id, {
                      group_number:
                        +e.target.value || null,
                    }).then(load)
                  }
                />
                <input
                  placeholder="Nama kelompok"
                  defaultValue={g.group_name || ""}
                  disabled={archived}
                  onBlur={(e) =>
                    upd("groups", g.id, {
                      group_name: e.target.value,
                    }).then(load)
                  }
                />
                <input
                  placeholder="Kelas"
                  defaultValue={g.class_name || ""}
                  disabled={archived}
                  onBlur={(e) =>
                    upd("groups", g.id, {
                      class_name: e.target.value,
                    }).then(load)
                  }
                />
                <input
                  placeholder="Ketua"
                  defaultValue={g.leader_name || ""}
                  disabled={archived}
                  onBlur={(e) =>
                    upd("groups", g.id, {
                      leader_name: e.target.value,
                    }).then(load)
                  }
                />
              </div>

              <label>Video yang ditugaskan</label>
              <select
                value={cur?.video_id || ""}
                disabled={archived}
                onChange={(e) =>
                  setVideo(g.id, e.target.value)
                }
              >
                <option value="">
                  — Belum ditentukan —
                </option>
                {groupVideos.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    Video{" "}
                    {String(v.number).padStart(2, "0")} —{" "}
                    {v.title}
                  </option>
                ))}
              </select>

              <Members
                init={gm
                  .filter((m: any) => m.group_id === g.id)
                  .map((m: any) => m.name)}
                readOnly={archived}
                onSave={(a) => members(g.id, a)}
              />

              <div className="row">
                <button
                  className="btn g"
                  disabled={archived}
                  onClick={() => del(g)}
                >
                  Hapus kelompok
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
