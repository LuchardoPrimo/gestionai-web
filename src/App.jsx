import { useState, useEffect, createContext, useContext, useRef, useMemo } from "react";
import { supabase } from "./lib/supabase";
import {
  LayoutDashboard, FolderKanban, CheckSquare, Wallet, FileText, BarChart3,
  Calendar, Settings, Building2, GraduationCap, Search, Bell, ChevronDown,
  ChevronRight, Plus, X, Edit2, Trash2, ArrowUpRight, ArrowDownRight,
  Clock, AlertCircle, Target, Users, MapPin, Zap, Filter, Upload,
  Eye, Download, MoreHorizontal, CheckCircle2, Circle, Loader,
  BookOpen, Monitor, Video, DollarSign, TrendingUp, PieChart,
  ChevronLeft, Sparkles, Menu, Sun, Moon, LogOut, Home
} from "lucide-react";

// ─── Theme ───
const themes = {
  dark: {
    bg:"#111113", card:"#1C1C1E", hover:"#252528", sidebar:"#161618", topbar:"#161618",
    border:"#2C2C30", text:"#EDEDEF", muted:"#8E8E93", dim:"#636366",
    accent:"#0A84FF", accentL:"#5AC8FA", accentBg:"rgba(10,132,255,0.10)",
    green:"#30D158", greenBg:"rgba(48,209,88,0.10)",
    red:"#FF453A", redBg:"rgba(255,69,58,0.10)",
    orange:"#FF9F0A", orangeBg:"rgba(255,159,10,0.10)",
    blue:"#0A84FF", blueBg:"rgba(10,132,255,0.10)",
    yellow:"#FFD60A", yellowBg:"rgba(255,214,10,0.10)",
    shadow:"0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
  },
  light: {
    bg:"#F2F2F7", card:"#FFFFFF", hover:"#E8E8ED", sidebar:"#FBFBFD", topbar:"#FBFBFD",
    border:"#C6C6CC", text:"#1C1C1E", muted:"#48484A", dim:"#8A8A8E",
    accent:"#0066CC", accentL:"#004999", accentBg:"rgba(0,102,204,0.12)",
    green:"#248A3D", greenBg:"rgba(36,138,61,0.12)",
    red:"#D70015", redBg:"rgba(215,0,21,0.12)",
    orange:"#C93400", orangeBg:"rgba(201,52,0,0.12)",
    blue:"#0066CC", blueBg:"rgba(0,102,204,0.12)",
    yellow:"#A05A00", yellowBg:"rgba(160,90,0,0.12)",
    shadow:"0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)",
  },
};

const fmt = (n) => {
  if (n === undefined || n === null || isNaN(n)) return "$0";
  const a = Math.abs(n);
  if (a >= 1e6) return (n < 0 ? "-" : "") + "$" + (a / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return (n < 0 ? "-" : "") + "$" + (a / 1e3).toFixed(0) + "K";
  return "$" + Number(n).toLocaleString("es-AR");
};

const fmtDate = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" }) : "—";
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

// ─── Data Context ───
const DataCtx = createContext({});
const useData = () => useContext(DataCtx);

function DataProvider({ children, userId }) {
  const [companyId, setCompanyId] = useState(null);
  const [sedes, setSedes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    // Get company_id from user_profiles
    let cId = companyId;
    if (!cId) {
      const { data: profile } = await supabase.from("user_profiles").select("company_id").eq("id", userId).single();
      cId = profile?.company_id || null;
      setCompanyId(cId);
    }
    if (!cId) { setLoading(false); return; }

    const [se, pr, ta, doc, tx, notif, rep] = await Promise.all([
      supabase.from("sedes").select("*").eq("user_id", userId).order("name"),
      supabase.from("projects").select("*, sede:sedes(name, color, icon)").eq("company_id", cId).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*, project:projects(name, sede_id), sede:sedes(name)").eq("company_id", cId).order("due_date"),
      supabase.from("documents").select("*").eq("company_id", cId).order("created_at", { ascending: false }).limit(100),
      supabase.from("transactions").select("*, contact:clients(name), project:projects(name)").eq("company_id", cId).order("date", { ascending: false }).limit(100),
      supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("ai_reports").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    ]);
    setSedes(se.data || []);
    setProjects((pr.data || []).map(p => ({
      ...p, progress: p.progress || 0, cost: Number(p.cost || 0), cost_spent: Number(p.cost_spent || 0),
      budget: Number(p.budget || 0),
    })));
    setTasks((ta.data || []).map(t => ({
      id: t.id, title: t.title, st: t.status, pri: t.priority, due: t.due_date,
      who: t.assignee, project: t.project?.name || "—", project_id: t.project_id,
      sede_id: t.sede_id, sede: t.sede?.name, tags: t.tags || [], raw: t,
    })));
    setDocuments((doc.data || []).map(d => ({
      id: d.id, name: d.name, type: d.type, status: d.status, date: d.created_at?.split("T")[0],
      file_url: d.file_url, project_id: d.project_id, sede_id: d.sede_id, raw: d,
    })));
    setTransactions((tx.data || []).map(t => ({
      id: t.id, desc: t.description, amount: Number(t.amount || 0), status: t.status,
      date: t.date, contact: t.contact?.name || "—", project: t.project?.name || "—",
      project_id: t.project_id, raw: t,
    })));
    setNotifications(notif.data || []);
    setReports(rep.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  return (
    <DataCtx.Provider value={{ sedes, projects, tasks, documents, transactions, notifications, reports, loading, reload: load, userId, companyId }}>
      {children}
    </DataCtx.Provider>
  );
}

// ─── UI Primitives ───
function Crd({ children, t, style: s, onClick }) {
  return <div onClick={onClick} style={{ background: t.card, borderRadius: 12, border: "1px solid " + t.border, ...s }}>{children}</div>;
}

function Badge({ label, color, bg }) {
  return <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: bg, color }}>{label}</span>;
}

function StatusBadge({ s, t }) {
  const m = {
    todo: { l: "Pendiente", c: t.orange, b: t.orangeBg },
    in_progress: { l: "En curso", c: t.blue, b: t.blueBg },
    done: { l: "Listo", c: t.green, b: t.greenBg },
    active: { l: "Activo", c: t.green, b: t.greenBg },
    planning: { l: "Planificación", c: t.muted, b: t.hover },
    completed: { l: "Completado", c: t.green, b: t.greenBg },
    cancelled: { l: "Cancelado", c: t.red, b: t.redBg },
    planned: { l: "Planificado", c: t.muted, b: t.hover },
    pending: { l: "Pendiente", c: t.orange, b: t.orangeBg },
    paid: { l: "Pagado", c: t.green, b: t.greenBg },
    partial: { l: "Parcial", c: t.orange, b: t.orangeBg },
    overdue: { l: "Vencido", c: t.red, b: t.redBg },
  };
  const v = m[s] || { l: s || "—", c: t.dim, b: t.hover };
  return <Badge label={v.l} color={v.c} bg={v.b} />;
}

function PBar({ v, h = 5, color, t, bg }) {
  return (
    <div style={{ height: h, borderRadius: h, background: bg || t.hover, overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: h, background: color || t.accent, width: Math.min(v, 100) + "%", transition: "width 0.4s" }} />
    </div>
  );
}

function Inp({ label, val, onChange, t, placeholder, type = "text", style }) {
  return (
    <div style={{ marginBottom: 12, ...style }}>
      {label && <div style={{ fontSize: 11, fontWeight: 600, color: t.muted, marginBottom: 4 }}>{label}</div>}
      <input value={val} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid " + t.border, background: t.hover, color: t.text, fontSize: 13, outline: "none" }} />
    </div>
  );
}

function Select({ label, val, onChange, options, t, style }) {
  return (
    <div style={{ marginBottom: 12, ...style }}>
      {label && <div style={{ fontSize: 11, fontWeight: 600, color: t.muted, marginBottom: 4 }}>{label}</div>}
      <select value={val} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid " + t.border, background: t.hover, color: t.text, fontSize: 13, outline: "none" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Modal({ open, onClose, title, children, t, width = 500 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 14, padding: 24, width, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: t.text }}>{title}</span>
          <X size={18} color={t.muted} style={{ cursor: "pointer" }} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub, t, action, onAction }) {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <Icon size={32} color={t.dim} style={{ marginBottom: 10 }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: t.muted, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: t.dim, marginBottom: action ? 16 : 0 }}>{sub}</div>
      {action && <button onClick={onAction} style={{ padding: "8px 16px", borderRadius: 8, background: t.accent, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Plus size={14} /> {action}</button>}
    </div>
  );
}

// ─── Sidebar ───
function Sidebar({ active, onNav, collapsed, toggle, t }) {
  const { sedes, notifications } = useData();
  const unread = notifications.filter(n => !n.read).length;
  const [sedesOpen, setSedesOpen] = useState(true);

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "_sedes", icon: Building2, label: "Sedes", expandable: true },
    { id: "projects", icon: FolderKanban, label: "Proyectos" },
    { id: "tasks", icon: CheckSquare, label: "Tareas" },
    { id: "budget", icon: Wallet, label: "Presupuestos" },
    { id: "documents", icon: FileText, label: "Documentos" },
    { id: "reports", icon: Sparkles, label: "Informes IA" },
    { id: "calendar", icon: Calendar, label: "Calendario" },
  ];

  const NavItem = ({ id, icon: Icon, label, indent, count, color }) => (
    <div onClick={() => onNav(id)} style={{
      display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "10px 12px" : "8px 14px",
      marginLeft: indent ? 12 : 0, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: active === id ? 600 : 400,
      color: active === id ? t.accent : t.muted, background: active === id ? t.accentBg : "transparent",
      transition: "all 0.15s",
    }}>
      {color && <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />}
      {!color && <Icon size={16} />}
      {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
      {count > 0 && !collapsed && <span style={{ fontSize: 10, fontWeight: 700, color: t.red, background: t.redBg, padding: "1px 6px", borderRadius: 8 }}>{count}</span>}
    </div>
  );

  return (
    <div style={{ width: collapsed ? 56 : 220, background: t.sidebar, borderRight: "1px solid " + t.border, display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 0.2s", overflow: "hidden" }}>
      {/* Logo */}
      <div onClick={toggle} style={{ padding: collapsed ? "16px 12px" : "16px 18px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderBottom: "1px solid " + t.border }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: t.text, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Zap size={14} color={t.bg} />
        </div>
        {!collapsed && <span style={{ fontSize: 15, fontWeight: 800, color: t.text, letterSpacing: "-0.3px" }}>LuchoNeitor</span>}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: "8px 6px", overflowY: "auto" }}>
        {navItems.map(item => {
          if (item.id === "_sedes") {
            return (
              <div key="sedes">
                <div onClick={() => setSedesOpen(!sedesOpen)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderRadius: 8, cursor: "pointer", color: t.muted, fontSize: 13 }}>
                  <Building2 size={16} />
                  {!collapsed && <>
                    <span style={{ flex: 1 }}>Sedes</span>
                    <ChevronDown size={14} style={{ transform: sedesOpen ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.15s" }} />
                  </>}
                </div>
                {sedesOpen && !collapsed && sedes.map(s => (
                  <NavItem key={s.id} id={"sede:" + s.id} icon={MapPin} label={s.name} indent color={s.color} />
                ))}
                {sedesOpen && !collapsed && (
                  <div onClick={() => onNav("settings")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", marginLeft: 12, fontSize: 11, color: t.dim, cursor: "pointer" }}>
                    <Plus size={12} /> Agregar sede
                  </div>
                )}
              </div>
            );
          }
          return <NavItem key={item.id} {...item} />;
        })}
      </div>

      {/* Bottom */}
      <div style={{ padding: "8px 6px", borderTop: "1px solid " + t.border }}>
        <NavItem id="settings" icon={Settings} label="Configuración" />
      </div>
    </div>
  );
}

// ─── TopBar ───
function TopBar({ title, sub, theme, toggleTheme, t, onLogout }) {
  const { notifications, reload } = useData();
  const unread = notifications.filter(n => !n.read).length;
  const [showNotif, setShowNotif] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: t.topbar, borderBottom: "1px solid " + t.border, flexShrink: 0 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: t.muted }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div onClick={() => setShowSearch(true)} style={{ width: 32, height: 32, borderRadius: 8, background: t.hover, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Search size={15} color={t.muted} />
        </div>
        <div style={{ position: "relative" }}>
          <div onClick={() => setShowNotif(!showNotif)} style={{ width: 32, height: 32, borderRadius: 8, background: t.hover, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Bell size={15} color={t.muted} />
            {unread > 0 && <div style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: t.red }} />}
          </div>
          {showNotif && (
            <div style={{ position: "absolute", top: 40, right: 0, width: 320, background: t.card, border: "1px solid " + t.border, borderRadius: 12, padding: 8, zIndex: 100, boxShadow: t.shadow }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, padding: "8px 10px" }}>Notificaciones</div>
              {notifications.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: t.dim }}>Sin notificaciones</div>
              ) : notifications.slice(0, 8).map(n => (
                <div key={n.id} style={{ padding: "8px 10px", borderRadius: 6, background: n.read ? "transparent" : t.accentBg, marginBottom: 2 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{n.title}</div>
                  <div style={{ fontSize: 10, color: t.dim }}>{n.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div onClick={toggleTheme} style={{ width: 32, height: 32, borderRadius: 8, background: t.hover, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {theme === "dark" ? <Sun size={15} color={t.muted} /> : <Moon size={15} color={t.muted} />}
        </div>
        <div onClick={onLogout} style={{ width: 32, height: 32, borderRadius: 8, background: t.hover, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Cerrar sesión">
          <LogOut size={15} color={t.muted} />
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ───
function Dashboard({ t, onNav }) {
  const { sedes, projects, tasks, transactions } = useData();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const today = now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  const overdueTasks = tasks.filter(tk => tk.due && tk.st !== "done" && new Date(tk.due) < new Date(todayStr));
  const pendingTasks = tasks.filter(tk => tk.st !== "done");
  const doneTasks = tasks.filter(tk => tk.st === "done");
  const activeProjects = projects.filter(p => p.status === "in_progress" || p.status === "active");

  const dueSoon = tasks.filter(tk => {
    if (!tk.due || tk.st === "done") return false;
    const diff = (new Date(tk.due) - now) / (1000*60*60*24);
    return diff >= 0 && diff <= 7;
  }).sort((a, b) => new Date(a.due) - new Date(b.due));

  return (
    <div style={{ padding: 28, overflowY: "auto", height: "calc(100vh - 52px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: t.text, letterSpacing: "-0.5px" }}>Dashboard</div>
          <div style={{ fontSize: 12, color: t.muted, marginTop: 2, textTransform: "capitalize" }}>{today}</div>
        </div>
        {overdueTasks.length > 0 && (
          <div onClick={() => onNav("tasks")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, background: t.redBg, cursor: "pointer" }}>
            <AlertCircle size={13} color={t.red} />
            <span style={{ fontSize: 12, fontWeight: 600, color: t.red }}>{overdueTasks.length} vencida{overdueTasks.length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Proyectos activos", val: activeProjects.length, icon: FolderKanban, color: t.accent, nav: "projects" },
          { label: "Tareas pendientes", val: pendingTasks.length, sub: doneTasks.length + " completadas", icon: CheckSquare, color: t.orange, nav: "tasks" },
          { label: "Tareas vencidas", val: overdueTasks.length, sub: overdueTasks.length > 0 ? "Requieren atención" : "Todo al día", icon: AlertCircle, color: t.red, nav: "tasks" },
          { label: "Sedes activas", val: sedes.length, sub: projects.length + " proyectos totales", icon: Building2, color: t.green, nav: "settings" },
        ].map((k, i) => (
          <Crd key={i} t={t} style={{ padding: 18, cursor: "pointer" }} onClick={() => onNav(k.nav)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: t.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.label}</span>
              <k.icon size={14} color={k.color} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: t.text, letterSpacing: "-0.5px" }}>{k.val}</div>
            {k.sub && <div style={{ fontSize: 10, color: t.dim, marginTop: 2 }}>{k.sub}</div>}
          </Crd>
        ))}
      </div>

      {/* Sedes Grid */}
      <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 12 }}>Sedes</div>
      {sedes.length === 0 ? (
        <Crd t={t} style={{ padding: 20 }}>
          <EmptyState icon={Building2} title="Sin sedes" sub="Agregá tu primera sede desde Configuración" t={t} action="Agregar sede" onAction={() => onNav("settings")} />
        </Crd>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: sedes.length >= 3 ? "repeat(3,1fr)" : "repeat(" + Math.max(sedes.length, 1) + ",1fr)", gap: 14, marginBottom: 24 }}>
          {sedes.map(s => {
            const sedeProjects = projects.filter(p => p.sede_id === s.id);
            const sedeTasks = tasks.filter(tk => tk.sede_id === s.id || sedeProjects.some(p => p.id === tk.project_id));
            const sedeOverdue = sedeTasks.filter(tk => tk.due && tk.st !== "done" && new Date(tk.due) < new Date(todayStr));
            const sedePending = sedeTasks.filter(tk => tk.st !== "done");
            const budget = Number(s.budget || 0);
            const spent = sedeProjects.reduce((sum, p) => sum + (p.cost_spent || 0), 0);
            return (
              <Crd key={s.id} t={t} style={{ padding: 22, cursor: "pointer", borderLeft: "4px solid " + (s.color || t.accent), transition: "transform 0.1s" }} onClick={() => onNav("sede:" + s.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 24 }}>{s.icon || "🏢"}</span>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: t.text }}>{s.name}</div>
                    {s.address && <div style={{ fontSize: 11, color: t.dim }}>{s.address}</div>}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: t.dim, marginBottom: 2 }}>Proyectos</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: t.text }}>{sedeProjects.length}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: t.dim, marginBottom: 2 }}>Tareas pend.</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: sedePending.length > 0 ? t.orange : t.text }}>{sedePending.length}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: t.dim, marginBottom: 2 }}>Vencidas</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: sedeOverdue.length > 0 ? t.red : t.green }}>{sedeOverdue.length}</div>
                  </div>
                </div>
                {budget > 0 && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: t.muted, marginBottom: 4 }}>
                      <span>Presupuesto</span><span>{fmt(spent)} / {fmt(budget)}</span>
                    </div>
                    <PBar v={pct(spent, budget)} t={t} color={pct(spent, budget) > 90 ? t.red : pct(spent, budget) > 70 ? t.orange : t.accent} h={5} />
                  </div>
                )}
                {sedeProjects.length > 0 && (
                  <div style={{ marginTop: 10, borderTop: "1px solid " + t.border, paddingTop: 8 }}>
                    {sedeProjects.slice(0, 3).map(p => (
                      <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, padding: "3px 0" }}>
                        <span style={{ color: t.text }}>{p.name}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <StatusBadge s={p.status} t={t} />
                          <span style={{ fontSize: 10, fontWeight: 600, color: t.accent }}>{p.progress}%</span>
                        </div>
                      </div>
                    ))}
                    {sedeProjects.length > 3 && <div style={{ fontSize: 10, color: t.dim, marginTop: 2 }}>+{sedeProjects.length - 3} más</div>}
                  </div>
                )}
              </Crd>
            );
          })}
        </div>
      )}

      {/* Tasks + Projects */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 14 }}>
        <Crd t={t} style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Próximas tareas</span>
            <span onClick={() => onNav("tasks")} style={{ fontSize: 11, color: t.accent, cursor: "pointer", fontWeight: 600 }}>Ver todas →</span>
          </div>
          {[...overdueTasks, ...dueSoon].length === 0 ? (
            <div style={{ padding: 16, textAlign: "center" }}>
              <CheckCircle2 size={22} color={t.green} style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: t.green }}>Todo al día</div>
            </div>
          ) : [...overdueTasks, ...dueSoon].slice(0, 8).map(tk => {
            const isOverdue = tk.due && new Date(tk.due) < new Date(todayStr);
            return (
              <div key={tk.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, marginBottom: 2, borderLeft: "3px solid " + (isOverdue ? t.red : t.accent + "40"), background: isOverdue ? t.redBg : "transparent" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{tk.title}</div>
                  <div style={{ fontSize: 10, color: t.dim }}>{tk.project}{tk.sede ? " · " + tk.sede : ""}</div>
                </div>
                {tk.due && <span style={{ fontSize: 10, fontWeight: 600, color: isOverdue ? t.red : t.dim }}>{isOverdue ? "Vencida" : fmtDate(tk.due)}</span>}
              </div>
            );
          })}
        </Crd>

        <Crd t={t} style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Proyectos activos</span>
            <span onClick={() => onNav("projects")} style={{ fontSize: 11, color: t.accent, cursor: "pointer", fontWeight: 600 }}>→</span>
          </div>
          {activeProjects.length === 0 ? (
            <div style={{ fontSize: 11, color: t.dim, textAlign: "center", padding: 10 }}>Sin proyectos activos</div>
          ) : activeProjects.slice(0, 6).map(p => (
            <div key={p.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{p.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: t.accent }}>{p.progress}%</span>
              </div>
              <PBar v={p.progress} t={t} />
              <div style={{ fontSize: 9, color: t.dim, marginTop: 2 }}>{p.sede?.name || "—"}{p.deadline ? " · " + fmtDate(p.deadline) : ""}</div>
            </div>
          ))}
        </Crd>
      </div>
    </div>
  );
}

// ─── SEDE DETAIL (Dashboard-style workspace) ───
function SedeDetail({ sedeId, t, onNav }) {
  const { sedes, projects, tasks, documents, reload, userId, companyId } = useData();
  const sede = sedes.find(s => s.id === sedeId);
  const [showForm, setShowForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(null);
  const [form, setForm] = useState({ name: "", type: "general", deadline: "", cost: "", description: "" });
  const [taskForm, setTaskForm] = useState({ title: "", priority: "medium", due_date: "" });
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [editingTaskNote, setEditingTaskNote] = useState(null);
  const [taskNoteText, setTaskNoteText] = useState("");
  const fileRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);

  if (!sede) return <div style={{ padding: 40, textAlign: "center", color: t.dim }}>Sede no encontrada</div>;

  const sedeProjects = projects.filter(p => p.sede_id === sedeId);
  const allSedeTasks = tasks.filter(tk => sedeProjects.some(p => p.id === tk.project_id) || tk.sede_id === sedeId);
  const budget = Number(sede.budget || 0);
  const spent = sedeProjects.reduce((s, p) => s + (p.cost_spent || 0), 0);
  const todayStr = new Date().toISOString().split("T")[0];
  const overdueTasks = allSedeTasks.filter(tk => tk.due && tk.st !== "done" && new Date(tk.due) < new Date(todayStr));
  const pendingTasks = allSedeTasks.filter(tk => tk.st !== "done");
  const doneTasks = allSedeTasks.filter(tk => tk.st === "done");
  const activeProjects = sedeProjects.filter(p => p.status === "in_progress");
  const avgProgress = sedeProjects.length > 0 ? Math.round(sedeProjects.reduce((s, p) => s + (p.progress || 0), 0) / sedeProjects.length) : 0;

  // CRUD functions
  const saveProject = async () => {
    const { error } = await supabase.from("projects").insert({
      company_id: companyId, sede_id: sedeId, name: form.name, type: form.type,
      deadline: form.deadline || null, cost: Number(form.cost) || 0, description: form.description || null,
      status: "planning", progress: 0,
    });
    if (error) { alert("Error: " + error.message); return; }
    setShowForm(false);
    setForm({ name: "", type: "general", deadline: "", cost: "", description: "" });
    reload();
  };

  const quickStatus = async (id, status) => {
    await supabase.from("projects").update({ status }).eq("id", id);
    reload();
  };

  const quickProgress = async (id, val) => {
    await supabase.from("projects").update({ progress: Number(val) }).eq("id", id);
    reload();
  };

  const saveProjectNote = async (id) => {
    await supabase.from("projects").update({ description: noteText }).eq("id", id);
    setEditingNote(null);
    reload();
  };

  const saveTaskNote = async (id) => {
    await supabase.from("tasks").update({ notes: taskNoteText }).eq("id", id);
    setEditingTaskNote(null);
    reload();
  };

  const deleteProject = async (id) => {
    if (!window.confirm("¿Eliminar este proyecto?")) return;
    await supabase.from("transactions").update({ project_id: null }).eq("project_id", id);
    await supabase.from("tasks").update({ project_id: null }).eq("project_id", id);
    await supabase.from("documents").update({ project_id: null }).eq("project_id", id);
    await supabase.from("projects").delete().eq("id", id);
    reload();
  };

  const addTask = async (projectId) => {
    if (!taskForm.title) return;
    await supabase.from("tasks").insert({
      company_id: companyId, title: taskForm.title, project_id: projectId,
      sede_id: sedeId, priority: taskForm.priority, due_date: taskForm.due_date || null, status: "todo",
    });
    setShowTaskForm(null);
    setTaskForm({ title: "", priority: "medium", due_date: "" });
    reload();
  };

  const toggleTask = async (id, st) => {
    const next = st === "todo" ? "in_progress" : st === "in_progress" ? "done" : "todo";
    await supabase.from("tasks").update({ status: next }).eq("id", id);
    reload();
  };

  const deleteTask = async (id) => {
    await supabase.from("tasks").delete().eq("id", id);
    reload();
  };

  const uploadDoc = async (files, projectId) => {
    for (const file of Array.from(files)) {
      const path = Date.now() + "_" + Math.random().toString(36).slice(2) + "_" + file.name;
      const { error } = await supabase.storage.from("documents").upload(path, file);
      if (error) continue;
      const { data } = supabase.storage.from("documents").getPublicUrl(path);
      await supabase.from("documents").insert({
        company_id: companyId, name: file.name, type: "other", file_url: data?.publicUrl,
        status: "pending", source: "web", project_id: projectId, sede_id: sedeId,
        size: file.size > 1048576 ? (file.size / 1048576).toFixed(1) + " MB" : Math.round(file.size / 1024) + " KB",
      });
    }
    reload();
  };

  const deleteDoc = async (id) => { await supabase.from("documents").delete().eq("id", id); reload(); };

  const priColor = { high: t.red, medium: t.orange, low: t.green };
  const priLabel = { high: "Alta", medium: "Media", low: "Baja" };

  return (
    <div style={{ padding: 28, overflowY: "auto", height: "calc(100vh - 52px)" }}>
      <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => { if (uploadTarget) uploadDoc(e.target.files, uploadTarget); e.target.value = ""; }} />

      {/* Breadcrumb */}
      <div onClick={() => onNav("dashboard")} style={{ fontSize: 13, color: t.accent, cursor: "pointer", marginBottom: 12, fontWeight: 600 }}>← Dashboard</div>

      {/* Sede Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: (sede.color || t.accent) + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{sede.icon || "🏢"}</div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: t.text, letterSpacing: "-0.5px" }}>{sede.name}</div>
            <div style={{ fontSize: 14, color: t.muted }}>{sede.address || ""} · {sedeProjects.length} proyectos</div>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12, background: t.accent, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}><Plus size={16} /> Nuevo proyecto</button>
      </div>

      {/* Dashboard KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Proyectos", val: sedeProjects.length, sub: activeProjects.length + " activos", color: t.accent, icon: FolderKanban },
          { label: "Tareas pend.", val: pendingTasks.length, sub: doneTasks.length + " completadas", color: t.orange, icon: CheckSquare },
          { label: "Vencidas", val: overdueTasks.length, sub: overdueTasks.length > 0 ? "Requieren atención" : "Todo al día", color: overdueTasks.length > 0 ? t.red : t.green, icon: AlertCircle },
          { label: "Avance prom.", val: avgProgress + "%", sub: "Promedio proyectos", color: t.accent, icon: Target },
          { label: "Presupuesto", val: budget > 0 ? pct(spent, budget) + "%" : "—", sub: budget > 0 ? fmt(spent) + " / " + fmt(budget) : "Sin asignar", color: budget > 0 && pct(spent, budget) > 90 ? t.red : t.green, icon: Wallet },
        ].map((k, i) => (
          <Crd key={i} t={t} style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: t.dim, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.label}</span>
              <k.icon size={14} color={k.color} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>{k.val}</div>
            <div style={{ fontSize: 10, color: t.dim, marginTop: 1 }}>{k.sub}</div>
          </Crd>
        ))}
      </div>

      {budget > 0 && (
        <Crd t={t} style={{ padding: 14, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.muted }}>Presupuesto sede</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{fmt(spent)} / {fmt(budget)}</span>
          </div>
          <PBar v={pct(spent, budget)} t={t} h={7} color={pct(spent, budget) > 90 ? t.red : pct(spent, budget) > 70 ? t.orange : t.accent} />
        </Crd>
      )}

      {/* Projects — each one is a full workspace card */}
      {sedeProjects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Sin proyectos en esta sede" sub="Creá tu primer proyecto para empezar" t={t} action="Nuevo proyecto" onAction={() => setShowForm(true)} />
      ) : sedeProjects.map(p => {
        const pTasks = tasks.filter(tk => tk.project_id === p.id);
        const pDocs = documents.filter(d => d.project_id === p.id);
        const pending = pTasks.filter(tk => tk.st !== "done");
        const done = pTasks.filter(tk => tk.st === "done");
        const donePct = pTasks.length > 0 ? pct(done.length, pTasks.length) : p.progress;
        const daysLeft = p.deadline ? Math.ceil((new Date(p.deadline) - new Date()) / (1000*60*60*24)) : null;
        const typeEmoji = { obra: "🏗️", mejora: "🔧", academico: "📚", mri: "🏥", general: "📋" };

        return (
          <Crd key={p.id} t={t} style={{ marginBottom: 16, overflow: "hidden", borderLeft: "4px solid " + (p.status === "completed" ? t.green : p.status === "in_progress" ? t.accent : t.dim) }}>
            {/* Project header with status and progress */}
            <div style={{ padding: "20px 24px", background: t.hover + "60" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 26 }}>{typeEmoji[p.type] || "📋"}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: t.muted }}>{p.type}{p.deadline ? " · Deadline: " + fmtDate(p.deadline) : ""}{daysLeft !== null ? (daysLeft < 0 ? " · ⚠️ Vencido" : " · " + daysLeft + " días") : ""}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <StatusBadge s={p.status} t={t} />
                  {p.status !== "in_progress" && p.status !== "completed" && <div onClick={() => quickStatus(p.id, "in_progress")} style={{ padding: "7px 16px", borderRadius: 8, background: t.blueBg, color: t.blue, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>▶ Iniciar</div>}
                  {p.status === "in_progress" && <div onClick={() => quickStatus(p.id, "completed")} style={{ padding: "7px 16px", borderRadius: 8, background: t.greenBg, color: t.green, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✓ Completar</div>}
                  <div onClick={() => deleteProject(p.id)} style={{ padding: "7px 12px", borderRadius: 8, background: t.redBg, color: t.red, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🗑️</div>
                </div>
              </div>

              {/* Progress */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: t.muted, flexShrink: 0 }}>Avance</span>
                <input type="range" min="0" max="100" value={p.progress || 0} onChange={e => quickProgress(p.id, e.target.value)} style={{ flex: 1, accentColor: t.accent, height: 6 }} />
                <span style={{ fontSize: 16, fontWeight: 800, color: donePct >= 100 ? t.green : t.accent, minWidth: 48, textAlign: "right" }}>{p.progress || 0}%</span>
              </div>

              {/* Mini stats */}
              <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: 12, color: t.muted }}>
                <span>{pending.length} tareas pendientes</span>
                <span>{done.length} completadas</span>
                <span>{pDocs.length} documentos</span>
                {p.cost > 0 && <span>Costo: {fmt(p.cost_spent)} / {fmt(p.cost)}</span>}
              </div>
            </div>

            {/* Project content area */}
            <div style={{ padding: "16px 24px" }}>
              {/* NOTES section */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.dim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>📝 Notas</div>
                {editingNote === p.id ? (
                  <div>
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)} autoFocus placeholder="Escribí notas, observaciones, ideas..."
                      style={{ width: "100%", minHeight: 80, padding: 12, borderRadius: 10, border: "1px solid " + t.accent, background: t.hover, color: t.text, fontSize: 13, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit" }} />
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button onClick={() => saveProjectNote(p.id)} style={{ padding: "6px 16px", borderRadius: 8, background: t.accent, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Guardar</button>
                      <button onClick={() => setEditingNote(null)} style={{ padding: "6px 16px", borderRadius: 8, background: t.hover, color: t.muted, border: "1px solid " + t.border, fontSize: 12, cursor: "pointer" }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => { setEditingNote(p.id); setNoteText(p.description || ""); }} style={{ padding: 12, borderRadius: 10, background: t.hover, minHeight: 44, cursor: "text", fontSize: 13, color: p.description ? t.text : t.dim, lineHeight: 1.5, whiteSpace: "pre-wrap", border: "1px solid transparent" }}>
                    {p.description || "Click para agregar notas..."}
                  </div>
                )}
              </div>

              {/* TASKS section */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: t.dim, textTransform: "uppercase", letterSpacing: "0.5px" }}>✅ Tareas ({pTasks.length})</span>
                  <div onClick={() => setShowTaskForm(showTaskForm === p.id ? null : p.id)} style={{ padding: "5px 12px", borderRadius: 6, background: t.accentBg, color: t.accent, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Agregar</div>
                </div>

                {/* Quick add task */}
                {showTaskForm === p.id && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, padding: "10px 12px", borderRadius: 10, background: t.hover, border: "1px solid " + t.accent + "30" }}>
                    <input value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder="Nueva tarea..." autoFocus
                      style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid " + t.border, background: t.card, color: t.text, fontSize: 13, outline: "none" }}
                      onKeyDown={e => { if (e.key === "Enter" && taskForm.title) addTask(p.id); }} />
                    <input type="date" value={taskForm.due_date} onChange={e => setTaskForm({...taskForm, due_date: e.target.value})} style={{ padding: "8px", borderRadius: 8, border: "1px solid " + t.border, background: t.card, color: t.text, fontSize: 12 }} />
                    <select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value})} style={{ padding: "8px", borderRadius: 8, border: "1px solid " + t.border, background: t.card, color: t.text, fontSize: 12 }}>
                      <option value="high">🔴 Alta</option><option value="medium">🟡 Media</option><option value="low">🟢 Baja</option>
                    </select>
                    <button onClick={() => addTask(p.id)} disabled={!taskForm.title} style={{ padding: "8px 18px", borderRadius: 8, background: t.accent, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: taskForm.title ? 1 : 0.5 }}>Crear</button>
                  </div>
                )}

                {/* Task list */}
                {pTasks.map(tk => {
                  const isOverdue = tk.due && tk.st !== "done" && new Date(tk.due) < new Date(todayStr);
                  return (
                    <div key={tk.id} style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: isOverdue ? t.redBg : t.hover, borderLeft: "3px solid " + (tk.st === "done" ? t.green : isOverdue ? t.red : priColor[tk.pri] || t.accent) }}>
                        <div onClick={() => toggleTask(tk.id, tk.st)} style={{ cursor: "pointer", padding: 2 }}>
                          {tk.st === "done" ? <CheckCircle2 size={20} color={t.green} /> : <Circle size={20} color={t.dim} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 14, color: t.text, fontWeight: 500, textDecoration: tk.st === "done" ? "line-through" : "none" }}>{tk.title}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: (priColor[tk.pri] || t.accent) + "15", color: priColor[tk.pri] || t.accent }}>{priLabel[tk.pri]}</span>
                        {tk.due && <span style={{ fontSize: 11, fontWeight: 500, color: isOverdue ? t.red : t.dim }}>{fmtDate(tk.due)}</span>}
                        <div onClick={() => { if (editingTaskNote === tk.id) { setEditingTaskNote(null); } else { setEditingTaskNote(tk.id); setTaskNoteText(tk.raw?.notes || ""); } }} style={{ padding: "3px 8px", borderRadius: 6, background: tk.raw?.notes ? t.yellowBg : t.hover, color: tk.raw?.notes ? t.yellow : t.dim, cursor: "pointer", fontSize: 11, fontWeight: 500 }}>📝</div>
                        <div onClick={() => deleteTask(tk.id)} style={{ padding: "3px 8px", borderRadius: 6, background: t.redBg, color: t.red, cursor: "pointer" }}><Trash2 size={14} /></div>
                      </div>
                      {/* Task note inline */}
                      {editingTaskNote === tk.id && (
                        <div style={{ marginLeft: 32, marginTop: 4, padding: "8px 12px", borderRadius: 8, background: t.hover, border: "1px solid " + t.border }}>
                          <textarea value={taskNoteText} onChange={e => setTaskNoteText(e.target.value)} placeholder="Nota de la tarea..." autoFocus
                            style={{ width: "100%", minHeight: 50, padding: 8, borderRadius: 6, border: "none", background: "transparent", color: t.text, fontSize: 12, resize: "vertical", outline: "none", fontFamily: "inherit" }} />
                          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                            <button onClick={() => saveTaskNote(tk.id)} style={{ padding: "4px 12px", borderRadius: 6, background: t.accent, color: "#fff", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Guardar</button>
                          </div>
                        </div>
                      )}
                      {!editingTaskNote && tk.raw?.notes && (
                        <div style={{ marginLeft: 42, marginTop: 2, fontSize: 11, color: t.dim, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{tk.raw.notes}</div>
                      )}
                    </div>
                  );
                })}
                {pTasks.length === 0 && <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: t.dim }}>Sin tareas — usá "+ Agregar" para crear una</div>}
              </div>

              {/* DOCUMENTS section */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: t.dim, textTransform: "uppercase", letterSpacing: "0.5px" }}>📎 Documentos ({pDocs.length})</span>
                  <div onClick={() => { setUploadTarget(p.id); fileRef.current?.click(); }} style={{ padding: "5px 12px", borderRadius: 6, background: t.orangeBg, color: t.orange, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Subir</div>
                </div>
                {pDocs.map(d => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: t.hover, marginBottom: 4 }}>
                    <FileText size={16} color={d.name?.endsWith(".pdf") ? t.red : d.name?.endsWith(".xlsx") || d.name?.endsWith(".csv") ? t.green : t.accent} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>{d.name}</div>
                      <div style={{ fontSize: 10, color: t.dim }}>{d.date}{d.raw?.size ? " · " + d.raw.size : ""}</div>
                    </div>
                    {d.file_url && <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: t.accent, textDecoration: "none", padding: "5px 12px", background: t.accentBg, borderRadius: 6, fontWeight: 600 }}>Ver</a>}
                    <div onClick={() => deleteDoc(d.id)} style={{ padding: "5px 8px", borderRadius: 6, background: t.redBg, color: t.red, cursor: "pointer" }}><Trash2 size={14} /></div>
                  </div>
                ))}
                {pDocs.length === 0 && <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: t.dim }}>Sin documentos — usá "+ Subir" para agregar archivos</div>}
              </div>
            </div>
          </Crd>
        );
      })}

      {/* New project modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo proyecto" t={t}>
        <Inp label="Nombre" val={form.name} onChange={v => setForm({...form, name: v})} t={t} placeholder="Ej: Reforma aula 3" />
        <Select label="Tipo" val={form.type} onChange={v => setForm({...form, type: v})} t={t} options={[
          { value: "general", label: "📋 General" }, { value: "obra", label: "🏗️ Obra" }, { value: "mejora", label: "🔧 Mejora" },
          { value: "academico", label: "📚 Académico" }, { value: "mri", label: "🏥 MRI" },
        ]} />
        <Inp label="Deadline" val={form.deadline} onChange={v => setForm({...form, deadline: v})} t={t} type="date" />
        <Inp label="Costo estimado" val={form.cost} onChange={v => setForm({...form, cost: v})} t={t} type="number" placeholder="$0" />
        <Inp label="Descripción" val={form.description} onChange={v => setForm({...form, description: v})} t={t} placeholder="Notas iniciales..." />
        <button onClick={saveProject} disabled={!form.name} style={{ width: "100%", padding: "14px", borderRadius: 12, background: t.accent, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: form.name ? 1 : 0.5 }}>Crear proyecto</button>
      </Modal>
    </div>
  );
}
// ─── PROJECTS PAGE ───
function ProjectsPage({ t, onNav }) {
  const { projects, tasks, sedes, documents, reload, userId, companyId } = useData();
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", type: "general", sede_id: "", deadline: "", cost: "", description: "", status: "planning", progress: "" });

  const filtered = filter === "all" ? projects : projects.filter(p => p.sede_id === filter || p.type === filter || p.status === filter);

  const openEdit = (p) => {
    setForm({ name: p.name, type: p.type || "general", sede_id: p.sede_id || "", deadline: p.deadline || "", cost: String(p.cost || ""), description: p.description || "", status: p.status || "planning", progress: String(p.progress || 0) });
    setEditId(p.id);
    setShowForm(true);
  };

  const saveProject = async () => {
    const data = { name: form.name, type: form.type, sede_id: form.sede_id || null, deadline: form.deadline || null, cost: Number(form.cost) || 0, description: form.description || null, status: form.status, progress: Number(form.progress) || 0 };
    if (editId) {
      const { error } = await supabase.from("projects").update(data).eq("id", editId);
      if (error) { alert("Error: " + error.message); return; }
    } else {
      data.company_id = companyId;
      const { error } = await supabase.from("projects").insert(data);
      if (error) { alert("Error al crear: " + error.message); return; }
    }
    setShowForm(false); setEditId(null);
    setForm({ name: "", type: "general", sede_id: "", deadline: "", cost: "", description: "", status: "planning", progress: "" });
    reload();
  };

  const quickStatus = async (id, status) => { await supabase.from("projects").update({ status }).eq("id", id); reload(); };

  const deleteProject = async (id) => {
    if (!window.confirm("¿Eliminar este proyecto?")) return;
    await supabase.from("transactions").update({ project_id: null }).eq("project_id", id);
    await supabase.from("tasks").update({ project_id: null }).eq("project_id", id);
    await supabase.from("documents").update({ project_id: null }).eq("project_id", id);
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { alert("Error: " + error.message); return; }
    reload();
  };

  const statusColors = { planning: t.dim, in_progress: t.accent, completed: t.green };
  const typeEmoji = { obra: "🏗️", mejora: "🔧", academico: "📚", mri: "🏥", general: "📋" };

  return (
    <div style={{ padding: 28, overflowY: "auto", height: "calc(100vh - 52px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>Proyectos</div>
          <div style={{ fontSize: 13, color: t.muted }}>{projects.length} proyectos · {projects.filter(p => p.status === "in_progress").length} en curso</div>
        </div>
        <button onClick={() => { setEditId(null); setForm({ name: "", type: "general", sede_id: "", deadline: "", cost: "", description: "", status: "planning", progress: "" }); setShowForm(true); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12, background: t.accent, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}><Plus size={16} /> Nuevo proyecto</button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[{ id: "all", label: "Todos" }, ...sedes.map(s => ({ id: s.id, label: s.name })), { id: "obra", label: "🏗️ Obras" }, { id: "mejora", label: "🔧 Mejoras" }].map(f => (
          <div key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", background: filter === f.id ? t.accent : t.card, color: filter === f.id ? "#fff" : t.muted, border: "1px solid " + (filter === f.id ? t.accent : t.border), transition: "all 0.15s" }}>{f.label}</div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Sin proyectos" sub="Creá tu primer proyecto" t={t} action="Crear proyecto" onAction={() => setShowForm(true)} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {filtered.map(p => {
            const pTasks = tasks.filter(tk => tk.project_id === p.id);
            const pDocs = documents.filter(d => d.project_id === p.id);
            const pendingTasks = pTasks.filter(tk => tk.st !== "done");
            const donePct = pTasks.length > 0 ? pct(pTasks.filter(tk => tk.st === "done").length, pTasks.length) : p.progress;
            const daysLeft = p.deadline ? Math.ceil((new Date(p.deadline) - new Date()) / (1000*60*60*24)) : null;

            return (
              <Crd key={p.id} t={t} style={{ padding: 0, overflow: "hidden", borderLeft: "4px solid " + (statusColors[p.status] || t.dim) }}>
                {/* Header */}
                <div style={{ padding: "20px 22px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{typeEmoji[p.type] || "📋"}</span>
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: t.text }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: t.muted, marginTop: 1 }}>{p.sede?.name || "Sin sede"} · {p.type}</div>
                      </div>
                    </div>
                    <StatusBadge s={p.status} t={t} />
                  </div>
                  {p.description && <div style={{ fontSize: 12, color: t.dim, marginTop: 6, lineHeight: 1.4 }}>{p.description}</div>}
                </div>

                {/* Progress */}
                <div style={{ padding: "14px 22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: t.muted }}>Avance</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: donePct >= 100 ? t.green : t.accent }}>{donePct}%</span>
                  </div>
                  <PBar v={donePct} t={t} h={8} color={donePct >= 100 ? t.green : t.accent} />
                </div>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid " + t.border, borderBottom: "1px solid " + t.border }}>
                  <div style={{ padding: "12px 16px", textAlign: "center", borderRight: "1px solid " + t.border }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: pendingTasks.length > 0 ? t.orange : t.green }}>{pendingTasks.length}</div>
                    <div style={{ fontSize: 10, color: t.dim, marginTop: 1 }}>Tareas pend.</div>
                  </div>
                  <div style={{ padding: "12px 16px", textAlign: "center", borderRight: "1px solid " + t.border }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>{pDocs.length}</div>
                    <div style={{ fontSize: 10, color: t.dim, marginTop: 1 }}>Documentos</div>
                  </div>
                  <div style={{ padding: "12px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: daysLeft !== null && daysLeft < 0 ? t.red : daysLeft !== null && daysLeft <= 7 ? t.orange : t.text }}>{daysLeft !== null ? (daysLeft < 0 ? "Vencido" : daysLeft + "d") : "—"}</div>
                    <div style={{ fontSize: 10, color: t.dim, marginTop: 1 }}>Deadline</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: "12px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {p.status !== "in_progress" && p.status !== "completed" && <div onClick={() => quickStatus(p.id, "in_progress")} style={{ padding: "8px 16px", borderRadius: 8, background: t.blueBg, color: t.blue, fontSize: 13, fontWeight: 600, cursor: "pointer", flex: 1, textAlign: "center" }}>▶ Iniciar</div>}
                  {p.status === "in_progress" && <div onClick={() => quickStatus(p.id, "completed")} style={{ padding: "8px 16px", borderRadius: 8, background: t.greenBg, color: t.green, fontSize: 13, fontWeight: 600, cursor: "pointer", flex: 1, textAlign: "center" }}>✓ Completar</div>}
                  <div onClick={() => openEdit(p)} style={{ padding: "8px 16px", borderRadius: 8, background: t.accentBg, color: t.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", flex: 1, textAlign: "center" }}>✏️ Editar</div>
                  <div onClick={() => deleteProject(p.id)} style={{ padding: "8px 14px", borderRadius: 8, background: t.redBg, color: t.red, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🗑️</div>
                </div>
              </Crd>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null); }} title={editId ? "Editar proyecto" : "Nuevo proyecto"} t={t} width={520}>
        <Inp label="Nombre del proyecto" val={form.name} onChange={v => setForm({...form, name: v})} t={t} placeholder="Ej: Reforma aula 3" />
        <Select label="Sede" val={form.sede_id} onChange={v => setForm({...form, sede_id: v})} t={t} options={[{ value: "", label: "Sin sede" }, ...sedes.map(s => ({ value: s.id, label: s.name }))]} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Select label="Tipo" val={form.type} onChange={v => setForm({...form, type: v})} t={t} options={[
            { value: "general", label: "📋 General" }, { value: "obra", label: "🏗️ Obra" }, { value: "mejora", label: "🔧 Mejora" },
            { value: "academico", label: "📚 Académico" }, { value: "mri", label: "🏥 MRI" },
          ]} />
          <Select label="Estado" val={form.status} onChange={v => setForm({...form, status: v})} t={t} options={[
            { value: "planning", label: "Planificación" }, { value: "in_progress", label: "En curso" }, { value: "completed", label: "Completado" },
          ]} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Inp label="Deadline" val={form.deadline} onChange={v => setForm({...form, deadline: v})} t={t} type="date" />
          <Inp label="Costo estimado" val={form.cost} onChange={v => setForm({...form, cost: v})} t={t} type="number" placeholder="$0" />
        </div>
        {editId && <Inp label="Avance (%)" val={form.progress} onChange={v => setForm({...form, progress: v})} t={t} type="number" placeholder="0-100" />}
        <Inp label="Descripción / Notas" val={form.description} onChange={v => setForm({...form, description: v})} t={t} placeholder="Notas, observaciones..." />
        <button onClick={saveProject} disabled={!form.name} style={{ width: "100%", padding: "14px", borderRadius: 12, background: t.accent, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: form.name ? 1 : 0.5, marginTop: 8 }}>{editId ? "Guardar cambios" : "Crear proyecto"}</button>
      </Modal>
    </div>
  );
}

// ─── TASKS PAGE ───
function TasksPage({ t, onNav }) {
  const { tasks, projects, sedes, reload, userId, companyId } = useData();
  const [view, setView] = useState("kanban");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", project_id: "", sede_id: "", priority: "medium", due_date: "" });
  const todayStr = new Date().toISOString().split("T")[0];

  const filtered = filter === "all" ? tasks : tasks.filter(tk => tk.sede_id === filter || tk.project_id === filter);

  const saveTask = async () => {
    const { error } = await supabase.from("tasks").insert({
      company_id: companyId, title: form.title, project_id: form.project_id || null,
      sede_id: form.sede_id || null, priority: form.priority, due_date: form.due_date || null, status: "todo",
    });
    if (error) { alert("Error: " + error.message); return; }
    setShowForm(false);
    setForm({ title: "", project_id: "", sede_id: "", priority: "medium", due_date: "" });
    reload();
  };

  const updateStatus = async (taskId, newStatus) => {
    await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
    reload();
  };

  const deleteTask = async (id) => {
    await supabase.from("tasks").delete().eq("id", id);
    reload();
  };

  const priColors = { high: t.red, medium: t.orange, low: t.green };
  const priLabels = { high: "Alta", medium: "Media", low: "Baja" };
  const columns = [
    { id: "todo", label: "📋 Pendiente", color: t.orange, bg: t.orangeBg },
    { id: "in_progress", label: "⚡ En curso", color: t.blue, bg: t.blueBg },
    { id: "done", label: "✅ Completado", color: t.green, bg: t.greenBg },
  ];

  const TaskCard = ({ tk }) => {
    const isOverdue = tk.due && tk.st !== "done" && new Date(tk.due) < new Date(todayStr);
    const daysLeft = tk.due ? Math.ceil((new Date(tk.due) - new Date()) / (1000*60*60*24)) : null;
    return (
      <Crd t={t} style={{ padding: 16, marginBottom: 8, borderLeft: "4px solid " + (isOverdue ? t.red : priColors[tk.pri] || t.accent) }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 6 }}>{tk.title}</div>
        <div style={{ fontSize: 12, color: t.muted, marginBottom: 10 }}>{tk.project}{tk.sede ? " · " + tk.sede : ""}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: (priColors[tk.pri] || t.accent) + "15", color: priColors[tk.pri] || t.accent }}>{priLabels[tk.pri] || "Media"}</span>
          {tk.due && <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 6, background: isOverdue ? t.redBg : t.hover, color: isOverdue ? t.red : t.dim }}>
            {isOverdue ? "Vencida" : daysLeft === 0 ? "Hoy" : daysLeft === 1 ? "Mañana" : daysLeft + "d"}
          </span>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {tk.st === "todo" && <div onClick={() => updateStatus(tk.id, "in_progress")} style={{ flex: 1, padding: "7px", borderRadius: 8, background: t.blueBg, color: t.blue, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>▶ Iniciar</div>}
          {tk.st === "in_progress" && <div onClick={() => updateStatus(tk.id, "done")} style={{ flex: 1, padding: "7px", borderRadius: 8, background: t.greenBg, color: t.green, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>✓ Completar</div>}
          {tk.st === "done" && <div onClick={() => updateStatus(tk.id, "todo")} style={{ flex: 1, padding: "7px", borderRadius: 8, background: t.hover, color: t.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>↩ Reabrir</div>}
          <div onClick={() => deleteTask(tk.id)} style={{ padding: "7px 12px", borderRadius: 8, background: t.redBg, color: t.red, cursor: "pointer" }}><Trash2 size={14} /></div>
        </div>
      </Crd>
    );
  };

  return (
    <div style={{ padding: 28, overflowY: "auto", height: "calc(100vh - 52px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>Tareas</div>
          <div style={{ fontSize: 13, color: t.muted }}>{tasks.filter(tk => tk.st !== "done").length} pendientes · {tasks.filter(tk => tk.st === "done").length} completadas</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid " + t.border }}>
            {["kanban", "list"].map(v => (
              <div key={v} onClick={() => setView(v)} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: view === v ? t.accent : "transparent", color: view === v ? "#fff" : t.muted }}>{v === "kanban" ? "Kanban" : "Lista"}</div>
            ))}
          </div>
          <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: t.accent, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}><Plus size={16} /> Nueva tarea</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[{ id: "all", label: "Todas" }, ...sedes.map(s => ({ id: s.id, label: s.name }))].map(f => (
          <div key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", background: filter === f.id ? t.accent : t.card, color: filter === f.id ? "#fff" : t.muted, border: "1px solid " + (filter === f.id ? t.accent : t.border) }}>{f.label}</div>
        ))}
      </div>

      {view === "kanban" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, alignItems: "flex-start" }}>
          {columns.map(col => (
            <div key={col.id}>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: col.bg, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: col.color }}>{col.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: col.color, background: col.color + "20", padding: "2px 8px", borderRadius: 6 }}>{filtered.filter(tk => tk.st === col.id).length}</span>
              </div>
              {filtered.filter(tk => tk.st === col.id).length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: t.dim, borderRadius: 10, border: "2px dashed " + t.border }}>Sin tareas</div>
              ) : filtered.filter(tk => tk.st === col.id).map(tk => <TaskCard key={tk.id} tk={tk} />)}
            </div>
          ))}
        </div>
      ) : (
        filtered.length === 0 ? <EmptyState icon={CheckSquare} title="Sin tareas" sub="Creá tu primera tarea" t={t} action="Nueva tarea" onAction={() => setShowForm(true)} /> :
        filtered.map(tk => {
          const isOverdue = tk.due && tk.st !== "done" && new Date(tk.due) < new Date(todayStr);
          return (
            <div key={tk.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, marginBottom: 6, background: t.card, border: "1px solid " + t.border, borderLeft: "4px solid " + (isOverdue ? t.red : tk.st === "done" ? t.green : priColors[tk.pri] || t.accent) }}>
              <div onClick={() => updateStatus(tk.id, tk.st === "done" ? "todo" : tk.st === "todo" ? "in_progress" : "done")} style={{ cursor: "pointer", padding: 4 }}>
                {tk.st === "done" ? <CheckCircle2 size={22} color={t.green} /> : <Circle size={22} color={t.dim} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: t.text, fontWeight: 500, textDecoration: tk.st === "done" ? "line-through" : "none" }}>{tk.title}</div>
                <div style={{ fontSize: 12, color: t.dim, marginTop: 2 }}>{tk.project}{tk.sede ? " · " + tk.sede : ""}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, background: (priColors[tk.pri] || t.accent) + "15", color: priColors[tk.pri] || t.accent }}>{priLabels[tk.pri]}</span>
              <StatusBadge s={tk.st} t={t} />
              {tk.due && <span style={{ fontSize: 12, fontWeight: 500, color: isOverdue ? t.red : t.dim }}>{fmtDate(tk.due)}</span>}
              <div onClick={() => deleteTask(tk.id)} style={{ padding: "6px 10px", borderRadius: 8, background: t.redBg, color: t.red, cursor: "pointer" }}><Trash2 size={16} /></div>
            </div>
          );
        })
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nueva tarea" t={t} width={480}>
        <Inp label="¿Qué hay que hacer?" val={form.title} onChange={v => setForm({...form, title: v})} t={t} placeholder="Describí la tarea..." />
        <Select label="Proyecto" val={form.project_id} onChange={v => setForm({...form, project_id: v})} t={t} options={[{ value: "", label: "Sin proyecto" }, ...projects.map(p => ({ value: p.id, label: p.name }))]} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Select label="Sede" val={form.sede_id} onChange={v => setForm({...form, sede_id: v})} t={t} options={[{ value: "", label: "Sin sede" }, ...sedes.map(s => ({ value: s.id, label: s.name }))]} />
          <Select label="Prioridad" val={form.priority} onChange={v => setForm({...form, priority: v})} t={t} options={[{ value: "high", label: "🔴 Alta" }, { value: "medium", label: "🟡 Media" }, { value: "low", label: "🟢 Baja" }]} />
        </div>
        <Inp label="Fecha límite" val={form.due_date} onChange={v => setForm({...form, due_date: v})} t={t} type="date" />
        <button onClick={saveTask} disabled={!form.title} style={{ width: "100%", padding: "14px", borderRadius: 12, background: t.accent, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: form.title ? 1 : 0.5, marginTop: 8 }}>Crear tarea</button>
      </Modal>
    </div>
  );
}
// ─── BUDGET PAGE ───
function BudgetPage({ t }) {
  const { sedes, projects } = useData();
  const totalBudget = sedes.reduce((s, se) => s + Number(se.budget || 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (p.cost_spent || 0), 0);
  const totalAllocated = projects.reduce((s, p) => s + (p.cost || 0), 0);

  return (
    <div style={{ padding: 28, overflowY: "auto", height: "calc(100vh - 52px)" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: t.text, marginBottom: 20 }}>Presupuestos</div>

      {/* Global KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <Crd t={t} style={{ padding: 16 }}><div style={{ fontSize: 10, color: t.dim }}>Budget total sedes</div><div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>{fmt(totalBudget)}</div></Crd>
        <Crd t={t} style={{ padding: 16 }}><div style={{ fontSize: 10, color: t.dim }}>Asignado a proyectos</div><div style={{ fontSize: 22, fontWeight: 800, color: t.blue }}>{fmt(totalAllocated)}</div></Crd>
        <Crd t={t} style={{ padding: 16 }}><div style={{ fontSize: 10, color: t.dim }}>Gastado</div><div style={{ fontSize: 22, fontWeight: 800, color: t.orange }}>{fmt(totalSpent)}</div></Crd>
        <Crd t={t} style={{ padding: 16 }}><div style={{ fontSize: 10, color: t.dim }}>Disponible</div><div style={{ fontSize: 22, fontWeight: 800, color: totalBudget - totalSpent >= 0 ? t.green : t.red }}>{fmt(totalBudget - totalSpent)}</div></Crd>
      </div>

      {/* By sede */}
      <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 12 }}>Por sede</div>
      {sedes.map(s => {
        const sedeProjects = projects.filter(p => p.sede_id === s.id);
        const sedeBudget = Number(s.budget || 0);
        const sedeSpent = sedeProjects.reduce((sum, p) => sum + (p.cost_spent || 0), 0);
        return (
          <Crd key={s.id} t={t} style={{ padding: 18, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color || t.accent }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{s.name}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{sedeBudget > 0 ? pct(sedeSpent, sedeBudget) + "%" : "—"}</span>
            </div>
            {sedeBudget > 0 && <PBar v={pct(sedeSpent, sedeBudget)} t={t} color={pct(sedeSpent, sedeBudget) > 90 ? t.red : pct(sedeSpent, sedeBudget) > 70 ? t.orange : t.accent} h={6} />}
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: t.muted }}>
              <span>Budget: {fmt(sedeBudget)}</span><span>Gastado: {fmt(sedeSpent)}</span><span>Disponible: {fmt(sedeBudget - sedeSpent)}</span>
            </div>
            {sedeProjects.length > 0 && (
              <div style={{ marginTop: 12, borderTop: "1px solid " + t.border, paddingTop: 10 }}>
                {sedeProjects.map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: 12 }}>
                    <span style={{ color: t.text }}>{p.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: t.muted, fontSize: 11 }}>{fmt(p.cost_spent)} / {fmt(p.cost)}</span>
                      <div style={{ width: 60 }}><PBar v={p.cost > 0 ? pct(p.cost_spent, p.cost) : 0} t={t} h={3} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Crd>
        );
      })}

      {/* Unassigned projects */}
      {projects.filter(p => !p.sede_id && p.cost > 0).length > 0 && (
        <Crd t={t} style={{ padding: 18, marginTop: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 10 }}>Proyectos sin sede</div>
          {projects.filter(p => !p.sede_id && p.cost > 0).map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12 }}>
              <span style={{ color: t.text }}>{p.name}</span>
              <span style={{ color: t.muted }}>{fmt(p.cost_spent)} / {fmt(p.cost)}</span>
            </div>
          ))}
        </Crd>
      )}
    </div>
  );
}

// ─── DOCUMENTS PAGE ───
function DocumentsPage({ t }) {
  const { documents, sedes, projects, reload, userId, companyId } = useData();
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState(null);
  const fileRef = useRef(null);

  const filtered = filter === "all" ? documents
    : filter === "unlinked" ? documents.filter(d => !d.project_id && !d.sede_id)
    : documents.filter(d => d.sede_id === filter || d.project_id === filter);

  const handleUpload = async (files) => {
    for (const file of Array.from(files)) {
      const path = Date.now() + "_" + Math.random().toString(36).slice(2) + "_" + file.name;
      const { error } = await supabase.storage.from("documents").upload(path, file);
      if (error) { alert("Error subiendo archivo: " + error.message); continue; }
      const { data } = supabase.storage.from("documents").getPublicUrl(path);
      const fileType = file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv") ? "excel"
        : file.name.endsWith(".pdf") ? "pdf"
        : file.name.endsWith(".doc") || file.name.endsWith(".docx") ? "document"
        : "other";
      const { error: insertError } = await supabase.from("documents").insert({
        company_id: companyId,
        name: file.name,
        type: fileType,
        file_url: data?.publicUrl || null,
        status: "pending",
        source: "web",
        size: file.size > 1048576 ? (file.size / 1048576).toFixed(1) + " MB" : Math.round(file.size / 1024) + " KB",
      });
      if (insertError) alert("Error guardando: " + insertError.message);
    }
    reload();
  };

  const deleteDoc = async (id) => {
    setDeleting(id);
    await supabase.from("documents").delete().eq("id", id);
    reload();
    setDeleting(null);
  };

  return (
    <div style={{ padding: 28, overflowY: "auto", height: "calc(100vh - 52px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: t.text }}>Documentos</div>
          <div style={{ fontSize: 12, color: t.muted }}>{documents.length} archivos</div>
        </div>
        <div>
          <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => { handleUpload(e.target.files); e.target.value = ""; }} />
          <button onClick={() => fileRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: t.accent, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}><Upload size={16} /> Subir archivo</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[{ id: "all", label: "Todos (" + documents.length + ")" }, { id: "unlinked", label: "Sin vincular" }, ...sedes.map(s => ({ id: s.id, label: s.name }))].map(f => (
          <div key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", background: filter === f.id ? t.accent : t.hover, color: filter === f.id ? "#fff" : t.muted, fontWeight: 500 }}>{f.label}</div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="Sin documentos" sub="Subí archivos para organizarlos por proyecto o sede" t={t} action="Subir archivo" onAction={() => fileRef.current?.click()} />
      ) : filtered.map(d => (
        <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, background: t.hover, marginBottom: 6 }}>
          <FileText size={20} color={d.name?.endsWith(".xlsx") || d.name?.endsWith(".csv") ? t.green : d.name?.endsWith(".pdf") ? t.red : t.accent} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>{d.name}</div>
            <div style={{ fontSize: 11, color: t.dim }}>{d.date}{d.raw?.size ? " · " + d.raw.size : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {d.file_url && (
              <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: t.accent, textDecoration: "none", padding: "6px 14px", background: t.accentBg, borderRadius: 8, fontWeight: 600 }}>Ver</a>
            )}
            <button onClick={() => deleteDoc(d.id)} disabled={deleting === d.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: t.redBg, color: t.red, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Trash2 size={14} /> Borrar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── AI REPORTS PAGE ───
function AIReportsPage({ t }) {
  const { reports, sedes, projects, reload, userId } = useData();
  const [generating, setGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [reportType, setReportType] = useState("sede_status");
  const [customPrompt, setCustomPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const fileRef = useRef(null);

  const reportTypes = [
    { value: "sede_status", label: "Estado de sede", icon: Building2, desc: "Resumen ejecutivo: métricas clave, alertas y recomendaciones", prompt: "Analizá estos datos y generá un informe de estado de sede con: 1) Resumen ejecutivo (3 líneas), 2) Métricas principales con números concretos y porcentajes, 3) Alertas o problemas detectados, 4) Recomendaciones. Usá formato claro con secciones." },
    { value: "course_sales", label: "Ventas y cobros", icon: DollarSign, desc: "Total ventas, % cobrado, ranking, deudores", prompt: "Analizá estos datos de ventas/cobros y generá: 1) Total de ingresos y porcentaje cobrado, 2) Ranking de items por facturación, 3) Análisis de tendencia, 4) Lista de deudores con montos, 5) Recomendaciones de cobranza." },
    { value: "occupancy", label: "Ocupación y uso", icon: Users, desc: "Capacidad utilizada, horarios pico, espacios libres", prompt: "Analizá estos datos de ocupación y generá: 1) Porcentaje de capacidad utilizada, 2) Horarios/días pico, 3) Espacios o turnos subutilizados, 4) Proyección y recomendaciones de optimización." },
    { value: "budget_analysis", label: "Análisis de presupuesto", icon: Wallet, desc: "Gastado vs asignado, desvíos, proyección", prompt: "Analizá estos datos presupuestarios y generá: 1) Resumen de ejecución (gastado vs presupuestado con %), 2) Partidas con mayor desvío, 3) Burn rate y proyección, 4) Alertas de sobrepresupuesto, 5) Recomendaciones." },
    { value: "comparison", label: "Comparativa", icon: BarChart3, desc: "Comparar períodos, sedes o categorías", prompt: "Analizá estos datos y generá una comparativa detallada: 1) Tabla comparativa con las métricas principales, 2) Variaciones porcentuales, 3) Tendencias identificadas, 4) Conclusiones y recomendaciones." },
    { value: "custom", label: "Análisis personalizado", icon: Sparkles, desc: "Escribí tus propias instrucciones", prompt: "" },
  ];

  const handleFileSelect = (files) => {
    const file = files[0];
    if (!file) return;
    setSelectedFile(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Try to read as text (CSV)
        const text = e.target.result;
        if (file.name.endsWith(".csv") || file.name.endsWith(".tsv") || file.name.endsWith(".txt")) {
          setFileData(text.substring(0, 15000));
          return;
        }
        // For Excel, read as text preview (first attempt)
        const lines = text.split("\n").slice(0, 200);
        setFileData(lines.join("\n").substring(0, 15000));
      } catch (err) {
        setFileData("Error leyendo archivo: " + err.message);
      }
    };
    if (file.name.endsWith(".csv") || file.name.endsWith(".tsv") || file.name.endsWith(".txt")) {
      reader.readAsText(file);
    } else {
      // For Excel, read as text (lossy but functional)
      reader.readAsText(file);
    }
  };

  const generateReport = async () => {
    if (!fileData) return;
    setGenerating(true);
    const prompt = reportType === "custom" ? customPrompt : reportTypes.find(r => r.value === reportType)?.prompt;
    try {
      // Call via Supabase Edge Function (avoids CORS)
      const { data: fnData, error: fnError } = await supabase.functions.invoke("ai-analyze", {
        body: { fileData, fileName: selectedFile, prompt, reportType },
      });
      
      let text;
      if (fnError) {
        // Fallback: try direct call (won't work in browser due to CORS, but shows intent)
        text = "Error: " + (fnError.message || "No se pudo conectar con la IA") + "\n\nPara que funcione, desplegá la Edge Function 'ai-analyze' en Supabase:\nsupabase functions deploy ai-analyze --no-verify-jwt";
      } else {
        text = fnData?.result || fnData?.text || "No se pudo generar el informe.";
      }
      setResult(text);
      setActiveReport(null);
      // Save to DB
      const fileUrl = null; // Optionally upload file
      await supabase.from("ai_reports").insert({
        user_id: userId, name: selectedFile + " — " + reportTypes.find(r => r.value === reportType)?.label,
        source_file_name: selectedFile, report_type: reportType, prompt_used: prompt, result: text,
      });
      reload();
    } catch (e) {
      setResult("Error: " + e.message + "\n\nAsegurate de desplegar la Edge Function 'ai-analyze'.");
    }
    setGenerating(false);
  };

  const currentResult = activeReport ? activeReport.result : result;

  return (
    <div style={{ padding: 28, overflowY: "auto", height: "calc(100vh - 52px)" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: t.text, marginBottom: 4 }}>Informes IA</div>
      <div style={{ fontSize: 13, color: t.muted, marginBottom: 24 }}>Subí un archivo y obtené un análisis automático con inteligencia artificial</div>

      <div style={{ display: "grid", gridTemplateColumns: currentResult ? "1fr 1fr" : "1fr", gap: 16 }}>
        {/* Left: controls */}
        <div>
          {/* Report type selection */}
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 10 }}>Tipo de análisis</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
            {reportTypes.map(r => (
              <div key={r.value} onClick={() => setReportType(r.value)} style={{
                padding: "14px 16px", borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                background: reportType === r.value ? t.accentBg : t.card,
                border: reportType === r.value ? "2px solid " + t.accent : "1px solid " + t.border,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <r.icon size={16} color={reportType === r.value ? t.accent : t.muted} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: reportType === r.value ? t.accent : t.text }}>{r.label}</span>
                </div>
                <div style={{ fontSize: 11, color: t.dim }}>{r.desc}</div>
              </div>
            ))}
          </div>

          {reportType === "custom" && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.muted, marginBottom: 4 }}>Instrucciones personalizadas</div>
              <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Ej: Analizá las ventas por mes y decime cuáles son los 3 productos más rentables..." style={{ width: "100%", height: 80, padding: 10, borderRadius: 8, border: "1px solid " + t.border, background: t.hover, color: t.text, fontSize: 12, resize: "vertical", outline: "none" }} />
            </div>
          )}

          {/* File upload */}
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 10 }}>Archivo</div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.tsv,.txt" style={{ display: "none" }} onChange={e => { handleFileSelect(e.target.files); e.target.value = ""; }} />
          <div onClick={() => fileRef.current?.click()} style={{
            border: "2px dashed " + (selectedFile ? t.accent : t.border), borderRadius: 12, padding: 28, textAlign: "center",
            cursor: "pointer", marginBottom: 16, background: selectedFile ? t.accentBg : t.hover, transition: "all 0.15s",
          }}>
            {selectedFile ? (
              <div><FileText size={24} color={t.green} style={{ marginBottom: 6 }} /><div style={{ fontSize: 13, color: t.text, fontWeight: 600 }}>{selectedFile}</div><div style={{ fontSize: 11, color: t.dim, marginTop: 2 }}>Click para cambiar archivo</div></div>
            ) : (
              <div><Upload size={24} color={t.dim} style={{ marginBottom: 6 }} /><div style={{ fontSize: 13, color: t.muted }}>Click para subir Excel, CSV o TXT</div><div style={{ fontSize: 11, color: t.dim, marginTop: 2 }}>Formatos: .xlsx, .csv, .tsv, .txt</div></div>
            )}
          </div>

          <button onClick={generateReport} disabled={!fileData || generating} style={{
            width: "100%", padding: "14px", borderRadius: 10, background: t.accent, color: "#fff", border: "none",
            fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: fileData && !generating ? 1 : 0.4,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {generating ? <><Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> Analizando datos...</> : <><Sparkles size={16} /> Generar informe</>}
          </button>

          {/* History */}
          {reports.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 10 }}>Informes anteriores</div>
              {reports.slice(0, 10).map(r => (
                <div key={r.id} onClick={() => { setActiveReport(r); setResult(null); }} style={{
                  padding: "10px 14px", borderRadius: 8, marginBottom: 4, cursor: "pointer",
                  background: activeReport?.id === r.id ? t.accentBg : t.hover,
                  border: activeReport?.id === r.id ? "1px solid " + t.accent : "1px solid transparent",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: t.dim }}>{r.created_at?.split("T")[0]} · {r.report_type}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: result */}
        {currentResult && (
          <Crd t={t} style={{ padding: 24, alignSelf: "flex-start", maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Resultado del análisis</div>
              <X size={16} color={t.dim} style={{ cursor: "pointer" }} onClick={() => { setResult(null); setActiveReport(null); }} />
            </div>
            <div style={{ fontSize: 13, color: t.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{currentResult}</div>
          </Crd>
        )}
      </div>
    </div>
  );
}

// ─── CALENDAR PAGE ───
function CalendarPage({ t, onNav }) {
  const { tasks, projects, sedes, reload, userId, companyId } = useData();
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", project_id: "", priority: "medium" });
  const year = month.getFullYear();
  const mo = month.getMonth();
  const firstDay = new Date(year, mo, 1).getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  const events = useMemo(() => {
    const ev = [];
    tasks.forEach(tk => { if (tk.due) ev.push({ date: tk.due, label: tk.title, type: "task", color: tk.st === "done" ? t.green : tk.pri === "high" ? t.red : t.accent, id: tk.id, status: tk.st }); });
    projects.forEach(p => { if (p.deadline) ev.push({ date: p.deadline, label: p.name, type: "deadline", color: t.orange, id: p.id }); });
    return ev;
  }, [tasks, projects, t]);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const monthName = month.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const selectedEvents = selectedDate ? events.filter(e => e.date === selectedDate) : [];

  const addTask = async () => {
    if (!form.title || !selectedDate) return;
    const { error } = await supabase.from("tasks").insert({
      company_id: companyId, title: form.title, due_date: selectedDate,
      project_id: form.project_id || null, priority: form.priority, status: "todo",
    });
    if (error) { alert("Error: " + error.message); return; }
    setShowForm(false);
    setForm({ title: "", project_id: "", priority: "medium" });
    reload();
  };

  return (
    <div style={{ padding: 28, overflowY: "auto", height: "calc(100vh - 52px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: t.text }}>Calendario</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div onClick={() => setMonth(new Date())} style={{ padding: "6px 14px", borderRadius: 8, background: t.hover, color: t.muted, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Hoy</div>
          <ChevronLeft size={20} color={t.muted} style={{ cursor: "pointer", padding: 4 }} onClick={() => setMonth(new Date(year, mo - 1))} />
          <span style={{ fontSize: 15, fontWeight: 700, color: t.text, textTransform: "capitalize", minWidth: 160, textAlign: "center" }}>{monthName}</span>
          <ChevronRight size={20} color={t.muted} style={{ cursor: "pointer", padding: 4 }} onClick={() => setMonth(new Date(year, mo + 1))} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedDate ? "1fr 300px" : "1fr", gap: 16 }}>
        <Crd t={t} style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
              <div key={d} style={{ padding: 8, textAlign: "center", fontSize: 11, fontWeight: 600, color: t.dim }}>{d}</div>
            ))}
            {days.map((d, i) => {
              if (!d) return <div key={i} />;
              const dateStr = `${year}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const dayEvents = events.filter(e => e.date === dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              return (
                <div key={i} onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)} style={{ minHeight: 76, padding: 6, border: isSelected ? "2px solid " + t.accent : "1px solid " + t.border + "30", borderRadius: 8, background: isToday ? t.accentBg : isSelected ? t.accent + "08" : "transparent", cursor: "pointer", transition: "all 0.1s" }}>
                  <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? t.accent : t.text, marginBottom: 4 }}>{d}</div>
                  {dayEvents.slice(0, 3).map((e, j) => (
                    <div key={j} style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, background: e.color + "20", color: e.color, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{e.label}</div>
                  ))}
                  {dayEvents.length > 3 && <div style={{ fontSize: 9, color: t.dim }}>+{dayEvents.length - 3}</div>}
                </div>
              );
            })}
          </div>
        </Crd>

        {/* Day detail panel */}
        {selectedDate && (
          <Crd t={t} style={{ padding: 16, alignSelf: "flex-start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{new Date(selectedDate + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</div>
              <X size={16} color={t.dim} style={{ cursor: "pointer" }} onClick={() => setSelectedDate(null)} />
            </div>

            {selectedEvents.length === 0 ? (
              <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: t.dim }}>Sin eventos este día</div>
            ) : selectedEvents.map((e, i) => (
              <div key={i} style={{ padding: "8px 10px", borderRadius: 8, background: t.hover, marginBottom: 4, borderLeft: "3px solid " + e.color }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{e.label}</div>
                <div style={{ fontSize: 10, color: t.dim }}>{e.type === "deadline" ? "Deadline de proyecto" : "Tarea"}{e.status ? " · " + e.status : ""}</div>
              </div>
            ))}

            <div style={{ marginTop: 12, borderTop: "1px solid " + t.border, paddingTop: 12 }}>
              {!showForm ? (
                <button onClick={() => setShowForm(true)} style={{ width: "100%", padding: "10px", borderRadius: 8, background: t.accent, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Plus size={14} /> Agregar tarea</button>
              ) : (
                <div>
                  <Inp label="Tarea" val={form.title} onChange={v => setForm({...form, title: v})} t={t} placeholder="Nombre de la tarea" />
                  <Select label="Proyecto" val={form.project_id} onChange={v => setForm({...form, project_id: v})} t={t} options={[{ value: "", label: "Sin proyecto" }, ...projects.map(p => ({ value: p.id, label: p.name }))]} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "8px", borderRadius: 8, background: t.hover, color: t.muted, border: "1px solid " + t.border, fontSize: 12, cursor: "pointer" }}>Cancelar</button>
                    <button onClick={addTask} disabled={!form.title} style={{ flex: 1, padding: "8px", borderRadius: 8, background: t.accent, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: form.title ? 1 : 0.5 }}>Crear</button>
                  </div>
                </div>
              )}
            </div>
          </Crd>
        )}
      </div>
    </div>
  );
}

// ─── SETTINGS PAGE ───
function SettingsPage({ t, user }) {
  const { sedes, reload, userId } = useData();
  const [showSedeForm, setShowSedeForm] = useState(false);
  const [sedeForm, setSedeForm] = useState({ name: "", address: "", budget: "", color: "#0A84FF", icon: "🏢" });
  const [editId, setEditId] = useState(null);

  const saveSede = async () => {
    const data = { user_id: userId, name: sedeForm.name, address: sedeForm.address || null, budget: Number(sedeForm.budget) || 0, color: sedeForm.color, icon: sedeForm.icon, type: "physical" };
    if (editId) {
      await supabase.from("sedes").update(data).eq("id", editId);
    } else {
      await supabase.from("sedes").insert(data);
    }
    setShowSedeForm(false);
    setEditId(null);
    setSedeForm({ name: "", address: "", budget: "", color: "#0A84FF", icon: "🏢" });
    reload();
  };

  const deleteSede = async (id) => {
    if (!window.confirm("¿Eliminar esta sede? Los proyectos asociados quedarán sin sede.")) return;
    await supabase.from("sedes").delete().eq("id", id);
    reload();
  };

  const editSede = (s) => {
    setSedeForm({ name: s.name, address: s.address || "", budget: String(s.budget || ""), color: s.color || "#0A84FF", icon: s.icon || "🏢" });
    setEditId(s.id);
    setShowSedeForm(true);
  };

  const icons = ["🏢", "🏛️", "🏖️", "🏠", "🏗️", "📍", "🎓", "💼", "🏥", "🏭"];
  const colors = ["#0A84FF", "#30D158", "#FF9F0A", "#FF453A", "#BF5AF2", "#5AC8FA", "#FFD60A", "#AC8E68"];

  return (
    <div style={{ padding: 28, overflowY: "auto", height: "calc(100vh - 52px)" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: t.text, marginBottom: 20 }}>Configuración</div>

      {/* Profile */}
      <Crd t={t} style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 12 }}>Perfil</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff", fontWeight: 700 }}>
            {(user?.user_metadata?.full_name || user?.email || "L")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{user?.user_metadata?.full_name || "Lucho"}</div>
            <div style={{ fontSize: 12, color: t.muted }}>{user?.email}</div>
          </div>
        </div>
      </Crd>

      {/* Sedes management */}
      <Crd t={t} style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Sedes</div>
          <button onClick={() => { setShowSedeForm(true); setEditId(null); setSedeForm({ name: "", address: "", budget: "", color: "#0A84FF", icon: "🏢" }); }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, background: t.accent, color: "#fff", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer" }}><Plus size={12} /> Nueva sede</button>
        </div>
        {sedes.map(s => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: t.hover, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>{s.icon}</span>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{s.name}</div>
              <div style={{ fontSize: 10, color: t.dim }}>{s.address || "Sin dirección"} · Budget: {fmt(Number(s.budget || 0))}</div>
            </div>
            <div onClick={() => editSede(s)} style={{ padding: "5px 12px", borderRadius: 6, background: t.accentBg, color: t.accent, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Edit2 size={13} /> Editar</div>
            <div onClick={() => deleteSede(s.id)} style={{ padding: "5px 12px", borderRadius: 6, background: t.redBg, color: t.red, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={13} /> Borrar</div>
          </div>
        ))}
      </Crd>

      <Modal open={showSedeForm} onClose={() => setShowSedeForm(false)} title={editId ? "Editar sede" : "Nueva sede"} t={t}>
        <Inp label="Nombre" val={sedeForm.name} onChange={v => setSedeForm({...sedeForm, name: v})} t={t} placeholder="Ej: Belgrano" />
        <Inp label="Dirección" val={sedeForm.address} onChange={v => setSedeForm({...sedeForm, address: v})} t={t} placeholder="Opcional" />
        <Inp label="Presupuesto anual" val={sedeForm.budget} onChange={v => setSedeForm({...sedeForm, budget: v})} t={t} type="number" placeholder="0" />
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.muted, marginBottom: 4 }}>Icono</div>
          <div style={{ display: "flex", gap: 6 }}>{icons.map(ic => (
            <div key={ic} onClick={() => setSedeForm({...sedeForm, icon: ic})} style={{ width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", background: sedeForm.icon === ic ? t.accentBg : t.hover, border: sedeForm.icon === ic ? "2px solid " + t.accent : "1px solid " + t.border }}>{ic}</div>
          ))}</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.muted, marginBottom: 4 }}>Color</div>
          <div style={{ display: "flex", gap: 6 }}>{colors.map(c => (
            <div key={c} onClick={() => setSedeForm({...sedeForm, color: c})} style={{ width: 24, height: 24, borderRadius: 6, background: c, cursor: "pointer", border: sedeForm.color === c ? "2px solid " + t.text : "2px solid transparent" }} />
          ))}</div>
        </div>
        <button onClick={saveSede} disabled={!sedeForm.name} style={{ width: "100%", padding: "10px", borderRadius: 8, background: t.accent, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: sedeForm.name ? 1 : 0.5 }}>{editId ? "Guardar" : "Crear sede"}</button>
      </Modal>
    </div>
  );
}

// ─── LOGIN PAGE ───
function LoginPage({ onLogin, t }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setError(error.message);
    else onLogin();
    setLoading(false);
  };

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg }}>
      <div style={{ width: 360, padding: 32, background: t.card, borderRadius: 16, border: "1px solid " + t.border }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: t.text, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <Zap size={22} color={t.bg} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: t.text }}>LuchoNeitor</div>
          <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>Gestor de proyectos</div>
        </div>
        <Inp label="Email" val={email} onChange={setEmail} t={t} placeholder="tu@email.com" />
        <Inp label="Contraseña" val={pass} onChange={setPass} t={t} type="password" placeholder="••••••••" />
        {error && <div style={{ fontSize: 11, color: t.red, marginBottom: 10, padding: "6px 10px", background: t.redBg, borderRadius: 6 }}>{error}</div>}
        <button onClick={handleLogin} disabled={loading || !email || !pass} style={{
          width: "100%", padding: "12px", borderRadius: 10, background: t.accent, color: "#fff", border: "none",
          fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: loading || !email || !pass ? 0.5 : 1,
        }}>{loading ? "Ingresando..." : "Ingresar"}</button>
      </div>
    </div>
  );
}

// ─── APP ROOT ───
export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState("dark");
  const t = themes[theme];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (!authReady) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111113" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#0A84FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Zap size={20} color="#fff" />
      </div>
    </div>
  );

  if (!user) return <LoginPage onLogin={() => {}} t={themes.dark} />;

  const pageTitles = {
    dashboard: ["Dashboard", "Vista general"],
    projects: ["Proyectos", "Todos los proyectos"],
    tasks: ["Tareas", "Gestión de tareas"],
    budget: ["Presupuestos", "Control financiero"],
    documents: ["Documentos", "Repositorio de archivos"],
    reports: ["Informes IA", "Análisis automáticos"],
    calendar: ["Calendario", "Timeline de eventos"],
    settings: ["Configuración", "Ajustes del sistema"],
  };

  // Parse page for sede detail
  const isSedeDetail = page.startsWith("sede:");
  const sedeId = isSedeDetail ? page.split(":")[1] : null;
  const currentTitle = isSedeDetail
    ? ["Sede", "Detalle"]
    : pageTitles[page] || ["LuchoNeitor", ""];

  const pages = {
    dashboard: Dashboard,
    projects: ProjectsPage,
    tasks: TasksPage,
    budget: BudgetPage,
    documents: DocumentsPage,
    reports: AIReportsPage,
    calendar: CalendarPage,
    settings: SettingsPage,
  };

  const PageComponent = isSedeDetail ? null : pages[page];

  return (
    <DataProvider userId={user.id}>
      <div style={{ display: "flex", height: "100vh", background: t.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: t.text }}>
        <style>{
          "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');" +
          "*{box-sizing:border-box;margin:0;padding:0}" +
          "@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}" +
          "::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:" + t.border + ";border-radius:3px}"
        }</style>
        <Sidebar active={page} onNav={setPage} collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} t={t} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <TopBar title={currentTitle[0]} sub={currentTitle[1]} theme={theme} toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} t={t} onLogout={handleLogout} />
          {isSedeDetail ? (
            <SedeDetail sedeId={sedeId} t={t} onNav={setPage} />
          ) : PageComponent ? (
            <PageComponent t={t} onNav={setPage} user={user} />
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: t.dim }}>Página no encontrada</div>
          )}
        </div>
      </div>
    </DataProvider>
  );
}
