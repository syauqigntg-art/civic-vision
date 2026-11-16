"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
type Member = { id: string; name: string; group_id: string; groups?: { group_name: string | null; group_number: number | null } | null };
export default function StudentAccountsPage() {
 const [members,setMembers]=useState<Member[]>([]),[selected,setSelected]=useState(""),[loginId,setLoginId]=useState(""),[pin,setPin]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 const load=async()=>{const {data,error}=await sb.from("group_members").select("id,name,group_id,groups(group_name,group_number)").order("member_order");if(error){setError("Daftar anggota tidak dapat dimuat. Pastikan migrasi login siswa sudah diterapkan.");return;}setMembers((data||[]) as unknown as Member[]);};
 useEffect(()=>{void load();},[]);
 const save=async(event:React.FormEvent)=>{event.preventDefault();setError("");setMessage("");setBusy(true);try{const response=await fetch("/api/admin/student-accounts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({groupMemberId:selected,loginId,pin})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Kredensial gagal disimpan.");setMessage("ID dan PIN berhasil disimpan.");setPin("");await load();}catch(e){setError(e instanceof Error?e.message:"Terjadi kesalahan.");}finally{setBusy(false);}};
 const member=members.find(x=>x.id===selected);
 return <main style={{maxWidth:900,margin:"0 auto",padding:28}}><header style={{marginBottom:24}}><p style={{color:"#3972a8",letterSpacing:".12em",fontWeight:700}}>PENGELOLAAN SISWA</p><h1 style={{fontSize:30}}>Akun Login Siswa</h1><p>Buat atau reset ID dan PIN individual. Jawaban LKPD tetap dibagikan bersama kelompok.</p></header><form onSubmit={save} style={{display:"grid",gap:16,maxWidth:560,padding:24,border:"1px solid #dbe3ec",borderRadius:18}}>
 <label style={{display:"grid",gap:7}}>Anggota kelompok<select required value={selected} onChange={e=>setSelected(e.target.value)} style={{padding:12,border:"1px solid #cbd5e1",borderRadius:10}}><option value="">Pilih anggota siswa</option>{members.map(m=><option key={m.id} value={m.id}>{m.name} · {m.groups?.group_name||"Kelompok"}{m.groups?.group_number?" #"+m.groups.group_number:""}</option>)}</select></label>
 <label style={{display:"grid",gap:7}}>ID Login<input required minLength={4} maxLength={32} value={loginId} onChange={e=>setLoginId(e.target.value)} placeholder="Contoh: siswa01" style={{padding:12,border:"1px solid #cbd5e1",borderRadius:10}}/></label>
 <label style={{display:"grid",gap:7}}>PIN (6–12 digit)<input required minLength={6} maxLength={12} inputMode="numeric" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,12))} placeholder="Masukkan PIN awal" style={{padding:12,border:"1px solid #cbd5e1",borderRadius:10}}/></label>
 {member&&<p style={{color:"#526579",margin:0}}>Akun terhubung ke kelompok {member.groups?.group_name||member.group_id}. Mengubah kredensial akan memperbarui akses login siswa.</p>}
 {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}{message&&<p role="status" style={{color:"#16794b"}}>{message}</p>}
 <button disabled={busy||!selected||loginId.length<4||pin.length<6} style={{padding:13,border:0,borderRadius:10,background:"#145b91",color:"white",fontWeight:700}}>{busy?"MENYIMPAN...":"SIMPAN KREDENSIAL"}</button></form>
 <p style={{marginTop:20,color:"#64748b",fontSize:13}}>PIN disimpan sebagai hash scrypt. Bagikan kredensial secara pribadi kepada siswa.</p></main>;
}
