"use client";

import { useState } from "react";

type View = "login" | "home" | "task";

export default function StudentLoginPreview() {
  const [view, setView] = useState<View>("login");
  const [studentId, setStudentId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState(false);

  function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (studentId.trim().toUpperCase() === "CV-2026-001" && pin === "123456") {
      setError("");
      setView("home");
    } else {
      setError("ID Siswa atau PIN tidak sesuai. Gunakan akun demo di bawah.");
    }
  }

  return (
    <main className="preview">
      <style jsx>{`
        .preview{min-height:100vh;padding:28px 20px 48px;background:radial-gradient(ellipse at 12% 8%,#dce9ff 0,transparent 38%),radial-gradient(ellipse at 88% 16%,#e9e0ff 0,transparent 34%),linear-gradient(145deg,#f5f8ff,#f7f5ff 55%,#effaf7);color:#18264e;font-family:Arial,Helvetica,sans-serif}
        .wrap{max-width:980px;margin:0 auto}.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:44px}
        .brand{display:flex;align-items:center;gap:12px;font-weight:800;font-size:19px;letter-spacing:-.5px}.logo{width:42px;height:42px;border-radius:15px;background:linear-gradient(140deg,#263c83,#8999e8);display:grid;place-items:center;color:white;font-weight:900;box-shadow:0 8px 20px #344b9830}
        .sub{font-size:11px;color:#71809e;font-weight:500;letter-spacing:.3px;margin-top:3px}.tag{font-size:10px;font-weight:800;letter-spacing:1px;color:#435aa8;background:#e8edff;border:1px solid #dce4ff;border-radius:30px;padding:8px 12px}
        .glass{background:#ffffffb8;border:1px solid #ffffffd9;box-shadow:0 20px 60px #344b9815;backdrop-filter:blur(20px);border-radius:26px}
        .login{max-width:450px;margin:0 auto}.intro{text-align:center;margin-bottom:24px}.spark{font-size:34px;color:#697dcc}.intro h1{font-size:30px;letter-spacing:-1px;margin:8px 0;color:#1d2c60}.intro p,.muted{color:#73809a;font-size:13px;line-height:1.6}
        .panel{padding:30px}.panel h2{font-size:19px;margin:0 0 6px}.field{display:block;margin-top:19px;font-size:12px;font-weight:750;color:#39496e}.field input{display:block;box-sizing:border-box;width:100%;margin-top:9px;border:1px solid #dce3f1;border-radius:13px;background:#ffffffd9;padding:14px 15px;font-size:14px;color:#1d2c60;outline:none}.field input:focus{border-color:#7288d8;box-shadow:0 0 0 3px #7288d820}
        .primary,.secondary{border:0;border-radius:13px;padding:13px 16px;font-weight:750;cursor:pointer}.primary{background:linear-gradient(110deg,#293f86,#536ac0);color:white;box-shadow:0 8px 20px #344b9827}.primary:hover{filter:brightness(1.06)}.secondary{background:white;color:#354a91;border:1px solid #dce3f1}
        .full{width:100%;margin-top:22px}.demo{margin-top:17px;padding:13px 15px;border-radius:13px;background:#f0f3ff;color:#526183;font-size:12px;line-height:1.8}.demo strong{color:#273c83}.foot{text-align:center;margin:20px auto 0;max-width:390px;font-size:11px;line-height:1.6;color:#8993a9}
        .error{margin-top:12px;color:#bd3e4c;font-size:12px}.heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:22px}.heading h1{font-size:27px;letter-spacing:-.8px;margin:5px 0}.eyebrow{font-size:10px;font-weight:800;letter-spacing:1px;color:#7181a3}
        .hero{padding:23px;margin-bottom:18px}.hero h2{font-size:22px;margin:12px 0 5px}.hero p{font-size:12px;color:#78849c;margin:0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px}.stat{background:#f1f4ff;border-radius:15px;padding:13px}.stat small{display:block;color:#77839e;font-size:11px}.stat strong{display:block;margin-top:5px;font-size:14px}
        .phase-title{font-weight:800;margin:23px 0 12px}.phases{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.phase{padding:12px 5px;text-align:center;border:1px solid #e1e7f2;background:#fff;border-radius:14px}.phase b{display:block;font-size:11px;margin-top:7px}.phase small{font-size:9px;color:#78849c}.phase.done{background:#effaf5;border-color:#c9eadc}.phase.active{background:#eef1ff;border-color:#aebcf1}
        .cards{display:grid;grid-template-columns:1.1fr .9fr;gap:13px;margin-top:15px}.card{background:#fff;border:1px solid #e5eaf3;border-radius:17px;padding:17px}.card h3{font-size:14px;margin:0 0 12px}.card p{font-size:12px;line-height:1.6;color:#77839b}.people{display:flex;align-items:center;gap:10px;margin-top:12px;font-size:12px}.avatar{width:33px;height:33px;border-radius:50%;background:#e9edff;color:#4359a0;display:grid;place-items:center;font-weight:800}
        .notice{margin-top:15px;padding:13px 15px;border-radius:13px;background:#f0f3fa;color:#596985;font-size:11px;line-height:1.6}.task{padding:25px}.task h1{font-size:25px;margin:10px 0}.question{padding:16px;border-radius:14px;background:#f0f3ff;margin:22px 0;font-size:13px;line-height:1.7}.task textarea{box-sizing:border-box;width:100%;margin-top:9px;border:1px solid #dce3f1;border-radius:13px;padding:14px;font:13px Arial;resize:vertical;color:#1d2c60}
        .actions{display:flex;gap:9px;margin-top:15px}.actions button{flex:1}.saved{font-size:11px;color:#27815f;margin-top:12px}
        @media(max-width:600px){.preview{padding:18px 13px 35px}.top{margin-bottom:32px}.panel{padding:22px}.intro h1{font-size:26px}.heading h1{font-size:22px}.phases{gap:5px}.phase{padding:10px 2px}.phase b{font-size:10px}.phase small{font-size:8px}.cards{grid-template-columns:1fr}.tag{font-size:9px}.hero{padding:18px}}
      `}</style>
      <div className="wrap">
        <header className="top">
          <div className="brand"><div className="logo">CV</div><div>Civic Vision<div className="sub">DIGITAL PANCASILA LEARNING</div></div></div>
          <span className="tag">PREVIEW MODE</span>
        </header>

        {view === "login" && <section className="login">
          <div className="intro"><div className="spark">✦</div><h1>Selamat datang!</h1><p>Masuk ke ruang belajar Civic Vision</p></div>
          <div className="glass panel">
            <h2>Login Siswa</h2><p className="muted">Gunakan identitas akun yang diberikan oleh guru.</p>
            <form onSubmit={login}>
              <label className="field">ID Siswa<input value={studentId} onChange={e=>setStudentId(e.target.value)} placeholder="Contoh: CV-2026-001" autoComplete="off" required /></label>
              <label className="field">PIN<input value={pin} onChange={e=>setPin(e.target.value)} placeholder="Masukkan PIN" type="password" inputMode="numeric" required /></label>
              {error && <div className="error" role="alert">{error}</div>}
              <button className="primary full" type="submit">Masuk ke pembelajaran&nbsp; →</button>
            </form>
            <div className="demo"><strong>AKUN SIMULASI</strong><br/>ID: <b>CV-2026-001</b><br/>PIN: <b>123456</b></div>
          </div>
          <p className="foot">Akun siswa bersifat individual. Aktivitas dan jawaban PBL tetap tersimpan sebagai pekerjaan kelompok.</p>
        </section>}

        {view === "home" && <section>
          <div className="heading"><div><div className="eyebrow">RUANG BELAJAR / BERANDA</div><h1>Halo, Aulia! 👋</h1><div className="muted">Siap melanjutkan pembelajaran hari ini?</div></div><button className="secondary" onClick={()=>{setView("login");setPin("");}}>Keluar ↗</button></div>
          <div className="glass hero"><span className="tag">PROJECT AKTIF</span><h2>Harmoni dalam Keberagaman</h2><p>Pendidikan Pancasila · Kelas VIII</p><div className="grid"><div className="stat"><small>Kelompok</small><strong>Garuda 02</strong></div><div className="stat"><small>Anggota</small><strong>5 siswa</strong></div></div><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:17}}><span className="muted">Progres kelompok</span><b>40%</b></div><div style={{height:7,background:"#e8edf5",borderRadius:20,marginTop:8,overflow:"hidden"}}><div style={{width:"40%",height:"100%",background:"#7185d6",borderRadius:20}}/></div></div>
          <div className="phase-title">Perjalanan PBL</div><div className="phases"><div className="phase done">👁️<b>SEE</b><small>Selesai</small></div><div className="phase active">🧠<b>THINK</b><small>Aktif</small></div><div className="phase">🛠️<b>ACT</b><small>Berikutnya</small></div><div className="phase">🔗<b>CONNECT</b><small>Terkunci</small></div><div className="phase">🌱<b>KEEP</b><small>Terkunci</small></div></div>
          <div className="cards"><div className="card"><div style={{display:"flex",justifyContent:"space-between",gap:8}}><h3>Tugas kelompok</h3><span className="tag">THINK</span></div><b style={{fontSize:14}}>Analisis masalah keberagaman</b><p>Diskusikan penyebab dan dampak masalah di lingkungan sekitar.</p><button className="primary" style={{width:"100%",marginTop:8}} onClick={()=>setView("task")}>Buka tugas →</button></div><div className="card"><h3>Aktivitas anggota</h3>{[["AU","Aulia","Anda"],["RA","Raka","Berkontribusi di diskusi"],["DI","Dina","Menunggu tugas"]].map(([initial,name,status])=><div className="people" key={name}><div className="avatar">{initial}</div><div><b>{name}</b><div className="muted" style={{fontSize:10}}>{status}</div></div></div>)}</div></div>
          <div className="notice">🔒 <b>Ruang kerja bersama:</b> jawaban, diskusi, dan pengumpulan tugas disimpan atas nama kelompok Garuda 02. Setiap siswa tetap masuk dengan ID dan PIN masing-masing.</div>
        </section>}

        {view === "task" && <section className="glass task"><div className="heading"><button className="secondary" onClick={()=>setView("home")}>← Beranda</button><span className="tag">THINK PHASE</span></div><div className="eyebrow">GARUDA 02 · HARMONI DALAM KEBERAGAMAN</div><h1>Analisis Masalah</h1><p className="muted">Identifikasi persoalan keberagaman di lingkungan sekitar dan diskusikan bersama kelompok.</p><div className="question"><b>Pertanyaan pemantik</b><br/>Mengapa perbedaan di masyarakat dapat menimbulkan konflik, dan bagaimana nilai Pancasila dapat menjadi solusi?</div><label className="field">Jawaban / hasil diskusi kelompok<textarea rows={6} value={answer} onChange={e=>{setAnswer(e.target.value);setSaved(false);}} placeholder="Tuliskan hasil diskusi kelompok di sini..."/></label><div className="notice">Jawaban ini merupakan satu ruang kerja bersama. Pada aplikasi sebenarnya, perubahan anggota kelompok akan tersinkronisasi melalui backend.</div><div className="actions"><button className="primary" onClick={()=>setSaved(true)}>Simpan simulasi</button><button className="secondary" onClick={()=>setView("home")}>Kembali</button></div>{saved&&<div className="saved">✓ Jawaban tersimpan dalam simulasi preview ini.</div>}</section>}
        <footer className="foot">CIVIC VISION · SEE · THINK · ACT · CONNECT · KEEP</footer>
      </div>
    </main>
  );
}
