import { useState, useEffect, useRef } from "react";
import JSZip from "jszip";

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
const UNITS = ["Each","Pair","Set","m","m²","m³","kg","tonne","L","Box","Roll","Sheet","Bag","Pack","Item"];
const SCOPE_PRESETS = [
  { label:"Roads / Civil", text:"Supply and delivery of materials and equipment for road maintenance and civil works." },
  { label:"PPE / Safety", text:"Supply and delivery of personal protective equipment (PPE) and safety workwear for field staff." },
  { label:"Building Materials", text:"Supply and delivery of building materials and associated hardware." },
  { label:"Electrical", text:"Supply and delivery of electrical materials and fittings." },
];

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
  return <span title={ok?"RFQ-ready":"No email — cannot send RFQ"} style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:ok?"#22c55e":"#f59e0b", marginRight:6, flexShrink:0 }} />;
}
function Spinner() {
  return <div style={{ width:32, height:32, border:"3px solid #e5e7eb", borderTopColor:"#1F3864", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />;
}
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16, animation:"fadeIn 0.15s ease" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:12, width:"100%", maxWidth:580, maxHeight:"92vh", overflow:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.3)" }}>
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

function Field({ label, required, hint, children, error }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:4 }}>
        {label}{required && <span style={{ color:"#ef4444", marginLeft:2 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ margin:"3px 0 0", fontSize:11, color:"#9ca3af" }}>{hint}</p>}
      {error && <p style={{ margin:"3px 0 0", fontSize:11, color:"#ef4444" }}>{error}</p>}
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
    setErrors(e); return !Object.keys(e).length;
  };
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
        <div style={{ gridColumn:"1/-1" }}>
          <Field label="Supplier Name" required>
            <input style={{ ...iStyle, borderColor:errors.name?"#ef4444":"#d1d5db" }} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Deo Hire" />
            {errors.name && <p style={{ margin:"3px 0 0", fontSize:11, color:"#ef4444" }}>{errors.name}</p>}
          </Field>
        </div>
        <Field label="Category" required>
          <select style={iStyle} value={form.category} onChange={e=>set("category",e.target.value)}>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Email" hint="Required to send RFQ">
          <input style={iStyle} type="email" value={form.email||""} onChange={e=>set("email",e.target.value)} placeholder="contact@example.com" />
        </Field>
        <Field label="Phone">
          <input style={iStyle} value={form.phone||""} onChange={e=>set("phone",e.target.value)} placeholder="+679 000 0000" />
        </Field>
        <div style={{ gridColumn:"1/-1" }}>
          <Field label="Website">
            <input style={iStyle} type="url" value={form.website||""} onChange={e=>set("website",e.target.value)} placeholder="https://www.example.com" />
          </Field>
        </div>
        <Field label="Location">
          <input style={iStyle} value={form.location||""} onChange={e=>set("location",e.target.value)} placeholder="e.g. Nadi (Western Division)" />
        </Field>
        <div style={{ gridColumn:"1/-1" }}>
          <Field label="Address">
            <input style={iStyle} value={form.address||""} onChange={e=>set("address",e.target.value)} placeholder="Street address" />
          </Field>
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <Field label="Specialties" hint="Comma-separated">
            <input style={iStyle} value={form.specialties||""} onChange={e=>set("specialties",e.target.value)} placeholder="e.g. plant hire, heavy machinery" />
          </Field>
        </div>
        <div style={{ gridColumn:"1/-1", borderTop:"1px solid #f3f4f6", paddingTop:14, marginBottom:4 }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#1F3864", letterSpacing:"0.06em", margin:"0 0 10px", textTransform:"uppercase" }}>Tax Compliance Certificate</p>
        </div>
        <Field label="TCC Reference Number">
          <input style={iStyle} value={form.tcc_reference||""} onChange={e=>set("tcc_reference",e.target.value)} placeholder="e.g. TCC-2024-00123" />
        </Field>
        <Field label="TCC Issue Date">
          <input style={iStyle} type="date" value={form.tcc_issue_date||""} onChange={e=>set("tcc_issue_date",e.target.value||null)} />
        </Field>
        <Field label="Last Verified Date">
          <input style={iStyle} type="date" value={form.last_verified||""} onChange={e=>set("last_verified",e.target.value||null)} />
        </Field>
        <div style={{ gridColumn:"1/-1" }}>
          <Field label="Notes">
            <textarea style={{ ...iStyle, minHeight:72, resize:"vertical" }} value={form.notes||""} onChange={e=>set("notes",e.target.value)} placeholder="Additional notes..." />
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
  try { return new Date(d+"T00:00:00").toLocaleDateString("en-FJ",{day:"numeric",month:"short",year:"numeric"}); }
  catch { return d; }
}
function fmtLong(d) {
  if (!d) return "";
  try { return new Date(d+"T00:00:00").toLocaleDateString("en-FJ",{day:"numeric",month:"long",year:"numeric"}); }
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
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 20px rgba(31,56,100,0.12)";e.currentTarget.style.transform="translateY(-1px)";}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none";}}>
      <div style={{ padding:"14px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5, flexWrap:"wrap" }}>
              <StatusDot email={supplier.email} />
              <span style={{ fontWeight:700, fontSize:15, color:"#111827" }}>{supplier.name}</span>
              <Badge category={supplier.category} />
            </div>
            {hasEmail ? <p style={{ margin:"0 0 2px", fontSize:12, color:"#6b7280" }}>✉ {supplier.email}</p>
              : <p style={{ margin:"0 0 2px", fontSize:12, color:"#f59e0b", fontWeight:600 }}>⚠ No email — cannot send RFQ</p>}
            {supplier.location && <p style={{ margin:0, fontSize:12, color:"#6b7280" }}>📍 {supplier.location}</p>}
          </div>
          <div style={{ display:"flex", gap:6, flexShrink:0 }}>
            <button onClick={()=>onEdit(supplier)} style={{ padding:"5px 12px", borderRadius:6, border:"1px solid #d1d5db", background:"#fff", cursor:"pointer", fontSize:12, fontWeight:500, color:"#374151" }}>Edit</button>
            <button onClick={()=>onDelete(supplier)} style={{ padding:"5px 12px", borderRadius:6, border:"1px solid #fecaca", background:"#fff", cursor:"pointer", fontSize:12, fontWeight:500, color:"#dc2626" }}>Delete</button>
          </div>
        </div>
        <button onClick={()=>setOpen(o=>!o)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#9ca3af", padding:"4px 0 0", display:"flex", alignItems:"center", gap:4 }}>
          {open?"▲ Less":"▼ More detail"}
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
          {(supplier.tcc_reference||supplier.tcc_issue_date) && <>
            <DetailRow label="TCC Reference" value={supplier.tcc_reference} />
            <DetailRow label="TCC Issue Date" value={fmt(supplier.tcc_issue_date)} />
          </>}
          <div style={{ gridColumn:"1/-1" }}><DetailRow label="Notes" value={supplier.notes} /></div>
        </div>
      )}
    </div>
  );
}

// ─── DOCX Generation ───────────────────────────────────────────────────────

function escXml(str) {
  return String(str||"")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}

function findClose(xml, start, tag) {
  const open = "<" + tag, close = "</" + tag + ">";
  let depth = 0, i = start;
  while (i < xml.length) {
    if (xml.startsWith(open, i) && "/>><: ".includes(xml[i+open.length])) { depth++; i += open.length; }
    else if (xml.startsWith(close, i)) { depth--; if (depth === 0) return i; i += close.length; }
    else i++;
  }
  return xml.length;
}

function removePara(xml, token) {
  const idx = xml.indexOf(token);
  if (idx === -1) return xml;
  const pStart = xml.lastIndexOf("<w:p", idx);
  const pEnd = findClose(xml, pStart, "w:p") + 6;
  return xml.slice(0, pStart) + xml.slice(pEnd);
}

function expandLoop(xml, items) {
  xml = removePara(xml, "{#items}");
  const idx = xml.indexOf("{{ITEM_NO}}");
  if (idx === -1) return removePara(xml, "{/items}");
  const trStart = xml.lastIndexOf("<w:tr", idx);
  const trEnd = findClose(xml, trStart, "w:tr") + 7;
  const tmpl = xml.slice(trStart, trEnd);
  const rows = items.filter(i => i.description.trim()).map((item, n) =>
    tmpl
      .replaceAll("{{ITEM_NO}}", escXml(String(n+1)))
      .replaceAll("{{DESCRIPTION}}", escXml(item.description))
      .replaceAll("{{QTY}}", escXml(String(item.qty||"")))
      .replaceAll("{{UNIT}}", escXml(item.unit||""))
      .replaceAll("{{RATE}}", "")
      .replaceAll("{{VIP_RATE}}", "")
      .replaceAll("{{COMMENTS}}", "")
  ).join("");
  xml = xml.slice(0, trStart) + rows + xml.slice(trEnd);
  return removePara(xml, "{/items}");
}

async function generateRFQDoc(supplierName, form, items) {
  const resp = await fetch("/quote_template.docx");
  if (!resp.ok) throw new Error("Could not load template");
  const buf = await resp.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const tokens = {
    "{{PROJECT}}": escXml(form.project),
    "{{BRBN}}": escXml(form.brbn),
    "{{DATE}}": escXml(fmtLong(form.date)),
    "{{SCOPE_OF_WORKS}}": escXml(form.scope),
    "{{CLOSING_TIME}}": escXml(form.closingTime),
    "{{CLOSING_DATE}}": escXml(fmtLong(form.closingDate)),
  };

  let doc = await zip.file("word/document.xml").async("string");
  for (const [k,v] of Object.entries(tokens)) doc = doc.replaceAll(k, v);
  doc = expandLoop(doc, items);
  zip.file("word/document.xml", doc);

  for (const fname of ["word/footer1.xml", "word/footer2.xml"]) {
    let f = await zip.file(fname).async("string");
    f = f.replaceAll("{{BRBN}}", escXml(form.brbn))
         .replaceAll("{{PROJECT}}", escXml(form.project))
         .replaceAll("{{DATE}}", escXml(fmtLong(form.date)));
    zip.file(fname, f);
  }

  const blob = await zip.generateAsync({ type:"blob", mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const brbnSafe = form.brbn.replace(/\//g,"-");
  const nameSafe = supplierName.replace(/\s+/g,"_").replace(/[^A-Za-z0-9_-]/g,"");
  const filename = `RFQ_BRBN${brbnSafe}_${nameSafe}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 1500);
  return filename;
}

// ─── RFQ Generator Tab ────────────────────────────────────────────────────

function SectionHead({ n, title, sub }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
      <div style={{ width:28, height:28, borderRadius:"50%", background:"#1F3864", color:"#fff", fontSize:13, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{n}</div>
      <div>
        <p style={{ margin:0, fontWeight:700, fontSize:14, color:"#111827" }}>{title}</p>
        {sub && <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{sub}</p>}
      </div>
    </div>
  );
}

function RFQGenerator({ suppliers }) {
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({ project:"", brbn:"", date:today, scope:"", closingTime:"12:00 PM", closingDate:"" });
  const [items, setItems] = useState([{ id:1, description:"", qty:"1", unit:"Each" }]);
  const [selIds, setSelIds] = useState([]);
  const [catFilter, setCatFilter] = useState("All");
  const [suppSearch, setSuppSearch] = useState("");
  const [errors, setErrors] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState([]);

  const setF = (k,v) => setForm(f=>({...f,[k]:v}));
  const emailSuppliers = suppliers.filter(s => s.email && s.email.trim());

  const addItem = () => setItems(it=>[...it,{id:Date.now(),description:"",qty:"1",unit:"Each"}]);
  const removeItem = id => setItems(it=>it.filter(i=>i.id!==id));
  const setItem = (id,k,v) => setItems(it=>it.map(i=>i.id===id?{...i,[k]:v}:i));

  const toggle = id => setSelIds(sel => sel.includes(id) ? sel.filter(s=>s!==id) : sel.length<5 ? [...sel,id] : sel);

  const visibleSuppliers = emailSuppliers.filter(s => {
    if (catFilter!=="All" && s.category!==catFilter) return false;
    const q = suppSearch.toLowerCase();
    return !q || [s.name,s.category,s.location].some(v=>(v||"").toLowerCase().includes(q));
  });

  const validate = () => {
    const e = {};
    if (!form.project.trim()) e.project = "Required";
    if (!form.brbn.trim()) e.brbn = "Required";
    if (!form.closingDate) e.closingDate = "Required";
    if (!items.some(i=>i.description.trim())) e.items = "Add at least one item";
    if (selIds.length < 3) e.suppliers = `Select at least 3 suppliers (${selIds.length}/3 minimum)`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const generate = async () => {
    if (!validate()) return;
    setGenerating(true);
    setGenerated([]);
    const chosen = suppliers.filter(s => selIds.includes(s.id));
    const results = [];
    try {
      for (const s of chosen) {
        const fn = await generateRFQDoc(s.name, form, items);
        results.push({ name: s.name, file: fn });
        setGenerated([...results]);
      }
    } catch(err) {
      setErrors(e=>({...e, gen:"Generation failed: "+err.message}));
    }
    setGenerating(false);
  };

  const card = { background:"#fff", border:"1px solid #e5e7eb", borderRadius:10, padding:"20px", marginBottom:16 };
  const err = k => errors[k] ? <p style={{ margin:"4px 0 0", fontSize:11, color:"#ef4444" }}>{errors[k]}</p> : null;

  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"20px" }}>

      {/* ── 1. Project Details ── */}
      <div style={card}>
        <SectionHead n="1" title="Project Details" sub="Core identifiers used throughout the document" />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <div style={{ gridColumn:"1/-1" }}>
            <Field label="Project Name" required error={errors.project}>
              <input style={{ ...iStyle, borderColor:errors.project?"#ef4444":"#d1d5db" }}
                value={form.project} onChange={e=>setF("project",e.target.value)}
                placeholder="e.g. NAWAWA ROAD MAINTENANCE" />
            </Field>
          </div>
          <Field label="BRBN" required error={errors.brbn} hint="Budget Reference Batch Number">
            <input style={{ ...iStyle, borderColor:errors.brbn?"#ef4444":"#d1d5db" }}
              value={form.brbn} onChange={e=>setF("brbn",e.target.value)}
              placeholder="e.g. 314/25/26" />
          </Field>
          <Field label="Document Date">
            <input style={iStyle} type="date" value={form.date} onChange={e=>setF("date",e.target.value)} />
          </Field>
          <Field label="Closing Time">
            <select style={iStyle} value={form.closingTime} onChange={e=>setF("closingTime",e.target.value)}>
              {["9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM"].map(t=><option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Closing Date" required error={errors.closingDate}>
            <input style={{ ...iStyle, borderColor:errors.closingDate?"#ef4444":"#d1d5db" }}
              type="date" value={form.closingDate} onChange={e=>setF("closingDate",e.target.value)} />
          </Field>
        </div>
        <Field label="Scope of Works">
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:7 }}>
            {SCOPE_PRESETS.map(p=>(
              <button key={p.label} onClick={()=>setF("scope",p.text)} style={{ padding:"4px 10px", borderRadius:5, border:"1px solid #d1d5db", background:form.scope===p.text?"#eff6ff":"#fff", cursor:"pointer", fontSize:11, color:form.scope===p.text?"#1d4ed8":"#374151", fontWeight:form.scope===p.text?600:400 }}>{p.label}</button>
            ))}
          </div>
          <textarea style={{ ...iStyle, minHeight:72, resize:"vertical" }}
            value={form.scope} onChange={e=>setF("scope",e.target.value)}
            placeholder="Describe the scope of works..." />
        </Field>
      </div>

      {/* ── 2. Line Items ── */}
      <div style={card}>
        <SectionHead n="2" title="Line Items" sub="Items suppliers will quote on — Rate and Total left blank for them to fill" />
        {err("items")}
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:480 }}>
            <thead>
              <tr style={{ background:"#f8fafc" }}>
                {["#","Description","Qty","Unit",""].map((h,i)=>(
                  <th key={i} style={{ padding:"8px 8px", textAlign:"left", borderBottom:"1px solid #e5e7eb", fontWeight:600, color:"#6b7280", fontSize:11, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item,idx)=>(
                <tr key={item.id} style={{ borderBottom:"1px solid #f3f4f6" }}>
                  <td style={{ padding:"6px 8px", color:"#9ca3af", fontSize:12, width:24 }}>{idx+1}</td>
                  <td style={{ padding:"4px 6px" }}>
                    <input style={{ ...iStyle, padding:"6px 8px", fontSize:12 }}
                      value={item.description} onChange={e=>setItem(item.id,"description",e.target.value)}
                      placeholder="Item description" />
                  </td>
                  <td style={{ padding:"4px 6px", width:70 }}>
                    <input style={{ ...iStyle, padding:"6px 8px", fontSize:12, textAlign:"right" }}
                      type="number" min="0" step="0.01"
                      value={item.qty} onChange={e=>setItem(item.id,"qty",e.target.value)} />
                  </td>
                  <td style={{ padding:"4px 6px", width:90 }}>
                    <select style={{ ...iStyle, padding:"6px 8px", fontSize:12 }}
                      value={item.unit} onChange={e=>setItem(item.id,"unit",e.target.value)}>
                      {UNITS.map(u=><option key={u}>{u}</option>)}
                    </select>
                  </td>
                  <td style={{ padding:"4px 6px", width:32, textAlign:"center" }}>
                    {items.length>1 && <button onClick={()=>removeItem(item.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#f87171", fontSize:16, lineHeight:1, padding:2 }}>×</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addItem} style={{ marginTop:12, padding:"7px 16px", borderRadius:6, border:"1px dashed #93c5fd", background:"#eff6ff", cursor:"pointer", fontSize:12, color:"#1d4ed8", fontWeight:600 }}>
          + Add item
        </button>
      </div>

      {/* ── 3. Supplier Selection ── */}
      <div style={card}>
        <SectionHead n="3" title="Select Suppliers" sub="Choose 3–5 — one RFQ document generated per supplier" />
        <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:10 }}>
          <div style={{ flex:1 }}>
            <input value={suppSearch} onChange={e=>setSuppSearch(e.target.value)}
              placeholder="Search suppliers…"
              style={{ ...iStyle, fontSize:12, padding:"7px 10px" }} />
          </div>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
            style={{ ...iStyle, width:"auto", fontSize:12, padding:"7px 10px", flexShrink:0 }}>
            <option value="All">All categories</option>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ fontSize:12, color:"#6b7280" }}>{emailSuppliers.length} RFQ-ready suppliers</span>
          <span style={{ fontSize:12, fontWeight:700, color:selIds.length>=3?"#16a34a":selIds.length>0?"#ca8a04":"#9ca3af" }}>
            {selIds.length} selected {selIds.length>=3?"✓":selIds.length>0?`(need ${3-selIds.length} more)`:"(min 3)"}
          </span>
        </div>

        {err("suppliers")}

        {visibleSuppliers.length === 0
          ? <p style={{ textAlign:"center", color:"#9ca3af", fontSize:13, padding:"20px 0" }}>No suppliers match. <button onClick={()=>{setCatFilter("All");setSuppSearch("");}} style={{ background:"none", border:"none", color:"#3b82f6", cursor:"pointer", fontSize:13 }}>Clear filters</button></p>
          : <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:340, overflowY:"auto" }}>
              {visibleSuppliers.map(s=>{
                const sel = selIds.includes(s.id);
                return (
                  <div key={s.id} onClick={()=>toggle(s.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", border:`1.5px solid ${sel?"#3b82f6":"#e5e7eb"}`, borderRadius:8, cursor:"pointer", background:sel?"#eff6ff":"#fff", transition:"all 0.1s" }}>
                    <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${sel?"#3b82f6":"#d1d5db"}`, background:sel?"#3b82f6":"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {sel && <span style={{ color:"#fff", fontSize:11, fontWeight:800, lineHeight:1 }}>✓</span>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontWeight:600, fontSize:13, color:"#111827" }}>{s.name}</p>
                      <p style={{ margin:0, fontSize:11, color:"#6b7280" }}>{s.category}{s.location?` · ${s.location}`:""}</p>
                    </div>
                    <Badge category={s.category} />
                  </div>
                );
              })}
            </div>
        }

        {suppliers.filter(s=>!s.email||!s.email.trim()).length > 0 && (
          <p style={{ margin:"12px 0 0", fontSize:11, color:"#9ca3af" }}>
            ⚠ {suppliers.filter(s=>!s.email||!s.email.trim()).length} supplier(s) hidden — no email address on file.
          </p>
        )}
      </div>

      {/* ── Generate ── */}
      {err("gen")}
      <button onClick={generate} disabled={generating}
        style={{ width:"100%", padding:"14px", borderRadius:9, border:"none", background:generating?"#93c5fd":"#1F3864", color:"#fff", fontSize:15, fontWeight:700, cursor:generating?"not-allowed":"pointer", boxShadow:"0 2px 12px rgba(31,56,100,0.3)", marginBottom:16 }}>
        {generating ? `Generating… (${generated.length}/${selIds.length})` : `Generate ${selIds.length>0?selIds.length+" ":""} RFQ Document${selIds.length!==1?"s":""}  ↓`}
      </button>

      {generated.length>0 && (
        <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:9, padding:"16px 18px", animation:"fadeIn 0.2s ease" }}>
          <p style={{ margin:"0 0 10px", fontWeight:700, fontSize:13, color:"#16a34a" }}>✓ {generated.length} document{generated.length!==1?"s":""} generated and downloaded</p>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {generated.map((g,i)=>(
              <div key={i} style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:13 }}>📄</span>
                <div>
                  <p style={{ margin:0, fontSize:12, fontWeight:600, color:"#166534" }}>{g.name}</p>
                  <p style={{ margin:0, fontSize:11, color:"#4ade80", fontFamily:"monospace" }}>{g.file}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin:"10px 0 0", fontSize:11, color:"#4ade80" }}>Check your Downloads folder.</p>
        </div>
      )}
    </div>
  );
}

// ─── Directory Tab ─────────────────────────────────────────────────────────

function SupplierDirectory({ suppliers, loading, error, onRetry, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");

  const filtered = suppliers.filter(s => {
    if (cat!=="All" && s.category!==cat) return false;
    const q = search.toLowerCase();
    return !q || [s.name,s.email,s.specialties,s.location].some(v=>(v||"").toLowerCase().includes(q));
  });
  const rfqReady = filtered.filter(s=>s.email&&s.email.trim()).length;
  const noEmail = suppliers.filter(s=>!s.email||!s.email.trim()).length;

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:300, gap:14 }}>
      <Spinner /><p style={{ color:"#6b7280", fontSize:13 }}>Loading suppliers…</p>
    </div>
  );
  if (error) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:40 }}>
      <div style={{ textAlign:"center", maxWidth:420 }}>
        <p style={{ fontSize:36, margin:"0 0 12px" }}>⚠️</p>
        <p style={{ fontWeight:700, fontSize:16, color:"#111827", marginBottom:8 }}>Connection Error</p>
        <p style={{ color:"#6b7280", fontSize:13, marginBottom:20, lineHeight:1.6 }}>{error}</p>
        <button onClick={onRetry} style={{ padding:"10px 24px", background:"#1F3864", color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontSize:14, fontWeight:700 }}>Retry</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth:920, margin:"0 auto" }}>
      {/* Stats + Add */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px 0", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:28 }}>
          {[["Total",suppliers.length],["RFQ-Ready",suppliers.filter(s=>s.email&&s.email.trim()).length],["No Email",noEmail]].map(([l,v])=>(
            <div key={l}>
              <p style={{ margin:0, fontSize:22, fontWeight:800, color:"#1F3864" }}>{v}</p>
              <p style={{ margin:0, fontSize:10, color:"#9ca3af", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>{l}</p>
            </div>
          ))}
        </div>
        <button onClick={onAdd} style={{ padding:"9px 18px", borderRadius:8, border:"none", background:"#1F3864", cursor:"pointer", fontSize:13, color:"#fff", fontWeight:700, boxShadow:"0 2px 8px rgba(31,56,100,0.2)" }}>+ Add Supplier</button>
      </div>

      {/* Category filter */}
      <div style={{ padding:"12px 20px 0", overflowX:"auto" }}>
        <div style={{ display:"flex", gap:4 }}>
          {["All",...CATEGORIES].map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{ padding:"6px 12px", border:"none", cursor:"pointer", whiteSpace:"nowrap", background:cat===c?"#1F3864":"#f1f5f9", color:cat===c?"#fff":"#6b7280", fontWeight:cat===c?700:400, fontSize:12, borderRadius:6 }}>
              {c}{c!=="All"&&` (${suppliers.filter(s=>s.category===c).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:"12px 20px 20px" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by name, email, specialty, or location…"
          style={{ width:"100%", padding:"10px 14px", border:"1px solid #e5e7eb", borderRadius:8, fontSize:13, outline:"none", background:"#fff", marginBottom:10, boxSizing:"border-box", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }} />
        <p style={{ margin:"0 0 10px", fontSize:12, color:"#9ca3af" }}>
          {filtered.length===0 ? "No suppliers found." : `${filtered.length} supplier${filtered.length!==1?"s":""} · ${rfqReady} RFQ-ready`}
        </p>
        {filtered.length===0
          ? <div style={{ textAlign:"center", padding:"48px 20px", background:"#fff", borderRadius:10, border:"1px solid #e5e7eb" }}>
              <p style={{ fontSize:36, margin:"0 0 10px" }}>🔍</p>
              <p style={{ color:"#6b7280", fontSize:14, margin:0 }}>No suppliers match.</p>
              {cat!=="All" && <button onClick={()=>setCat("All")} style={{ marginTop:12, background:"none", border:"1px solid #d1d5db", borderRadius:6, padding:"7px 16px", cursor:"pointer", fontSize:12, color:"#374151" }}>Clear filter</button>}
            </div>
          : <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {filtered.map(s=><SupplierCard key={s.id} supplier={s} onEdit={onEdit} onDelete={onDelete} />)}
            </div>
        }
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("directory");
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const seeded = useRef(false);

  const toast$ = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3200); };

  const load = async () => {
    setError(null);
    try {
      const data = await db.list();
      if (!Array.isArray(data)) throw new Error(data?.message || "Unexpected response from database");
      if (data.length===0 && !seeded.current) {
        seeded.current = true;
        for (const s of SEED_SUPPLIERS) await db.insert(s);
        const seeded2 = await db.list();
        setSuppliers(Array.isArray(seeded2)?seeded2:[]);
      } else { setSuppliers(data); }
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const handleAdd = async (form) => {
    setSaving(true);
    try {
      await db.insert({...form, id:"sup_"+Date.now(), last_verified:form.last_verified||null, tcc_issue_date:form.tcc_issue_date||null, website:form.website||null});
      await load(); setModal(null); toast$(`${form.name} added.`);
    } catch { toast$("Failed to save.","err"); }
    setSaving(false);
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      await db.update(form.id,{...form, last_verified:form.last_verified||null, tcc_issue_date:form.tcc_issue_date||null, website:form.website||null});
      await load(); setModal(null); toast$(`${form.name} updated.`);
    } catch { toast$("Failed to update.","err"); }
    setSaving(false);
  };

  const handleDelete = async (s) => {
    setSaving(true);
    try {
      await db.delete(s.id); await load(); setModal(null); toast$(`${s.name} deleted.`,"del");
    } catch { toast$("Failed to delete.","err"); }
    setSaving(false);
  };

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ minHeight:"100vh", background:"#f0f2f5" }}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg, #1F3864 0%, #2d5282 100%)", boxShadow:"0 2px 12px rgba(0,0,0,0.2)" }}>
          <div style={{ maxWidth:920, margin:"0 auto", padding:"18px 20px 0" }}>
            <p style={{ margin:"0 0 2px", fontSize:11, color:"#93c5fd", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase" }}>Ministry of Public Works — Divisional Engineer Works West</p>
            <h1 style={{ margin:"0 0 14px", fontSize:22, fontWeight:800, color:"#fff", letterSpacing:"-0.02em" }}>MPW Procurement Tools</h1>

            {/* Tab bar */}
            <div style={{ display:"flex", gap:2 }}>
              {[["directory","📋  Supplier Directory"],["rfq","📄  RFQ Generator"]].map(([id,label])=>(
                <button key={id} onClick={()=>setTab(id)} style={{
                  padding:"10px 18px", border:"none", cursor:"pointer", whiteSpace:"nowrap",
                  background:tab===id?"#fff":"transparent",
                  color:tab===id?"#1F3864":"#93c5fd",
                  fontWeight:tab===id?700:500, fontSize:13,
                  borderRadius:"6px 6px 0 0",
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {tab==="directory"
          ? <SupplierDirectory
              suppliers={suppliers} loading={loading} error={error}
              onRetry={load}
              onAdd={()=>setModal({type:"add"})}
              onEdit={s=>setModal({type:"edit",supplier:s})}
              onDelete={s=>setModal({type:"delete",supplier:s})}
            />
          : <RFQGenerator suppliers={suppliers} />
        }
      </div>

      {modal?.type==="add" && <Modal title="Add New Supplier" onClose={()=>!saving&&setModal(null)}><SupplierForm onSave={handleAdd} onCancel={()=>setModal(null)} saving={saving} /></Modal>}
      {modal?.type==="edit" && <Modal title="Edit Supplier" onClose={()=>!saving&&setModal(null)}><SupplierForm initial={modal.supplier} onSave={handleEdit} onCancel={()=>setModal(null)} saving={saving} /></Modal>}
      {modal?.type==="delete" && <ConfirmDelete supplier={modal.supplier} onConfirm={()=>handleDelete(modal.supplier)} onCancel={()=>setModal(null)} saving={saving} />}

      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:toast.type==="err"?"#dc2626":toast.type==="del"?"#374151":"#1F3864", color:"#fff", padding:"11px 22px", borderRadius:9, fontSize:13, fontWeight:600, boxShadow:"0 4px 20px rgba(0,0,0,0.25)", whiteSpace:"nowrap", zIndex:2000, animation:"fadeIn 0.2s ease" }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
