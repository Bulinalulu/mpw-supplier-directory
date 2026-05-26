import { useState, useEffect, useRef, createContext, useContext } from "react";

// ── Supabase ───────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://boxiezoqibfczozevxzu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJveGllem9xaWJmY3pvemV2eHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2ODk1MTMsImV4cCI6MjA5NTI2NTUxM30.AdLmdgHcCkmfdpQVBLifFERtD6kpn87-bZ4H5RFpyoE";
const HDR = {
  "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json", "Prefer": "return=representation",
};
const db = {
  suppliers: {
    list:   ()       => fetch(`${SUPABASE_URL}/rest/v1/suppliers?order=name.asc`, { headers: HDR }).then(r => r.json()),
    insert: (row)    => fetch(`${SUPABASE_URL}/rest/v1/suppliers`, { method:"POST", headers: HDR, body: JSON.stringify(row) }).then(r => r.json()),
    update: (id,row) => fetch(`${SUPABASE_URL}/rest/v1/suppliers?id=eq.${id}`, { method:"PATCH", headers: HDR, body: JSON.stringify(row) }).then(r => r.json()),
    delete: (id)     => fetch(`${SUPABASE_URL}/rest/v1/suppliers?id=eq.${id}`, { method:"DELETE", headers: HDR }).then(r => r.ok),
  },
  projects: {
    list:   ()       => fetch(`${SUPABASE_URL}/rest/v1/projects?order=name.asc`, { headers: HDR }).then(r => r.json()),
    insert: (row)    => fetch(`${SUPABASE_URL}/rest/v1/projects`, { method:"POST", headers: HDR, body: JSON.stringify(row) }).then(r => r.json()),
    update: (id,row) => fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${id}`, { method:"PATCH", headers: HDR, body: JSON.stringify(row) }).then(r => r.json()),
    delete: (id)     => fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${id}`, { method:"DELETE", headers: HDR }).then(r => r.ok),
  },
  rfq: {
    list:   ()       => fetch(`${SUPABASE_URL}/rest/v1/rfq_records?order=created_at.desc`, { headers: HDR }).then(r => r.json()),
    insert: (row)    => fetch(`${SUPABASE_URL}/rest/v1/rfq_records`, { method:"POST", headers: HDR, body: JSON.stringify(row) }).then(r => r.json()),
    update: (id, row) => fetch(`${SUPABASE_URL}/rest/v1/rfq_records?id=eq.${id}`, { method:"PATCH", headers: HDR, body: JSON.stringify(row) }).then(r => r.json()),
    delete: (id)      => fetch(`${SUPABASE_URL}/rest/v1/rfq_records?id=eq.${id}`, { method:"DELETE", headers: HDR }).then(r => r.ok),
    updateStatus: (record, newStatus) => {
      const entry = { from: record.status, to: newStatus, at: new Date().toISOString() };
      const history = [...(record.status_history||[]), entry];
      return fetch(`${SUPABASE_URL}/rest/v1/rfq_records?id=eq.${record.id}`, {
        method:"PATCH", headers: HDR,
        body: JSON.stringify({ status: newStatus, status_history: history, updated_at: new Date().toISOString() })
      }).then(r => r.json());
    },
  },
};

// ── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = ["Plant Hire","Building Materials","PPE / Safety","Civil Works","Transport / Logistics","Office Supplies","Fuel / Lubricants"];
const UNITS = ["Each","Hours","Pair","Set","m","m²","m³","kg","tonne","L","Box","Roll","Sheet","Bag","Pack","Item"];
const PROJECT_STATUSES = ["Active","On Hold","Completed"];
const SCOPE_PRESETS = [
  { label:"Roads / Civil",      text:"Supply and delivery of materials and equipment for road maintenance and civil works." },
  { label:"PPE / Safety",       text:"Supply and delivery of personal protective equipment (PPE) and safety workwear for field staff." },
  { label:"Building Materials", text:"Supply and delivery of building materials and associated hardware." },
  { label:"Electrical",         text:"Supply and delivery of electrical materials and fittings." },
];
const STATUS_META = {
  Draft:  { color:"#000080", next:"Issued", nextLabel:"Mark as Issued", prev:null,    prevLabel:null             },
  Issued: { color:"#008000", next:"Closed", nextLabel:"Mark as Closed", prev:"Draft", prevLabel:"Revert to Draft" },
  Closed: { color:"#800000", next:null,     nextLabel:null,             prev:"Issued",prevLabel:"Revert to Issued"},
};
const PROJ_STATUS_COLOR = { Active:"#008000", "On Hold":"#808000", Completed:"#000080" };


// ── Mobile context ────────────────────────────────────────────────────────
const MobileCtx = createContext(false);
const useMob = () => useContext(MobileCtx);

// ── Win95 Design System ────────────────────────────────────────────────────
const W = {
  bg:   '#c0c0c0',
  font: '"MS Sans Serif", Tahoma, Arial, sans-serif',
  raised: { borderTop:'2px solid #ffffff', borderLeft:'2px solid #ffffff', borderBottom:'2px solid #808080', borderRight:'2px solid #808080' },
  sunken: { borderTop:'2px solid #808080', borderLeft:'2px solid #808080', borderBottom:'2px solid #dfdfdf', borderRight:'2px solid #dfdfdf' },
  deep:   { borderTop:'2px solid #404040', borderLeft:'2px solid #404040', borderBottom:'2px solid #dfdfdf', borderRight:'2px solid #dfdfdf' },
};
const btn  = (extra={}) => ({ ...W.raised, background:'#c0c0c0', cursor:'pointer', padding:'4px 16px', fontFamily:W.font, fontSize:11, color:'#000000', whiteSpace:'nowrap', ...extra });
const inp  = (extra={}) => ({ ...W.sunken, background:'#ffffff', padding:'3px 5px', fontFamily:W.font, fontSize:11, color:'#000000', outline:'none', width:'100%', boxSizing:'border-box', ...extra });
const sel  = (extra={}) => ({ ...W.sunken, background:'#ffffff', padding:'2px 4px', fontFamily:W.font, fontSize:11, color:'#000000', outline:'none', width:'100%', boxSizing:'border-box', ...extra });

const css = String.raw;
const globalStyles = css`
  *, *::before, *::after { box-sizing: border-box; }
  body { margin:0; background:#008080; font-family:"MS Sans Serif",Tahoma,Arial,sans-serif; font-size:11px; }
  @keyframes spin { to { transform:rotate(360deg); } }
  input, select, textarea, button { font-family:"MS Sans Serif",Tahoma,Arial,sans-serif; font-size:11px; }
  ::-webkit-scrollbar { width:16px; height:16px; }
  ::-webkit-scrollbar-track { background:#c0c0c0; }
  ::-webkit-scrollbar-thumb { background:#c0c0c0; border-top:2px solid #ffffff; border-left:2px solid #ffffff; border-bottom:2px solid #808080; border-right:2px solid #808080; }
  ::-webkit-scrollbar-button { background:#c0c0c0; border-top:2px solid #ffffff; border-left:2px solid #ffffff; border-bottom:2px solid #808080; border-right:2px solid #808080; display:block; height:16px; width:16px; }
  @media (max-width:640px) {
    ::-webkit-scrollbar { width:4px; height:4px; }
    ::-webkit-scrollbar-button { display:none; }
    body { background:#c0c0c0; }
    input, select, textarea, button { font-size:13px !important; }
  }
`;

// ── Shared Win95 Components ────────────────────────────────────────────────
function W95Btn({ onClick, disabled, children, style={} }) {
  const [pressed, setPressed] = useState(false);
  const s = disabled
    ? { ...btn(), color:'#808080', cursor:'not-allowed', ...style }
    : pressed
      ? { ...btn(), borderTop:'2px solid #808080', borderLeft:'2px solid #808080', borderBottom:'2px solid #ffffff', borderRight:'2px solid #ffffff', ...style }
      : { ...btn(), ...style };
  return (
    <button style={s} onClick={disabled?null:onClick} disabled={disabled}
      onMouseDown={()=>setPressed(true)} onMouseUp={()=>setPressed(false)} onMouseLeave={()=>setPressed(false)}>
      {children}
    </button>
  );
}

function W95GroupBox({ title, children, style={} }) {
  return (
    <div style={{ position:'relative', border:'none', marginBottom:10, paddingTop:10, ...style }}>
      <div style={{ ...W.sunken, padding:'12px 8px 8px', position:'relative' }}>
        <span style={{ position:'absolute', top:-8, left:8, background:'#c0c0c0', padding:'0 4px', fontFamily:W.font, fontSize:11, fontWeight:'bold' }}>{title}</span>
        {children}
      </div>
    </div>
  );
}

function W95Dialog({ title, onClose, children, width=480 }) {
  const mobile = useMob();
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:mobile?'flex-start':'center', justifyContent:'center', padding:mobile?0:16, overflowY:'auto' }}>
      <div style={{ background:'#c0c0c0', ...W.raised, width:'100%', maxWidth:mobile?'100%':width, fontFamily:W.font, ...(mobile&&{minHeight:'100dvh'}) }}>
        {/* Title bar */}
        <div style={{ background:'linear-gradient(to right,#000080,#1084d0)', padding:mobile?'6px 8px':'3px 4px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ color:'#fff', fontWeight:'bold', fontSize:mobile?13:11 }}>📋 {title}</span>
          <button onClick={onClose} style={{ ...W.raised, background:'#c0c0c0', border:'none', borderTop:'2px solid #ffffff', borderLeft:'2px solid #ffffff', borderBottom:'2px solid #808080', borderRight:'2px solid #808080', width:mobile?28:18, height:mobile?24:16, fontSize:mobile?13:10, cursor:'pointer', padding:0, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>
        <div style={{ padding:mobile?16:12 }}>{children}</div>
      </div>
    </div>
  );
}

function W95Field({ label, children, style={} }) {
  return (
    <div style={{ marginBottom:8, ...style }}>
      <div style={{ fontFamily:W.font, fontSize:11, marginBottom:2 }}>{label}</div>
      {children}
    </div>
  );
}

function Spinner() {
  return <div style={{ width:16, height:16, border:'2px solid #808080', borderTopColor:'#000080', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />;
}

function fmt(d)   { if(!d) return "—"; try { return new Date(d+"T00:00:00").toLocaleDateString("en-FJ",{day:"2-digit",month:"short",year:"numeric"}); } catch { return d; } }
function fmtTs(ts){ if(!ts) return "—"; try { return new Date(ts).toLocaleDateString("en-FJ",{day:"2-digit",month:"short",year:"numeric"}); } catch { return ts; } }
function fmtLong(d){ if(!d) return ""; try { return new Date(d+"T00:00:00").toLocaleDateString("en-FJ",{day:"numeric",month:"long",year:"numeric"}); } catch { return d; } }

// ── Project Register ───────────────────────────────────────────────────────
function ProjectForm({ initial, onSave, onCancel }) {
  const mobile = useMob();
  const [form, setForm] = useState(initial || { name:"", description:"", location:"", status:"Active" });
  const [err, setErr] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const save = () => { if(!form.name.trim()){setErr("Project name is required.");return;} onSave(form); };
  return (
    <div>
      <W95Field label="Project Name *"><input style={inp()} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. NAWAWA ROAD MAINTENANCE" /></W95Field>
      <W95Field label="Location"><input style={inp()} value={form.location||""} onChange={e=>set("location",e.target.value)} placeholder="e.g. Nadi (Western Division)" /></W95Field>
      <W95Field label="Description"><textarea style={inp({minHeight:56,resize:"vertical"})} value={form.description||""} onChange={e=>set("description",e.target.value)} /></W95Field>
      <W95Field label="Status">
        <select style={sel()} value={form.status} onChange={e=>set("status",e.target.value)}>
          {PROJECT_STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
      </W95Field>
      {err && <p style={{ color:'#800000', marginBottom:8 }}>{err}</p>}
      <div style={{ display:"flex", justifyContent:"flex-end", gap:6, marginTop:12, paddingTop:8, borderTop:'1px solid #808080' }}>
        <W95Btn onClick={onCancel}>Cancel</W95Btn>
        <W95Btn onClick={save}>OK</W95Btn>
      </div>
    </div>
  );
}

function ProjectRegister({ projects, rfqRecords, loading, onRefresh, onProjectCreated }) {
  const [modal, setModal]   = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const getRFQs = (proj) => rfqRecords.filter(r => r.project === proj.name);

  const filtered = projects.filter(p => {
    if(statusFilter!=="All" && p.status!==statusFilter) return false;
    return !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.location||"").toLowerCase().includes(search.toLowerCase());
  });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if(modal.type==="edit") {
        await db.projects.update(modal.project.id, { ...form, updated_at: new Date().toISOString() });
        await onRefresh();
      } else {
        const proj = { ...form, id:"proj_"+Date.now(), created_at:new Date().toISOString(), updated_at:new Date().toISOString() };
        await db.projects.insert(proj);
        onProjectCreated(proj);
      }
      setModal(null);
    } catch{}
    setSaving(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    await db.projects.delete(modal.project.id);
    await onRefresh(); setModal(null); setSelected(null);
    setSaving(false);
  };

  return (
    <div style={{ padding:8, fontFamily:W.font }}>
      {/* Toolbar */}
      <div style={{ display:"flex", gap:4, marginBottom:8, alignItems:"center", flexWrap:"wrap" }}>
        <W95Btn onClick={()=>setModal({type:"add"})}>📁 New Project</W95Btn>
        <W95Btn onClick={()=>selected&&setModal({type:"edit",project:selected})} disabled={!selected}>✏ Edit</W95Btn>
        <W95Btn onClick={()=>selected&&setModal({type:"delete",project:selected})} disabled={!selected}>🗑 Delete</W95Btn>
        <div style={{ marginLeft:8, display:"flex", gap:4, alignItems:"center" }}>
          <span>Search:</span>
          <input style={inp({width:160})} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Project name or location" />
          <span>Status:</span>
          <select style={sel({width:100})} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option value="All">All</option>
            {PROJECT_STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <W95Btn onClick={onRefresh} style={{ marginLeft:"auto" }}>↻ Refresh</W95Btn>
      </div>

      {/* Stats row */}
      <div style={{ display:"flex", gap:8, marginBottom:8 }}>
        {PROJECT_STATUSES.map(s=>(
          <div key={s} style={{ ...W.sunken, background:"#fff", padding:"4px 12px", display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ color:PROJ_STATUS_COLOR[s], fontWeight:"bold" }}>●</span>
            <span>{s}: {projects.filter(p=>p.status===s).length}</span>
          </div>
        ))}
        <div style={{ ...W.sunken, background:"#fff", padding:"4px 12px" }}>Total RFQs: {rfqRecords.length}</div>
      </div>

      {/* Project list */}
      <div style={{ ...W.sunken, background:"#fff", minHeight:200, maxHeight:420, overflowY:"auto", overflowX:"auto" }}>
        {/* Header */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 80px 60px 80px 80px", background:"#c0c0c0", borderBottom:"2px solid #808080", position:"sticky", top:0 }}>
          {["Project Name","Location","Status","RFQs","Latest","Created"].map(h=>(
            <div key={h} style={{ ...W.raised, padding:"3px 6px", fontWeight:"bold", fontSize:11 }}>{h}</div>
          ))}
        </div>
        {loading ? (
          <div style={{ padding:24, textAlign:"center" }}><Spinner /> Loading…</div>
        ) : filtered.length===0 ? (
          <div style={{ padding:24, textAlign:"center", color:"#808080" }}>No projects found.</div>
        ) : filtered.map(p => {
          const rfqs = getRFQs(p);
          const latest = rfqs[0];
          const isSelected = selected?.id === p.id;
          return (
            <div key={p.id} onClick={()=>setSelected(isSelected?null:p)} style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 80px 60px 80px 80px", background:isSelected?"#000080":"#fff", color:isSelected?"#fff":"#000", cursor:"pointer", borderBottom:"1px solid #e0e0e0" }}>
              <div style={{ padding:"3px 6px", fontWeight:"bold" }}>📁 {p.name}</div>
              <div style={{ padding:"3px 6px" }}>{p.location||"—"}</div>
              <div style={{ padding:"3px 6px" }}>
                <span style={{ color:isSelected?"#fff":PROJ_STATUS_COLOR[p.status]||"#000", fontWeight:"bold" }}>● </span>{p.status}
              </div>
              <div style={{ padding:"3px 6px", textAlign:"center" }}>{rfqs.length}</div>
              <div style={{ padding:"3px 6px", fontSize:10 }}>{latest ? fmtTs(latest.created_at) : "—"}</div>
              <div style={{ padding:"3px 6px", fontSize:10 }}>{fmtTs(p.created_at)}</div>
            </div>
          );
        })}
      </div>

      {/* Detail panel for selected project */}
      {selected && (() => {
        const rfqs = getRFQs(selected);
        return (
          <div style={{ marginTop:8 }}>
            <W95GroupBox title={`RFQs — ${selected.name}`}>
              {rfqs.length===0
                ? <div style={{ padding:"8px 0", color:"#808080" }}>No RFQs for this project yet.</div>
                : <div style={{ ...W.sunken, background:"#fff", maxHeight:160, overflowY:"auto" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"120px 1fr 100px 80px", background:"#c0c0c0", borderBottom:"2px solid #808080", position:"sticky", top:0 }}>
                      {["BRBN","Project","Closing","Status"].map(h=>(
                        <div key={h} style={{ ...W.raised, padding:"3px 6px", fontWeight:"bold", fontSize:11 }}>{h}</div>
                      ))}
                    </div>
                    {rfqs.map(r=>(
                      <div key={r.id} style={{ display:"grid", gridTemplateColumns:"120px 1fr 100px 80px", borderBottom:"1px solid #e0e0e0" }}>
                        <div style={{ padding:"3px 6px" }}>{r.brbn}</div>
                        <div style={{ padding:"3px 6px" }}>{r.project}</div>
                        <div style={{ padding:"3px 6px", fontSize:10 }}>{fmt(r.closing_date)}</div>
                        <div style={{ padding:"3px 6px", color:STATUS_META[r.status]?.color||"#000", fontWeight:"bold" }}>{r.status}</div>
                      </div>
                    ))}
                  </div>
              }
            </W95GroupBox>
          </div>
        );
      })()}

      {/* Dialogs */}
      {modal?.type==="add"    && <W95Dialog title="New Project" onClose={()=>setModal(null)}><ProjectForm onSave={handleSave} onCancel={()=>setModal(null)} /></W95Dialog>}
      {modal?.type==="edit"   && <W95Dialog title="Edit Project" onClose={()=>setModal(null)}><ProjectForm initial={modal.project} onSave={handleSave} onCancel={()=>setModal(null)} /></W95Dialog>}
      {modal?.type==="delete" && (
        <W95Dialog title="Confirm Delete" onClose={()=>setModal(null)} width={360}>
          <p>Delete project <strong>{modal.project.name}</strong>? This cannot be undone.</p>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:6, marginTop:12 }}>
            <W95Btn onClick={()=>setModal(null)}>Cancel</W95Btn>
            <W95Btn onClick={handleDelete} disabled={saving}>{saving?"Deleting…":"Delete"}</W95Btn>
          </div>
        </W95Dialog>
      )}
    </div>
  );
}

// ── Supplier Directory ─────────────────────────────────────────────────────
const EMPTY_SUPP = { name:"", email:"", phone:"", address:"", location:"", category:CATEGORIES[0], specialties:"", last_verified:"", tcc_reference:"", tcc_issue_date:"", notes:"", website:"", contact_name:"", contact_position:"", contact_mobiles:"" };

function SupplierForm({ initial, onSave, onCancel }) {
  const mobile = useMob();
  const [form, setForm] = useState(initial || EMPTY_SUPP);
  const [err, setErr] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const save = () => { if(!form.name.trim()){setErr("Name is required.");return;} onSave(form); };
  return (
    <div style={{ display:"flex", flexDirection:"column" }}>
      <div style={{ maxHeight:mobile?"calc(100dvh - 160px)":"62vh", overflowY:"auto", paddingRight:4 }}>
        <div style={{ display:"grid", gridTemplateColumns:mobile?"1fr":"1fr 1fr", gap:"0 12px" }}>
          <div style={{ gridColumn:"1/-1" }}><W95Field label="Supplier Name *"><input style={inp({borderColor:err?"#800000":undefined})} value={form.name} onChange={e=>set("name",e.target.value)} /></W95Field></div>
          <W95Field label="Category"><select style={sel()} value={form.category} onChange={e=>set("category",e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></W95Field>
          <W95Field label="Email"><input style={inp()} type="email" value={form.email||""} onChange={e=>set("email",e.target.value)} /></W95Field>
          <W95Field label="Phone"><input style={inp()} value={form.phone||""} onChange={e=>set("phone",e.target.value)} /></W95Field>
          <W95Field label="Location"><input style={inp()} value={form.location||""} onChange={e=>set("location",e.target.value)} /></W95Field>
          <div style={{ gridColumn:"1/-1" }}><W95Field label="Address"><input style={inp()} value={form.address||""} onChange={e=>set("address",e.target.value)} /></W95Field></div>
          <div style={{ gridColumn:"1/-1" }}><W95Field label="Website"><input style={inp()} type="url" value={form.website||""} onChange={e=>set("website",e.target.value)} /></W95Field></div>
          <div style={{ gridColumn:"1/-1" }}><W95Field label="Specialties"><input style={inp()} value={form.specialties||""} onChange={e=>set("specialties",e.target.value)} placeholder="Comma-separated" /></W95Field></div>
          <div style={{ gridColumn:"1/-1", borderTop:"1px solid #808080", marginTop:4, paddingTop:8 }}>
            <div style={{ fontWeight:"bold", marginBottom:6 }}>Contact Person</div>
          </div>
          <W95Field label="Contact Name"><input style={inp()} value={form.contact_name||""} onChange={e=>set("contact_name",e.target.value)} /></W95Field>
          <W95Field label="Position"><input style={inp()} value={form.contact_position||""} onChange={e=>set("contact_position",e.target.value)} /></W95Field>
          <div style={{ gridColumn:"1/-1" }}><W95Field label="Mobile(s)"><input style={inp()} value={form.contact_mobiles||""} onChange={e=>set("contact_mobiles",e.target.value)} placeholder="e.g. 9917971, 7717971" /></W95Field></div>
          <div style={{ gridColumn:"1/-1", borderTop:"1px solid #808080", marginTop:4, paddingTop:8 }}>
            <div style={{ fontWeight:"bold", marginBottom:6 }}>Tax Compliance Certificate</div>
          </div>
          <W95Field label="TCC Reference"><input style={inp()} value={form.tcc_reference||""} onChange={e=>set("tcc_reference",e.target.value)} /></W95Field>
          <W95Field label="TCC Issue Date"><input style={inp()} type="date" value={form.tcc_issue_date||""} onChange={e=>set("tcc_issue_date",e.target.value||null)} /></W95Field>
          <W95Field label="Last Verified"><input style={inp()} type="date" value={form.last_verified||""} onChange={e=>set("last_verified",e.target.value||null)} /></W95Field>
          <div style={{ gridColumn:"1/-1" }}><W95Field label="Notes"><textarea style={inp({minHeight:56,resize:"vertical"})} value={form.notes||""} onChange={e=>set("notes",e.target.value)} /></W95Field></div>
        </div>
      </div>
      {err && <p style={{ color:"#800000", margin:"4px 0" }}>{err}</p>}
      <div style={{ display:"flex", justifyContent:"flex-end", gap:6, marginTop:12, paddingTop:8, borderTop:"1px solid #808080" }}>
        <W95Btn onClick={onCancel}>Cancel</W95Btn>
        <W95Btn onClick={save}>OK</W95Btn>
      </div>
    </div>
  );
}

function SupplierDirectory({ suppliers, loading, onRefresh, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState(""); const [cat, setCat] = useState("All");
  const [selected, setSelected] = useState(null); const [expanded, setExpanded] = useState(null);
  const filtered = suppliers.filter(s => {
    if(cat!=="All"&&s.category!==cat) return false;
    const q=search.toLowerCase();
    return !q||[s.name,s.email,s.specialties,s.location,s.contact_name].some(v=>(v||"").toLowerCase().includes(q));
  });
  return (
    <div style={{ padding:8, fontFamily:W.font }}>
      {/* Toolbar */}
      <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap", alignItems:"center" }}>
        <W95Btn onClick={onAdd}>➕ Add Supplier</W95Btn>
        <W95Btn onClick={()=>selected&&onEdit(selected)} disabled={!selected}>✏ Edit</W95Btn>
        <W95Btn onClick={()=>selected&&onDelete(selected)} disabled={!selected}>🗑 Delete</W95Btn>
        <span style={{ marginLeft:8 }}>Search:</span>
        <input style={inp({width:200})} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, email, specialty…" />
        <span>Category:</span>
        <select style={sel({width:130})} value={cat} onChange={e=>setCat(e.target.value)}>
          <option value="All">All</option>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        <W95Btn onClick={onRefresh} style={{ marginLeft:"auto" }}>↻ Refresh</W95Btn>
      </div>
      {/* Stats */}
      <div style={{ display:"flex", gap:8, marginBottom:8 }}>
        {[["Total",suppliers.length],["RFQ-Ready",suppliers.filter(s=>s.email).length],["No Email",suppliers.filter(s=>!s.email).length]].map(([l,v])=>(
          <div key={l} style={{ ...W.sunken, background:"#fff", padding:"3px 10px" }}>{l}: <strong>{v}</strong></div>
        ))}
        <div style={{ ...W.sunken, background:"#fff", padding:"3px 10px" }}>Shown: <strong>{filtered.length}</strong></div>
      </div>
      {/* List */}
      <div style={{ ...W.sunken, background:"#fff", minHeight:200, maxHeight:460, overflowY:"auto", overflowX:"auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"20px 2fr 1.5fr 1.2fr 1fr 80px", background:"#c0c0c0", borderBottom:"2px solid #808080", position:"sticky", top:0 }}>
          {["","Name","Category","Contact","Location","Verified"].map(h=>(
            <div key={h} style={{ ...W.raised, padding:"3px 5px", fontWeight:"bold", fontSize:11 }}>{h}</div>
          ))}
        </div>
        {loading ? <div style={{ padding:24, textAlign:"center" }}><Spinner /> Loading…</div>
          : filtered.length===0 ? <div style={{ padding:24, textAlign:"center", color:"#808080" }}>No suppliers found.</div>
          : filtered.map(s => {
            const isSelected = selected?.id===s.id;
            const isExpanded = expanded===s.id;
            const hasEmail = s.email&&s.email.trim();
            return (
              <div key={s.id}>
                <div onClick={()=>{setSelected(isSelected?null:s);setExpanded(isExpanded?null:s.id);}}
                  style={{ display:"grid", gridTemplateColumns:"20px 2fr 1.5fr 1.2fr 1fr 80px", background:isSelected?"#000080":"#fff", color:isSelected?"#fff":"#000", cursor:"pointer", borderBottom:"1px solid #e0e0e0" }}>
                  <div style={{ padding:"3px 4px", textAlign:"center" }}>{hasEmail?"✉":"⚠"}</div>
                  <div style={{ padding:"3px 5px", fontWeight:"bold" }}>📦 {s.name}</div>
                  <div style={{ padding:"3px 5px", fontSize:10 }}>{s.category}</div>
                  <div style={{ padding:"3px 5px", fontSize:10 }}>{s.contact_name||"—"}</div>
                  <div style={{ padding:"3px 5px", fontSize:10 }}>{s.location||"—"}</div>
                  <div style={{ padding:"3px 5px", fontSize:10 }}>{fmt(s.last_verified)}</div>
                </div>
                {isExpanded && (
                  <div style={{ background:"#f0f0f0", padding:"6px 12px", borderBottom:"1px solid #c0c0c0", fontSize:10, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"4px 16px" }}>
                    {s.email && <div><span style={{ color:"#808080" }}>Email: </span>{s.email}</div>}
                    {s.phone && <div><span style={{ color:"#808080" }}>Phone: </span>{s.phone}</div>}
                    {s.contact_mobiles && <div><span style={{ color:"#808080" }}>Mobile: </span>{s.contact_mobiles}</div>}
                    {s.contact_position && <div><span style={{ color:"#808080" }}>Position: </span>{s.contact_position}</div>}
                    {s.address && <div style={{ gridColumn:"1/-1" }}><span style={{ color:"#808080" }}>Address: </span>{s.address}</div>}
                    {s.specialties && <div style={{ gridColumn:"1/-1" }}><span style={{ color:"#808080" }}>Specialties: </span>{s.specialties}</div>}
                    {s.tcc_reference && <div><span style={{ color:"#808080" }}>TCC: </span>{s.tcc_reference}</div>}
                    {s.notes && <div style={{ gridColumn:"1/-1" }}><span style={{ color:"#808080" }}>Notes: </span>{s.notes}</div>}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ── RFQ Generator ──────────────────────────────────────────────────────────
function triggerDownload(filename, contentB64) {
  const bytes = Uint8Array.from(atob(contentB64), c=>c.charCodeAt(0));
  const blob  = new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement("a");
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

function RFQGenerator({ suppliers, projects, onGenerated, onProjectCreated }) {
  const mobile = useMob();
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm]           = useState({ project:"", brbn:"", date:today, scope:"", closingTime:"12:00 PM", closingDate:"" });
  const [items, setItems]         = useState([{id:1,description:"",qty:"1",unit:"Each"}]);
  const [selIds, setSelIds]       = useState([]);
  const [recipientsNotes, setRecipientsNotes] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [suppSearch, setSuppSearch] = useState("");
  const [errors, setErrors]       = useState({});
  const [status, setStatus]       = useState(null);
  const [genError, setGenError]   = useState("");
  const [newProjModal, setNewProjModal] = useState(false);

  const setF = (k,v) => setForm(f=>({...f,[k]:v}));
  const emailSuppliers = suppliers.filter(s=>s.email&&s.email.trim());
  const addItem = () => setItems(it=>[...it,{id:Date.now(),description:"",qty:"1",unit:"Each"}]);
  const removeItem = id => setItems(it=>it.filter(i=>i.id!==id));
  const setItem = (id,k,v) => setItems(it=>it.map(i=>i.id===id?{...i,[k]:v}:i));
  const toggle = id => setSelIds(sel=>sel.includes(id)?sel.filter(s=>s!==id):sel.length<10?[...sel,id]:sel);

  const visibleSuppliers = emailSuppliers.filter(s=>{
    if(catFilter!=="All"&&s.category!==catFilter) return false;
    const q=suppSearch.toLowerCase();
    return !q||[s.name,s.category,s.location].some(v=>(v||"").toLowerCase().includes(q));
  });

  const validate = () => {
    const e={};
    if(!form.project.trim()) e.project="Required";
    if(!form.brbn.trim())    e.brbn="Required";
    if(!form.closingDate)    e.closingDate="Required";
    if(!items.some(i=>i.description.trim())) e.items="Add at least one item";
    if(selIds.length<3)      e.recipients=`Select at least 3 (${selIds.length} selected)`;
    setErrors(e); return Object.keys(e).length===0;
  };

  const handleNewProject = async (projForm) => {
    const proj = { ...projForm, id:"proj_"+Date.now(), created_at:new Date().toISOString(), updated_at:new Date().toISOString() };
    await db.projects.insert(proj);
    onProjectCreated(proj);
    setF("project", projForm.name);
    setNewProjModal(false);
  };

  const generate = async () => {
    if(!validate()) return;
    setStatus("generating"); setGenError("");
    try {
      const resp = await fetch("/.netlify/functions/generate-rfq", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ form, items }),
      });
      if(!resp.ok){ const e=await resp.json().catch(()=>({error:"Server error"})); throw new Error(e.error||"Generation failed"); }
      const { filename, contentB64 } = await resp.json();
      triggerDownload(filename, contentB64);
      setStatus("saving");
      const chosen = suppliers.filter(s=>selIds.includes(s.id));
      await db.rfq.insert({
        id:"rfq_"+Date.now(), brbn:form.brbn, project:form.project, doc_date:form.date,
        scope:form.scope, closing_time:form.closingTime, closing_date:form.closingDate,
        items:JSON.stringify(items.filter(i=>i.description.trim())),
        supplier_ids:JSON.stringify(chosen.map(s=>s.id)),
        supplier_names:JSON.stringify(chosen.map(s=>s.name)),
        recipients_notes:recipientsNotes.trim()||null,
        status:"Draft", created_at:new Date().toISOString(), updated_at:new Date().toISOString(),
        status_history:JSON.stringify([]),
      });
      setStatus("done"); if(onGenerated) onGenerated();
    } catch(err){ setGenError(err.message); setStatus("error"); }
  };

  const reset = () => {
    setForm({project:"",brbn:"",date:today,scope:"",closingTime:"12:00 PM",closingDate:""});
    setItems([{id:1,description:"",qty:"1",unit:"Each"}]);
    setSelIds([]); setRecipientsNotes(""); setStatus(null); setGenError(""); setErrors({});
  };

  if(status==="done") return (
    <div style={{ padding:24, textAlign:"center", fontFamily:W.font }}>
      <p style={{ fontSize:32, margin:"0 0 8px" }}>✅</p>
      <p style={{ fontWeight:"bold", marginBottom:8 }}>RFQ generated and downloaded successfully.</p>
      <p style={{ color:"#808080", marginBottom:16 }}>Record saved to RFQ Register.</p>
      <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
        <W95Btn onClick={reset}>New RFQ</W95Btn>
        <W95Btn onClick={onGenerated}>View in RFQ Register →</W95Btn>
      </div>
    </div>
  );

  return (
    <div style={{ padding:8, fontFamily:W.font, maxHeight:"calc(100vh - 120px)", overflowY:"auto" }}>

      {/* Section 1 — Project Details */}
      <W95GroupBox title="1. Project Details">
        <div style={{ display:"grid", gridTemplateColumns:mobile?"1fr":"1fr 1fr", gap:"0 12px" }}>
          {/* Project picker */}
          <div style={{ gridColumn:"1/-1" }}>
            <W95Field label={<span>Project Name {errors.project&&<span style={{color:"#800000"}}> — {errors.project}</span>}</span>}>
              <div style={{ display:"flex", gap:4 }}>
                <select style={sel({flex:1,borderColor:errors.project?"#800000":undefined})}
                  value={form.project} onChange={e=>setF("project",e.target.value)}>
                  <option value="">— Select or type project —</option>
                  {projects.map(p=><option key={p.id} value={p.name}>{p.name}{p.location?` (${p.location})`:""}</option>)}
                </select>
                <W95Btn onClick={()=>setNewProjModal(true)} style={{ padding:"3px 8px" }}>+ New</W95Btn>
              </div>
              <input style={inp({marginTop:4})} value={form.project} onChange={e=>setF("project",e.target.value)} placeholder="Or type project name directly" />
            </W95Field>
          </div>
          <W95Field label={<span>BRBN {errors.brbn&&<span style={{color:"#800000"}}> — {errors.brbn}</span>}</span>}>
            <input style={inp({borderColor:errors.brbn?"#800000":undefined})} value={form.brbn} onChange={e=>setF("brbn",e.target.value)} placeholder="e.g. 314/25/26" />
          </W95Field>
          <W95Field label="Document Date">
            <input style={inp()} type="date" value={form.date} onChange={e=>setF("date",e.target.value)} />
          </W95Field>
          <W95Field label="Closing Time">
            <select style={sel()} value={form.closingTime} onChange={e=>setF("closingTime",e.target.value)}>
              {["9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM"].map(t=><option key={t}>{t}</option>)}
            </select>
          </W95Field>
          <W95Field label={<span>Closing Date {errors.closingDate&&<span style={{color:"#800000"}}> — {errors.closingDate}</span>}</span>}>
            <input style={inp({borderColor:errors.closingDate?"#800000":undefined})} type="date" value={form.closingDate} onChange={e=>setF("closingDate",e.target.value)} />
          </W95Field>
        </div>
        <W95Field label="Scope of Works">
          <div style={{ display:"flex", gap:4, marginBottom:4, flexWrap:"wrap" }}>
            {SCOPE_PRESETS.map(p=>(
              <W95Btn key={p.label} onClick={()=>setF("scope",p.text)} style={{ padding:"2px 8px", fontSize:10, background:form.scope===p.text?"#000080":undefined, color:form.scope===p.text?"#fff":undefined }}>{p.label}</W95Btn>
            ))}
          </div>
          <textarea style={inp({minHeight:56,resize:"vertical"})} value={form.scope} onChange={e=>setF("scope",e.target.value)} placeholder="Describe scope of works…" />
        </W95Field>
      </W95GroupBox>

      {/* Section 2 — Line Items */}
      <W95GroupBox title="2. Line Items">
        {errors.items && <p style={{ color:"#800000", margin:"0 0 6px" }}>{errors.items}</p>}
        <div style={{ ...W.sunken, background:"#fff", marginBottom:8, overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, minWidth:480 }}>
            <thead>
              <tr style={{ background:"#c0c0c0" }}>
                {["#","Description","Qty","Unit",""].map((h,i)=>(
                  <th key={i} style={{ ...W.raised, padding:"3px 6px", textAlign:"left", fontWeight:"bold" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item,idx)=>(
                <tr key={item.id} style={{ borderBottom:"1px solid #e0e0e0" }}>
                  <td style={{ padding:"3px 6px", width:24, color:"#808080" }}>{idx+1}</td>
                  <td style={{ padding:"2px 4px" }}><input style={inp({padding:"2px 4px"})} value={item.description} onChange={e=>setItem(item.id,"description",e.target.value)} placeholder="Item description" /></td>
                  <td style={{ padding:"2px 4px", width:70 }}><input style={inp({padding:"2px 4px",textAlign:"right"})} type="number" min="0" step="0.01" value={item.qty} onChange={e=>setItem(item.id,"qty",e.target.value)} /></td>
                  <td style={{ padding:"2px 4px", width:90 }}><select style={sel({padding:"2px 4px"})} value={item.unit} onChange={e=>setItem(item.id,"unit",e.target.value)}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></td>
                  <td style={{ padding:"2px 4px", width:28, textAlign:"center" }}>{items.length>1&&<W95Btn onClick={()=>removeItem(item.id)} style={{ padding:"0 6px", minWidth:0 }}>✕</W95Btn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <W95Btn onClick={addItem}>+ Add Item</W95Btn>
      </W95GroupBox>

      {/* Section 3 — Recipients */}
      <W95GroupBox title="3. Recipients (min 3 required — for record only, does not affect document)">
        <div style={{ display:"flex", gap:4, marginBottom:6, flexWrap:"wrap", alignItems:"center" }}>
          <input value={suppSearch} onChange={e=>setSuppSearch(e.target.value)} placeholder="Search…" style={inp({width:160})} />
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={sel({width:120})}>
            <option value="All">All categories</option>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <span style={{ marginLeft:"auto", color:selIds.length>=3?"#008000":selIds.length>0?"#808000":"#800000", fontWeight:"bold" }}>
            {selIds.length} selected {selIds.length>=3?"✓":selIds.length>0?`(need ${3-selIds.length} more)`:"(min 3)"}
          </span>
        </div>
        {errors.recipients && <p style={{ color:"#800000", margin:"0 0 6px" }}>{errors.recipients}</p>}
        <div style={{ ...W.sunken, background:"#fff", maxHeight:200, overflowY:"auto", marginBottom:8 }}>
          {visibleSuppliers.length===0
            ? <div style={{ padding:12, color:"#808080" }}>No suppliers match.</div>
            : visibleSuppliers.map(s=>{
                const sel2=selIds.includes(s.id);
                return (
                  <div key={s.id} onClick={()=>toggle(s.id)} style={{ display:"flex", alignItems:"center", gap:6, padding:"3px 6px", background:sel2?"#000080":"#fff", color:sel2?"#fff":"#000", cursor:"pointer", borderBottom:"1px solid #e0e0e0" }}>
                    <input type="checkbox" readOnly checked={sel2} style={{ margin:0 }} />
                    <span style={{ fontWeight:"bold" }}>{s.name}</span>
                    <span style={{ fontSize:10, color:sel2?"#c0c0c0":"#808080" }}>{s.category}{s.location?` · ${s.location}`:""}</span>
                  </div>
                );
              })
          }
        </div>
        <W95Field label="Additional recipients not in directory (optional)">
          <input style={inp()} value={recipientsNotes} onChange={e=>setRecipientsNotes(e.target.value)} placeholder="e.g. Haroon's Hardware (hand-delivered)" />
        </W95Field>
      </W95GroupBox>

      {genError && <p style={{ color:"#800000", ...W.sunken, padding:"4px 8px", background:"#fff", marginBottom:8 }}>⚠ {genError}</p>}
      <div style={{ display:"flex", gap:8 }}>
        <W95Btn onClick={generate} disabled={!!status&&status!=="error"} style={{ padding:"6px 24px", fontWeight:"bold" }}>
          {status==="generating"?"⚙ Generating…":status==="saving"?"💾 Saving…":"Generate RFQ ↓"}
        </W95Btn>
        <W95Btn onClick={reset}>Reset Form</W95Btn>
      </div>

      {newProjModal && <W95Dialog title="New Project" onClose={()=>setNewProjModal(false)}><ProjectForm onSave={handleNewProject} onCancel={()=>setNewProjModal(false)} /></W95Dialog>}
    </div>
  );
}

// ── RFQ Preview ────────────────────────────────────────────────────────────
function RFQPreviewModal({ record, onClose }) {
  const containerRef = useRef(null);
  const styleRef     = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const form = { project:record.project, brbn:record.brbn, date:record.doc_date, scope:record.scope, closingTime:record.closing_time, closingDate:record.closing_date };
        const items = JSON.parse(record.items||"[]");
        const resp = await fetch("/.netlify/functions/generate-rfq", {
          method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({form,items}),
        });
        if(!resp.ok) throw new Error("Failed to generate preview");
        const { contentB64 } = await resp.json();
        if(cancelled) return;
        const bytes = Uint8Array.from(atob(contentB64), c=>c.charCodeAt(0));
        const blob  = new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
        const { renderAsync } = await import("docx-preview");
        await renderAsync(blob, containerRef.current, styleRef.current, { inWrapper:true, ignoreWidth:false, breakPages:true });
        if(!cancelled) setLoading(false);
      } catch(err) { if(!cancelled){setError(err.message);setLoading(false);} }
    }
    render();
    return ()=>{cancelled=true;};
  }, [record.id]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:2000, display:"flex", flexDirection:"column", alignItems:"center", padding:16, overflowY:"auto" }} onClick={onClose}>
      {/* Dialog chrome */}
      <div style={{ width:"100%", maxWidth:860, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:"linear-gradient(to right,#000080,#1084d0)", padding:"3px 4px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ color:"#fff", fontWeight:"bold", fontSize:11 }}>📄 RFQ Preview — BRBN {record.brbn} / {record.project}</span>
          <div style={{ display:"flex", gap:4 }}>
            <button onClick={()=>window.print()} style={{ ...btn(), padding:"2px 8px", fontSize:10 }}>🖨 Print</button>
            <button onClick={onClose} style={{ ...btn(), padding:"2px 8px", fontSize:10 }}>✕ Close</button>
          </div>
        </div>
        <div style={{ background:"#c0c0c0", ...W.raised, padding:8, marginBottom:32, position:"relative", minHeight:200 }}>
          {loading && <div style={{ padding:32, textAlign:"center" }}><Spinner /> <span style={{ marginLeft:8 }}>Rendering document…</span></div>}
          {error   && <div style={{ padding:32, color:"#800000" }}>⚠ {error}</div>}
          <div ref={styleRef} />
          <div ref={containerRef} style={{ display:loading?"none":"block" }} />
        </div>
      </div>
    </div>
  );
}

// ── RFQ Edit Modal ─────────────────────────────────────────────────────────
function RFQEditModal({ record, projects, onSave, onClose }) {
  const mobile = useMob();
  const [form, setForm] = useState({
    project: record.project || "",
    brbn: record.brbn || "",
    date: record.doc_date || "",
    scope: record.scope || "",
    closingTime: record.closing_time || "12:00 PM",
    closingDate: record.closing_date || "",
  });
  let parsedItems = [];
  try { parsedItems = JSON.parse(record.items || "[]"); } catch {}
  if (!parsedItems.length) parsedItems = [{ id: 1, description: "", qty: "1", unit: "Each" }];
  const [items, setItems]   = useState(parsedItems);
  const [recipientsNotes, setRecipientsNotes] = useState(record.recipients_notes || "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  let supplierNames = [];
  try { supplierNames = JSON.parse(record.supplier_names || "[]"); } catch {}

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addItem    = () => setItems(it => [...it, { id: Date.now(), description: "", qty: "1", unit: "Each" }]);
  const removeItem = id => setItems(it => it.filter(i => i.id !== id));
  const setItem    = (id, k, v) => setItems(it => it.map(i => i.id === id ? { ...i, [k]: v } : i));

  const validate = () => {
    const e = {};
    if (!form.project.trim())  e.project = "Required";
    if (!form.brbn.trim())     e.brbn = "Required";
    if (!form.closingDate)     e.closingDate = "Required";
    if (!items.some(i => i.description.trim())) e.items = "Add at least one item";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    await onSave(record.id, {
      brbn: form.brbn, project: form.project, doc_date: form.date,
      scope: form.scope, closing_time: form.closingTime, closing_date: form.closingDate,
      items: JSON.stringify(items.filter(i => i.description.trim())),
      recipients_notes: recipientsNotes.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
  };

  return (
    <W95Dialog title={`Edit RFQ — ${record.brbn}`} onClose={onClose} width={600}>
      <div style={{ maxHeight:"70vh", overflowY:"auto", paddingRight:4 }}>
        <W95GroupBox title="Project Details">
          <div style={{ display:"grid", gridTemplateColumns:mobile?"1fr":"1fr 1fr", gap:"0 12px" }}>
            <div style={{ gridColumn:"1/-1" }}>
              <W95Field label={<span>Project {errors.project&&<span style={{color:"#800000"}}> — {errors.project}</span>}</span>}>
                <div style={{ display:"flex", gap:4 }}>
                  <select style={sel({flex:1})} value={form.project} onChange={e=>setF("project",e.target.value)}>
                    <option value="">— Select —</option>
                    {projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                  <input style={inp({flex:1})} value={form.project} onChange={e=>setF("project",e.target.value)} placeholder="Or type…" />
                </div>
              </W95Field>
            </div>
            <W95Field label={<span>BRBN {errors.brbn&&<span style={{color:"#800000"}}> — {errors.brbn}</span>}</span>}>
              <input style={inp()} value={form.brbn} onChange={e=>setF("brbn",e.target.value)} />
            </W95Field>
            <W95Field label="Document Date">
              <input style={inp()} type="date" value={form.date} onChange={e=>setF("date",e.target.value)} />
            </W95Field>
            <W95Field label="Closing Time">
              <select style={sel()} value={form.closingTime} onChange={e=>setF("closingTime",e.target.value)}>
                {["9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM"].map(t=><option key={t}>{t}</option>)}
              </select>
            </W95Field>
            <W95Field label={<span>Closing Date {errors.closingDate&&<span style={{color:"#800000"}}> — {errors.closingDate}</span>}</span>}>
              <input style={inp()} type="date" value={form.closingDate} onChange={e=>setF("closingDate",e.target.value)} />
            </W95Field>
          </div>
          <W95Field label="Scope of Works">
            <textarea style={inp({minHeight:52,resize:"vertical"})} value={form.scope} onChange={e=>setF("scope",e.target.value)} />
          </W95Field>
        </W95GroupBox>

        <W95GroupBox title="Line Items">
          {errors.items && <p style={{color:"#800000",margin:"0 0 6px"}}>{errors.items}</p>}
          <div style={{...W.sunken,background:"#fff",marginBottom:8,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:400}}>
              <thead>
                <tr style={{background:"#c0c0c0"}}>
                  {["#","Description","Qty","Unit",""].map((h,i)=>(
                    <th key={i} style={{...W.raised,padding:"3px 6px",textAlign:"left"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item,idx)=>(
                  <tr key={item.id} style={{borderBottom:"1px solid #e0e0e0"}}>
                    <td style={{padding:"3px 6px",width:24,color:"#808080"}}>{idx+1}</td>
                    <td style={{padding:"2px 4px"}}><input style={inp({padding:"2px 4px"})} value={item.description} onChange={e=>setItem(item.id,"description",e.target.value)} /></td>
                    <td style={{padding:"2px 4px",width:70}}><input style={inp({padding:"2px 4px",textAlign:"right"})} type="number" min="0" step="0.01" value={item.qty} onChange={e=>setItem(item.id,"qty",e.target.value)} /></td>
                    <td style={{padding:"2px 4px",width:90}}><select style={sel({padding:"2px 4px"})} value={item.unit} onChange={e=>setItem(item.id,"unit",e.target.value)}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></td>
                    <td style={{padding:"2px 4px",width:28,textAlign:"center"}}>{items.length>1&&<W95Btn onClick={()=>removeItem(item.id)} style={{padding:"0 6px",minWidth:0}}>✕</W95Btn>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <W95Btn onClick={addItem}>+ Add Item</W95Btn>
        </W95GroupBox>

        <W95GroupBox title="Recipients">
          {supplierNames.length>0 && (
            <div style={{...W.sunken,background:"#fff",padding:"4px 8px",marginBottom:8,fontSize:10}}>
              {supplierNames.join(", ")}
            </div>
          )}
          <W95Field label="Additional recipients / notes">
            <input style={inp()} value={recipientsNotes} onChange={e=>setRecipientsNotes(e.target.value)} placeholder="e.g. Haroon's Hardware (hand-delivered)" />
          </W95Field>
        </W95GroupBox>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:6,marginTop:8,paddingTop:8,borderTop:"1px solid #808080"}}>
        <W95Btn onClick={onClose} disabled={saving}>Cancel</W95Btn>
        <W95Btn onClick={save} disabled={saving}>{saving?"Saving…":"OK"}</W95Btn>
      </div>
    </W95Dialog>
  );
}

// ── RFQ Register ───────────────────────────────────────────────────────────
function RFQRegister({ suppliers, projects }) {
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [updating, setUpdating] = useState(null);
  const [filter,   setFilter]   = useState("All");
  const [preview,  setPreview]  = useState(null);
  const [editRecord,   setEditRecord]   = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search,   setSearch]   = useState("");

  const load = async () => {
    setError(null);
    try { const d=await db.rfq.list(); if(!Array.isArray(d)) throw new Error(d?.message||"Error"); setRecords(d); }
    catch(e){ setError(e.message); }
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const handleSaveEdit = async (id, row) => {
    await db.rfq.update(id, row);
    setRecords(rs => rs.map(r => r.id === id ? { ...r, ...row, items: row.items } : r));
    setEditRecord(null);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await db.rfq.delete(deleteRecord.id);
    setRecords(rs => rs.filter(r => r.id !== deleteRecord.id));
    setDeleteRecord(null);
    setDeleting(false);
  };

  const changeStatus = async (record, newStatus) => {
    setUpdating(record.id+newStatus);
    try {
      await db.rfq.updateStatus(record, newStatus);
      const entry={from:record.status,to:newStatus,at:new Date().toISOString()};
      setRecords(rs=>rs.map(r=>r.id===record.id?{...r,status:newStatus,status_history:[...(r.status_history||[]),entry]}:r));
    } catch{}
    setUpdating(null);
  };

  const filtered = records.filter(r=>{
    if(filter!=="All"&&r.status!==filter) return false;
    const q=search.toLowerCase();
    return !q||[r.brbn,r.project,r.status].some(v=>(v||"").toLowerCase().includes(q));
  });

  if(loading) return <div style={{ padding:24, textAlign:"center", fontFamily:W.font }}><Spinner /> Loading RFQ Register…</div>;
  if(error)   return <div style={{ padding:24, color:"#800000", fontFamily:W.font }}>⚠ {error} <W95Btn onClick={load}>Retry</W95Btn></div>;

  return (
    <div style={{ padding:8, fontFamily:W.font }}>
      {/* Toolbar */}
      <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap", alignItems:"center" }}>
        <span>Filter:</span>
        {["All","Draft","Issued","Closed"].map(s=>(
          <W95Btn key={s} onClick={()=>setFilter(s)} style={{ background:filter===s?"#000080":undefined, color:filter===s?"#fff":undefined }}>
            {s}{s!=="All"?` (${records.filter(r=>r.status===s).length})`:` (${records.length})`}
          </W95Btn>
        ))}
        <span style={{ marginLeft:8 }}>Search:</span>
        <input style={inp({width:180})} value={search} onChange={e=>setSearch(e.target.value)} placeholder="BRBN, project…" />
        <W95Btn onClick={load} style={{ marginLeft:"auto" }}>↻ Refresh</W95Btn>
      </div>

      {/* Table */}
      <div style={{ ...W.sunken, background:"#fff", minHeight:200, maxHeight:500, overflowY:"auto", overflowX:"auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"130px 2fr 90px 90px 80px 280px", background:"#c0c0c0", borderBottom:"2px solid #808080", position:"sticky", top:0 }}>
          {["BRBN","Project","Closing","Created","Status","Actions"].map(h=>(
            <div key={h} style={{ ...W.raised, padding:"3px 6px", fontWeight:"bold", fontSize:11 }}>{h}</div>
          ))}
        </div>
        {filtered.length===0
          ? <div style={{ padding:24, textAlign:"center", color:"#808080" }}>{filter==="All"?"No RFQs yet.":"No RFQs with status: "+filter}</div>
          : filtered.map(r=>{
              const meta=STATUS_META[r.status]||STATUS_META.Draft;
              let supplierNames=[];
              try{supplierNames=JSON.parse(r.supplier_names||"[]");}catch{}
              return (
                <RFQRow key={r.id} record={r} meta={meta} supplierNames={supplierNames}
                  onPreview={()=>setPreview(r)}
                  onEdit={()=>setEditRecord(r)}
                  onDelete={()=>setDeleteRecord(r)}
                  onAdvance={meta.next?()=>changeStatus(r,meta.next):null}
                  onRevert={meta.prev?()=>changeStatus(r,meta.prev):null}
                  advanceLabel={meta.nextLabel} revertLabel={meta.prevLabel}
                  updating={updating===r.id+meta.next||updating===r.id+meta.prev}
                />
              );
            })
        }
      </div>
      {preview      && <RFQPreviewModal record={preview} onClose={()=>setPreview(null)} />}
      {editRecord   && <RFQEditModal record={editRecord} projects={projects||[]} onSave={handleSaveEdit} onClose={()=>setEditRecord(null)} />}
      {deleteRecord && (
        <W95Dialog title="Confirm Delete" onClose={()=>setDeleteRecord(null)} width={360}>
          <p>Delete RFQ <strong>{deleteRecord.brbn}</strong> — {deleteRecord.project}?<br/>This cannot be undone.</p>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:6, marginTop:12 }}>
            <W95Btn onClick={()=>setDeleteRecord(null)} disabled={deleting}>Cancel</W95Btn>
            <W95Btn onClick={handleDelete} disabled={deleting}>{deleting?"Deleting…":"Delete"}</W95Btn>
          </div>
        </W95Dialog>
      )}
    </div>
  );
}

function RFQRow({ record, meta, supplierNames, onPreview, onEdit, onDelete, onAdvance, onRevert, advanceLabel, revertLabel, updating }) {
  const [expanded, setExpanded] = useState(false);
  let items=[],statusHistory=[];
  try{items=JSON.parse(record.items||"[]");}catch{}
  try{statusHistory=record.status_history||[];}catch{}
  return (
    <>
      <div style={{ display:"grid", gridTemplateColumns:"130px 2fr 90px 90px 80px 280px", borderBottom:"1px solid #e0e0e0", cursor:"pointer" }} onClick={()=>setExpanded(o=>!o)}>
        <div style={{ padding:"3px 6px", fontWeight:"bold" }}>{record.brbn}</div>
        <div style={{ padding:"3px 6px" }}>{record.project}</div>
        <div style={{ padding:"3px 6px", fontSize:10 }}>{fmt(record.closing_date)}</div>
        <div style={{ padding:"3px 6px", fontSize:10 }}>{fmtTs(record.created_at)}</div>
        <div style={{ padding:"3px 6px", color:meta.color, fontWeight:"bold" }}>{record.status}</div>
        <div style={{ padding:"2px 4px", display:"flex", gap:3, alignItems:"center", flexWrap:"wrap" }} onClick={e=>e.stopPropagation()}>
          <W95Btn onClick={onPreview} style={{ padding:"2px 6px", fontSize:10 }}>👁 View</W95Btn>
          <W95Btn onClick={onEdit}    style={{ padding:"2px 6px", fontSize:10 }}>✏ Edit</W95Btn>
          <W95Btn onClick={onDelete}  style={{ padding:"2px 6px", fontSize:10 }}>🗑 Del</W95Btn>
          {onRevert  && <W95Btn onClick={onRevert}  style={{ padding:"2px 6px", fontSize:10 }} disabled={updating}>{updating?<Spinner/>:revertLabel}</W95Btn>}
          {onAdvance && <W95Btn onClick={onAdvance} style={{ padding:"2px 6px", fontSize:10 }} disabled={updating}>{updating?<Spinner/>:advanceLabel}</W95Btn>}
        </div>
      </div>
      {expanded && (
        <div style={{ background:"#f0f0f0", padding:"6px 12px", borderBottom:"1px solid #c0c0c0", fontSize:10 }}>
          {supplierNames.length>0 && <div style={{ marginBottom:4 }}><strong>Recipients:</strong> {supplierNames.join(", ")}{record.recipients_notes?`, ${record.recipients_notes}`:""}</div>}
          {record.scope && <div style={{ marginBottom:4 }}><strong>Scope:</strong> {record.scope}</div>}
          {items.length>0 && (
            <div style={{ marginBottom:4 }}>
              <strong>Items:</strong>
              <table style={{ marginTop:4, borderCollapse:"collapse", width:"100%", maxWidth:500 }}>
                <thead><tr style={{ background:"#c0c0c0" }}>
                  {["#","Description","Qty","Unit"].map(h=><th key={h} style={{ ...W.raised, padding:"2px 6px", textAlign:"left" }}>{h}</th>)}
                </tr></thead>
                <tbody>{items.map((item,i)=>(
                  <tr key={i} style={{ borderBottom:"1px solid #d0d0d0" }}>
                    <td style={{ padding:"2px 6px" }}>{i+1}</td>
                    <td style={{ padding:"2px 6px" }}>{item.description}</td>
                    <td style={{ padding:"2px 6px" }}>{item.qty}</td>
                    <td style={{ padding:"2px 6px" }}>{item.unit}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {statusHistory.length>0 && (
            <div><strong>Status History:</strong>
              {statusHistory.map((h,i)=><div key={i} style={{ marginLeft:8 }}>{fmtTs(h.at)}: {h.from} → {h.to}</div>)}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── App Root ───────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState("projects");
  const [suppliers, setSuppliers] = useState([]);
  const [projects,  setProjects]  = useState([]);
  const [rfqRecords,setRfqRecords]= useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [historyKey,setHistoryKey]= useState(0);
  const [mobile,    setMobile]    = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const loadSuppliers = async () => {
    const data = await db.suppliers.list();
    if(!Array.isArray(data)) return;
    setSuppliers(data);
    setLoading(false);
  };
  const loadProjects = async () => { const d=await db.projects.list(); if(Array.isArray(d)) setProjects(d); };
  const loadRFQs    = async () => { const d=await db.rfq.list();      if(Array.isArray(d)) setRfqRecords(d); };
  const addLocalProject = (proj) => setProjects(ps => [...ps, proj].sort((a,b) => a.name.localeCompare(b.name)));

  useEffect(()=>{ loadSuppliers(); loadProjects(); loadRFQs(); },[]);

  const handleAddSupp   = async (form) => { setSaving(true); try{ await db.suppliers.insert({...form,id:"sup_"+Date.now()}); await loadSuppliers(); setModal(null); }catch{} setSaving(false); };
  const handleEditSupp  = async (form) => { setSaving(true); try{ await db.suppliers.update(form.id,form); await loadSuppliers(); setModal(null); }catch{} setSaving(false); };
  const handleDelSupp   = async (s)    => { setSaving(true); try{ await db.suppliers.delete(s.id); await loadSuppliers(); setModal(null); }catch{} setSaving(false); };

  const goToRegister = () => { setHistoryKey(k=>k+1); setTab("rfqregister"); loadRFQs(); };

  const TABS = [
    { id:"projects",    label:"🏗 Project Register", short:"🏗 Projects"  },
    { id:"suppliers",   label:"📦 Suppliers",        short:"📦 Suppliers" },
    { id:"rfq",         label:"📄 RFQ Generator",    short:"📄 RFQ"       },
    { id:"rfqregister", label:"📁 RFQ Register",     short:"📁 Register"  },
  ];

  const rfqReady = suppliers.filter(s=>s.email&&s.email.trim()).length;

  return (
    <MobileCtx.Provider value={mobile}>
    <>
      <style>{globalStyles}</style>
      <div style={{ minHeight:"100vh", background:"#008080", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:mobile?0:"16px" }}>
        {/* Main window */}
        <div style={{ background:"#c0c0c0", ...(mobile?{}:W.raised), width:"100%", maxWidth:mobile?"100%":980, fontFamily:W.font }}>
          {/* Title bar */}
          <div style={{ background:"linear-gradient(to right,#000080,#1084d0)", padding:mobile?"6px 8px":"3px 4px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:mobile?18:14 }}>🖥</span>
              <span style={{ color:"#fff", fontWeight:"bold", fontSize:mobile?14:11 }}>Test App</span>
            </div>
            {!mobile && <div style={{ display:"flex", gap:2 }}>
              {["_","□","×"].map((c,i)=>(
                <button key={i} style={{ ...W.raised, background:"#c0c0c0", border:"none", borderTop:"2px solid #ffffff", borderLeft:"2px solid #ffffff", borderBottom:"2px solid #808080", borderRight:"2px solid #808080", width:18, height:16, fontSize:9, cursor:"pointer", padding:0, lineHeight:1 }}>{c}</button>
              ))}
            </div>}
          </div>

          {/* Menu bar — desktop only */}
          {!mobile && <div style={{ background:"#c0c0c0", borderBottom:"1px solid #808080", padding:"2px 4px", display:"flex", gap:0 }}>
            {["File","Edit","View","Help"].map(m=>(
              <button key={m} style={{ background:"none", border:"none", padding:"2px 8px", cursor:"pointer", fontFamily:W.font, fontSize:11 }}>{m}</button>
            ))}
          </div>}

          {/* Tab bar */}
          <div style={{ background:"#c0c0c0", padding:mobile?"4px 4px 0":"4px 4px 0", display:"flex", gap:2, borderBottom:"2px solid #808080", flexWrap:mobile?"wrap":"nowrap" }}>
            {TABS.map(t=>{
              const active = tab===t.id;
              return (
                <button key={t.id} onClick={()=>setTab(t.id)} style={{
                  padding:mobile?"8px 6px":"3px 12px",
                  flex:mobile?"1 1 calc(50% - 4px)":"0 0 auto",
                  cursor:"pointer", fontFamily:W.font, fontSize:mobile?12:11,
                  fontWeight:active?"bold":"normal",
                  background:"#c0c0c0", textAlign:"center",
                  borderTop:"2px solid #ffffff", borderLeft:"2px solid #ffffff",
                  borderRight:"2px solid #808080",
                  borderBottom:active?"2px solid #c0c0c0":"2px solid #808080",
                  marginBottom:active?-2:0, position:"relative", zIndex:active?1:0,
                }}>
                  {mobile ? t.short : t.label}
                </button>
              );
            })}
          </div>

          {/* Client area */}
          <div style={{ background:"#c0c0c0", minHeight:mobile?0:400, maxHeight:mobile?"calc(100dvh - 100px)":"calc(100vh - 120px)", overflowY:"auto" }}>
            {tab==="projects"    && <ProjectRegister projects={projects} rfqRecords={rfqRecords} loading={loading} onRefresh={async()=>{await loadProjects();await loadRFQs();}} onProjectCreated={addLocalProject} />}
            {tab==="suppliers"   && <SupplierDirectory suppliers={suppliers} loading={loading} onRefresh={loadSuppliers} onAdd={()=>setModal({type:"add"})} onEdit={s=>setModal({type:"edit",supplier:s})} onDelete={s=>setModal({type:"delete",supplier:s})} />}
            {tab==="rfq"         && <RFQGenerator suppliers={suppliers} projects={projects} onGenerated={goToRegister} onProjectCreated={addLocalProject} />}
            {tab==="rfqregister" && <RFQRegister key={historyKey} suppliers={suppliers} projects={projects} />}
          </div>

          {/* Status bar */}
          <div style={{ display:"flex", gap:4, padding:"2px 4px", borderTop:"2px solid #808080" }}>
            {[
              tab==="projects"    ? `${projects.length} projects` :
              tab==="suppliers"   ? `${suppliers.length} suppliers · ${rfqReady} RFQ-ready` :
              tab==="rfq"         ? "RFQ Generator" :
              "RFQ Register",
              new Date().toLocaleTimeString("en-FJ",{hour:"2-digit",minute:"2-digit"}),
            ].map((txt,i)=>(
              <div key={i} style={{ ...W.sunken, padding:"1px 8px", flex:i===0?1:0, whiteSpace:"nowrap", fontSize:11 }}>{txt}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Supplier dialogs */}
      {modal?.type==="add"    && <W95Dialog title="Add Supplier" onClose={()=>!saving&&setModal(null)} width={560}><SupplierForm onSave={handleAddSupp} onCancel={()=>setModal(null)} /></W95Dialog>}
      {modal?.type==="edit"   && <W95Dialog title="Edit Supplier" onClose={()=>!saving&&setModal(null)} width={560}><SupplierForm initial={modal.supplier} onSave={handleEditSupp} onCancel={()=>setModal(null)} /></W95Dialog>}
      {modal?.type==="delete" && (
        <W95Dialog title="Confirm Delete" onClose={()=>!saving&&setModal(null)} width={360}>
          <p>Delete <strong>{modal.supplier.name}</strong>? This cannot be undone.</p>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:6, marginTop:12 }}>
            <W95Btn onClick={()=>setModal(null)}>Cancel</W95Btn>
            <W95Btn onClick={()=>handleDelSupp(modal.supplier)} disabled={saving}>{saving?"Deleting…":"Delete"}</W95Btn>
          </div>
        </W95Dialog>
      )}
    </>
    </MobileCtx.Provider>
  );
}
