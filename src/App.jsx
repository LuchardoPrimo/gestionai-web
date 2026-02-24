import { useState, useEffect, createContext, useContext, useRef } from "react";
import { supabase } from "./lib/supabase";

// File upload helper — stores file in Supabase Storage and returns URL
const uploadFile = async (file) => {
  const ext = file.name.split(".").pop();
  const path = Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext;
  const { error } = await supabase.storage.from("documents").upload(path, file);
  if (error) { console.error("Upload error:", error); return null; }
  const { data } = supabase.storage.from("documents").getPublicUrl(path);
  return data?.publicUrl || null;
};
import {
  LayoutDashboard, Users, FolderKanban, Receipt, Wallet, FileText, Bell, Search,
  Plus, MoreHorizontal, ArrowUpRight, ArrowDownRight, Eye, Calendar, Clock,
  CheckCircle2, AlertCircle, Phone, Mail, MapPin, Tag, MessageSquare, BarChart3,
  CreditCard, FileUp, Download, Zap, ChevronLeft, X, Check, Bot, CircleDollarSign,
  Layers, Target, Activity, Archive, Sun, Moon, Upload, Link2, List, Grid3X3,
  FileSpreadsheet, Printer, Share2, DollarSign, TrendingUp, Briefcase, LogOut, Lock, UserPlus
} from "lucide-react";

// Data context for Supabase
const DataContext = createContext({});
const useData = () => useContext(DataContext);

function DataProvider({ children }) {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState(null);

  const load = async () => {
    try {
      // Get company_id for inserts
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from("user_profiles").select("company_id").eq("id", user.id).single();
        if (prof?.company_id) setCompanyId(prof.company_id);
      }

      const [cRes, pRes, tRes, tkRes, dRes] = await Promise.all([
        supabase.from("clients").select("*").order("name"),
        supabase.from("projects").select("*, client:clients(name)").order("name"),
        supabase.from("transactions").select("*, contact:clients(name), project:projects(name)").order("date", { ascending: false }),
        supabase.from("tasks").select("*, project:projects(name)").order("due_date"),
        supabase.from("documents").select("*, contact:clients(name), project:projects(name)").order("created_at", { ascending: false }),
      ]);

      if (cRes.data) setClients(cRes.data.map(c => ({
        ...c, tags: c.tags || [], lastAct: "Reciente",
        projects: 0, contact: c.contact || "",
      })));

      if (pRes.data) setProjects(pRes.data.map(p => ({
        ...p, client: p.client?.name || "—",
        tasks: 0, done: 0, docs: 0,
        deadline: p.deadline ? new Date(p.deadline).toLocaleDateString("es-AR", { month: "short", year: "numeric" }) : "—",
      })));

      if (tRes.data) setTransactions(tRes.data.map(tx => ({
        ...tx, contact: tx.contact?.name || "—",
        project: tx.project?.name || "—",
        date: new Date(tx.date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
        desc: tx.description,
        amount: Number(tx.amount),
        pid: tx.project_id,
      })));

      if (tkRes.data) setTasks(tkRes.data.map(tk => ({
        ...tk, project: tk.project?.name || "Admin",
        pid: tk.project_id,
        who: tk.assignee || "—",
        pri: tk.priority,
        due: tk.due_date,
        st: tk.status,
        tag: tk.tag || "",
        title: tk.title,
      })));

      if (dRes.data) setDocuments(dRes.data.map(d => ({
        ...d, contact: d.contact?.name || null,
        project: d.project?.name || "—",
        pid: d.project_id,
        txId: d.transaction_id,
        date: new Date(d.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
        size: d.size || "—",
      })));
    } catch (err) {
      console.error("Error loading data:", err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <DataContext.Provider value={{ clients, projects, transactions, tasks, documents, loading, reload: load, companyId, setClients, setProjects, setTransactions, setTasks, setDocuments }}>
      {children}
    </DataContext.Provider>
  );
}

const themes = {
  dark: {
    bg:"#0D0F15", card:"#151822", hover:"#1C1F2E", sidebar:"#0D0F15", topbar:"#0D0F15",
    border:"#262940", text:"#ECF0F6", muted:"#8890A8", dim:"#555B75",
    accent:"#7C6DF0", accentL:"#9F92FF", accentBg:"rgba(124,109,240,0.10)",
    green:"#34D399", greenBg:"rgba(52,211,153,0.10)",
    red:"#F87171", redBg:"rgba(248,113,113,0.10)",
    orange:"#FBBF24", orangeBg:"rgba(251,191,36,0.10)",
    blue:"#60A5FA", blueBg:"rgba(96,165,250,0.10)",
    yellow:"#FACC15", yellowBg:"rgba(250,204,21,0.10)",
    shadow:"0 1px 3px rgba(0,0,0,0.4)",
  },
  light: {
    bg:"#F3F4F8", card:"#FFFFFF", hover:"#EDEEF3", sidebar:"#FFFFFF", topbar:"#FFFFFF",
    border:"#DFE1E8", text:"#1B1E2C", muted:"#6A7088", dim:"#9EA3B8",
    accent:"#6C5CE7", accentL:"#6C5CE7", accentBg:"rgba(108,92,231,0.07)",
    green:"#10B981", greenBg:"rgba(16,185,129,0.07)",
    red:"#EF4444", redBg:"rgba(239,68,68,0.07)",
    orange:"#F59E0B", orangeBg:"rgba(245,158,11,0.07)",
    blue:"#3B82F6", blueBg:"rgba(59,130,246,0.07)",
    yellow:"#EAB308", yellowBg:"rgba(234,179,8,0.07)",
    shadow:"0 1px 3px rgba(0,0,0,0.05)",
  },
};

const fmt = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + n;
};

const pill = (bg, color) => ({
  display: "inline-flex", alignItems: "center", gap: 4,
  padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600,
  background: bg, color: color, whiteSpace: "nowrap",
});

const exportCSV = (filename, headers, rows) => {
  const csvContent = [headers.join(","), ...rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename + ".csv";
  link.click();
  URL.revokeObjectURL(link.href);
};

const handlePrint = (title, rows) => {
  const printWin = window.open("", "_blank");
  if (!printWin) return;
  const tableRows = rows ? rows.map(r => "<tr>" + r.map(c => "<td>" + c + "</td>").join("") + "</tr>").join("") : "";
  printWin.document.write("<html><head><title>" + title + "</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%;margin-top:16px}td,th{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5;font-weight:600}h1{font-size:18px;margin-bottom:4px}h2{font-size:13px;color:#666;margin-bottom:16px;font-weight:400}</style></head><body>");
  printWin.document.write("<h1>GestiónAI — " + title + "</h1><h2>Febrero 2026</h2>");
  if (tableRows) printWin.document.write("<table>" + tableRows + "</table>");
  printWin.document.write("</body></html>");
  printWin.document.close();
  setTimeout(() => printWin.print(), 300);
};

// Data now comes from Supabase via DataContext

function Av({ name, size = 30 }) {
  const i = name.split(" ").map(w => w[0]).join("").slice(0, 2);
  const colors = ["#6C5CE7","#10B981","#F87171","#3B82F6","#F59E0B","#EC4899"];
  const c = colors[name.charCodeAt(0) % 6];
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
      {i}
    </div>
  );
}

function Badge({ s, t }) {
  const m = {
    active:[t.greenBg,t.green,"Activo"], pending:[t.orangeBg,t.orange,"Pendiente"],
    paid:[t.greenBg,t.green,"Pagado"], overdue:[t.redBg,t.red,"Vencido"],
    in_progress:[t.blueBg,t.blue,"En curso"], planning:[t.accentBg,t.accentL,"Planificación"],
    review:[t.yellowBg,t.yellow,"Revisión"], done:[t.greenBg,t.green,"Completado"],
    completed:[t.greenBg,t.green,"Completado"],
    high:[t.redBg,t.red,"Alta"], medium:[t.orangeBg,t.orange,"Media"], low:[t.blueBg,t.blue,"Baja"],
    customer:[t.greenBg,t.green,"Cliente"], supplier:[t.blueBg,t.blue,"Proveedor"],
    todo:[t.hover,t.muted,"Por hacer"],
    processed:[t.greenBg,t.green,"Procesado"], filed:[t.blueBg,t.blue,"Archivado"],
    invoice:[t.accentBg,t.accentL,"Factura"], receipt:[t.orangeBg,t.orange,"Remito"],
    cert:[t.greenBg,t.green,"Certificado"], quote:[t.yellowBg,t.yellow,"Presupuesto"],
    contract:[t.accentBg,t.accentL,"Contrato"],
  };
  const v = m[s] || [t.hover, t.muted, s];
  return <span style={pill(v[0], v[1])}>{v[2]}</span>;
}

function PBar({ v, h = 6, color, t }) {
  return (
    <div style={{ width: "100%", height: h, background: t.hover, borderRadius: h }}>
      <div style={{ width: v + "%", height: "100%", background: color || t.accent, borderRadius: h, transition: "width 0.5s" }} />
    </div>
  );
}

function Chart({ data, color, w = 110, h = 36 }) {
  const mx = Math.max(...data);
  const mn = Math.min(...data);
  const r = mx - mn || 1;
  const pts = data.map((v, i) => ((i / (data.length - 1)) * w) + "," + (h - ((v - mn) / r) * (h - 4) - 2)).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Btn({ children, primary, t, onClick }) {
  const base = primary
    ? { background: t.accent, color: "#fff", border: "none", fontWeight: 600 }
    : { background: "transparent", color: t.muted, border: "1px solid " + t.border };
  return (
    <button onClick={onClick} style={{ ...base, borderRadius: 8, padding: "7px 13px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
      {children}
    </button>
  );
}

function Tabs({ items, active, onChange, t }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {items.map(tb => (
        <button key={tb.id} onClick={() => onChange(tb.id)} style={{
          background: active === tb.id ? t.accentBg : "transparent",
          color: active === tb.id ? t.accentL : t.muted,
          border: "1px solid " + (active === tb.id ? t.accent + "40" : t.border),
          borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer",
          fontWeight: active === tb.id ? 600 : 400, display: "flex", alignItems: "center", gap: 5,
        }}>
          {tb.icon && <tb.icon size={13} />}{tb.label}
        </button>
      ))}
    </div>
  );
}

function Crd({ children, t, style: s }) {
  return (
    <div style={{ background: t.card, borderRadius: 13, border: "1px solid " + t.border, boxShadow: t.shadow, ...s }}>
      {children}
    </div>
  );
}

function Sidebar({ active, onNav, collapsed, toggle, t, user, onLogout, role }) {
  const allNav = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["owner","admin","accountant","pm","employee"] },
    { id: "clients", icon: Users, label: "Clientes / Proveedores", roles: ["owner","admin","accountant"] },
    { id: "projects", icon: FolderKanban, label: "Proyectos / Obras", roles: ["owner","admin","pm","employee"] },
    { id: "tasks", icon: Target, label: "Tareas", roles: ["owner","admin","pm","employee"] },
    { id: "transactions", icon: Receipt, label: "Finanzas", roles: ["owner","admin","accountant"] },
    { id: "treasury", icon: Wallet, label: "Tesorería", roles: ["owner","admin"] },
    { id: "documents", icon: FileText, label: "Documentos", roles: ["owner","admin","accountant","pm"] },
    { id: "reports", icon: BarChart3, label: "Reportes", roles: ["owner","admin","accountant"] },
  ];
  const nav = allNav.filter(n => n.roles.includes(role || "owner"));
  const w = collapsed ? 64 : 230;
  return (
    <div style={{ width: w, minWidth: w, height: "100vh", background: t.sidebar, borderRight: "1px solid " + t.border, display: "flex", flexDirection: "column", transition: "width 0.2s", overflow: "hidden" }}>
      <div onClick={toggle} style={{ padding: collapsed ? "18px 14px" : "18px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid " + t.border, cursor: "pointer", minHeight: 60 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, " + t.accent + ", #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px " + t.accent + "40" }}>
          <Zap size={16} color="#fff" />
        </div>
        {!collapsed && <div><span style={{ fontSize: 16, fontWeight: 800, color: t.text, letterSpacing: "-0.3px" }}>GestiónAI</span><div style={{ fontSize: 9, color: t.dim, marginTop: 1, letterSpacing: "1px", textTransform: "uppercase" }}>Construcción</div></div>}
      </div>
      <div style={{ flex: 1, padding: collapsed ? "10px 8px" : "10px 10px", overflowY: "auto" }}>
        {!collapsed && <div style={{ fontSize: 9, fontWeight: 700, color: t.dim, textTransform: "uppercase", letterSpacing: "1.2px", padding: "10px 10px 6px", marginBottom: 2 }}>Menú principal</div>}
        {nav.map(n => {
          const isActive = active === n.id;
          return (
            <div key={n.id} onClick={() => onNav(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: collapsed ? "10px 16px" : "9px 12px",
              borderRadius: 9, cursor: "pointer", marginBottom: 2,
              background: isActive ? t.accentBg : "transparent",
              borderLeft: isActive ? "3px solid " + t.accent : "3px solid transparent",
              transition: "all 0.15s",
            }}>
              <n.icon size={17} color={isActive ? t.accentL : t.dim} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? t.accentL : t.muted }}>{n.label}</span>}
            </div>
          );
        })}
      </div>
      <div style={{ padding: collapsed ? 10 : 14, borderTop: "1px solid " + t.border }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: collapsed ? "8px 6px" : "10px 12px", background: "rgba(37,211,102,0.06)", borderRadius: 9, border: "1px solid rgba(37,211,102,0.12)", marginBottom: 8 }}>
          <MessageSquare size={16} color="#25D366" />
          {!collapsed && <div><div style={{ fontSize: 11, fontWeight: 600, color: "#25D366" }}>WhatsApp</div><div style={{ fontSize: 10, color: t.dim }}>Conectado</div></div>}
        </div>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: collapsed ? "8px 6px" : "8px 10px" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: t.accent + "25", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.accentL }}>{(user.email || "U")[0].toUpperCase()}</span>
            </div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: t.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
              </div>
            )}
            <div onClick={onLogout} style={{ cursor: "pointer", flexShrink: 0 }} title="Cerrar sesión"><LogOut size={14} color={t.dim} /></div>
          </div>
        )}
      </div>
    </div>
  );
}

function TopBar({ title, sub, theme, toggleTheme, t, user, profile, onLogout, onNav }) {
  const { transactions: TXS, tasks, clients, projects, documents } = useData();
  const [searchQ, setSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Search across all data
  const searchResults = searchQ.length < 2 ? [] : [
    ...clients.filter(c => c.name.toLowerCase().includes(searchQ.toLowerCase())).slice(0, 3).map(c => ({ type: "Cliente", name: c.name, icon: Users, nav: "clients" })),
    ...projects.filter(p => p.name.toLowerCase().includes(searchQ.toLowerCase())).slice(0, 3).map(p => ({ type: "Proyecto", name: p.name, icon: FolderKanban, nav: "projects" })),
    ...TXS.filter(tx => tx.desc.toLowerCase().includes(searchQ.toLowerCase())).slice(0, 3).map(tx => ({ type: "Transacción", name: tx.desc + " (" + fmt(tx.amount) + ")", icon: Receipt, nav: "transactions" })),
    ...tasks.filter(tk => tk.title.toLowerCase().includes(searchQ.toLowerCase())).slice(0, 3).map(tk => ({ type: "Tarea", name: tk.title, icon: CheckCircle2, nav: "tasks" })),
    ...documents.filter(d => d.name.toLowerCase().includes(searchQ.toLowerCase())).slice(0, 3).map(d => ({ type: "Documento", name: d.name, icon: FileText, nav: "documents" })),
  ].slice(0, 8);

  // Notifications
  const overdueTx = TXS.filter(tx => tx.status === "overdue");
  const pendingTx = TXS.filter(tx => tx.status === "pending");
  const urgentTasks = tasks.filter(tk => tk.pri === "high" && tk.st !== "done");
  const dueSoonTasks = tasks.filter(tk => {
    if (!tk.due || tk.st === "done") return false;
    const d = new Date(tk.due); const now = new Date(); const diff = (d - now) / (1000*60*60*24);
    return diff >= 0 && diff <= 3;
  });
  const notifs = [
    ...overdueTx.map(tx => ({ icon: AlertCircle, color: t.red, text: "Pago vencido: " + tx.desc, sub: fmt(tx.amount), nav: "transactions" })),
    ...urgentTasks.map(tk => ({ icon: Target, color: t.red, text: "Tarea urgente: " + tk.title, sub: tk.project, nav: "tasks" })),
    ...dueSoonTasks.map(tk => ({ icon: Clock, color: t.orange, text: "Vence pronto: " + tk.title, sub: tk.due, nav: "tasks" })),
    ...pendingTx.slice(0, 3).map(tx => ({ icon: Clock, color: t.orange, text: "Pendiente: " + tx.desc, sub: fmt(tx.amount), nav: "transactions" })),
  ];
  const notiCount = overdueTx.length + urgentTasks.length + dueSoonTasks.length;

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";
  const userCompany = profile?.company?.name || user?.user_metadata?.company || "";
  const userPhone = user?.user_metadata?.phone || "";
  const userRole = { owner: "Dueño / Socio", admin: "Administrador", accountant: "Contador", pm: "Director de obra", employee: "Empleado", other: "Otro" }[profile?.role || user?.user_metadata?.role] || "";

  return (
    <div style={{ padding: "11px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid " + t.border, background: t.topbar, minHeight: 54, position: "relative" }}>
      <div>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: t.text, margin: 0 }}>{title}</h1>
        {sub && <p style={{ fontSize: 11, color: t.muted, margin: "1px 0 0" }}>{sub}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: t.card, border: "1px solid " + (searchOpen ? t.accent + "50" : t.border), borderRadius: 7, padding: "5px 10px", width: searchOpen ? 260 : 180, transition: "all 0.2s" }}>
            <Search size={13} color={t.dim} />
            <input value={searchQ} onChange={e => { setSearchQ(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onBlur={() => setTimeout(() => setSearchOpen(false), 200)} placeholder="Buscar clientes, obras, tareas..." style={{ background: "transparent", border: "none", padding: 0, fontSize: 12, color: t.text, outline: "none", width: "100%" }} />
            {searchQ && <div onMouseDown={() => { setSearchQ(""); setSearchOpen(false); }} style={{ cursor: "pointer" }}><X size={12} color={t.dim} /></div>}
          </div>
          {searchOpen && searchQ.length >= 2 && (
            <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, width: 320, background: t.card, border: "1px solid " + t.border, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 100, overflow: "hidden" }}>
              {searchResults.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: t.dim, fontSize: 12 }}>Sin resultados para "{searchQ}"</div>
              ) : searchResults.map((r, i) => (
                <div key={i} onMouseDown={() => { onNav(r.nav); setSearchQ(""); setSearchOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid " + t.border + "30", background: "transparent" }} onMouseEnter={e => e.currentTarget.style.background = t.hover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <r.icon size={14} color={t.accentL} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: t.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                  </div>
                  <span style={{ fontSize: 10, color: t.dim, background: t.hover, padding: "2px 6px", borderRadius: 4 }}>{r.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Theme */}
        <div onClick={toggleTheme} style={{ width: 30, height: 30, borderRadius: 7, background: t.card, border: "1px solid " + t.border, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {theme === "dark" ? <Sun size={14} color={t.yellow} /> : <Moon size={14} color={t.accent} />}
        </div>

        {/* Notifications */}
        <div style={{ position: "relative" }}>
          <div onClick={() => { setNotiOpen(!notiOpen); setProfileOpen(false); }} style={{ width: 30, height: 30, borderRadius: 7, background: notiOpen ? t.accentBg : t.card, border: "1px solid " + (notiOpen ? t.accent + "30" : t.border), display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
            <Bell size={14} color={notiOpen ? t.accentL : t.muted} />
            {notiCount > 0 && <div style={{ position: "absolute", top: 3, right: 3, minWidth: 14, height: 14, background: t.red, borderRadius: 7, border: "2px solid " + t.topbar, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 8, color: "#fff", fontWeight: 700 }}>{notiCount}</span></div>}
          </div>
          {notiOpen && (
            <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, width: 340, background: t.card, border: "1px solid " + t.border, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 100, maxHeight: 380, overflowY: "auto" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Notificaciones</span>
                <span style={{ fontSize: 11, color: t.dim }}>{notifs.length} alertas</span>
              </div>
              {notifs.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: t.dim, fontSize: 12 }}>Todo al día</div>
              ) : notifs.map((n, i) => (
                <div key={i} onMouseDown={() => { onNav(n.nav); setNotiOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid " + t.border + "20" }} onMouseEnter={e => e.currentTarget.style.background = t.hover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: n.color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><n.icon size={13} color={n.color} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{n.text}</div>
                    <div style={{ fontSize: 10, color: t.dim }}>{n.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <div style={{ position: "relative" }}>
          <div onClick={() => { setProfileOpen(!profileOpen); setNotiOpen(false); }} style={{ cursor: "pointer" }}>
            <Av name={userName} size={30} />
          </div>
          {profileOpen && (
            <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, width: 280, background: t.card, border: "1px solid " + t.border, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 100 }}>
              <div style={{ padding: 16, borderBottom: "1px solid " + t.border }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <Av name={userName} size={40} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{userName}</div>
                    <div style={{ fontSize: 11, color: t.muted }}>{user?.email}</div>
                  </div>
                </div>
                {userCompany && (
                  <div style={{ padding: "8px 10px", background: t.hover, borderRadius: 7, marginBottom: 6 }}>
                    <div style={{ fontSize: 10, color: t.dim }}>Empresa</div>
                    <div style={{ fontSize: 12, color: t.text, fontWeight: 600 }}>{userCompany}</div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {userRole && <div style={{ padding: "6px 8px", background: t.hover, borderRadius: 6 }}><div style={{ fontSize: 9, color: t.dim }}>Rol</div><div style={{ fontSize: 11, color: t.text }}>{userRole}</div></div>}
                  {userPhone && <div style={{ padding: "6px 8px", background: t.hover, borderRadius: 6 }}><div style={{ fontSize: 9, color: t.dim }}>Teléfono</div><div style={{ fontSize: 11, color: t.text }}>{userPhone}</div></div>}
                </div>
              </div>
              <div onMouseDown={onLogout} style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: t.red, fontSize: 12, fontWeight: 600 }} onMouseEnter={e => e.currentTarget.style.background = t.hover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <LogOut size={14} /> Cerrar sesión
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ t, onNav }) {
  const { transactions: TXS, tasks, clients, projects, documents } = useData();
  const pendingTasks = tasks.filter(tk => tk.st === "todo" || tk.st === "in_progress");
  const urgentTasks = pendingTasks.filter(tk => tk.pri === "high");
  const pendingTx = TXS.filter(tx => tx.status === "pending" || tx.status === "overdue");
  const overdueTx = TXS.filter(tx => tx.status === "overdue");
  const recentDocs = documents.slice(0, 5);
  const today = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  // Tasks due soon (next 7 days)
  const dueSoon = tasks.filter(tk => {
    if (!tk.due || tk.st === "done") return false;
    const d = new Date(tk.due); const now = new Date(); const diff = (d - now) / (1000*60*60*24);
    return diff >= -1 && diff <= 7;
  }).sort((a, b) => new Date(a.due) - new Date(b.due));

  return (
    <div style={{ padding: 24, overflowY: "auto", height: "calc(100vh - 54px)" }}>
      {/* Welcome + date */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>Buen día</div>
        <div style={{ fontSize: 12, color: t.muted, marginTop: 2, textTransform: "capitalize" }}>{today}</div>
      </div>

      {/* Quick stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { icon: Target, label: "Tareas pendientes", val: pendingTasks.length, sub: urgentTasks.length + " urgentes", color: t.accent, bg: t.accentBg, nav: "tasks" },
          { icon: AlertCircle, label: "Pagos vencidos", val: overdueTx.length, sub: overdueTx.length ? fmt(overdueTx.reduce((s, tx) => s + Math.abs(tx.amount), 0)) : "Ninguno", color: t.red, bg: t.redBg, nav: "transactions" },
          { icon: Clock, label: "Cobros pendientes", val: pendingTx.filter(tx => tx.amount > 0).length, sub: fmt(pendingTx.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0)), color: t.green, bg: t.greenBg, nav: "transactions" },
          { icon: FolderKanban, label: "Obras activas", val: projects.filter(p => p.status === "active" || p.status === "in_progress").length || projects.length, sub: clients.length + " clientes", color: t.blue, bg: "rgba(96,165,250,0.08)", nav: "projects" },
        ].map((k, i) => (
          <Crd key={i} t={t} style={{ padding: 16, cursor: "pointer", transition: "transform 0.15s" }} onClick={() => onNav && onNav(k.nav)} onMouseEnter={e => e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform="none"}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><k.icon size={17} color={k.color} /></div>
            </div>
            <div style={{ fontSize: 10, color: t.muted }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: t.text }}>{k.val}</div>
            <div style={{ fontSize: 10, color: t.dim, marginTop: 2 }}>{k.sub}</div>
          </Crd>
        ))}
      </div>

      {/* Main grid: tasks + agenda */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 14, marginBottom: 20 }}>
        {/* Tasks panel */}
        <Crd t={t} style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Tareas para hoy</div>
            <span onClick={() => onNav && onNav("tasks")} style={{ fontSize: 11, color: t.accentL, cursor: "pointer", fontWeight: 500 }}>Ver todas →</span>
          </div>
          {pendingTasks.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center" }}>
              <CheckCircle2 size={28} color={t.green} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: t.green, fontWeight: 600 }}>Todo al día</div>
              <div style={{ fontSize: 11, color: t.dim }}>No hay tareas pendientes</div>
            </div>
          ) : pendingTasks.slice(0, 8).map(tk => (
            <div key={tk.id} onClick={() => onNav && onNav("tasks")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: t.hover, marginBottom: 5, borderLeft: "3px solid " + (tk.pri === "high" ? t.red : tk.pri === "medium" ? t.orange : t.blue), cursor: "pointer" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{tk.title}</div>
                <div style={{ fontSize: 10, color: t.dim }}>{tk.project} · {tk.who || "Sin asignar"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                {tk.due && <div style={{ fontSize: 10, color: new Date(tk.due) < new Date() ? t.red : t.dim }}>{tk.due}</div>}
                <Badge s={tk.st} t={t} />
              </div>
            </div>
          ))}
          {pendingTasks.length > 8 && <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: t.accentL }}>+{pendingTasks.length - 8} tareas más</div>}
        </Crd>

        {/* Right column: vencimientos + próximos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Due soon */}
          <Crd t={t} style={{ padding: 16 }}>
            <div onClick={() => onNav && onNav("tasks")} style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 10, cursor: "pointer" }}>Vencimientos próximos <span style={{ fontSize: 10, color: t.accentL, fontWeight: 500 }}>→</span></div>
            {dueSoon.length === 0 ? (
              <div style={{ fontSize: 11, color: t.dim, textAlign: "center", padding: 12 }}>Sin vencimientos esta semana</div>
            ) : dueSoon.slice(0, 5).map(tk => {
              const d = new Date(tk.due); const now = new Date(); const diff = Math.ceil((d - now) / (1000*60*60*24));
              const urgency = diff < 0 ? "Vencida" : diff === 0 ? "Hoy" : diff === 1 ? "Mañana" : diff + " días";
              return (
                <div key={tk.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid " + t.border + "15" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: diff <= 0 ? t.red : diff <= 2 ? t.orange : t.blue, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: t.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.title}</div>
                    <div style={{ fontSize: 10, color: t.dim }}>{tk.project}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: diff <= 0 ? t.red : diff <= 2 ? t.orange : t.muted, whiteSpace: "nowrap" }}>{urgency}</span>
                </div>
              );
            })}
          </Crd>

          {/* Cobros/pagos urgentes */}
          <Crd t={t} style={{ padding: 16 }}>
            <div onClick={() => onNav && onNav("transactions")} style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 10, cursor: "pointer" }}>Cobros y pagos pendientes <span style={{ fontSize: 10, color: t.accentL, fontWeight: 500 }}>→</span></div>
            {pendingTx.length === 0 ? (
              <div style={{ fontSize: 11, color: t.dim, textAlign: "center", padding: 12 }}>Todo al día</div>
            ) : pendingTx.slice(0, 5).map(tx => (
              <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid " + t.border + "15" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: t.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.desc}</div>
                  <div style={{ fontSize: 10, color: t.dim }}>{tx.contact}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: tx.amount > 0 ? t.green : t.red }}>{fmt(tx.amount)}</div>
                  <Badge s={tx.status} t={t} />
                </div>
              </div>
            ))}
          </Crd>
        </div>
      </div>

      {/* Bottom row: recent activity + docs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Last transactions */}
        <Crd t={t} style={{ padding: 20 }}>
          <div onClick={() => onNav && onNav("transactions")} style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 14, cursor: "pointer" }}>Últimos movimientos <span style={{ fontSize: 10, color: t.accentL, fontWeight: 500 }}>→</span></div>
          {TXS.slice(0, 5).map(tx => (
            <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + t.border + "15" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: tx.amount > 0 ? t.greenBg : t.redBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {tx.amount > 0 ? <ArrowUpRight size={11} color={t.green} /> : <ArrowDownRight size={11} color={t.red} />}
                </div>
                <div><div style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{tx.desc}</div><div style={{ fontSize: 10, color: t.dim }}>{tx.date} · {tx.contact}</div></div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: tx.amount > 0 ? t.green : t.red }}>{fmt(tx.amount)}</span>
            </div>
          ))}
        </Crd>

        {/* Recent docs */}
        <Crd t={t} style={{ padding: 20 }}>
          <div onClick={() => onNav && onNav("documents")} style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 14, cursor: "pointer" }}>Documentos recientes <span style={{ fontSize: 10, color: t.accentL, fontWeight: 500 }}>→</span></div>
          {recentDocs.length === 0 ? (
            <div style={{ fontSize: 12, color: t.dim, textAlign: "center", padding: 20 }}>Sin documentos</div>
          ) : recentDocs.map(d => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid " + t.border + "15" }}>
              <FileText size={14} color={t.accentL} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: t.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                <div style={{ fontSize: 10, color: t.dim }}>{d.date} · {d.contact || d.project || "—"}</div>
              </div>
              <Badge s={d.status} t={t} />
              {d.file_url && <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: t.accentL, textDecoration: "none", padding: "2px 6px", background: t.accentBg, borderRadius: 4 }}>Ver</a>}
            </div>
          ))}
        </Crd>
      </div>
    </div>
  );
}

function Inp({ label, val, onChange, t, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>{label}</div>
      {type === "select" ? (
        <select value={val} onChange={e => onChange(e.target.value)} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 9px", color: t.text, fontSize: 12 }}>
          <option value="customer">Cliente</option>
          <option value="supplier">Proveedor</option>
        </select>
      ) : (
        <input value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 9px", color: t.text, fontSize: 12, outline: "none" }} />
      )}
    </div>
  );
}

function Clients({ t }) {
  const { clients, setClients, transactions: TXS, documents: DOCS, reload, companyId } = useData();
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const clientFileRef = useRef(null);
  const [nf, setNf] = useState({ name: "", type: "customer", contact: "", phone: "", email: "", city: "" });
  const list = clients.filter(c => filter === "all" || c.type === filter);

  const saveNew = async () => {
    if (!nf.name.trim()) return;
    const { data, error } = await supabase.from("clients").insert([{ name: nf.name, type: nf.type, contact: nf.contact, phone: nf.phone, email: nf.email, city: nf.city, company_id: companyId }]).select();
    if (!error && data) {
      await reload();
    }
    setNf({ name: "", type: "customer", contact: "", phone: "", email: "", city: "" });
    setShowNew(false);
  };

  if (sel) {
    const c = clients.find(x => x.id === sel);
    if (!c) { setSel(null); return null; }
    const clientTxs = TXS.filter(tx => tx.contact === c.name);
    const clientDocs = DOCS.filter(d => d.contact_id === c.id || d.contact === c.name);
    return (
      <div style={{ padding: 22, overflowY: "auto", height: "calc(100vh - 54px)" }}>
        <div onClick={() => setSel(null)} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 16, cursor: "pointer", color: t.muted, fontSize: 12 }}><ChevronLeft size={14} /> Volver</div>
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 14 }}>
          <Crd t={t} style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><Av name={c.name} size={42} /><div><div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{c.name}</div><Badge s={c.type} t={t} /></div></div>
            {[[Phone,"Tel",c.phone],[Mail,"Email",c.email],[MapPin,"Ciudad",c.city]].map(([I,l,v],i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}><I size={12} color={t.dim} /><div><div style={{ fontSize: 10, color: t.dim }}>{l}</div><div style={{ fontSize: 12, color: t.text }}>{v || "—"}</div></div></div>
            ))}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid " + t.border }}><div style={{ fontSize: 10, color: t.dim }}>Saldo</div><div style={{ fontSize: 20, fontWeight: 700, color: c.balance >= 0 ? t.green : t.red }}>{fmt(c.balance)}</div></div>
          </Crd>
          <div>
            <Crd t={t} style={{ padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>Movimientos ({clientTxs.length})</div>
              {clientTxs.length ? clientTxs.map(tx => (
                <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + t.border + "15" }}>
                  <div><div style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{tx.desc}</div><div style={{ fontSize: 10, color: t.dim }}>{tx.date} · {tx.project}</div></div>
                  <div style={{ textAlign: "right" }}><span style={{ fontSize: 12, fontWeight: 600, color: tx.amount > 0 ? t.green : t.red }}>{fmt(tx.amount)}</span><div><Badge s={tx.status} t={t} /></div></div>
                </div>
              )) : <div style={{ fontSize: 12, color: t.dim, textAlign: "center", padding: 24 }}>Sin movimientos aún</div>}
            </Crd>
            <Crd t={t} style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Documentos ({clientDocs.length})</div>
                <input ref={clientFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={async (e) => {
                  const f = e.target.files[0]; if (!f) return;
                  const fileUrl = await uploadFile(f);
                  await supabase.from("documents").insert([{ name: f.name, type: "other", size: f.size > 1048576 ? (f.size/1048576).toFixed(1)+" MB" : Math.round(f.size/1024)+" KB", contact_id: c.id, status: "pending", file_url: fileUrl, company_id: companyId }]);
                  const curSel = sel; await reload(); setSel(curSel);
                }} />
                <Btn t={t} onClick={() => clientFileRef.current && clientFileRef.current.click()}><Upload size={12} />Subir</Btn>
              </div>
              {clientDocs.length ? clientDocs.map(d => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid " + t.border + "15" }}>
                  <FileText size={14} color={t.accentL} />
                  <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: t.text, fontWeight: 500 }}>{d.name}</div><div style={{ fontSize: 10, color: t.dim }}>{d.date} · {d.size}</div></div>
                  {d.file_url && <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: t.accentL, textDecoration: "none", padding: "3px 8px", background: t.accentBg, borderRadius: 5 }}>Ver ↗</a>}
                  <Badge s={d.status} t={t} />
                </div>
              )) : <div style={{ fontSize: 12, color: t.dim, textAlign: "center", padding: 24 }}>Sin documentos</div>}
            </Crd>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: 22, overflowY: "auto", height: "calc(100vh - 54px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <Tabs t={t} active={filter} onChange={setFilter} items={[{ id: "all", label: "Todos" }, { id: "customer", label: "Clientes" }, { id: "supplier", label: "Proveedores" }]} />
        <Btn primary t={t} onClick={() => setShowNew(!showNew)}><Plus size={12} />Nuevo</Btn>
      </div>

      {showNew && (
        <Crd t={t} style={{ padding: 18, marginBottom: 14, border: "2px solid " + t.accent + "30" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>Nuevo contacto</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Inp label="Razón social / Nombre" val={nf.name} onChange={v => setNf({...nf, name: v})} t={t} placeholder="Ej: Constructora Norte SA" />
            <Inp label="Tipo" val={nf.type} onChange={v => setNf({...nf, type: v})} t={t} type="select" />
            <Inp label="Persona de contacto" val={nf.contact} onChange={v => setNf({...nf, contact: v})} t={t} placeholder="Nombre y apellido" />
            <Inp label="Teléfono" val={nf.phone} onChange={v => setNf({...nf, phone: v})} t={t} placeholder="+54 11 ..." />
            <Inp label="Email" val={nf.email} onChange={v => setNf({...nf, email: v})} t={t} placeholder="email@empresa.com" />
            <Inp label="Ciudad" val={nf.city} onChange={v => setNf({...nf, city: v})} t={t} placeholder="Buenos Aires" />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 6 }}>
            <Btn t={t} onClick={() => setShowNew(false)}>Cancelar</Btn>
            <Btn primary t={t} onClick={saveNew}><Check size={12} />Guardar</Btn>
          </div>
        </Crd>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 10 }}>
        {list.map(c => (
          <Crd key={c.id} t={t} style={{ padding: 14, cursor: "pointer" }}>
            <div onClick={() => setSel(c.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Av name={c.name} size={36} /><div><div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{c.name}</div><div style={{ fontSize: 11, color: t.muted }}>{c.contact}</div></div></div>
                <Badge s={c.type} t={t} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div><div style={{ fontSize: 10, color: t.dim }}>Saldo</div><div style={{ fontSize: 16, fontWeight: 700, color: c.balance >= 0 ? t.green : t.red }}>{fmt(c.balance)}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: t.dim }}>{c.projects} proy.</div></div>
              </div>
            </div>
          </Crd>
        ))}
      </div>
    </div>
  );
}

function ProjectsPage({ t }) {
  const { projects: PROJECTS, transactions: TXS, tasks: TASKS, documents: DOCS, clients, reload, companyId } = useData();
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [nf, setNf] = useState({ name: "", client_id: "", budget: "", deadline: "", priority: "medium", description: "" });
  const projFileRef = useRef(null);
  const list = PROJECTS.filter(p => filter === "all" ? true : filter === "active" ? (p.status === "in_progress" || p.status === "planning") : p.status === "completed");

  const saveProject = async () => {
    if (!nf.name.trim()) return;
    await supabase.from("projects").insert([{ name: nf.name, client_id: nf.client_id || null, budget: Number(nf.budget) || 0, deadline: nf.deadline || null, priority: nf.priority, description: nf.description, status: "planning", progress: 0, spent: 0, company_id: companyId }]);
    await reload();
    setNf({ name: "", client_id: "", budget: "", deadline: "", priority: "medium", description: "" });
    setShowNew(false);
  };

  if (sel) {
    const p = PROJECTS.find(x => x.id === sel);
    return (
      <div style={{ padding: 22, overflowY: "auto", height: "calc(100vh - 54px)" }}>
        <div onClick={() => setSel(null)} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 16, cursor: "pointer", color: t.muted, fontSize: 12 }}><ChevronLeft size={14} /> Volver</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div><h2 style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: 0 }}>{p.name}</h2><div style={{ fontSize: 12, color: t.muted, marginTop: 3 }}>{p.client} · {p.deadline}</div></div>
          <div style={{ display: "flex", gap: 6 }}><Badge s={p.status} t={t} /><Badge s={p.priority} t={t} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
          {(() => {
            const pTxs = TXS.filter(tx => tx.pid === p.id);
            const pTasks = TASKS.filter(tk => tk.pid === p.id);
            const pDocs = DOCS.filter(d => d.pid === p.id);
            return [["Presupuesto",fmt(p.budget)],["Gastado",fmt(p.spent)+" ("+(p.budget ? Math.round(p.spent/p.budget*100) : 0)+"%)"],["Tareas",pTasks.filter(tk=>tk.st==="done").length+"/"+pTasks.length],["Docs",""+pDocs.length]].map(([l,v],i) => (
              <Crd key={i} t={t} style={{ padding: 12 }}><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>{l}</div><div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{v}</div></Crd>
            ));
          })()}
        </div>
        <div style={{ marginBottom: 16 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: t.muted }}>Avance</span><span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{p.progress}%</span></div><PBar v={p.progress} h={8} color={p.progress > 80 ? t.green : t.accent} t={t} /></div>
        {p.description && <p style={{ fontSize: 12, color: t.muted, marginBottom: 18 }}>{p.description}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <Crd t={t} style={{ padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 10 }}>Movimientos de dinero</div>
            {TXS.filter(tx => tx.pid === p.id).length ? TXS.filter(tx => tx.pid === p.id).map(tx => (
              <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid " + t.border + "15" }}>
                <div><div style={{ fontSize: 11, color: t.text }}>{tx.desc}</div><div style={{ fontSize: 10, color: t.dim }}>{tx.date} · {tx.contact}</div></div>
                <div style={{ textAlign: "right" }}><span style={{ fontSize: 12, fontWeight: 600, color: tx.amount > 0 ? t.green : t.red }}>{fmt(tx.amount)}</span><div><Badge s={tx.status} t={t} /></div></div>
              </div>
            )) : <div style={{ fontSize: 11, color: t.dim, textAlign: "center", padding: 16 }}>Sin movimientos</div>}
          </Crd>
          <Crd t={t} style={{ padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 10 }}>Tareas y pendientes</div>
            {TASKS.filter(tk => tk.pid === p.id).length ? TASKS.filter(tk => tk.pid === p.id).map(tk => (
              <div key={tk.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid " + t.border + "15" }}>
                <div>
                  <span style={{ fontSize: 11, color: t.text, textDecoration: tk.st === "done" ? "line-through" : "none" }}>{tk.title}</span>
                  <div style={{ fontSize: 10, color: t.dim }}>{tk.due || "Sin fecha"} · {tk.who}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}><Badge s={tk.st} t={t} /><Badge s={tk.pri} t={t} /></div>
              </div>
            )) : <div style={{ fontSize: 11, color: t.dim, textAlign: "center", padding: 16 }}>Sin tareas</div>}
          </Crd>
        </div>
        <Crd t={t} style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Documentos y facturas</div>
            <input ref={projFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={async (e) => {
              const f = e.target.files[0]; if (!f) return;
              const fileUrl = await uploadFile(f);
              await supabase.from("documents").insert([{ name: f.name, type: "other", size: f.size > 1048576 ? (f.size/1048576).toFixed(1)+" MB" : Math.round(f.size/1024)+" KB", project_id: p.id, status: "pending", file_url: fileUrl, company_id: companyId }]);
              const curSel = sel; await reload(); setSel(curSel);
            }} />
            <Btn t={t} onClick={() => projFileRef.current && projFileRef.current.click()}><Upload size={12} />Subir documento</Btn>
          </div>
          {DOCS.filter(d => d.pid === p.id || d.project_id === p.id).length ? DOCS.filter(d => d.pid === p.id || d.project_id === p.id).map(d => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid " + t.border + "15" }}>
              <FileText size={14} color={t.accentL} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: t.text, fontWeight: 500 }}>{d.name}</div><div style={{ fontSize: 10, color: t.dim }}>{d.date} · {d.size} · {d.contact || "—"}</div></div>
              {d.file_url && <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: t.accentL, textDecoration: "none", padding: "3px 8px", background: t.accentBg, borderRadius: 5 }}>Ver ↗</a>}
              <Badge s={d.status} t={t} />
            </div>
          )) : <div style={{ fontSize: 11, color: t.dim, textAlign: "center", padding: 16 }}>Sin documentos aún</div>}
        </Crd>
      </div>
    );
  }
  return (
    <div style={{ padding: 22, overflowY: "auto", height: "calc(100vh - 54px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <Tabs t={t} active={filter} onChange={setFilter} items={[{ id: "all", label: "Todos", icon: Layers }, { id: "active", label: "En curso", icon: Activity }, { id: "done", label: "Completados", icon: Archive }]} />
        <Btn primary t={t} onClick={() => setShowNew(!showNew)}><Plus size={12} />Nuevo proyecto</Btn>
      </div>
      {showNew && (
        <Crd t={t} style={{ padding: 18, marginBottom: 14, border: "2px dashed " + t.accent + "35" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 14 }}>Nuevo proyecto</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <Inp label="Nombre del proyecto" val={nf.name} onChange={v => setNf({ ...nf, name: v })} t={t} placeholder="Ej: Torre Belgrano" />
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Cliente</div>
              <select value={nf.client_id} onChange={e => setNf({ ...nf, client_id: e.target.value })} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 9px", color: t.text, fontSize: 12 }}>
                <option value="">— Seleccionar —</option>
                {clients.filter(c => c.type === "customer").map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <Inp label="Presupuesto ($)" val={nf.budget} onChange={v => setNf({ ...nf, budget: v })} t={t} placeholder="45000000" />
            <Inp label="Fecha límite" val={nf.deadline} onChange={v => setNf({ ...nf, deadline: v })} t={t} placeholder="2026-06-30" />
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Prioridad</div>
              <select value={nf.priority} onChange={e => setNf({ ...nf, priority: e.target.value })} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 9px", color: t.text, fontSize: 12 }}>
                <option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option>
              </select>
            </div>
          </div>
          <Inp label="Descripción" val={nf.description} onChange={v => setNf({ ...nf, description: v })} t={t} placeholder="Descripción del proyecto..." />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 6 }}>
            <Btn t={t} onClick={() => setShowNew(false)}>Cancelar</Btn>
            <Btn primary t={t} onClick={saveProject}><Check size={12} />Guardar</Btn>
          </div>
        </Crd>
      )}
      {list.map(p => (
        <Crd key={p.id} t={t} style={{ padding: 14, marginBottom: 8, cursor: "pointer" }}>
          <div onClick={() => setSel(p.id)} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 100px 80px", alignItems: "center", gap: 12 }}>
            <div><div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{p.name}</div><div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{p.client}</div></div>
            <div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 10, color: t.dim }}>Avance</span><span style={{ fontSize: 10, fontWeight: 600, color: t.text }}>{p.progress}%</span></div><PBar v={p.progress} color={p.progress > 80 ? t.green : t.accent} t={t} /></div>
            <div><div style={{ fontSize: 10, color: t.dim }}>Presupuesto</div><div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{fmt(p.budget)}</div></div>
            <div><div style={{ fontSize: 10, color: t.dim }}>Deadline</div><div style={{ fontSize: 12, color: t.text }}>{p.deadline}</div></div>
            <Badge s={p.priority} t={t} />
          </div>
        </Crd>
      ))}
    </div>
  );
}

function TasksPage({ t }) {
  const { tasks: dbTasks, reload, companyId } = useData();
  const [view, setView] = useState("board");
  const [tasks, setTasks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const cols = [{ id: "todo", label: "Por hacer", color: t.muted, icon: Clock }, { id: "in_progress", label: "En progreso", color: t.blue, icon: Activity }, { id: "review", label: "Revisión", color: t.yellow, icon: Eye }, { id: "done", label: "Completado", color: t.green, icon: CheckCircle2 }];

  useEffect(() => { setTasks(dbTasks); }, [dbTasks]);

  const openEdit = (tk) => { setEditing(tk.id); setEditForm({ ...tk }); };
  const saveEdit = async () => {
    const { id, project, ...rest } = editForm;
    await supabase.from("tasks").update({ title: rest.title, assignee: rest.who, priority: rest.pri, due_date: rest.due, status: rest.st, tag: rest.tag }).eq("id", id);
    setTasks(tasks.map(tk => tk.id === editing ? { ...editForm } : tk));
    setEditing(null); setEditForm(null);
  };
  const deleteTask = async (id) => {
    if (!window.confirm("¿Eliminar esta tarea?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    setTasks(tasks.filter(tk => tk.id !== id));
    setEditing(null); setEditForm(null);
  };
  const addTask = async () => {
    const { data } = await supabase.from("tasks").insert([{ title: "Nueva tarea", assignee: "MR", priority: "medium", due_date: "2026-02-20", status: "todo", tag: "General", company_id: companyId }]).select();
    if (data && data[0]) {
      const nt = { ...data[0], project: "Admin", pid: null, who: data[0].assignee, pri: data[0].priority, due: data[0].due_date, st: data[0].status, tag: data[0].tag };
      setTasks([nt, ...tasks]);
      openEdit(nt);
    }
  };

  const editPanel = editForm && (
    <div style={{ position: "fixed", top: 0, right: 0, width: 340, height: "100vh", background: t.card, borderLeft: "1px solid " + t.border, padding: 20, zIndex: 100, boxShadow: "-4px 0 20px rgba(0,0,0,0.2)", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Editar tarea</span>
        <div onClick={() => { setEditing(null); setEditForm(null); }} style={{ cursor: "pointer" }}><X size={16} color={t.muted} /></div>
      </div>
      <Inp label="Título" val={editForm.title} onChange={v => setEditForm({...editForm, title: v})} t={t} />
      <Inp label="Proyecto" val={editForm.project} onChange={v => setEditForm({...editForm, project: v})} t={t} />
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Estado</div>
        <select value={editForm.st} onChange={e => setEditForm({...editForm, st: e.target.value})} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 9px", color: t.text, fontSize: 12 }}>
          <option value="todo">Por hacer</option><option value="in_progress">En progreso</option><option value="review">Revisión</option><option value="done">Completado</option>
        </select>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Prioridad</div>
        <select value={editForm.pri} onChange={e => setEditForm({...editForm, pri: e.target.value})} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 9px", color: t.text, fontSize: 12 }}>
          <option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option>
        </select>
      </div>
      <Inp label="Asignado" val={editForm.who} onChange={v => setEditForm({...editForm, who: v})} t={t} />
      <Inp label="Fecha de vencimiento (YYYY-MM-DD)" val={editForm.due} onChange={v => setEditForm({...editForm, due: v})} t={t} />
      <Inp label="Etiqueta" val={editForm.tag} onChange={v => setEditForm({...editForm, tag: v})} t={t} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <Btn t={t} onClick={() => deleteTask(editForm.id)} style={{ color: t.red }}><X size={12} />Eliminar</Btn>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn t={t} onClick={() => { setEditing(null); setEditForm(null); }}>Cancelar</Btn>
          <Btn primary t={t} onClick={saveEdit}><Check size={12} />Guardar</Btn>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 22, overflowY: "auto", height: "calc(100vh - 54px)" }}>
      {editPanel}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <Tabs t={t} active={view} onChange={setView} items={[{ id: "board", label: "Board", icon: Grid3X3 }, { id: "list", label: "Lista", icon: List }, { id: "calendar", label: "Calendario", icon: Calendar }]} />
        <Btn primary t={t} onClick={addTask}><Plus size={12} />Nueva tarea</Btn>
      </div>
      {view === "board" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, alignItems: "flex-start" }}>
          {cols.map(col => {
            const items = tasks.filter(tk => tk.st === col.id);
            return (
              <div key={col.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                  <col.icon size={13} color={col.color} /><span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{col.label}</span>
                  <span style={{ fontSize: 10, color: t.dim, background: t.hover, padding: "1px 6px", borderRadius: 8 }}>{items.length}</span>
                </div>
                {items.map(tk => (
                  <Crd key={tk.id} t={t} style={{ padding: 11, marginBottom: 6, cursor: "pointer", border: editing === tk.id ? "1px solid " + t.accent : "1px solid " + t.border }}>
                    <div onClick={() => openEdit(tk)}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 5 }}>{tk.title}</div>
                      <div style={{ fontSize: 10, color: t.dim, marginBottom: 7 }}>{tk.project}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ ...pill(t.hover, t.muted), fontSize: 9, padding: "1px 6px" }}>{tk.tag}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 10, color: t.dim }}>{( tk.due || "").slice(8)}/{(tk.due || "").slice(5, 7)}</span><Av name={tk.who} size={18} /></div>
                      </div>
                    </div>
                  </Crd>
                ))}
              </div>
            );
          })}
        </div>
      )}
      {view === "list" && (
        <Crd t={t} style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: t.hover }}>{["Tarea","Proyecto","Prioridad","Fecha","Estado",""].map(h => <th key={h} style={{ padding: "9px 12px", fontSize: 10, fontWeight: 600, color: t.dim, textAlign: "left", textTransform: "uppercase", borderBottom: "1px solid " + t.border }}>{h}</th>)}</tr></thead>
            <tbody>{tasks.map(tk => (
              <tr key={tk.id} style={{ cursor: "pointer" }} onClick={() => openEdit(tk)}>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid " + t.border + "15" }}><span style={{ fontSize: 12, color: t.text, fontWeight: 500, textDecoration: tk.st === "done" ? "line-through" : "none" }}>{tk.title}</span></td>
                <td style={{ padding: "9px 12px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{tk.project}</td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid " + t.border + "15" }}><Badge s={tk.pri} t={t} /></td>
                <td style={{ padding: "9px 12px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{( tk.due || "").slice(8)}/{(tk.due || "").slice(5, 7)}</td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid " + t.border + "15" }}><Badge s={tk.st} t={t} /></td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid " + t.border + "15" }}><MoreHorizontal size={13} color={t.dim} /></td>
              </tr>
            ))}</tbody>
          </table>
        </Crd>
      )}
      {view === "calendar" && (
        <Crd t={t} style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: t.text }}>Febrero 2026</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
            {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: t.dim, padding: "8px 0", borderBottom: "2px solid " + t.border }}>
                {d}
              </div>
            ))}
            {Array(6).fill(null).map((_, i) => <div key={"e" + i} style={{ minHeight: 80 }} />)}
            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => {
              const ds = "2026-02-" + String(d).padStart(2, "0");
              const dt = tasks.filter(tk => tk.due === ds);
              const today = d === 20;
              const isWeekend = (() => { const dow = new Date(2026, 1, d).getDay(); return dow === 0 || dow === 6; })();
              return (
                <div key={d} style={{
                  minHeight: 80, padding: 6, borderRadius: 8,
                  border: today ? "2px solid " + t.accent : "1px solid " + t.border + "30",
                  background: today ? t.accentBg : isWeekend ? t.hover + "50" : "transparent",
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: today ? 800 : 500,
                    color: today ? t.accentL : isWeekend ? t.dim : t.text,
                    textAlign: "right", padding: "0 2px", marginBottom: 4,
                  }}>
                    {d}
                  </div>
                  {dt.map(tk => (
                    <div key={tk.id} onClick={() => openEdit(tk)} style={{
                      fontSize: 10, padding: "3px 5px", borderRadius: 4, marginBottom: 2,
                      cursor: "pointer", lineHeight: 1.3,
                      background: tk.pri === "high" ? t.redBg : tk.pri === "medium" ? t.orangeBg : t.blueBg,
                      color: tk.pri === "high" ? t.red : tk.pri === "medium" ? t.orange : t.blue,
                      borderLeft: "2px solid " + (tk.pri === "high" ? t.red : tk.pri === "medium" ? t.orange : t.blue),
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {tk.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 14 }}>
            {[["Alta", t.red, t.redBg], ["Media", t.orange, t.orangeBg], ["Baja", t.blue, t.blueBg]].map(([l, c, bg]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: bg, border: "1px solid " + c }} />
                <span style={{ fontSize: 10, color: t.muted }}>{l}</span>
              </div>
            ))}
          </div>
        </Crd>
      )}
    </div>
  );
}

function Transactions({ t }) {
  const { transactions: TXS, documents: DOCS, clients, projects, reload, companyId } = useData();
  const [tab, setTab] = useState("all");
  const [sel, setSel] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [filterProject, setFilterProject] = useState("");
  const [nf, setNf] = useState({ description: "", contact_id: "", project_id: "", amount: "", status: "pending", date: new Date().toISOString().slice(0, 10) });

  const saveTx = async () => {
    if (!nf.description.trim() || !nf.amount) return;
    await supabase.from("transactions").insert([{ description: nf.description, contact_id: nf.contact_id || null, project_id: nf.project_id || null, amount: Number(nf.amount), status: nf.status, date: nf.date, company_id: companyId }]);
    await reload();
    setNf({ description: "", contact_id: "", project_id: "", amount: "", status: "pending", date: new Date().toISOString().slice(0, 10) });
    setShowNew(false);
  };

  const markPaid = async (id) => {
    await supabase.from("transactions").update({ status: "paid" }).eq("id", id);
    await reload();
    setSel(null);
  };

  const list = tab === "accounting" ? TXS : TXS.filter(tx => {
    if (filterProject && tx.project !== filterProject) return false;
    return tab === "income" ? tx.amount > 0 : tab === "expense" ? tx.amount < 0 : tab === "pending" ? (tx.status === "pending" || tx.status === "overdue") : true;
  });

  const txFileRef = useRef(null);

  if (sel && tab !== "accounting") {
    const tx = TXS.find(x => x.id === sel);
    if (!tx) { setSel(null); return null; }
    const linkedDocs = DOCS.filter(d => d.transaction_id === tx.id);
    const attachDoc = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const fileUrl = await uploadFile(f);
      await supabase.from("documents").insert([{ name: f.name, type: "invoice", size: f.size > 1048576 ? (f.size/1048576).toFixed(1)+" MB" : Math.round(f.size/1024)+" KB", contact_id: tx.contact_id, project_id: tx.project_id, transaction_id: tx.id, status: "pending", file_url: fileUrl, company_id: companyId }]);
      const curSel = sel;
      await reload();
      setSel(curSel);
    };
    return (
      <div style={{ padding: 22, overflowY: "auto", height: "calc(100vh - 54px)" }}>
        <div onClick={() => setSel(null)} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 16, cursor: "pointer", color: t.muted, fontSize: 12 }}><ChevronLeft size={14} /> Volver</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}>
          <div>
            <Crd t={t} style={{ padding: 18, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div><div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>{tx.desc}</div><div style={{ fontSize: 12, color: t.muted, marginTop: 3 }}>{tx.contact} · {tx.project}</div></div>
                <Badge s={tx.status} t={t} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><div style={{ fontSize: 10, color: t.dim }}>Monto</div><div style={{ fontSize: 20, fontWeight: 700, color: tx.amount > 0 ? t.green : t.red }}>{fmt(tx.amount)}</div></div>
                <div><div style={{ fontSize: 10, color: t.dim }}>Fecha</div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{tx.date}/2026</div></div>
                <div><div style={{ fontSize: 10, color: t.dim }}>Tipo</div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{tx.amount > 0 ? "Ingreso" : "Egreso"}</div></div>
              </div>
              {(tx.status === "pending" || tx.status === "overdue") && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: tx.status === "overdue" ? t.redBg : t.orangeBg, border: "1px solid " + (tx.status === "overdue" ? t.red : t.orange) + "25" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: tx.status === "overdue" ? t.red : t.orange, marginBottom: 4 }}>
                    {tx.status === "overdue" ? "⚠ Vencido — cobro/pago pasado de fecha" : "⏳ Pendiente — en espera de confirmación"}
                  </div>
                  <div style={{ fontSize: 11, color: t.muted }}>
                    {tx.status === "overdue" ? "Este movimiento pasó su fecha de vencimiento y requiere seguimiento urgente con el contacto." : "Este movimiento fue registrado pero aún no se confirmó el cobro/pago efectivo."}
                  </div>
                </div>
              )}
            </Crd>
            {tx.status !== "paid" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <Btn primary t={t} onClick={() => markPaid(tx.id)}><Check size={12} />Marcar como pagado</Btn>
                <Btn t={t} onClick={() => window.alert("📱 Recordatorio para " + tx.contact + ":\n\nHola, le recordamos que tiene un pago/cobro pendiente:\n• " + tx.desc + "\n• Monto: " + fmt(tx.amount) + "\n\n(Próximamente se enviará por WhatsApp automáticamente)")}><Mail size={12} />Enviar recordatorio</Btn>
              </div>
            )}
          </div>
          <div>
            <Crd t={t} style={{ padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 10 }}>Documentos vinculados</div>
              {linkedDocs.length ? linkedDocs.map(d => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid " + t.border + "15" }}>
                  <FileText size={16} color={t.accentL} />
                  <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: t.text, fontWeight: 500 }}>{d.name}</div><div style={{ fontSize: 10, color: t.dim }}>{d.size} · <Badge s={d.type} t={t} /></div></div>
                  {d.file_url && <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: t.accentL, textDecoration: "none", padding: "3px 8px", background: t.accentBg, borderRadius: 5 }}>Ver ↗</a>}
                </div>
              )) : (
                <div style={{ fontSize: 11, color: t.dim, marginBottom: 8, textAlign: "center" }}>Sin documentos</div>
              )}
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <input ref={txFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={attachDoc} />
                <Btn t={t} onClick={() => txFileRef.current && txFileRef.current.click()}><Upload size={12} />Adjuntar factura</Btn>
              </div>
            </Crd>
            <Crd t={t} style={{ padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 10 }}>Asiento contable</div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ fontSize: 11, color: t.muted }}>Débito</span><span style={{ fontSize: 11, color: t.text }}>{tx.amount > 0 ? "Cuentas por Cobrar" : "Materiales / Gastos"}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ fontSize: 11, color: t.muted }}>Crédito</span><span style={{ fontSize: 11, color: t.text }}>{tx.amount > 0 ? "Ingresos por Servicios" : "Banco / CxP"}</span></div>
            </Crd>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 22, overflowY: "auto", height: "calc(100vh - 54px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tabs t={t} active={tab} onChange={setTab} items={[{ id: "all", label: "Todas" }, { id: "income", label: "Ingresos" }, { id: "expense", label: "Egresos" }, { id: "pending", label: "Pendientes" }, { id: "accounting", label: "Contabilidad", icon: Layers }]} />
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "6px 9px", color: t.text, fontSize: 11 }}>
            <option value="">Todos los proyectos</option>
            {[...new Set(TXS.map(tx => tx.project).filter(Boolean))].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {filterProject && <button onClick={() => setFilterProject("")} style={{ background: "transparent", border: "none", color: t.red, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>✕</button>}
        </div>
        <Btn primary t={t} onClick={() => setShowNew(!showNew)}><Plus size={12} />Nueva</Btn>
      </div>
      {showNew && (
        <Crd t={t} style={{ padding: 18, marginBottom: 14, border: "2px dashed " + t.accent + "35" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 14 }}>Nueva transacción</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <Inp label="Descripción" val={nf.description} onChange={v => setNf({ ...nf, description: v })} t={t} placeholder="Ej: Certificado Obra #48" />
            <Inp label="Monto (positivo=ingreso, negativo=egreso)" val={nf.amount} onChange={v => setNf({ ...nf, amount: v })} t={t} placeholder="3200000 ó -1850000" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Contacto</div><select value={nf.contact_id} onChange={e => setNf({ ...nf, contact_id: e.target.value })} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 9px", color: t.text, fontSize: 12 }}><option value="">— Seleccionar —</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Proyecto</div><select value={nf.project_id} onChange={e => setNf({ ...nf, project_id: e.target.value })} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 9px", color: t.text, fontSize: 12 }}><option value="">— Seleccionar —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <Inp label="Fecha" val={nf.date} onChange={v => setNf({ ...nf, date: v })} t={t} placeholder="2026-02-23" />
            <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Estado</div><select value={nf.status} onChange={e => setNf({ ...nf, status: e.target.value })} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 9px", color: t.text, fontSize: 12 }}><option value="paid">Pagado</option><option value="pending">Pendiente</option></select></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <Btn t={t} onClick={() => setShowNew(false)}>Cancelar</Btn>
            <Btn primary t={t} onClick={saveTx}><Check size={12} />Guardar</Btn>
          </div>
        </Crd>
      )}
      {tab === "pending" && (
        <div style={{ background: t.orangeBg, border: "1px solid " + t.orange + "25", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={15} color={t.orange} />
          <div style={{ fontSize: 12, color: t.text }}>
            <b>Pendientes</b> son cobros o pagos registrados que aún no fueron efectivizados. Los <b style={{ color: t.red }}>vencidos</b> pasaron su fecha límite.
          </div>
        </div>
      )}
      {tab === "accounting" ? (
        <Crd t={t} style={{ overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border, display: "flex", alignItems: "center", gap: 8 }}>
            <Bot size={14} color={t.accentL} />
            <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Asientos generados automáticamente desde transacciones</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: t.hover }}>{["Fecha","Descripción","Debe","Haber","Monto","Origen","Estado"].map(h => <th key={h} style={{ padding: "9px 12px", fontSize: 10, fontWeight: 600, color: t.dim, textAlign: "left", textTransform: "uppercase", borderBottom: "1px solid " + t.border }}>{h}</th>)}</tr></thead>
            <tbody>{TXS.map(tx => (
              <tr key={tx.id}>
                <td style={{ padding: "9px 12px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{tx.date}</td>
                <td style={{ padding: "9px 12px", fontSize: 12, color: t.text, fontWeight: 500, borderBottom: "1px solid " + t.border + "15" }}>{tx.desc}</td>
                <td style={{ padding: "9px 12px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{tx.amount > 0 ? "Cuentas x Cobrar" : "Materiales/Gastos"}</td>
                <td style={{ padding: "9px 12px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{tx.amount > 0 ? "Ingresos" : "Banco/CxP"}</td>
                <td style={{ padding: "9px 12px", fontSize: 12, fontWeight: 600, color: t.text, borderBottom: "1px solid " + t.border + "15" }}>{fmt(Math.abs(tx.amount))}</td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid " + t.border + "15" }}><span style={pill(t.accentBg, t.accentL)}><Bot size={9} /> IA</span></td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid " + t.border + "15" }}>{tx.status === "paid" ? <span style={pill(t.greenBg, t.green)}>Asentado</span> : <span style={pill(t.orangeBg, t.orange)}>Pendiente</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </Crd>
      ) : (
      <Crd t={t} style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: t.hover }}>{["Fecha","Descripción","Contacto","Proyecto","Factura","Monto","Estado"].map(h => <th key={h} style={{ padding: "9px 12px", fontSize: 10, fontWeight: 600, color: t.dim, textAlign: "left", textTransform: "uppercase", borderBottom: "1px solid " + t.border }}>{h}</th>)}</tr></thead>
          <tbody>{list.map(tx => {
            const hasDoc = DOCS.some(d => d.txId === tx.id);
            return (
              <tr key={tx.id} style={{ cursor: "pointer" }} onClick={() => setSel(tx.id)}>
                <td style={{ padding: "10px 12px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{tx.date}</td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: t.text, fontWeight: 500, borderBottom: "1px solid " + t.border + "15" }}>{tx.desc}</td>
                <td style={{ padding: "10px 12px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{tx.contact}</td>
                <td style={{ padding: "10px 12px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{tx.project}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid " + t.border + "15" }}>{hasDoc ? <span style={pill(t.greenBg, t.green)}><FileText size={9} /> Sí</span> : <span style={{ fontSize: 10, color: t.dim }}>—</span>}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: tx.amount > 0 ? t.green : t.red, borderBottom: "1px solid " + t.border + "15" }}>{fmt(tx.amount)}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid " + t.border + "15" }}><Badge s={tx.status} t={t} /></td>
              </tr>
            );
          })}</tbody>
        </table>
      </Crd>
      )}
    </div>
  );
}

function Accounting({ t }) {
  const [tab, setTab] = useState("journal");
  const [selEntry, setSelEntry] = useState(null);
  const [entries, setEntries] = useState([
    { id:1, date:"12/02/2026", desc:"Certificado Obra #47 — Torre Belgrano", st:"posted", dr:"Cuentas por Cobrar", cr:"Ingresos por Servicios", amt:3200000, src:"ai", note:"Asiento generado automáticamente desde factura FE-2026-0892. Certificación de avance de obra correspondiente al período enero 2026.", txRef:"Certificado Obra #47 — Torre Belgrano", contact:"Constructora Vial SA" },
    { id:2, date:"11/02/2026", desc:"Compra barras Ø12 — 500 unidades", st:"proposed", dr:"Materiales de Obra", cr:"Cuentas por Pagar", amt:1850000, src:"ai", note:"Propuesto por IA: detectada factura de Hierros del Sur SRL por compra de 500 barras de acero Ø12mm para Torre Belgrano.", txRef:"Compra barras Ø12 — 500 unidades", contact:"Hierros del Sur SRL" },
    { id:3, date:"10/02/2026", desc:"Anticipo Fase 2 — Nordelta", st:"posted", dr:"Banco Galicia Cta Cte", cr:"Anticipos de Clientes", amt:5000000, src:"user", note:"Anticipo recibido de Inmobiliaria Costa para inicio de Fase 2 del complejo Nordelta. Transferencia bancaria confirmada.", txRef:"Anticipo Fase 2 — Nordelta", contact:"Inmobiliaria Costa" },
    { id:4, date:"09/02/2026", desc:"Materiales eléctricos varios", st:"proposed", dr:"Materiales de Obra", cr:"Banco Galicia Cta Cte", amt:420000, src:"ai", note:"Propuesto por IA: pago con débito directo a Ferretería López por materiales eléctricos destinados a Nave Industrial Pilar.", txRef:"Materiales eléctricos varios", contact:"Ferretería López" },
  ]);
  const pending = entries.filter(e => e.st === "proposed").length;
  const approve = (id) => { setEntries(entries.map(e => e.id === id ? { ...e, st: "posted" } : e)); if (selEntry && selEntry.id === id) setSelEntry({ ...selEntry, st: "posted" }); };
  const reject = (id) => { setEntries(entries.filter(e => e.id !== id)); if (selEntry && selEntry.id === id) setSelEntry(null); };
  const approveAll = () => setEntries(entries.map(e => ({ ...e, st: "posted" })));

  const renderJournal = () => (
    <div style={{ display: "grid", gridTemplateColumns: selEntry ? "1fr 340px" : "1fr", gap: 14 }}>
      <div>
        {pending > 0 && (
          <div style={{ background: t.accent + "0D", border: "1px solid " + t.accent + "25", borderRadius: 11, padding: "11px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Bot size={16} color={t.accentL} /><div><span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{pending} asientos propuestos por IA</span><div style={{ fontSize: 11, color: t.muted }}>Revisá y aprobá</div></div></div>
            <Btn primary t={t} onClick={approveAll}>Aprobar todos</Btn>
          </div>
        )}
        <Crd t={t} style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: t.hover }}>{["Fecha","Descripción","Débito","Crédito","Monto","Origen","Estado",""].map(h => <th key={h} style={{ padding: "9px 10px", fontSize: 10, fontWeight: 600, color: t.dim, textAlign: "left", textTransform: "uppercase", borderBottom: "1px solid " + t.border }}>{h}</th>)}</tr></thead>
            <tbody>{entries.map(e => (
              <tr key={e.id} onClick={() => setSelEntry(e)} style={{ background: selEntry && selEntry.id === e.id ? t.accentBg : e.st === "proposed" ? t.accent + "05" : "transparent", cursor: "pointer" }}>
                <td style={{ padding: "9px 10px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{e.date.slice(0,5)}</td>
                <td style={{ padding: "9px 10px", fontSize: 12, color: t.text, fontWeight: 500, borderBottom: "1px solid " + t.border + "15" }}>{e.desc}</td>
                <td style={{ padding: "9px 10px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{e.dr.length > 14 ? e.dr.slice(0,14) + "..." : e.dr}</td>
                <td style={{ padding: "9px 10px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{e.cr.length > 14 ? e.cr.slice(0,14) + "..." : e.cr}</td>
                <td style={{ padding: "9px 10px", fontSize: 12, fontWeight: 600, color: t.text, borderBottom: "1px solid " + t.border + "15" }}>{fmt(e.amt)}</td>
                <td style={{ padding: "9px 10px", borderBottom: "1px solid " + t.border + "15" }}>{e.src === "ai" ? <span style={pill(t.accentBg, t.accentL)}><Bot size={9} /> IA</span> : <span style={pill(t.hover, t.muted)}>Manual</span>}</td>
                <td style={{ padding: "9px 10px", borderBottom: "1px solid " + t.border + "15" }}>{e.st === "proposed" ? <span style={pill(t.orangeBg, t.orange)}>Pendiente</span> : <span style={pill(t.greenBg, t.green)}>OK</span>}</td>
                <td style={{ padding: "9px 10px", borderBottom: "1px solid " + t.border + "15" }}>{e.st === "proposed" && <div style={{ display: "flex", gap: 3 }} onClick={ev => ev.stopPropagation()}><div onClick={() => approve(e.id)} style={{ width: 22, height: 22, borderRadius: 5, background: t.greenBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Check size={11} color={t.green} /></div><div onClick={() => reject(e.id)} style={{ width: 22, height: 22, borderRadius: 5, background: t.redBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={11} color={t.red} /></div></div>}</td>
              </tr>
            ))}</tbody>
          </table>
        </Crd>
      </div>

      {selEntry && (
        <Crd t={t} style={{ padding: 0, position: "sticky", top: 0, alignSelf: "flex-start" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Detalle del asiento</span>
            <div onClick={() => setSelEntry(null)} style={{ cursor: "pointer" }}><X size={15} color={t.muted} /></div>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: t.dim, marginBottom: 2 }}>Descripción</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{selEntry.desc}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div><div style={{ fontSize: 10, color: t.dim }}>Fecha</div><div style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{selEntry.date}</div></div>
              <div><div style={{ fontSize: 10, color: t.dim }}>Monto</div><div style={{ fontSize: 16, fontWeight: 700, color: t.accent }}>{fmt(selEntry.amt)}</div></div>
              <div><div style={{ fontSize: 10, color: t.dim }}>Origen</div><div style={{ fontSize: 12, color: t.text }}>{selEntry.src === "ai" ? "Propuesto por IA" : "Ingreso manual"}</div></div>
              <div><div style={{ fontSize: 10, color: t.dim }}>Estado</div>{selEntry.st === "proposed" ? <Badge s="pending" t={t} /> : <Badge s="done" t={t} />}</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.text, marginBottom: 8 }}>Partida doble</div>
              <div style={{ background: t.hover, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid " + t.border }}>
                  <div><div style={{ fontSize: 10, color: t.dim }}>DEBE</div><div style={{ fontSize: 12, fontWeight: 600, color: t.green }}>{selEntry.dr}</div></div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.green }}>{fmt(selEntry.amt)}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px" }}>
                  <div><div style={{ fontSize: 10, color: t.dim }}>HABER</div><div style={{ fontSize: 12, fontWeight: 600, color: t.red }}>{selEntry.cr}</div></div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.red }}>{fmt(selEntry.amt)}</div>
                </div>
              </div>
            </div>

            {selEntry.contact && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: t.dim }}>Contacto asociado</div>
                <div style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{selEntry.contact}</div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.text, marginBottom: 4 }}>Notas</div>
              <div style={{ fontSize: 11, color: t.muted, lineHeight: 1.5, padding: 10, background: t.hover, borderRadius: 7 }}>{selEntry.note}</div>
            </div>

            {selEntry.st === "proposed" && (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn primary t={t} onClick={() => approve(selEntry.id)}><Check size={12} />Aprobar</Btn>
                <Btn t={t} onClick={() => reject(selEntry.id)}><X size={12} />Rechazar</Btn>
              </div>
            )}
            {selEntry.st === "posted" && (
              <div style={{ padding: "8px 10px", background: t.greenBg, borderRadius: 7, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={13} color={t.green} />
                <span style={{ fontSize: 11, color: t.green, fontWeight: 500 }}>Asiento contabilizado e impactado en estados financieros</span>
              </div>
            )}
          </div>
        </Crd>
      )}
    </div>
  );

  const renderLedger = () => {
    const accounts = ["CxC", "Materiales", "Banco Galicia", "Ingresos", "CxP", "Anticipos", "Banco"];
    const getMovs = (acc) => entries.filter(e => e.st === "posted" && (e.dr === acc || e.cr === acc));
    return (
      <div>
        {accounts.filter(a => getMovs(a).length > 0).map(acc => (
          <Crd key={acc} t={t} style={{ marginBottom: 10, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", background: t.hover, fontWeight: 600, fontSize: 12, color: t.text, borderBottom: "1px solid " + t.border }}>{acc}</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Fecha","Descripción","Debe","Haber","Saldo"].map(h => <th key={h} style={{ padding: "7px 12px", fontSize: 10, color: t.dim, textAlign: "left", borderBottom: "1px solid " + t.border }}>{h}</th>)}</tr></thead>
              <tbody>{(() => { let bal = 0; return getMovs(acc).map(e => { const debe = e.dr === acc ? e.amt : 0; const haber = e.cr === acc ? e.amt : 0; bal += debe - haber; return (
                <tr key={e.id}>
                  <td style={{ padding: "7px 12px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{e.date}</td>
                  <td style={{ padding: "7px 12px", fontSize: 11, color: t.text, borderBottom: "1px solid " + t.border + "15" }}>{e.desc}</td>
                  <td style={{ padding: "7px 12px", fontSize: 11, color: debe ? t.green : t.dim, borderBottom: "1px solid " + t.border + "15" }}>{debe ? fmt(debe) : "—"}</td>
                  <td style={{ padding: "7px 12px", fontSize: 11, color: haber ? t.red : t.dim, borderBottom: "1px solid " + t.border + "15" }}>{haber ? fmt(haber) : "—"}</td>
                  <td style={{ padding: "7px 12px", fontSize: 11, fontWeight: 600, color: t.text, borderBottom: "1px solid " + t.border + "15" }}>{fmt(bal)}</td>
                </tr>
              ); }); })()}</tbody>
            </table>
          </Crd>
        ))}
      </div>
    );
  };

  const renderTrial = () => {
    const accounts = [
      { name: "Caja y Bancos", debe: 18400000, haber: 0 },
      { name: "Cuentas por Cobrar", debe: 13700000, haber: 0 },
      { name: "Materiales en Obra", debe: 4200000, haber: 0 },
      { name: "Cuentas por Pagar", debe: 0, haber: 8760000 },
      { name: "Ingresos por Servicios", debe: 0, haber: 16800000 },
      { name: "Costos de Obra", debe: 11400000, haber: 0 },
      { name: "Gastos Operativos", debe: 1660000, haber: 0 },
      { name: "Anticipos de Clientes", debe: 0, haber: 5000000 },
      { name: "Capital Social", debe: 0, haber: 20000000 },
    ];
    const totalD = accounts.reduce((s, a) => s + a.debe, 0);
    const totalH = accounts.reduce((s, a) => s + a.haber, 0);
    return (
      <Crd t={t} style={{ overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid " + t.border }}><div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Balance de Comprobación — Feb 2026</div></div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: t.hover }}>{["Cuenta","Debe","Haber"].map(h => <th key={h} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 600, color: t.dim, textAlign: "left", textTransform: "uppercase", borderBottom: "1px solid " + t.border }}>{h}</th>)}</tr></thead>
          <tbody>
            {accounts.map((a, i) => (
              <tr key={i}>
                <td style={{ padding: "8px 14px", fontSize: 12, color: t.text, borderBottom: "1px solid " + t.border + "15" }}>{a.name}</td>
                <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 500, color: a.debe ? t.text : t.dim, borderBottom: "1px solid " + t.border + "15" }}>{a.debe ? fmt(a.debe) : "—"}</td>
                <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 500, color: a.haber ? t.text : t.dim, borderBottom: "1px solid " + t.border + "15" }}>{a.haber ? fmt(a.haber) : "—"}</td>
              </tr>
            ))}
            <tr style={{ background: t.accentBg }}>
              <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: t.text }}>TOTALES</td>
              <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: t.accent }}>{fmt(totalD)}</td>
              <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: t.accent }}>{fmt(totalH)}</td>
            </tr>
          </tbody>
        </table>
      </Crd>
    );
  };

  return (
    <div style={{ padding: 22, overflowY: "auto", height: "calc(100vh - 54px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <Tabs t={t} active={tab} onChange={setTab} items={[
          { id: "journal", label: "Libro Diario" }, { id: "ledger", label: "Mayor" }, { id: "trial", label: "Bal. Comprobación" },
        ]} />
        <Btn primary t={t}><Plus size={12} />Asiento manual</Btn>
      </div>
      {tab === "journal" && renderJournal()}
      {tab === "ledger" && renderLedger()}
      {tab === "trial" && renderTrial()}
    </div>
  );
}

function Treasury({ t }) {
  const [selAcc, setSelAcc] = useState(null);
  const [showNewAcc, setShowNewAcc] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: "", type: "ARS", bal: "", cbu: "", alias: "" });
  const [accounts, setAccounts] = useState([
    { id: 1, name: "Banco Galicia — Cta Cte", type: "ARS", bal: 12400000, color: t.accent, cbu: "0070999030004123456789", alias: "GESTION.AI.GALICIA", data: [8.2,9.5,8.8,10.1,11.3,12,12.4],
      movs: [
        { date: "13/02", desc: "Cobro Cert. Obra #47 — Vial SA", amt: 3200000, bal: 12400000 },
        { date: "12/02", desc: "Pago proveedores — Hierros Sur", amt: -1850000, bal: 9200000 },
        { date: "11/02", desc: "Cobro anticipo Nordelta — Costa", amt: 5000000, bal: 11050000 },
        { date: "10/02", desc: "Débito automático — Alquiler oficina", amt: -350000, bal: 6050000 },
        { date: "09/02", desc: "Transferencia desde Macro", amt: 2000000, bal: 6400000 },
        { date: "08/02", desc: "Pago sueldos enero", amt: -3400000, bal: 4400000 },
        { date: "07/02", desc: "Cobro Méndez — Honorarios diseño", amt: 780000, bal: 7800000 },
        { date: "05/02", desc: "Pago AFIP — IVA enero", amt: -1200000, bal: 7020000 },
      ]
    },
    { id: 2, name: "Banco Macro — Cta Cte", type: "ARS", bal: 4800000, color: t.blue, cbu: "2850999030004987654321", alias: "GESTION.AI.MACRO", data: [3.2,3.8,4.1,3.9,4.5,4.7,4.8],
      movs: [
        { date: "12/02", desc: "Cobro factura #887 — Vial SA", amt: 1500000, bal: 4800000 },
        { date: "10/02", desc: "Transferencia a Galicia", amt: -2000000, bal: 3300000 },
        { date: "08/02", desc: "Débito — Seguro obra", amt: -280000, bal: 5300000 },
        { date: "06/02", desc: "Cobro certificado Pilar", amt: 2200000, bal: 5580000 },
        { date: "04/02", desc: "Pago Ferretería López", amt: -500000, bal: 3380000 },
      ]
    },
    { id: 3, name: "Mercado Pago", type: "ARS", bal: 1200000, color: t.green, cbu: "—", alias: "GESTION.AI.MP", data: [0.6,0.8,0.9,1.0,1.1,1.15,1.2],
      movs: [
        { date: "13/02", desc: "Cobro QR — Venta mostrador", amt: 85000, bal: 1200000 },
        { date: "12/02", desc: "Cobro QR — Materiales menores", amt: 45000, bal: 1115000 },
        { date: "11/02", desc: "Transferencia a Galicia", amt: -500000, bal: 1070000 },
        { date: "09/02", desc: "Cobros varios", amt: 320000, bal: 1570000 },
      ]
    },
  ]);
  const colors = [t.accent, t.blue, t.green, t.orange, t.red, "#EC4899"];
  const totalBal = accounts.reduce((s, a) => s + a.bal, 0);

  const addAccount = () => {
    if (!newAcc.name.trim()) return;
    setAccounts([...accounts, { id: Date.now(), name: newAcc.name, type: newAcc.type, bal: Number(newAcc.bal) || 0, color: colors[accounts.length % colors.length], cbu: newAcc.cbu || "—", alias: newAcc.alias || "—", data: [0], movs: [] }]);
    setNewAcc({ name: "", type: "ARS", bal: "", cbu: "", alias: "" });
    setShowNewAcc(false);
  };

  const removeAccount = (id) => {
    if (!window.confirm("¿Eliminar esta cuenta?")) return;
    setAccounts(accounts.filter(a => a.id !== id));
    setSelAcc(null);
  };

  // CxC / CxP
  const cxc = [
    { contact: "Constructora Vial SA", amt: 7500000, days: 0, status: "vigente" },
    { contact: "Inmobiliaria Costa", amt: 2100000, days: 15, status: "1-30" },
    { contact: "Estudio Arq. Méndez", amt: 780000, days: 45, status: "31-60" },
  ];
  const cxp = [
    { contact: "Hierros del Sur SRL", amt: 1850000, days: 5, status: "vigente" },
    { contact: "Ferretería López", amt: 920000, days: 20, status: "1-30" },
    { contact: "Transportes Rápido", amt: 340000, days: 60, status: "+60" },
  ];

  if (selAcc) {
    const acc = accounts.find(a => a.id === selAcc);
    return (
      <div style={{ padding: 22, overflowY: "auto", height: "calc(100vh - 54px)" }}>
        <div onClick={() => setSelAcc(null)} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 16, cursor: "pointer", color: t.muted, fontSize: 12 }}><ChevronLeft size={14} /> Volver</div>
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 14 }}>
          <div>
            <Crd t={t} style={{ padding: 16, borderTop: "3px solid " + acc.color, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <CreditCard size={18} color={acc.color} />
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{acc.name}</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: t.text, marginBottom: 12 }}>{fmt(acc.bal)}</div>
              <Chart data={acc.data} color={acc.color} w={220} h={40} />
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid " + t.border }}>
                {[["CBU", acc.cbu], ["Alias", acc.alias], ["Moneda", acc.type]].map(([l, v], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: t.dim }}>{l}</span>
                    <span style={{ fontSize: 11, color: t.text, fontFamily: "monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => removeAccount(acc.id)} style={{ marginTop: 10, width: "100%", padding: "7px 0", borderRadius: 7, border: "1px solid " + t.red + "30", background: t.redBg, color: t.red, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Eliminar cuenta</button>
            </Crd>
            <Crd t={t} style={{ padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 8 }}>Resumen del mes</div>
              {(() => {
                const ingresos = acc.movs.filter(m => m.amt > 0).reduce((s, m) => s + m.amt, 0);
                const egresos = acc.movs.filter(m => m.amt < 0).reduce((s, m) => s + Math.abs(m.amt), 0);
                return (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: t.green }}>Ingresos</span><span style={{ fontSize: 12, fontWeight: 600, color: t.green }}>{fmt(ingresos)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: t.red }}>Egresos</span><span style={{ fontSize: 12, fontWeight: 600, color: t.red }}>{fmt(egresos)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid " + t.border }}><span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>Neto</span><span style={{ fontSize: 13, fontWeight: 700, color: ingresos - egresos >= 0 ? t.green : t.red }}>{fmt(ingresos - egresos)}</span></div>
                    <div style={{ marginTop: 8, fontSize: 10, color: t.dim }}>{acc.movs.length} movimientos en el período</div>
                  </div>
                );
              })()}
            </Crd>
          </div>
          <Crd t={t} style={{ overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Últimos movimientos</span>
              <Btn t={t} onClick={() => exportCSV("movimientos_" + acc.name.replace(/\s/g,"_"), ["Fecha","Descripción","Monto","Saldo"], acc.movs.map(m => [m.date, m.desc, m.amt, m.bal]))}><Download size={12} />Exportar</Btn>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: t.hover }}>{["Fecha","Descripción","Monto","Saldo"].map(h => <th key={h} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 600, color: t.dim, textAlign: "left", textTransform: "uppercase", borderBottom: "1px solid " + t.border }}>{h}</th>)}</tr></thead>
              <tbody>{acc.movs.map((m, i) => (
                <tr key={i}>
                  <td style={{ padding: "9px 14px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{m.date}</td>
                  <td style={{ padding: "9px 14px", fontSize: 12, color: t.text, fontWeight: 500, borderBottom: "1px solid " + t.border + "15" }}>{m.desc}</td>
                  <td style={{ padding: "9px 14px", fontSize: 12, fontWeight: 600, color: m.amt > 0 ? t.green : t.red, borderBottom: "1px solid " + t.border + "15" }}>{m.amt > 0 ? "+" : ""}{fmt(m.amt)}</td>
                  <td style={{ padding: "9px 14px", fontSize: 12, fontWeight: 500, color: t.text, borderBottom: "1px solid " + t.border + "15" }}>{fmt(m.bal)}</td>
                </tr>
              ))}</tbody>
            </table>
          </Crd>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 22, overflowY: "auto", height: "calc(100vh - 54px)" }}>
      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Disponible total", val: fmt(totalBal), color: t.accent, icon: CircleDollarSign, sub: "3 cuentas activas" },
          { label: "CxC total", val: fmt(cxc.reduce((s, c) => s + c.amt, 0)), color: t.green, icon: ArrowUpRight, sub: cxc.length + " clientes" },
          { label: "CxP total", val: fmt(cxp.reduce((s, c) => s + c.amt, 0)), color: t.red, icon: ArrowDownRight, sub: cxp.length + " proveedores" },
          { label: "Ratio liquidez", val: (totalBal / cxp.reduce((s, c) => s + c.amt, 0)).toFixed(1) + "x", color: t.blue, icon: TrendingUp, sub: totalBal / cxp.reduce((s, c) => s + c.amt, 0) > 2 ? "Saludable" : "Ajustado" },
        ].map((k, i) => (
          <Crd key={i} t={t} style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: k.color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}><k.icon size={15} color={k.color} /></div>
            </div>
            <div style={{ fontSize: 10, color: t.dim }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: t.text }}>{k.val}</div>
            <div style={{ fontSize: 10, color: t.muted, marginTop: 2 }}>{k.sub}</div>
          </Crd>
        ))}
      </div>

      {/* Bank Accounts */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Cuentas bancarias</div>
        <Btn primary t={t} onClick={() => setShowNewAcc(!showNewAcc)}><Plus size={12} />Nueva cuenta</Btn>
      </div>
      {showNewAcc && (
        <Crd t={t} style={{ padding: 16, marginBottom: 12, border: "2px dashed " + t.accent + "35" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>Agregar cuenta bancaria</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <Inp label="Nombre del banco / cuenta" val={newAcc.name} onChange={v => setNewAcc({ ...newAcc, name: v })} t={t} placeholder="Ej: Banco Nación — Cta Cte" />
            <Inp label="Saldo actual ($)" val={newAcc.bal} onChange={v => setNewAcc({ ...newAcc, bal: v })} t={t} placeholder="5000000" />
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Moneda</div>
              <select value={newAcc.type} onChange={e => setNewAcc({ ...newAcc, type: e.target.value })} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 9px", color: t.text, fontSize: 12 }}>
                <option value="ARS">ARS</option><option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <Inp label="CBU (opcional)" val={newAcc.cbu} onChange={v => setNewAcc({ ...newAcc, cbu: v })} t={t} placeholder="0000000000000000000000" />
            <Inp label="Alias (opcional)" val={newAcc.alias} onChange={v => setNewAcc({ ...newAcc, alias: v })} t={t} placeholder="MI.ALIAS.BANCO" />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <Btn t={t} onClick={() => setShowNewAcc(false)}>Cancelar</Btn>
            <Btn primary t={t} onClick={addAccount}><Check size={12} />Guardar</Btn>
          </div>
        </Crd>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        {accounts.map(acc => (
          <Crd key={acc.id} t={t} style={{ padding: 14, borderTop: "3px solid " + acc.color, cursor: "pointer" }}>
            <div onClick={() => setSelAcc(acc.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{acc.name}</div>
                <CreditCard size={15} color={acc.color} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 4 }}>{fmt(acc.bal)}</div>
              <Chart data={acc.data} color={acc.color} w={170} h={26} />
              <div style={{ marginTop: 8, fontSize: 10, color: t.dim }}>{acc.movs.length} movimientos · Click para ver detalle</div>
            </div>
          </Crd>
        ))}
      </div>

      {/* Cash Flow Projection */}
      <Crd t={t} style={{ padding: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Proyección de flujo de caja</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Bot size={12} color={t.accentL} /><span style={{ fontSize: 10, color: t.accentL }}>Estimación IA</span></div>
        </div>
        <div style={{ fontSize: 11, color: t.muted, marginBottom: 12 }}>Cuánta plata se estima que entra y sale cada semana — basado en cobros pendientes, pagos programados y patrones históricos.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 12 }}>
          {[
            ["Sem 1 (17-21 Feb)", 8200000, 2455000],
            ["Sem 2 (24-28 Feb)", 3500000, 4200000],
            ["Sem 3 (3-7 Mar)", 6800000, 3100000],
            ["Sem 4 (10-14 Mar)", 2200000, 5400000],
          ].map(([w, inc, out], i) => {
            const net = inc - out;
            return (
              <div key={i} style={{ padding: 12, background: t.hover, borderRadius: 9, border: "1px solid " + t.border }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.text, marginBottom: 8 }}>{w}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 10, color: t.green }}>Cobros</span><span style={{ fontSize: 11, fontWeight: 600, color: t.green }}>{fmt(inc)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 10, color: t.red }}>Pagos</span><span style={{ fontSize: 11, fontWeight: 600, color: t.red }}>{fmt(out)}</span></div>
                <div style={{ borderTop: "1px solid " + t.border, paddingTop: 5, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: t.muted }}>Neto</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: net >= 0 ? t.green : t.red }}>{fmt(net)}</span>
                </div>
              </div>
            );
          })}
        </div>
        {/* Projected balance line */}
        <div style={{ padding: 10, background: t.accentBg, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: t.text }}>Saldo proyectado al 14/03</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: t.accent }}>{fmt(totalBal + (8200000-2455000) + (3500000-4200000) + (6800000-3100000) + (2200000-5400000))}</span>
        </div>
      </Crd>

      {/* CxC / CxP + Alerts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        <Crd t={t} style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Cuentas por Cobrar</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.green }}>{fmt(cxc.reduce((s, c) => s + c.amt, 0))}</span>
          </div>
          {cxc.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + t.border + "15" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Av name={c.contact} size={26} />
                <div><div style={{ fontSize: 11, color: t.text, fontWeight: 500 }}>{c.contact}</div><div style={{ fontSize: 10, color: t.dim }}>{c.days === 0 ? "Vigente" : c.days + " días"}</div></div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.green }}>{fmt(c.amt)}</div>
                <span style={pill(c.days === 0 ? t.greenBg : c.days <= 30 ? t.orangeBg : t.redBg, c.days === 0 ? t.green : c.days <= 30 ? t.orange : t.red)}>{c.status}</span>
              </div>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, marginTop: 10 }}>
            {[["Vigente", 7500000, t.green], ["1-30d", 2100000, t.orange], ["31-60d", 780000, t.red]].map(([l, a, c], i) => (
              <div key={i} style={{ textAlign: "center", padding: 6, background: t.hover, borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: c }}>{l}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{fmt(a)}</div>
              </div>
            ))}
          </div>
        </Crd>

        <Crd t={t} style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Cuentas por Pagar</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.red }}>{fmt(cxp.reduce((s, c) => s + c.amt, 0))}</span>
          </div>
          {cxp.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + t.border + "15" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Av name={c.contact} size={26} />
                <div><div style={{ fontSize: 11, color: t.text, fontWeight: 500 }}>{c.contact}</div><div style={{ fontSize: 10, color: t.dim }}>{c.days === 0 ? "Vigente" : c.days + " días"}</div></div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.red }}>{fmt(c.amt)}</div>
                <span style={pill(c.days <= 10 ? t.greenBg : c.days <= 30 ? t.orangeBg : t.redBg, c.days <= 10 ? t.green : c.days <= 30 ? t.orange : t.red)}>{c.status}</span>
              </div>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, marginTop: 10 }}>
            {[["Vigente", 1850000, t.green], ["1-30d", 920000, t.orange], ["+60d", 340000, t.red]].map(([l, a, c], i) => (
              <div key={i} style={{ textAlign: "center", padding: 6, background: t.hover, borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: c }}>{l}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{fmt(a)}</div>
              </div>
            ))}
          </div>
        </Crd>
      </div>

      {/* Alerts */}
      <Crd t={t} style={{ padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Alertas y recordatorios</div>
        {[
          { icon: AlertCircle, color: t.red, title: "Pago vencido — Hierros del Sur SRL", desc: "Factura por $1.85M venció hace 5 días. Contactar para gestionar pago.", action: "Gestionar", onClick: () => alert("Se enviará un recordatorio de pago a Hierros del Sur SRL por WhatsApp") },
          { icon: Clock, color: t.orange, title: "Cobro próximo — Certificado #47 Vial SA", desc: "Vence en 2 días. Confirmar recepción de factura con el cliente.", action: "Recordar", onClick: () => alert("Recordatorio agendado para mañana a las 9:00") },
          { icon: TrendingUp, color: t.blue, title: "Semana 2 con flujo negativo proyectado", desc: "La semana del 24-28 Feb tiene más pagos ($4.2M) que cobros ($3.5M). Considerar diferir pagos.", action: "Ver detalle", onClick: () => alert("Semana 24-28 Feb:\n• Cobros esperados: $3.5M\n• Pagos programados: $4.2M\n• Déficit proyectado: -$700K\n\nSugerencia: diferir pago a Ferretería López ($420K) a la semana siguiente") },
          { icon: Bot, color: t.accent, title: "Sugerencia IA: transferir excedente", desc: "Mercado Pago tiene $1.2M sin rendimiento. Transferir a plazo fijo o FCI podría generar $8K/mes.", action: "Evaluar", onClick: () => alert("Opciones de inversión:\n• Plazo fijo 30d: ~$8K/mes (TNA 8%)\n• FCI Money Market: ~$6K/mes (variable)\n• Transferir a cuenta remunerada: ~$4K/mes\n\nPróximamente podrás ejecutar desde acá") },
        ].map((alert, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: t.hover, borderRadius: 8, marginBottom: 6, borderLeft: "3px solid " + alert.color }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <alert.icon size={16} color={alert.color} />
              <div><div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{alert.title}</div><div style={{ fontSize: 10, color: t.muted, marginTop: 1 }}>{alert.desc}</div></div>
            </div>
            <Btn t={t} onClick={alert.onClick}>{alert.action}</Btn>
          </div>
        ))}
      </Crd>
    </div>
  );
}

function DocumentsPage({ t }) {
  const { documents: DOCS, clients: CLIENTS, projects: PROJECTS, transactions: TXS, reload, companyId } = useData();
  const [showUp, setShowUp] = useState(false);
  const [filterContact, setFilterContact] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterType, setFilterType] = useState("");
  const [upFile, setUpFile] = useState(null);
  const [upForm, setUpForm] = useState({ type: "invoice", contact_id: "", project_id: "", transaction_id: "" });
  const [selDoc, setSelDoc] = useState(null);
  const docFileRef = useRef(null);

  const saveDoc = async () => {
    if (!upFile) { window.alert("Seleccioná un archivo primero"); return; }
    const fileUrl = await uploadFile(upFile);
    await supabase.from("documents").insert([{
      name: upFile.name,
      type: upForm.type,
      size: upFile.size > 1048576 ? (upFile.size / 1048576).toFixed(1) + " MB" : Math.round(upFile.size / 1024) + " KB",
      contact_id: upForm.contact_id || null,
      project_id: upForm.project_id || null,
      transaction_id: upForm.transaction_id || null,
      status: "pending",
      file_url: fileUrl,
      company_id: companyId,
    }]);
    await reload();
    setUpFile(null);
    setUpForm({ type: "invoice", contact_id: "", project_id: "", transaction_id: "" });
    setShowUp(false);
  };

  const updateDocStatus = async (id, status) => {
    await supabase.from("documents").update({ status }).eq("id", id);
    await reload();
    setSelDoc(null);
  };

  const deleteDoc = async (id) => {
    if (!window.confirm("¿Eliminar este documento?")) return;
    await supabase.from("documents").delete().eq("id", id);
    await reload();
    setSelDoc(null);
  };
  const contacts = [...new Set(DOCS.map(d => d.contact).filter(Boolean))];
  const projects = [...new Set(DOCS.map(d => d.project).filter(Boolean))];
  const types = [...new Set(DOCS.map(d => d.type))];
  const filtered = DOCS.filter(d =>
    (!filterContact || d.contact === filterContact) &&
    (!filterProject || d.project === filterProject) &&
    (!filterType || d.type === filterType)
  );
  const selStyle = { background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "7px 9px", color: t.text, fontSize: 12 };
  return (
    <div style={{ padding: 22, overflowY: "auto", height: "calc(100vh - 54px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={filterContact} onChange={e => setFilterContact(e.target.value)} style={selStyle}>
            <option value="">Todos los contactos</option>
            {contacts.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={selStyle}>
            <option value="">Todas las obras</option>
            {projects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selStyle}>
            <option value="">Todos los tipos</option>
            {types.map(tp => <option key={tp} value={tp}>{tp.charAt(0).toUpperCase() + tp.slice(1)}</option>)}
          </select>
          {(filterContact || filterProject || filterType) && (
            <button onClick={() => { setFilterContact(""); setFilterProject(""); setFilterType(""); }} style={{ background: "transparent", border: "none", color: t.red, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>✕ Limpiar</button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn t={t} onClick={() => exportCSV("documentos", ["Documento","Tipo","Fecha","Contacto","Proyecto","Estado"], filtered.map(d => [d.name, d.type, d.date, d.contact || "", d.project, d.status]))}><Download size={12} />Exportar</Btn>
          <Btn primary t={t} onClick={() => setShowUp(!showUp)}><Upload size={12} />Subir documento</Btn>
        </div>
      </div>
      {showUp && (
        <Crd t={t} style={{ padding: 18, marginBottom: 14, border: "2px dashed " + t.accent + "35" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 14 }}>Subir nuevo documento</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Tipo</div>
              <select value={upForm.type} onChange={e => setUpForm({ ...upForm, type: e.target.value })} style={{ width: "100%", ...selStyle }}>
                <option value="invoice">Factura</option><option value="receipt">Remito</option><option value="cert">Certificado</option><option value="contract">Contrato</option><option value="quote">Presupuesto</option><option value="other">Otro</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Cliente / Proveedor</div>
              <select value={upForm.contact_id} onChange={e => setUpForm({ ...upForm, contact_id: e.target.value })} style={{ width: "100%", ...selStyle }}>
                <option value="">— Seleccionar —</option>
                {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Proyecto</div>
              <select value={upForm.project_id} onChange={e => setUpForm({ ...upForm, project_id: e.target.value })} style={{ width: "100%", ...selStyle }}>
                <option value="">— Seleccionar —</option>
                {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Transacción (opcional)</div>
            <select value={upForm.transaction_id} onChange={e => setUpForm({ ...upForm, transaction_id: e.target.value })} style={{ width: "100%", ...selStyle }}>
              <option value="">— Sin vincular —</option>
              {TXS.map(tx => <option key={tx.id} value={tx.id}>{tx.date} — {tx.desc}</option>)}
            </select>
          </div>
          <div onClick={() => docFileRef.current && docFileRef.current.click()} style={{ border: "2px dashed " + t.border, borderRadius: 10, padding: 28, textAlign: "center", marginBottom: 12, background: t.hover, cursor: "pointer" }}>
            <input ref={docFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => setUpFile(e.target.files[0])} />
            <Upload size={24} color={upFile ? t.green : t.dim} />
            {upFile ? (
              <div style={{ fontSize: 12, color: t.green, fontWeight: 600, marginTop: 6 }}>{upFile.name} ({(upFile.size / 1024).toFixed(0)} KB)</div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: t.text, fontWeight: 500, marginTop: 6 }}>Arrastrá archivos o hacé click</div>
                <div style={{ fontSize: 10, color: t.dim, marginTop: 3 }}>PDF, JPG, PNG — Máx 25MB</div>
              </>
            )}
            <div style={{ fontSize: 10, color: t.accentL, marginTop: 6 }}>También por WhatsApp</div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <Btn t={t} onClick={() => { setShowUp(false); setUpFile(null); }}>Cancelar</Btn>
            <Btn primary t={t} onClick={saveDoc}><Upload size={12} />Subir y registrar</Btn>
          </div>
        </Crd>
      )}
      <div style={{ fontSize: 11, color: t.muted, marginBottom: 8 }}>{filtered.length} de {DOCS.length} documentos</div>
      <div style={{ display: "grid", gridTemplateColumns: selDoc ? "1fr 300px" : "1fr", gap: 14 }}>
      <Crd t={t} style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: t.hover }}>{["Documento","Tipo","Fecha","Contacto","Proyecto","Vinculado","Estado"].map(h => <th key={h} style={{ padding: "9px 10px", fontSize: 10, fontWeight: 600, color: t.dim, textAlign: "left", textTransform: "uppercase", borderBottom: "1px solid " + t.border }}>{h}</th>)}</tr></thead>
          <tbody>{filtered.length === 0 ? (
            <tr><td colSpan={7} style={{ padding: 30, textAlign: "center", color: t.dim, fontSize: 12 }}>No hay documentos con estos filtros</td></tr>
          ) : filtered.map(d => (
            <tr key={d.id} onClick={() => setSelDoc(d)} style={{ cursor: "pointer", background: selDoc && selDoc.id === d.id ? t.accentBg : "transparent" }}>
              <td style={{ padding: "9px 10px", borderBottom: "1px solid " + t.border + "15" }}><div style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{d.name}</div><div style={{ fontSize: 10, color: t.dim }}>{d.size}</div></td>
              <td style={{ padding: "9px 10px", borderBottom: "1px solid " + t.border + "15" }}><Badge s={d.type} t={t} /></td>
              <td style={{ padding: "9px 10px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{d.date}</td>
              <td style={{ padding: "9px 10px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{d.contact || "—"}</td>
              <td style={{ padding: "9px 10px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{d.project}</td>
              <td style={{ padding: "9px 10px", borderBottom: "1px solid " + t.border + "15" }}>{d.transaction_id ? <span style={pill(t.greenBg, t.green)}><Link2 size={9} /> Sí</span> : <span style={{ fontSize: 10, color: t.dim }}>No</span>}</td>
              <td style={{ padding: "9px 10px", borderBottom: "1px solid " + t.border + "15" }}><Badge s={d.status} t={t} /></td>
            </tr>
          ))}</tbody>
        </table>
      </Crd>
      {selDoc && (
        <Crd t={t} style={{ padding: 0, alignSelf: "flex-start", position: "sticky", top: 0 }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Detalle</span>
            <div onClick={() => setSelDoc(null)} style={{ cursor: "pointer" }}><X size={15} color={t.muted} /></div>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <FileText size={20} color={t.accentL} />
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{selDoc.name}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><div style={{ fontSize: 10, color: t.dim }}>Tipo</div><Badge s={selDoc.type} t={t} /></div>
                <div><div style={{ fontSize: 10, color: t.dim }}>Tamaño</div><div style={{ fontSize: 12, color: t.text }}>{selDoc.size}</div></div>
                <div><div style={{ fontSize: 10, color: t.dim }}>Fecha</div><div style={{ fontSize: 12, color: t.text }}>{selDoc.date}</div></div>
                <div><div style={{ fontSize: 10, color: t.dim }}>Estado</div><Badge s={selDoc.status} t={t} /></div>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Contacto</div>
              <div style={{ fontSize: 12, color: t.text }}>{selDoc.contact || "Sin asignar"}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Proyecto</div>
              <div style={{ fontSize: 12, color: t.text }}>{selDoc.project || "Sin asignar"}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Cambiar estado</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[["pending","Pendiente"],["processed","Procesado"],["filed","Archivado"]].map(([v,l]) => (
                  <button key={v} onClick={() => updateDocStatus(selDoc.id, v)} style={{ padding: "5px 10px", borderRadius: 6, border: selDoc.status === v ? "2px solid " + t.accent : "1px solid " + t.border, background: selDoc.status === v ? t.accentBg : t.hover, color: selDoc.status === v ? t.accentL : t.muted, fontSize: 11, cursor: "pointer", fontWeight: selDoc.status === v ? 600 : 400 }}>{l}</button>
                ))}
              </div>
            </div>
            {selDoc.file_url ? (
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <a href={selDoc.file_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 0", borderRadius: 7, background: t.accentBg, border: "1px solid " + t.accent + "30", color: t.accentL, fontSize: 12, fontWeight: 600, textDecoration: "none", cursor: "pointer" }}>
                  <Eye size={13} /> Ver archivo
                </a>
                <a href={selDoc.file_url} download={selDoc.name} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 0", borderRadius: 7, background: t.hover, border: "1px solid " + t.border, color: t.text, fontSize: 12, fontWeight: 600, textDecoration: "none", cursor: "pointer" }}>
                  <Download size={13} /> Descargar
                </a>
              </div>
            ) : (
              <div style={{ padding: "10px 12px", background: t.hover, borderRadius: 7, fontSize: 11, color: t.dim, textAlign: "center", marginBottom: 12 }}>
                Archivo no disponible — subido solo como registro
              </div>
            )}
            <button onClick={() => deleteDoc(selDoc.id)} style={{ width: "100%", padding: "8px 0", borderRadius: 7, border: "1px solid " + t.red + "30", background: t.redBg, color: t.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Eliminar documento</button>
          </div>
        </Crd>
      )}
      </div>
    </div>
  );
}

function Reports({ t }) {
  const { projects: PROJECTS, transactions: TXS, tasks, clients, documents } = useData();
  const [active, setActive] = useState("pnl");
  const reps = [
    { id: "pnl", label: "Estado de Resultados", icon: BarChart3 },
    { id: "balance", label: "Balance General", icon: Layers },
    { id: "cashflow", label: "Flujo de Efectivo", icon: Activity },
    { id: "project", label: "Por Proyecto", icon: FolderKanban },
    { id: "aging", label: "Aging Cartera", icon: Clock },
    { id: "kpi", label: "KPIs y Métricas", icon: TrendingUp },
  ];

  const renderPnl = () => {
    const pnl = [
      { cat: "Ingresos", items: [["Certificados de obra", 12800000], ["Servicios profesionales", 3680000], ["Otros ingresos", 320000]], total: 16800000 },
      { cat: "Costos Directos", items: [["Materiales de construcción", -6200000], ["Mano de obra directa", -3400000], ["Subcontratistas", -1800000], ["Fletes y logística", -580000]], total: -11980000 },
      { cat: "Gastos Operativos", items: [["Sueldos administrativos", -890000], ["Alquiler oficina/obrador", -350000], ["Transporte y combustible", -420000], ["Seguros y ART", -280000], ["Servicios (luz, gas, tel)", -180000], ["Software y tecnología", -90000]], total: -2210000 },
      { cat: "Impuestos y Retenciones", items: [["IVA neto a pagar", -420000], ["IIBB", -168000], ["Retenciones sufridas", -85000]], total: -673000 },
    ];
    const totalInc = 16800000; const totalCost = 11980000 + 2210000 + 673000; const net = totalInc - totalCost;
    const margenBruto = Math.round((totalInc - 11980000) / totalInc * 100);
    const margenNeto = Math.round(net / totalInc * 100);
    return (
      <div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Estado de Resultados</div><div style={{ fontSize: 11, color: t.muted }}>Febrero 2026</div></div>
          <div style={{ display: "flex", gap: 5 }}><Btn t={t} onClick={() => handlePrint("Estado de Resultados", [["<th>Categoría</th>","<th>Concepto</th>","<th>Monto</th>"],...pnl.flatMap(c => c.items.map(([n, a]) => [c.cat, n, fmt(a)])),["<b>RESULTADO</b>","<b>NETO</b>","<b>" + fmt(net) + "</b>"]])}><Printer size={12} />Imprimir</Btn><Btn t={t} onClick={() => exportCSV("estado_resultados", ["Categoría","Concepto","Monto"], pnl.flatMap(c => c.items.map(([n, a]) => [c.cat, n, a])))}><Download size={12} />Excel</Btn></div>
        </div>
        {/* KPI Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, padding: "12px 16px", borderBottom: "1px solid " + t.border + "30" }}>
          {[
            { l: "Ingresos totales", v: fmt(totalInc), c: t.green },
            { l: "Costos totales", v: fmt(totalCost), c: t.red },
            { l: "Margen bruto", v: margenBruto + "%", c: margenBruto > 25 ? t.green : t.orange },
            { l: "Margen neto", v: margenNeto + "%", c: margenNeto > 10 ? t.green : t.orange },
          ].map((k, i) => (
            <div key={i} style={{ textAlign: "center", padding: 8, background: t.hover, borderRadius: 7 }}>
              <div style={{ fontSize: 9, color: t.dim }}>{k.l}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: k.c }}>{k.v}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: 16 }}>
          {pnl.map((cat, ci) => (
            <div key={ci} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.text, textTransform: "uppercase", marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid " + t.border }}>{cat.cat}</div>
              {cat.items.map(([name, amt], ii) => (
                <div key={ii} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0 5px 14px" }}>
                  <span style={{ fontSize: 12, color: t.muted }}>{name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 60, height: 4, borderRadius: 2, background: t.border }}>
                      <div style={{ height: 4, borderRadius: 2, background: amt >= 0 ? t.green : t.red, width: Math.min(100, Math.abs(amt) / 168000) + "%" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: amt >= 0 ? t.text : t.red, minWidth: 90, textAlign: "right" }}>{fmt(amt)}</span>
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 6px 14px", borderTop: "1px solid " + t.border + "20", marginTop: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Subtotal</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: cat.total >= 0 ? t.green : t.red }}>{fmt(cat.total)}</span>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", background: net >= 0 ? t.greenBg : t.redBg, borderRadius: 9, border: "1px solid " + (net >= 0 ? t.green : t.red) + "20" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>RESULTADO NETO</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: net >= 0 ? t.green : t.red }}>{fmt(net)}</span>
          </div>
          {/* Monthly comparison */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 8 }}>Comparación mensual (últimos 6 meses)</div>
            <div style={{ display: "flex", gap: 10, height: 120, alignItems: "flex-end" }}>
              {[["Sep",4.2,3.1],["Oct",3.8,2.9],["Nov",2.1,2.8],["Dic",5.2,3.5],["Ene",4.8,3.2],["Feb",4.8,3.9]].map(([m,inc,cost], i) => (
                <div key={m} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ display: "flex", gap: 2, justifyContent: "center", alignItems: "flex-end", height: 95 }}>
                    <div style={{ width: 14, height: (inc/6*100) + "%", background: t.green, borderRadius: "3px 3px 0 0" }} />
                    <div style={{ width: 14, height: (cost/6*100) + "%", background: t.red + "60", borderRadius: "3px 3px 0 0" }} />
                  </div>
                  <div style={{ fontSize: 10, color: t.dim, marginTop: 4 }}>{m}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: t.green }} /><span style={{ fontSize: 10, color: t.dim }}>Ingresos (M)</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: t.red + "60" }} /><span style={{ fontSize: 10, color: t.dim }}>Costos (M)</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBalance = () => {
    const activos = [["Caja y Bancos", 18400000], ["Cuentas por Cobrar", 13700000], ["Materiales en Obra", 4200000], ["Anticipos a Proveedores", 1500000], ["Activos Fijos (neto)", 28000000], ["Intangibles", 600000]];
    const pasivos = [["Cuentas por Pagar", 8760000], ["Préstamos Bancarios", 12000000], ["Anticipos de Clientes", 5000000], ["Deudas Fiscales", 3200000], ["Provisiones", 1440000]];
    const patrimonio = [["Capital Social", 20000000], ["Reservas", 4000000], ["Resultados Acumulados", 7600000], ["Resultado del Ejercicio", 1937000]];
    const totalA = activos.reduce((s, [,a]) => s + a, 0);
    const totalP = pasivos.reduce((s, [,a]) => s + a, 0);
    const totalPat = patrimonio.reduce((s, [,a]) => s + a, 0);
    return (
      <div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Balance General</div><div style={{ fontSize: 11, color: t.muted }}>Al 24/02/2026</div></div>
          <div style={{ display: "flex", gap: 5 }}><Btn t={t} onClick={() => handlePrint("Balance General", [["<th>Categoría</th>","<th>Cuenta</th>","<th>Monto</th>"],...activos.map(([n,a]) => ["Activo", n, fmt(a)]),...pasivos.map(([n,a]) => ["Pasivo", n, fmt(a)]),...patrimonio.map(([n,a]) => ["Patrimonio", n, fmt(a)])])}><Printer size={12} />Imprimir</Btn><Btn t={t} onClick={() => exportCSV("balance_general", ["Categoría","Cuenta","Monto"], [...activos.map(([n,a]) => ["Activo",n,a]),...pasivos.map(([n,a]) => ["Pasivo",n,a]),...patrimonio.map(([n,a]) => ["Patrimonio",n,a])])}><Download size={12} />Excel</Btn></div>
        </div>
        {/* Visual summary */}
        <div style={{ display: "flex", gap: 0, padding: "12px 16px", borderBottom: "1px solid " + t.border + "30" }}>
          <div style={{ flex: totalA, height: 24, background: t.accent, borderRadius: "6px 0 0 6px", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>ACTIVOS {fmt(totalA)}</span></div>
          <div style={{ flex: totalP, height: 24, background: t.red, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>PASIVOS {fmt(totalP)}</span></div>
          <div style={{ flex: totalPat, height: 24, background: t.green, borderRadius: "0 6px 6px 0", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>PN {fmt(totalPat)}</span></div>
        </div>
        <div style={{ padding: 16 }}>
          {[{ cat: "ACTIVOS", items: activos, total: totalA, color: t.accent }, { cat: "PASIVOS", items: pasivos, total: totalP, color: t.red }, { cat: "PATRIMONIO NETO", items: patrimonio, total: totalPat, color: t.green }].map((sec, si) => (
            <div key={si} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: sec.color, textTransform: "uppercase", marginBottom: 6, paddingBottom: 4, borderBottom: "2px solid " + sec.color + "30" }}>{sec.cat}</div>
              {sec.items.map(([n, a], ii) => (
                <div key={ii} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0 5px 14px" }}>
                  <span style={{ fontSize: 12, color: t.muted }}>{n}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 50, height: 4, borderRadius: 2, background: t.border }}><div style={{ height: 4, borderRadius: 2, background: sec.color, width: Math.min(100, a / sec.total * 100) + "%" }} /></div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: t.text, minWidth: 90, textAlign: "right" }}>{fmt(a)}</span>
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 6px 14px", borderTop: "1px solid " + t.border + "20", marginTop: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Total {sec.cat}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: sec.color }}>{fmt(sec.total)}</span>
              </div>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 8 }}>
            {[
              { l: "Liquidez corriente", v: (18400000 / totalP).toFixed(2), ok: (18400000 / totalP) > 1 },
              { l: "Endeudamiento", v: Math.round(totalP / totalA * 100) + "%", ok: (totalP / totalA) < 0.6 },
              { l: "Solvencia", v: (totalA / totalP).toFixed(2), ok: (totalA / totalP) > 1.5 },
            ].map((r, i) => (
              <div key={i} style={{ padding: 10, background: t.hover, borderRadius: 7, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: t.dim }}>{r.l}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: r.ok ? t.green : t.red }}>{r.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCashflow = () => {
    const secciones = [
      { cat: "Actividades Operativas", items: [["Cobros de clientes", 16480000], ["Pagos a proveedores", -8955000], ["Sueldos y cargas sociales", -3400000], ["Impuestos pagados", -673000], ["Gastos operativos", -2210000]], total: 1242000 },
      { cat: "Actividades de Inversión", items: [["Compra de equipos", -1200000], ["Mejoras en obras", -800000], ["Venta de activos", 350000]], total: -1650000 },
      { cat: "Actividades de Financiamiento", items: [["Cuota préstamo bancario", -500000], ["Intereses pagados", -180000], ["Aportes de socios", 0]], total: -680000 },
    ];
    const variacion = secciones.reduce((s, sec) => s + sec.total, 0);
    const saldoInicial = 18400000;
    return (
      <div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Flujo de Efectivo</div><div style={{ fontSize: 11, color: t.muted }}>Febrero 2026</div></div>
          <div style={{ display: "flex", gap: 5 }}><Btn t={t} onClick={() => handlePrint("Flujo de Efectivo", [["<th>Actividad</th>","<th>Concepto</th>","<th>Monto</th>"],...secciones.flatMap(s => s.items.map(([n,a]) => [s.cat, n, fmt(a)]))])}><Printer size={12} />Imprimir</Btn><Btn t={t} onClick={() => exportCSV("flujo_efectivo", ["Actividad","Concepto","Monto"], secciones.flatMap(s => s.items.map(([n,a]) => [s.cat,n,a])))}><Download size={12} />Excel</Btn></div>
        </div>
        {/* Cash Flow chart */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border + "30" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.text, marginBottom: 8 }}>Flujo mensual (6 meses)</div>
          <div style={{ display: "flex", gap: 12, height: 100, alignItems: "flex-end" }}>
            {[["Sep",65,50],["Oct",70,45],["Nov",55,60],["Dic",80,55],["Ene",75,48],["Feb",85,52]].map(([m,inc,out], i) => (
              <div key={m} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ display: "flex", gap: 2, justifyContent: "center", alignItems: "flex-end", height: 80 }}>
                  <div style={{ width: 12, height: inc + "%", background: "linear-gradient(180deg, " + t.accent + ", " + t.accent + "60)", borderRadius: "3px 3px 0 0" }} />
                  <div style={{ width: 12, height: out + "%", background: "linear-gradient(180deg, " + t.red + "80, " + t.red + "30)", borderRadius: "3px 3px 0 0" }} />
                </div>
                <div style={{ fontSize: 10, color: t.dim, marginTop: 3 }}>{m}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 16 }}>
          {/* Saldo inicial */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: t.hover, borderRadius: 7, marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Saldo inicial del mes</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{fmt(saldoInicial)}</span>
          </div>
          {secciones.map((sec, si) => (
            <div key={si} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.text, textTransform: "uppercase", marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid " + t.border }}>{sec.cat}</div>
              {sec.items.map(([n, a], ii) => (
                <div key={ii} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 5px 14px" }}>
                  <span style={{ fontSize: 12, color: t.muted }}>{n}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: a >= 0 ? t.green : t.red }}>{fmt(a)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 6px 14px", borderTop: "1px solid " + t.border + "20", marginTop: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Subtotal</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: sec.total >= 0 ? t.green : t.red }}>{fmt(sec.total)}</span>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: t.accentBg, borderRadius: 9, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>VARIACIÓN NETA DE EFECTIVO</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: variacion >= 0 ? t.green : t.red }}>{fmt(variacion)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: t.hover, borderRadius: 9 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Saldo final proyectado</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: t.accent }}>{fmt(saldoInicial + variacion)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderProject = () => (
    <div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between" }}>
        <div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Rentabilidad por Proyecto</div><div style={{ fontSize: 11, color: t.muted }}>Febrero 2026</div></div>
        <Btn t={t} onClick={() => exportCSV("rentabilidad_proyectos", ["Proyecto","Cliente","Presupuesto","Ingresos","Egresos","Resultado","Margen"], PROJECTS.map(p => { const ing=TXS.filter(tx=>tx.pid===p.id&&tx.amount>0).reduce((s,tx)=>s+tx.amount,0); const eg=TXS.filter(tx=>tx.pid===p.id&&tx.amount<0).reduce((s,tx)=>s+Math.abs(tx.amount),0); return [p.name,p.client,p.budget,ing,eg,ing-eg,ing>0?Math.round((ing-eg)/ing*100)+"%":"0%"]; }))}><Download size={12} />Excel</Btn>
      </div>
      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, padding: "12px 16px", borderBottom: "1px solid " + t.border + "30" }}>
        {[
          { l: "Proyectos activos", v: PROJECTS.length, c: t.accent },
          { l: "Presupuesto total", v: fmt(PROJECTS.reduce((s,p) => s + (p.budget || 0), 0)), c: t.blue },
          { l: "Tareas totales", v: tasks.length, c: t.green },
        ].map((k, i) => (
          <div key={i} style={{ textAlign: "center", padding: 8, background: t.hover, borderRadius: 7 }}>
            <div style={{ fontSize: 9, color: t.dim }}>{k.l}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: 16 }}>
        {PROJECTS.map(p => {
          const ing = TXS.filter(tx => tx.pid === p.id && tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
          const eg = TXS.filter(tx => tx.pid === p.id && tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
          const net = ing - eg;
          const margin = ing > 0 ? Math.round(net / ing * 100) : 0;
          const pTasks = tasks.filter(tk => tk.pid === p.id);
          const doneTasks = pTasks.filter(tk => tk.st === "done").length;
          const progress = pTasks.length > 0 ? Math.round(doneTasks / pTasks.length * 100) : 0;
          const pDocs = documents.filter(d => d.pid === p.id);
          return (
            <div key={p.id} style={{ padding: 14, borderRadius: 9, background: t.hover, marginBottom: 10, border: "1px solid " + t.border }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{p.name}</div><div style={{ fontSize: 11, color: t.dim }}>{p.client} · {p.deadline || "Sin plazo"}</div></div>
                <Badge s={p.status} t={t} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 10 }}>
                <div><div style={{ fontSize: 10, color: t.dim }}>Presupuesto</div><div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{fmt(p.budget)}</div></div>
                <div><div style={{ fontSize: 10, color: t.dim }}>Ingresos</div><div style={{ fontSize: 12, fontWeight: 600, color: t.green }}>{fmt(ing)}</div></div>
                <div><div style={{ fontSize: 10, color: t.dim }}>Egresos</div><div style={{ fontSize: 12, fontWeight: 600, color: t.red }}>{fmt(eg)}</div></div>
                <div><div style={{ fontSize: 10, color: t.dim }}>Resultado</div><div style={{ fontSize: 12, fontWeight: 700, color: net >= 0 ? t.green : t.red }}>{fmt(net)}</div></div>
                <div><div style={{ fontSize: 10, color: t.dim }}>Margen</div><div style={{ fontSize: 12, fontWeight: 700, color: margin > 20 ? t.green : margin > 0 ? t.orange : t.red }}>{margin}%</div></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}><PBar v={progress} color={t.accent} h={5} t={t} /></div>
                <span style={{ fontSize: 10, color: t.dim, whiteSpace: "nowrap" }}>{doneTasks}/{pTasks.length} tareas · {pDocs.length} docs</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderAging = () => (
    <div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between" }}>
        <div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Aging de Cartera</div><div style={{ fontSize: 11, color: t.muted }}>Antigüedad de CxC y CxP</div></div>
        <Btn t={t} onClick={() => exportCSV("aging_cartera", ["Tipo","Rango","Monto","Porcentaje"], [["CxC","Vigentes",7500000,"55%"],["CxC","1-30d",3200000,"23%"],["CxC","31-60d",1800000,"13%"],["CxC","+60d",1200000,"9%"],["CxP","Vigentes",4200000,"48%"],["CxP","1-30d",2100000,"24%"],["CxP","31-60d",1500000,"17%"],["CxP","+60d",960000,"11%"]])}><Download size={12} />Excel</Btn>
      </div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "12px 16px", borderBottom: "1px solid " + t.border + "30" }}>
        <div style={{ textAlign: "center", padding: 10, background: t.greenBg, borderRadius: 7 }}><div style={{ fontSize: 10, color: t.green }}>Total CxC</div><div style={{ fontSize: 18, fontWeight: 700, color: t.green }}>{fmt(13700000)}</div></div>
        <div style={{ textAlign: "center", padding: 10, background: t.redBg, borderRadius: 7 }}><div style={{ fontSize: 10, color: t.red }}>Total CxP</div><div style={{ fontSize: 18, fontWeight: 700, color: t.red }}>{fmt(8760000)}</div></div>
      </div>
      <div style={{ padding: 16 }}>
        {[
          { title: "Cuentas por Cobrar", total: 13700000, data: [["Vigentes", 7500000, t.green, 55], ["1-30 días", 3200000, t.orange, 23], ["31-60 días", 1800000, t.red, 13], ["+60 días", 1200000, "#FF4757", 9]],
            detail: [["Constructora Vial SA", 7500000, 0, "vigente"], ["Inmobiliaria Costa", 2100000, 15, "1-30"], ["Estudio Arq. Méndez", 1800000, 45, "31-60"], ["Varios menores", 2300000, 70, "+60"]] },
          { title: "Cuentas por Pagar", total: 8760000, data: [["Vigentes", 4200000, t.green, 48], ["1-30 días", 2100000, t.orange, 24], ["31-60 días", 1500000, t.red, 17], ["+60 días", 960000, "#FF4757", 11]],
            detail: [["Hierros del Sur SRL", 1850000, 5, "vigente"], ["Ferretería López", 920000, 20, "1-30"], ["Transportes Rápido", 1500000, 50, "31-60"], ["Varios proveedores", 4490000, 30, "1-30"]] },
        ].map((sec, si) => (
          <div key={si} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 10 }}>{sec.title}</div>
            {sec.data.map(([l, a, c, p], i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: t.muted }}>{l} ({p}%)</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{fmt(a)}</span>
                </div>
                <PBar v={p} color={c} h={6} t={t} />
              </div>
            ))}
            {/* Detail table */}
            <div style={{ marginTop: 10, borderRadius: 7, overflow: "hidden", border: "1px solid " + t.border }}>
              {sec.detail.map(([name, amt, days, status], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 12px", borderBottom: i < sec.detail.length - 1 ? "1px solid " + t.border + "20" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Av name={name} size={22} />
                    <div><div style={{ fontSize: 11, color: t.text, fontWeight: 500 }}>{name}</div><div style={{ fontSize: 10, color: t.dim }}>{days === 0 ? "Al día" : days + " días"}</div></div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{fmt(amt)}</div>
                    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: status === "vigente" ? t.greenBg : status === "1-30" ? t.orangeBg : t.redBg, color: status === "vigente" ? t.green : status === "1-30" ? t.orange : t.red }}>{status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderKpi = () => {
    const totalInc = TXS.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
    const totalEg = TXS.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(tk => tk.st === "done").length;
    const totalDocs = documents.length;
    return (
      <div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>KPIs y Métricas del Negocio</div>
          <div style={{ fontSize: 11, color: t.muted }}>Resumen ejecutivo — Febrero 2026</div>
        </div>
        <div style={{ padding: 16 }}>
          {/* Financieros */}
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text, textTransform: "uppercase", marginBottom: 8 }}>Indicadores Financieros</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
            {[
              { l: "Ingresos totales", v: fmt(totalInc), c: t.green, sub: TXS.filter(tx => tx.amount > 0).length + " transacciones" },
              { l: "Egresos totales", v: fmt(totalEg), c: t.red, sub: TXS.filter(tx => tx.amount < 0).length + " transacciones" },
              { l: "Resultado neto", v: fmt(totalInc - totalEg), c: totalInc - totalEg >= 0 ? t.green : t.red, sub: "Margen: " + (totalInc > 0 ? Math.round((totalInc - totalEg) / totalInc * 100) : 0) + "%" },
              { l: "Ticket promedio ingreso", v: fmt(TXS.filter(tx => tx.amount > 0).length > 0 ? totalInc / TXS.filter(tx => tx.amount > 0).length : 0), c: t.accent, sub: "Por transacción" },
              { l: "CxC / CxP ratio", v: (13700000 / 8760000).toFixed(2), c: t.blue, sub: "CxC: " + fmt(13700000) },
              { l: "Liquidez", v: (18400000 / 8760000).toFixed(2), c: 18400000 / 8760000 > 1.5 ? t.green : t.orange, sub: "Caja / Pasivo corriente" },
            ].map((k, i) => (
              <div key={i} style={{ padding: 12, background: t.hover, borderRadius: 8, borderLeft: "3px solid " + k.c }}>
                <div style={{ fontSize: 10, color: t.dim }}>{k.l}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: k.c, marginTop: 2 }}>{k.v}</div>
                <div style={{ fontSize: 10, color: t.muted, marginTop: 2 }}>{k.sub}</div>
              </div>
            ))}
          </div>
          {/* Operativos */}
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text, textTransform: "uppercase", marginBottom: 8 }}>Indicadores Operativos</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
            {[
              { l: "Proyectos activos", v: PROJECTS.length, c: t.accent, sub: "Total registrados" },
              { l: "Tareas completadas", v: doneTasks + "/" + totalTasks, c: t.green, sub: totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) + "% completado" : "Sin tareas" },
              { l: "Tareas urgentes", v: tasks.filter(tk => tk.pri === "high" && tk.st !== "done").length, c: t.red, sub: "Prioridad alta pendientes" },
              { l: "Clientes activos", v: clients.length, c: t.blue, sub: clients.filter(c => c.type === "client").length + " clientes, " + clients.filter(c => c.type === "supplier").length + " proveedores" },
              { l: "Documentos", v: totalDocs, c: t.orange, sub: documents.filter(d => d.status === "pending").length + " pendientes de procesar" },
              { l: "Productividad", v: totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) + "%" : "—", c: t.green, sub: "Tasa de completitud" },
            ].map((k, i) => (
              <div key={i} style={{ padding: 12, background: t.hover, borderRadius: 8, borderLeft: "3px solid " + k.c }}>
                <div style={{ fontSize: 10, color: t.dim }}>{k.l}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: k.c, marginTop: 2 }}>{k.v}</div>
                <div style={{ fontSize: 10, color: t.muted, marginTop: 2 }}>{k.sub}</div>
              </div>
            ))}
          </div>
          {/* Task completion rate */}
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text, textTransform: "uppercase", marginBottom: 8 }}>Avance de Proyectos</div>
          {PROJECTS.map(p => {
            const pTasks = tasks.filter(tk => tk.pid === p.id);
            const done = pTasks.filter(tk => tk.st === "done").length;
            const prog = pTasks.length > 0 ? Math.round(done / pTasks.length * 100) : 0;
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid " + t.border + "15" }}>
                <div style={{ width: 120, fontSize: 11, color: t.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                <div style={{ flex: 1 }}><PBar v={prog} color={t.accent} h={6} t={t} /></div>
                <span style={{ fontSize: 11, fontWeight: 600, color: t.text, minWidth: 40, textAlign: "right" }}>{prog}%</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const content = { pnl: renderPnl, balance: renderBalance, cashflow: renderCashflow, project: renderProject, aging: renderAging, kpi: renderKpi };

  return (
    <div style={{ padding: 22, overflowY: "auto", height: "calc(100vh - 54px)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: 14 }}>
        <div>
          {reps.map(r => (
            <div key={r.id} onClick={() => setActive(r.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 10px", borderRadius: 8, cursor: "pointer", background: active === r.id ? t.accentBg : "transparent", border: "1px solid " + (active === r.id ? t.accent + "25" : "transparent"), marginBottom: 2 }}>
              <r.icon size={13} color={active === r.id ? t.accentL : t.dim} />
              <span style={{ fontSize: 12, fontWeight: active === r.id ? 600 : 400, color: active === r.id ? t.accentL : t.text }}>{r.label}</span>
            </div>
          ))}
        </div>
        <Crd t={t} style={{}}>
          {content[active] ? content[active]() : null}
        </Crd>
      </div>
    </div>
  );
}

function Landing({ onEnter }) {
  const [scrollY, setScrollY] = useState(0);
  const handleScroll = (e) => setScrollY(e.target.scrollTop);

  const features = [
    { icon: LayoutDashboard, title: "Dashboard inteligente", desc: "KPIs financieros en tiempo real con alertas automáticas de IA. Visualizá ingresos, egresos y cash flow de un vistazo." },
    { icon: Receipt, title: "Transacciones y facturación", desc: "Registrá cobros y pagos, vinculá facturas, controlá pendientes y vencidos. Exportá todo a Excel." },
    { icon: Layers, title: "Contabilidad automatizada", desc: "Libro Diario con asientos propuestos por IA, Libro Mayor y Balance de Comprobación. Partida doble visual." },
    { icon: Wallet, title: "Tesorería y bancos", desc: "Cuentas bancarias en vivo, forecast de 4 semanas, CxC/CxP por antigüedad, alertas de pagos." },
    { icon: FolderKanban, title: "Proyectos y obras", desc: "Seguimiento de avance, presupuesto vs real, tareas por obra. Todo en un solo lugar." },
    { icon: FileText, title: "OCR de comprobantes", desc: "Sacá una foto del ticket por WhatsApp. La IA extrae monto, proveedor, IVA y lo registra automáticamente." },
  ];

  const stats = [
    { val: "85%", label: "menos tiempo en administración" },
    { val: "30%", label: "más rentabilidad en obras" },
    { val: "100%", label: "trazabilidad de gastos" },
    { val: "24/7", label: "acceso desde cualquier lugar" },
  ];

  const steps = [
    { num: "01", title: "Conectá tus datos", desc: "Importá tu información existente o empezá de cero. En minutos tenés todo configurado." },
    { num: "02", title: "Operá día a día", desc: "Registrá gastos por WhatsApp, gestioná cobros, controlá obras. Todo fluye naturalmente." },
    { num: "03", title: "Tomá mejores decisiones", desc: "Reportes automáticos, alertas inteligentes y proyecciones que te permiten anticiparte." },
  ];

  return (
    <div onScroll={handleScroll} style={{ height: "100vh", overflowY: "auto", overflowX: "hidden", background: "#06080D", color: "#ECF0F6", fontFamily: "'DM Sans', sans-serif", scrollBehavior: "smooth" }}>
      <style>{
        "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');" +
        "@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}" +
        "@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}" +
        "@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}" +
        "@keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}" +
        "*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif}" +
        "::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#262940;border-radius:3px}"
      }</style>

      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, left: 0, right: 0, zIndex: 100, padding: "16px 40px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: scrollY > 50 ? "rgba(6,8,13,0.95)" : "rgba(6,8,13,0.8)",
        backdropFilter: "blur(20px)",
        borderBottom: scrollY > 50 ? "1px solid rgba(124,109,240,0.1)" : "1px solid transparent",
        transition: "all 0.3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg, #7C6DF0, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(124,109,240,0.4)" }}>
            <Zap size={17} color="#fff" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px" }}>GestiónAI</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <span onClick={() => document.getElementById("features").scrollIntoView({ behavior: "smooth" })} style={{ color: "#8890A8", textDecoration: "none", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Funcionalidades</span>
          <span onClick={() => document.getElementById("how").scrollIntoView({ behavior: "smooth" })} style={{ color: "#8890A8", textDecoration: "none", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cómo funciona</span>
          <span onClick={() => document.getElementById("pricing").scrollIntoView({ behavior: "smooth" })} style={{ color: "#8890A8", textDecoration: "none", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Planes</span>
          <button onClick={onEnter} style={{ background: "linear-gradient(135deg, #7C6DF0, #A78BFA)", color: "#fff", border: "none", borderRadius: 9, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 16px rgba(124,109,240,0.35)" }}>
            Ver Demo
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        textAlign: "center", padding: "60px 40px 80px", position: "relative", overflow: "hidden",
      }}>
        {/* BG effects */}
        <div style={{ position: "absolute", top: "20%", left: "10%", width: 400, height: 400, background: "radial-gradient(circle, rgba(124,109,240,0.12) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(60px)", animation: "float 8s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 350, height: 350, background: "radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(60px)", animation: "float 10s ease-in-out infinite 2s", pointerEvents: "none" }} />

        <div style={{ animation: "fadeUp 0.8s ease-out" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 20, background: "rgba(124,109,240,0.1)", border: "1px solid rgba(124,109,240,0.2)", marginBottom: 28 }}>
            <Bot size={13} color="#9F92FF" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#9F92FF" }}>Potenciado por Inteligencia Artificial</span>
          </div>
        </div>

        <h1 style={{ fontSize: 62, fontWeight: 900, lineHeight: 1.05, maxWidth: 800, letterSpacing: "-2px", animation: "fadeUp 0.8s ease-out 0.1s both" }}>
          Gestión financiera
          <span style={{ background: "linear-gradient(135deg, #7C6DF0, #34D399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}> inteligente</span>
          <br />para constructoras
        </h1>

        <p style={{ fontSize: 18, color: "#8890A8", maxWidth: 560, marginTop: 24, lineHeight: 1.6, animation: "fadeUp 0.8s ease-out 0.2s both" }}>
          Controlá obras, finanzas y equipos desde un solo lugar.
          Con IA que automatiza tu contabilidad y WhatsApp como canal de carga.
        </p>

        <div style={{ display: "flex", gap: 14, marginTop: 36, animation: "fadeUp 0.8s ease-out 0.3s both" }}>
          <button onClick={onEnter} style={{
            background: "linear-gradient(135deg, #7C6DF0, #A78BFA)", color: "#fff", border: "none",
            borderRadius: 12, padding: "15px 36px", fontSize: 16, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 24px rgba(124,109,240,0.4)", display: "flex", alignItems: "center", gap: 8,
          }}>
            Probar demo gratis <ArrowUpRight size={18} />
          </button>
          <button style={{
            background: "rgba(255,255,255,0.04)", color: "#ECF0F6", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: "15px 30px", fontSize: 16, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <MessageSquare size={16} color="#25D366" /> Contactar por WhatsApp
          </button>
        </div>

        {/* Stats strip */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0,
          marginTop: 72, padding: "28px 0", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)",
          maxWidth: 740, width: "100%", animation: "fadeUp 0.8s ease-out 0.5s both",
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{ textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <div style={{ fontSize: 32, fontWeight: 900, background: "linear-gradient(135deg, #7C6DF0, #34D399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#555B75", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "100px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#7C6DF0", textTransform: "uppercase", letterSpacing: 2 }}>Funcionalidades</span>
          <h2 style={{ fontSize: 40, fontWeight: 900, marginTop: 12, letterSpacing: "-1px" }}>Todo lo que tu constructora necesita</h2>
          <p style={{ fontSize: 16, color: "#8890A8", marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>Una sola plataforma para reemplazar las planillas, los papeles y los sistemas desconectados.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              padding: 30, borderRadius: 16, background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)", transition: "all 0.3s",
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: "rgba(124,109,240,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <f.icon size={21} color="#9F92FF" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: "#8890A8", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ padding: "100px 40px", background: "rgba(124,109,240,0.03)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#34D399", textTransform: "uppercase", letterSpacing: 2 }}>Cómo funciona</span>
            <h2 style={{ fontSize: 40, fontWeight: 900, marginTop: 12, letterSpacing: "-1px" }}>Arrancá en 3 pasos</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 32 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ position: "relative" }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: "rgba(124,109,240,0.12)", marginBottom: 12, lineHeight: 1 }}>{s.num}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: "#8890A8", lineHeight: 1.6 }}>{s.desc}</p>
                {i < 2 && <div style={{ position: "absolute", top: 24, right: -16, fontSize: 20, color: "rgba(124,109,240,0.2)" }}>→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "100px 40px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#FBBF24", textTransform: "uppercase", letterSpacing: 2 }}>Planes</span>
          <h2 style={{ fontSize: 40, fontWeight: 900, marginTop: 12, letterSpacing: "-1px" }}>Simple y transparente</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {[
            { name: "Starter", price: "Gratis", sub: "Para probar", features: ["1 obra activa", "3 usuarios", "Dashboard y reportes", "Soporte por email"], cta: "Empezar gratis", primary: false },
            { name: "Profesional", price: "$49.900", sub: "/mes · hasta 10 obras", features: ["10 obras activas", "15 usuarios", "Contabilidad con IA", "WhatsApp integrado", "OCR de comprobantes", "Soporte prioritario"], cta: "Elegir plan", primary: true },
            { name: "Empresa", price: "Personalizado", sub: "Obras ilimitadas", features: ["Obras ilimitadas", "Usuarios ilimitados", "Integración AFIP y bancos", "API y webhooks", "Onboarding dedicado", "Soporte 24/7"], cta: "Contactar ventas", primary: false },
          ].map((plan, i) => (
            <div key={i} style={{
              padding: 32, borderRadius: 16,
              background: plan.primary ? "linear-gradient(160deg, rgba(124,109,240,0.12), rgba(52,211,153,0.06))" : "rgba(255,255,255,0.02)",
              border: plan.primary ? "1px solid rgba(124,109,240,0.3)" : "1px solid rgba(255,255,255,0.06)",
              position: "relative",
            }}>
              {plan.primary && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", padding: "4px 14px", borderRadius: 12, background: "linear-gradient(135deg, #7C6DF0, #A78BFA)", fontSize: 11, fontWeight: 700, color: "#fff" }}>Más popular</div>}
              <div style={{ fontSize: 14, fontWeight: 700, color: "#9F92FF", marginBottom: 8 }}>{plan.name}</div>
              <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 2 }}>{plan.price}</div>
              <div style={{ fontSize: 12, color: "#555B75", marginBottom: 24 }}>{plan.sub}</div>
              {plan.features.map((f, fi) => (
                <div key={fi} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <CheckCircle2 size={14} color="#34D399" />
                  <span style={{ fontSize: 13, color: "#8890A8" }}>{f}</span>
                </div>
              ))}
              <button onClick={plan.primary ? onEnter : undefined} style={{
                width: "100%", marginTop: 20, padding: "13px 0", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
                background: plan.primary ? "linear-gradient(135deg, #7C6DF0, #A78BFA)" : "transparent",
                color: plan.primary ? "#fff" : "#9F92FF",
                border: plan.primary ? "none" : "1px solid rgba(124,109,240,0.3)",
                boxShadow: plan.primary ? "0 4px 20px rgba(124,109,240,0.3)" : "none",
              }}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "100px 40px", textAlign: "center" }}>
        <div style={{
          maxWidth: 700, margin: "0 auto", padding: "60px 40px", borderRadius: 24,
          background: "linear-gradient(160deg, rgba(124,109,240,0.1), rgba(52,211,153,0.05))",
          border: "1px solid rgba(124,109,240,0.15)",
        }}>
          <h2 style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-1px" }}>¿Listo para dejar las planillas?</h2>
          <p style={{ fontSize: 16, color: "#8890A8", marginTop: 12, marginBottom: 28 }}>Probá GestiónAI gratis y empezá a tomar mejores decisiones financieras hoy.</p>
          <button onClick={onEnter} style={{
            background: "linear-gradient(135deg, #7C6DF0, #A78BFA)", color: "#fff", border: "none",
            borderRadius: 12, padding: "16px 40px", fontSize: 16, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 24px rgba(124,109,240,0.4)", display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            Probar demo gratis <ArrowUpRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "40px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, #7C6DF0, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={13} color="#fff" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700 }}>GestiónAI</span>
          </div>
          <span style={{ fontSize: 11, color: "#555B75" }}>© 2026 GestiónAI — Hecho en Argentina</span>
        </div>
      </footer>
    </div>
  );
}

function LoadingScreen({ t }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: t.bg }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, " + t.accent + ", #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, animation: "float 2s ease-in-out infinite" }}>
        <Zap size={24} color="#fff" />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>GestiónAI</div>
      <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>Cargando datos...</div>
    </div>
  );
}

function AppContent({ user, profile, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState("dark");
  const { loading } = useData();
  const t = themes[theme];
  const role = profile?.role || user?.user_metadata?.role || "owner";

  if (loading) return <LoadingScreen t={t} />;

  const meta = {
    dashboard: ["Dashboard", "Resumen financiero"], clients: ["Clientes / Proveedores", "Gestión de contactos"],
    projects: ["Proyectos / Obras", "Seguimiento y presupuestos"], tasks: ["Tareas", "Gestión de actividades"],
    transactions: ["Finanzas", "Transacciones y contabilidad"],
    treasury: ["Tesorería", "Cuentas y cash flow"], documents: ["Documentos", "Facturas y comprobantes"],
    reports: ["Reportes", "Informes financieros"],
  };
  const pages = { dashboard: Dashboard, clients: Clients, projects: ProjectsPage, tasks: TasksPage, transactions: Transactions, treasury: Treasury, documents: DocumentsPage, reports: Reports };
  const Page = pages[page] || Dashboard;

  return (
    <>
      <style>{
        "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');" +
        "@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}" +
        "*{box-sizing:border-box;margin:0;padding:0}" +
        "body{font-family:'DM Sans',-apple-system,sans-serif}" +
        "::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:" + t.border + ";border-radius:3px}" +
        "input::placeholder{color:" + t.dim + "}" +
        "select{color:" + t.text + "}option{background:" + t.card + ";color:" + t.text + "}"
      }</style>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: t.bg, transition: "background 0.25s" }}>
        <Sidebar active={page} onNav={setPage} collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} t={t} user={user} onLogout={onLogout} role={role} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <TopBar title={meta[page] ? meta[page][0] : ""} sub={meta[page] ? meta[page][1] : ""} theme={theme} toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} t={t} user={user} profile={profile} onLogout={onLogout} onNav={setPage} />
          <Page t={t} onNav={setPage} user={user} />
        </div>
      </div>
    </>
  );
}

function LoginPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [company, setCompany] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cuit, setCuit] = useState("");
  const [role, setRole] = useState("owner");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // register: step 1 = company, step 2 = user
  const t = themes.dark;

  const inputStyle = { display: "flex", alignItems: "center", gap: 8, background: t.hover, border: "1px solid " + t.border, borderRadius: 8, padding: "10px 12px" };
  const fieldStyle = { flex: 1, background: "transparent", border: "none", color: t.text, fontSize: 13, outline: "none", width: "100%" };

  const validateRegStep1 = () => {
    if (!company.trim()) { setError("Ingresá el nombre de tu empresa"); return false; }
    if (!fullName.trim()) { setError("Ingresá tu nombre completo"); return false; }
    if (!phone.trim()) { setError("Ingresá un teléfono de contacto"); return false; }
    setError(""); return true;
  };

  const handleSubmit = async () => {
    setError("");
    if (isLogin) {
      if (!email.trim() || !pass.trim()) { setError("Completá email y contraseña"); return; }
    } else {
      if (!email.trim()) { setError("Completá tu email"); return; }
      if (pass.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
      if (pass !== pass2) { setError("Las contraseñas no coinciden"); return; }
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) setError(error.message === "Invalid login credentials" ? "Email o contraseña incorrectos" : error.message);
        else onLogin();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password: pass,
          options: { data: { full_name: fullName, company, phone, cuit, role } }
        });
        if (error) { setError(error.message); }
        else {
          // Create company + profile in database
          if (data?.user) {
            await supabase.rpc("create_company_and_profile", {
              p_user_id: data.user.id,
              p_company_name: company,
              p_cuit: cuit || null,
              p_phone: phone || null,
              p_full_name: fullName,
              p_role: role,
            });
          }
          window.alert("✅ Cuenta creada exitosamente.\n\nEmpresa: " + company + "\nUsuario: " + fullName + "\n\nYa podés iniciar sesión.");
          setIsLogin(true); setStep(1);
          setPass(""); setPass2("");
        }
      }
    } catch (e) { setError("Error de conexión"); }
    setLoading(false);
  };

  const switchMode = () => { setIsLogin(!isLogin); setError(""); setStep(1); setPass(""); setPass2(""); };

  return (
    <>
      <style>{
        "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');" +
        "*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',-apple-system,sans-serif}" +
        "input::placeholder{color:" + t.dim + "}"
      }</style>
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "20%", left: "10%", width: 300, height: 300, borderRadius: "50%", background: t.accent + "08", filter: "blur(80px)" }} />
          <div style={{ position: "absolute", bottom: "20%", right: "10%", width: 250, height: 250, borderRadius: "50%", background: "#A78BFA10", filter: "blur(80px)" }} />
        </div>
        <div style={{ width: isLogin ? 400 : 460, padding: 40, position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg, " + t.accent + ", #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 4px 20px " + t.accent + "40" }}>
              <Zap size={26} color="#fff" />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: t.text, letterSpacing: "-0.5px" }}>GestiónAI</div>
            <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>{isLogin ? "Iniciá sesión en tu cuenta" : step === 1 ? "Paso 1 de 2 — Datos de tu empresa" : "Paso 2 de 2 — Datos de acceso"}</div>
          </div>

          <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 14, padding: 24 }}>
            {isLogin ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: t.muted, marginBottom: 5 }}>Email</div>
                  <div style={inputStyle}>
                    <Mail size={14} color={t.dim} />
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@empresa.com" onKeyDown={e => e.key === "Enter" && handleSubmit()} style={fieldStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: t.muted, marginBottom: 5 }}>Contraseña</div>
                  <div style={inputStyle}>
                    <Lock size={14} color={t.dim} />
                    <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleSubmit()} style={fieldStyle} />
                  </div>
                </div>
              </>
            ) : step === 1 ? (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: t.muted, marginBottom: 5 }}>Nombre de la empresa *</div>
                  <div style={inputStyle}>
                    <Briefcase size={14} color={t.dim} />
                    <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Ej: Constructora López SRL" style={fieldStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: t.muted, marginBottom: 5 }}>CUIT (opcional)</div>
                  <div style={inputStyle}>
                    <FileText size={14} color={t.dim} />
                    <input value={cuit} onChange={e => setCuit(e.target.value)} placeholder="30-12345678-9" style={fieldStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: t.muted, marginBottom: 5 }}>Nombre completo *</div>
                  <div style={inputStyle}>
                    <Users size={14} color={t.dim} />
                    <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Juan Pérez" style={fieldStyle} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: t.muted, marginBottom: 5 }}>Teléfono *</div>
                    <div style={inputStyle}>
                      <Phone size={14} color={t.dim} />
                      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+54 11 ..." style={fieldStyle} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: t.muted, marginBottom: 5 }}>Rol en la empresa</div>
                    <select value={role} onChange={e => setRole(e.target.value)} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 8, padding: "10px 12px", color: t.text, fontSize: 13 }}>
                      <option value="owner">Dueño / Socio</option>
                      <option value="admin">Administrador</option>
                      <option value="accountant">Contador</option>
                      <option value="pm">Director de obra</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: t.muted, marginBottom: 5 }}>Email de acceso *</div>
                  <div style={inputStyle}>
                    <Mail size={14} color={t.dim} />
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@empresa.com" style={fieldStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: t.muted, marginBottom: 5 }}>Contraseña * <span style={{ fontSize: 10, color: t.dim }}>(mínimo 6 caracteres)</span></div>
                  <div style={inputStyle}>
                    <Lock size={14} color={t.dim} />
                    <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" style={fieldStyle} />
                  </div>
                  {pass.length > 0 && pass.length < 6 && <div style={{ fontSize: 10, color: t.red, marginTop: 4 }}>Mínimo 6 caracteres ({6 - pass.length} más)</div>}
                  {pass.length >= 6 && <div style={{ fontSize: 10, color: t.green, marginTop: 4 }}>✓ Contraseña válida</div>}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: t.muted, marginBottom: 5 }}>Repetir contraseña *</div>
                  <div style={{ ...inputStyle, borderColor: pass2.length > 0 ? (pass === pass2 ? t.green + "50" : t.red + "50") : t.border }}>
                    <Lock size={14} color={pass2.length > 0 ? (pass === pass2 ? t.green : t.red) : t.dim} />
                    <input type="password" value={pass2} onChange={e => setPass2(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleSubmit()} style={fieldStyle} />
                  </div>
                  {pass2.length > 0 && pass !== pass2 && <div style={{ fontSize: 10, color: t.red, marginTop: 4 }}>Las contraseñas no coinciden</div>}
                  {pass2.length > 0 && pass === pass2 && <div style={{ fontSize: 10, color: t.green, marginTop: 4 }}>✓ Las contraseñas coinciden</div>}
                </div>
                <div style={{ padding: "10px 12px", background: t.hover, borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: t.muted, marginBottom: 4 }}>Resumen de registro</div>
                  <div style={{ fontSize: 12, color: t.text }}><b>{company}</b> · {fullName} · {phone}</div>
                </div>
              </>
            )}

            {error && <div style={{ padding: "8px 12px", background: t.redBg, border: "1px solid " + t.red + "25", borderRadius: 8, marginBottom: 14, fontSize: 12, color: t.red }}>{error}</div>}

            {isLogin ? (
              <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "11px 0", borderRadius: 9, border: "none", background: "linear-gradient(135deg, " + t.accent + ", #A78BFA)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Ingresando..." : "Iniciar sesión"}
              </button>
            ) : step === 1 ? (
              <button onClick={() => { if (validateRegStep1()) setStep(2); }} style={{ width: "100%", padding: "11px 0", borderRadius: 9, border: "none", background: "linear-gradient(135deg, " + t.accent + ", #A78BFA)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Siguiente →
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "1px solid " + t.border, background: t.hover, color: t.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  ← Atrás
                </button>
                <button onClick={handleSubmit} disabled={loading || pass.length < 6 || pass !== pass2} style={{ flex: 2, padding: "11px 0", borderRadius: 9, border: "none", background: "linear-gradient(135deg, " + t.accent + ", #A78BFA)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer", opacity: (loading || pass.length < 6 || pass !== pass2) ? 0.5 : 1 }}>
                  {loading ? "Creando cuenta..." : "Crear cuenta"}
                </button>
              </div>
            )}
          </div>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <span style={{ fontSize: 12, color: t.muted }}>{isLogin ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?"} </span>
            <span onClick={switchMode} style={{ fontSize: 12, color: t.accentL, cursor: "pointer", fontWeight: 600 }}>{isLogin ? "Registrate" : "Iniciá sesión"}</span>
          </div>
          {!isLogin && <div style={{ textAlign: "center", marginTop: 8, fontSize: 10, color: t.dim }}>Al registrarte aceptás los términos y condiciones de GestiónAI</div>}
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [view, setView] = useState("loading");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const loadProfile = async (userId) => {
    const { data } = await supabase.from("user_profiles").select("*, company:companies(name)").eq("id", userId).single();
    if (data) setProfile(data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id); setView("app"); }
      else setView("landing");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id); setView("app"); }
      else { setUser(null); setProfile(null); setView("landing"); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setView("landing");
  };

  if (view === "loading") return <div style={{ minHeight: "100vh", background: "#0B0F1A", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", animation: "float 2s ease-in-out infinite" }}><Zap size={20} color="#fff" /></div></div>;
  if (view === "landing") return <Landing onEnter={() => setView("login")} />;
  if (view === "login") return <LoginPage onLogin={() => setView("app")} />;

  return (
    <DataProvider>
      <AppContent user={user} profile={profile} onLogout={handleLogout} />
    </DataProvider>
  );
}
