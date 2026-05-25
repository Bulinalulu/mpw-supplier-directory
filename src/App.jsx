import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://boxiezoqibfczozevxzu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJveGllem9xaWJmY3pvemV2eHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2ODk1MTMsImV4cCI6MjA5NTI2NTUxM30.AdLmdgHcCkmfdpQVBLifFERtD6kpn87-bZ4H5RFpyoE";

const HEADERS = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
};

const db = {
  list: () => fetch(`${SUPABASE_URL}/rest/v1/suppliers?order=name.asc`, { headers: HEADERS }).then(r => r.json()),
  insert: (row) => fetch(`${SUPABASE_URL}/rest/v1/suppliers`, { method: "POST", headers: HEADERS, body: JSON.stringify(row) }).then(r => r.json()),
  update: (id, row) => fetch(`${SUPABASE_URL}/rest/v1/suppliers?id=eq.${id}`, { method: "PATCH", headers: HEADERS, body: JSON.stringify(row) }).then(r => r.json()),
  delete: (id) => fetch(`${SUPABASE_URL}/rest/v1/suppliers?id=eq.${id}`, { method: "DELETE", headers: HEADERS }).then(r => r.ok),
};

const CATEGORIES = ["Plant Hire","Building Materials","PPE / Safety","Civil Works","Transport / Logistics","Office Supplies","Fuel / Lubricants"];

const SEED_SUPPLIERS = [
  { id:"sup_001", name:"Deo Hire", email:"saleshni.lingam@deoconstruction.com", phone:"+679 9992454", address:"Lot 11 Industrial Area, Denarau Island, Nadi, Fiji", location:"Nadi (Western Division)", category:"Plant Hire", specialties:"plant hire, construction equipment rental, industrial equipment", last_verified:"2026-05-13", tcc_reference:"", tcc_issue_date:null, notes:"Email and phones taken from company website Contact Us page." },
  { id:"sup_002", name:"National Hire Pte Ltd", email:"nationalhirefiji@gmail.com", phone:"+679 992 3200", address:"90 Brown Street, Toorak, Suva, Fiji", location:"Suva (head office); Nadi branch available", category:"Plant Hire", specialties:"plant hire, earthmoving equipment, heavy machinery, vehicle rental", last_verified:"2026-05-13", tcc_reference:"", tcc_issue_date:null, notes:"Founded 2002, ~70 permanent staff." },
  { id:"sup_003", name:"Central Project Hire Plant Services", email:"", phone:"+679 341 0749", address:"Lot 19 Bau Street, Nakasi, Fiji", location:"Nakasi (Central Division)", category:"Plant Hire", specialties:"earthmoving equipment, excavating equipment, plant hire", last_verified:"2026-05-13", tcc_reference:"", tcc_issue_date:null, notes:"No email found — needs direct outreach before RFQ can be sent." },
];

const EMPTY_FORM = { name:"", email:"", phone:"", address:"", location:"", category:CATEGORIES[0], specialties:"", last_verified:"", tcc_reference:"", tcc_issue_date:"", notes:"", website:"" };

const CAT_COLOR = { "Plant Hire":"#1F3864","Building Materials":"#2D6A4F","PPE / Safety":"#B5451B","Civil Works":"#4A4E69","Transport / Logistics":"#1B4F72","Office Supplies":"#6B3FA0","Fuel / Lubricants":"#7D4E1B" };

const css = String.raw;
const globalStyles = css`
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; background: #f0f2f5; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  input, select, textarea, button { font-family: inherit; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
`;

function Badge({ category }) {
  const color = CAT_COLOR[category] || "#555";
  return <span style={{ background:color+"18", color, border:`1px solid ${color}40`, borderRadius:4, padding:"2px 8px", fontSize:11, fontWeight:600, letterSpacing:"0.04em", whiteSpace:"nowrap" }}>{category}</span>;
}

function StatusDot({ email }) {
  const ok = email && email.trim();
  return <span title={ok ? "RFQ-ready" : "No email — cannot send RFQ"} style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:ok?"#22c55e":"#f59e0b", marginRight:6, flexShrink:0 }} />;
}

function Spinner() {
  return <div style={{ width:32, height:32, border:"3px solid #e5e7eb", borderTopColor:"#1F3864", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16, animation:"fadeIn 0.15s ease" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:12, width:"100%", maxWidth:580, maxHeight:"92vh", overflow:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 24px 14px", borderBottom:"1px solid #e5e7eb", position:"sticky", top:0, background:"#fff", zIndex:1 }}>
          <span style={{ fontWeight:700, fontSize:16, color:"#1F3864" }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:"#9ca3af", lineHeight:1, padding:"0 4px" }}>×</button>
        </div>
        <div style={{ padding:"20px 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

const iStyle = { width:"100%", padding:"9px 11px", border:"1px solid #d1d5db", borderRadius:7, fontSize:13, color:"#111827", background:"#fff", outline:"none" };

function Field({ label, required, hint, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:4 }}>
        {label}{required && <span style={{ color:"#ef4444", marginLeft:2 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ margin:"3px 0 0", fontSize:11, color:"#9ca3af" }}>{hint}</p>}
    </div>
  );
}

function SupplierForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    setErrors(e);
    return !Object.keys(e).length;
  };
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
        <div style={{ gridColumn:"1/-1" }}>
          <Field label="Supplier Name" required>
            <input style={{ ...iStyle, borderColor:errors.name?"#ef4444":"#d1d5db" }} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Deo Hire" />
            {errors.name && <p style={{ margin:"3px 0 0", fontSize:11, color:"#ef4444" }}>{errors.name}</p>}
          </Field>
        </div>
        <Field label="Category" required>
          <select style={iStyle} value={form.category} onChange={e => set("category", e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Email" hint="Required to send RFQ">
          <input style={iStyle} type="email" value={form.email||""} onChange={e => set("email", e.target.value)} placeholder="contact@example.com" />
        </Field>
        <Field label="Phone">
          <input style={iStyle} value={form.phone||""} onChange={e => set("phone", e.target.value)} placeholder="+679 000 0000" />
        </Field>
        <div style={{ gridColumn:"1/-1" }}>
          <Field label="Website">
            <input style={iStyle} type="url" value={form.website||""} onChange={e => set("website", e.target.value)} placeholder="https://www.example.com" />
          </Field>
        </div>
        <Field label="Location">
          <input style={iStyle} value={form.location||""} onChange={e => set("location", e.target.value)} placeholder="e.g. Nadi (Western Division)" />
        </Field>
        <div style={{ gridColumn:"1/-1" }}>
          <Field label="Address">
            <input style={iStyle} value={form.address||""} onChange={e => set("address", e.target.value)} placeholder="Street address" />
          </Field>
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <Field label="Specialties" hint="Comma-separated">
            <input style={iStyle} value={form.specialties||""} onChange={e => set("specialties", e.target.value)} placeholder="e.g. plant hire, heavy machinery" />
          </Field>
        </div>
        <div style={{ gridColumn:"1/-1", borderTop:"1px solid #f3f4f6", paddingTop:14, marginBottom:4 }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#1F3864", letterSpacing:"0.06em", margin:"0 0 10px", textTransform:"uppercase" }}>Tax Compliance Certificate</p>
        </div>
        <Field label="TCC Reference Number">
          <input style={iStyle} value={form.tcc_reference||""} onChange={e => set("tcc_reference", e.target.value)} placeholder="e.g. TCC-2024-00123" />
        </Field>
        <Field label="TCC Issue Date">
          <input style={iStyle} type="date" value={form.tcc_issue_date||""} onChange={e => set("tcc_issue_date", e.target.value||null)} />
        </Field>
        <Field label="Last Verified Date">
          <input style={iStyle} type="date" value={form.last_verified||""} onChange={e => set("last_verified", e.target.value||null)} />
        </Field>
        <div style={{ gridColumn:"1/-1" }}>
          <Field label="Notes">
            <textarea style={{ ...iStyle, minHeight:72, resize:"vertical" }} value={form.notes||""} onChange={e => set("notes", e.target.value)} placeholder="Additional notes..." />
          </Field>
        </div>
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
        <button onClick={onCancel} disabled={saving} style={{ padding:"9px 20px", borderRadius:7, border:"1px solid #d1d5db", background:"#fff", cursor:"pointer", fontSize:13, fontWeight:500 }}>Cancel</button>
        <button onClick={() => validate() && onSave(form)} disabled={saving} style={{ padding:"9px 22px", borderRadius:7, border:"none", background:saving?"#93c5fd":"#1F3864", cursor:saving?"not-allowed":"pointer", fontSize:13, color:"#fff", fontWeight:700, minWidth:130 }}>
          {saving ? "Saving…" : "Save Supplier"}
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({ supplier, onConfirm, onCancel, saving }) {
  return (
    <Modal title="Delete Supplier" onClose={onCancel}>
      <p style={{ color:"#374151", fontSize:14, lineHeight:1.6, marginBottom:20 }}>
        Are you sure you want to remove <strong>{supplier.name}</strong> from the directory? This cannot be undone.
      </p>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <button onClick={onCancel} style={{ padding:"9px 20px", borderRadius:7, border:"1px solid #d1d5db", background:"#fff", cursor:"pointer", fontSize:13, fontWeight:500 }}>Cancel</button>
        <button onClick={onConfirm} disabled={saving} style={{ padding:"9px 22px", borderRadius:7, border:"none", background:saving?"#fca5a5":"#dc2626", cursor:saving?"not-allowed":"pointer", fontSize:13, color:"#fff", fontWeight:700 }}>
          {saving ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
}

function fmt(d) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-FJ", { day:"numeric", month:"short", year:"numeric" }); }
  catch { return d; }
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p style={{ margin:"0 0 1px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</p>
      <p style={{ margin:0, fontSize:12, color:"#374151", lineHeight:1.5 }}>{value}</p>
    </div>
  );
}

function SupplierCard({ supplier, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const hasEmail = supplier.email && supplier.email.trim();
  return (
    <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:10, overflow:"hidden", transition:"box-shadow 0.15s, transform 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow="0 4px 20px rgba(31,56,100,0.12)"; e.currentTarget.style.transform="translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform="none"; }}>
      <div style={{ padding:"14px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5, flexWrap:"wrap" }}>
              <StatusDot email={supplier.email} />
              <span style={{ fontWeight:700, fontSize:15, color:"#111827" }}>{supplier.name}</span>
              <Badge category={supplier.category} />
            </div>
            {hasEmail
              ? <p style={{ margin:"0 0 2px", fontSize:12, color:"#6b7280" }}>✉ {supplier.email}</p>
              : <p style={{ margin:"0 0 2px", fontSize:12, color:"#f59e0b", fontWeight:600 }}>⚠ No email — cannot send RFQ</p>}
            {supplier.location && <p style={{ margin:0, fontSize:12, color:"#6b7280" }}>📍 {supplier.location}</p>}
          </div>
          <div style={{ display:"flex", gap:6, flexShrink:0 }}>
            <button onClick={() => onEdit(supplier)} style={{ padding:"5px 12px", borderRadius:6, border:"1px solid #d1d5db", background:"#fff", cursor:"pointer", fontSize:12, fontWeight:500, color:"#374151" }}>Edit</button>
            <button onClick={() => onDelete(supplier)} style={{ padding:"5px 12px", borderRadius:6, border:"1px solid #fecaca", background:"#fff", cursor:"pointer", fontSize:12, fontWeight:500, color:"#dc2626" }}>Delete</button>
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#9ca3af", padding:"4px 0 0", display:"flex", alignItems:"center", gap:4 }}>
          {open ? "▲ Less" : "▼ More detail"}
        </button>
      </div>
      {open && (
        <div style={{ padding:"12px 16px 16px", borderTop:"1px solid #f3f4f6", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 20px", animation:"fadeIn 0.15s ease" }}>
          <DetailRow label="Phone" value={supplier.phone} />
          <DetailRow label="Last Verified" value={fmt(supplier.last_verified)} />
          {supplier.website && (
            <div style={{ gridColumn:"1/-1" }}>
              <p style={{ margin:"0 0 1px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.05em" }}>Website</p>
              <a href={supplier.website} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:"#3b82f6", wordBreak:"break-all" }}>{supplier.website}</a>
            </div>
          )}
          <div style={{ gridColumn:"1/-1" }}><DetailRow label="Address" value={supplier.address} /></div>
          <div style={{ gridColumn:"1/-1" }}><DetailRow label="Specialties" value={supplier.specialties} /></div>
          {(supplier.tcc_reference || supplier.tcc_issue_date) && <>
            <DetailRow label="TCC Reference" value={supplier.tcc_reference} />
            <DetailRow label="TCC Issue Date" value={fmt(supplier.tcc_issue_date)} />
          </>}
          <div style={{ gridColumn:"1/-1" }}><DetailRow label="Notes" value={supplier.notes} /></div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const seeded = useRef(false);

  const toast$ = (msg, type="ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  const load = async () => {
    setError(null);
    try {
      const data = await db.list();
      if (!Array.isArray(data)) throw new Error(data?.message || "Unexpected response from database");
      if (data.length === 0 && !seeded.current) {
        seeded.current = true;
        for (const s of SEED_SUPPLIERS) await db.insert(s);
        const seeded2 = await db.list();
        setSuppliers(Array.isArray(seeded2) ? seeded2 : []);
      } else {
        setSuppliers(data);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (form) => {
    setSaving(true);
    try {
      await db.insert({ ...form, id:"sup_"+Date.now(), last_verified:form.last_verified||null, tcc_issue_date:form.tcc_issue_date||null, website:form.website||null });
      await load(); setModal(null); toast$(`${form.name} added.`);
    } catch { toast$("Failed to save.", "err"); }
    setSaving(false);
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      await db.update(form.id, { ...form, last_verified:form.last_verified||null, tcc_issue_date:form.tcc_issue_date||null, website:form.website||null });
      await load(); setModal(null); toast$(`${form.name} updated.`);
    } catch { toast$("Failed to update.", "err"); }
    setSaving(false);
  };

  const handleDelete = async (s) => {
    setSaving(true);
    try {
      await db.delete(s.id); await load(); setModal(null); toast$(`${s.name} deleted.`, "del");
    } catch { toast$("Failed to delete.", "err"); }
    setSaving(false);
  };

  const filtered = suppliers.filter(s => {
    if (cat !== "All" && s.category !== cat) return false;
    const q = search.toLowerCase();
    return !q || [s.name, s.email, s.specialties, s.location].some(v => (v||"").toLowerCase().includes(q));
  });

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", gap:14 }}>
      <Spinner /><p style={{ color:"#6b7280", fontSize:13 }}>Connecting to database…</p>
    </div>
  );

  if (error) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", padding:24 }}>
      <div style={{ textAlign:"center", maxWidth:420 }}>
        <p style={{ fontSize:40, margin:"0 0 12px" }}>⚠️</p>
        <p style={{ fontWeight:700, fontSize:16, color:"#111827", marginBottom:8 }}>Database Connection Error</p>
        <p style={{ color:"#6b7280", fontSize:13, marginBottom:20, lineHeight:1.6 }}>{error}</p>
        <button onClick={load} style={{ padding:"10px 24px", background:"#1F3864", color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontSize:14, fontWeight:700 }}>Retry</button>
      </div>
    </div>
  );

  const noEmail = suppliers.filter(s => !s.email || !s.email.trim()).length;
  const rfqReady = filtered.filter(s => s.email && s.email.trim()).length;

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ minHeight:"100vh", background:"#f0f2f5" }}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg, #1F3864 0%, #2d5282 100%)", boxShadow:"0 2px 12px rgba(0,0,0,0.2)" }}>
          <div style={{ maxWidth:920, margin:"0 auto", padding:"20px 20px 0" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:14, marginBottom:16 }}>
              <div>
                <p style={{ margin:"0 0 3px", fontSize:11, color:"#93c5fd", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase" }}>Ministry of Public Works — Divisional Engineer Works West</p>
                <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:"#fff", letterSpacing:"-0.02em" }}>Supplier Directory</h1><p style={{ margin:"4px 0 0", fontSize:11, color:"#bfdbfe" }}>v1.1 — includes website field</p>
              </div>
              <button onClick={() => setModal({ type:"add" })} style={{ padding:"10px 20px", borderRadius:8, border:"none", background:"#3b82f6", cursor:"pointer", fontSize:13, color:"#fff", fontWeight:700, boxShadow:"0 2px 10px rgba(59,130,246,0.4)", whiteSpace:"nowrap" }}>
                + Add Supplier
              </button>
            </div>

            {/* Stats */}
            <div style={{ display:"flex", gap:28, marginBottom:0 }}>
              {[["Total",suppliers.length],["RFQ-Ready",rfqReady],["No Email",noEmail]].map(([l,v]) => (
                <div key={l} style={{ paddingBottom:14 }}>
                  <p style={{ margin:0, fontSize:24, fontWeight:800, color:"#fff" }}>{v}</p>
                  <p style={{ margin:0, fontSize:10, color:"#93c5fd", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Category tabs */}
          <div style={{ maxWidth:920, margin:"0 auto", padding:"0 20px" }}>
            <div style={{ display:"flex", gap:2, overflowX:"auto", paddingBottom:0 }}>
              {["All",...CATEGORIES].map(c => (
                <button key={c} onClick={() => setCat(c)} style={{
                  padding:"8px 14px", border:"none", cursor:"pointer", whiteSpace:"nowrap",
                  background:cat===c?"#fff":"transparent", color:cat===c?"#1F3864":"#93c5fd",
                  fontWeight:cat===c?700:500, fontSize:12, borderRadius:"6px 6px 0 0",
                }}>
                  {c}{c!=="All"&&` (${suppliers.filter(s=>s.category===c).length})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth:920, margin:"0 auto", padding:"20px" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, specialty, or location…"
            style={{ width:"100%", padding:"11px 14px", border:"1px solid #e5e7eb", borderRadius:8, fontSize:13, outline:"none", background:"#fff", marginBottom:12, boxSizing:"border-box", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }} />

          <p style={{ margin:"0 0 12px", fontSize:12, color:"#9ca3af" }}>
            {filtered.length === 0 ? "No suppliers found." : `${filtered.length} supplier${filtered.length!==1?"s":""} · ${rfqReady} RFQ-ready`}
          </p>

          {filtered.length === 0
            ? <div style={{ textAlign:"center", padding:"64px 20px", background:"#fff", borderRadius:10, border:"1px solid #e5e7eb" }}>
                <p style={{ fontSize:36, margin:"0 0 10px" }}>🔍</p>
                <p style={{ color:"#6b7280", fontSize:14, margin:0 }}>No suppliers match your search.</p>
                {cat !== "All" && <button onClick={() => setCat("All")} style={{ marginTop:14, background:"none", border:"1px solid #d1d5db", borderRadius:6, padding:"7px 16px", cursor:"pointer", fontSize:12, color:"#374151" }}>Clear filter</button>}
              </div>
            : <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {filtered.map(s => <SupplierCard key={s.id} supplier={s} onEdit={s => setModal({type:"edit",supplier:s})} onDelete={s => setModal({type:"delete",supplier:s})} />)}
              </div>
          }
        </div>
      </div>

      {modal?.type==="add" && <Modal title="Add New Supplier" onClose={() => !saving && setModal(null)}><SupplierForm onSave={handleAdd} onCancel={() => setModal(null)} saving={saving} /></Modal>}
      {modal?.type==="edit" && <Modal title="Edit Supplier" onClose={() => !saving && setModal(null)}><SupplierForm initial={modal.supplier} onSave={handleEdit} onCancel={() => setModal(null)} saving={saving} /></Modal>}
      {modal?.type==="delete" && <ConfirmDelete supplier={modal.supplier} onConfirm={() => handleDelete(modal.supplier)} onCancel={() => setModal(null)} saving={saving} />}

      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:toast.type==="err"?"#dc2626":toast.type==="del"?"#374151":"#1F3864", color:"#fff", padding:"11px 22px", borderRadius:9, fontSize:13, fontWeight:600, boxShadow:"0 4px 20px rgba(0,0,0,0.25)", whiteSpace:"nowrap", zIndex:2000, animation:"fadeIn 0.2s ease" }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
