import { useState, useEffect, createContext, useContext, useRef, useMemo } from "react";
import { supabase } from "./lib/supabase";
import {
  LayoutDashboard, FolderKanban, CheckSquare, Wallet, FileText, BarChart3,
  Calendar, Settings, Building2, GraduationCap, Search, Bell, ChevronDown,
  ChevronRight, Plus, X, Edit2, Trash2, ArrowUpRight, ArrowDownRight,
  Clock, AlertCircle, Target, Users, MapPin, Filter, Upload,
  Eye, Download, MoreHorizontal, CheckCircle2, Circle, Loader,
  BookOpen, Monitor, Video, DollarSign, TrendingUp, PieChart,
  ChevronLeft, Sparkles, Sun, Moon, LogOut,
  StickyNote, Save, ListChecks, Layers, Hammer, Stethoscope, Activity
} from "lucide-react";

// ─── Theme: dark futurista — neón violeta/cyan, paleta coherente con 5 estados ───
const themes = {
  dark: {
    bg:"#06060B", card:"#101019", cardElev:"#15151F", hover:"#1B1B27",
    sidebar:"#08080F", topbar:"rgba(8,8,15,0.78)",
    border:"#1F1F2A", borderStrong:"#2D2D3A",
    text:"#F5F5F8", muted:"#9C9CAB", dim:"#5C5C6B",
    accent:"#7C5CFF", accentL:"#A78BFF", accentD:"#5B3FE3", accent2:"#22D3EE",
    accentBg:"rgba(124,92,255,0.14)", accentGlow:"rgba(124,92,255,0.55)",
    // Estados de tarea / proyecto:
    orange:"#FB923C", orangeBg:"rgba(251,146,60,0.13)",   // Pendiente
    blue:"#38BDF8", blueBg:"rgba(56,189,248,0.13)",       // En curso
    yellow:"#FBBF24", yellowBg:"rgba(251,191,36,0.13)",   // Esperando respuesta
    red:"#F43F5E", redBg:"rgba(244,63,94,0.13)",          // Pendiente solución / vencido
    green:"#10B981", greenBg:"rgba(16,185,129,0.13)",     // Listo
    // Tipos calendario:
    cyan:"#06B6D4", cyanBg:"rgba(6,182,212,0.13)",        // Reunión
    pink:"#EC4899", pinkBg:"rgba(236,72,153,0.13)",       // Evento
    purple:"#A855F7", purpleBg:"rgba(168,85,247,0.13)",   // Auxiliar
    shadow:"0 1px 2px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
    shadowLg:"0 16px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)",
    grad:"linear-gradient(135deg, #7C5CFF 0%, #22D3EE 100%)",
    gradSoft:"linear-gradient(135deg, #7C5CFF 0%, #A855F7 100%)",
    gradGlow:"linear-gradient(135deg, rgba(124,92,255,0.20) 0%, rgba(34,211,238,0.10) 100%)",
    grid:"linear-gradient(rgba(124,92,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,255,0.04) 1px, transparent 1px)",
  },
  light: {
    bg:"#F4F4F9", card:"#FFFFFF", cardElev:"#FFFFFF", hover:"#EDEDF3",
    sidebar:"#F8F8FB", topbar:"rgba(248,248,251,0.82)",
    border:"#E2E2EA", borderStrong:"#CDCDD8",
    text:"#0B0B14", muted:"#5A5A6B", dim:"#8E8E9F",
    accent:"#5B3FE3", accentL:"#7C5CFF", accentD:"#4730B5", accent2:"#0891B2",
    accentBg:"rgba(91,63,227,0.10)", accentGlow:"rgba(91,63,227,0.30)",
    orange:"#EA580C", orangeBg:"rgba(234,88,12,0.10)",
    blue:"#0284C7", blueBg:"rgba(2,132,199,0.10)",
    yellow:"#CA8A04", yellowBg:"rgba(202,138,4,0.10)",
    red:"#E11048", redBg:"rgba(225,16,72,0.10)",
    green:"#059669", greenBg:"rgba(5,150,105,0.10)",
    cyan:"#0891B2", cyanBg:"rgba(8,145,178,0.10)",
    pink:"#DB2777", pinkBg:"rgba(219,39,119,0.10)",
    purple:"#9333EA", purpleBg:"rgba(147,51,234,0.10)",
    shadow:"0 1px 3px rgba(11,11,20,0.06), 0 0 0 1px rgba(11,11,20,0.05)",
    shadowLg:"0 16px 40px rgba(11,11,20,0.10), 0 0 0 1px rgba(11,11,20,0.06)",
    grad:"linear-gradient(135deg, #5B3FE3 0%, #0891B2 100%)",
    gradSoft:"linear-gradient(135deg, #5B3FE3 0%, #9333EA 100%)",
    gradGlow:"linear-gradient(135deg, rgba(91,63,227,0.10) 0%, rgba(8,145,178,0.06) 100%)",
    grid:"linear-gradient(rgba(91,63,227,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(91,63,227,0.04) 1px, transparent 1px)",
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

// Silueta minimalista de guanaco de perfil mirando a la derecha.
function GuanacoIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="#fff" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M19 15V9a3 3 0 0 1 3-3h1V4a1 1 0 1 1 2 0v2h1a2 2 0 0 1 2 2v2a3 3 0 0 1-3 3h-1l-1 2h-4z" />
      <path d="M5 17a3 3 0 0 1 3-3h14v6H5v-3z" />
      <rect x="6" y="20" width="2" height="7" />
      <rect x="10" y="20" width="2" height="7" />
      <rect x="15" y="20" width="2" height="7" />
      <rect x="19" y="20" width="2" height="7" />
      <path d="M24 5l-1-2 2 1z" />
    </svg>
  );
}

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
  const [dashboardNotes, setDashboardNotes] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    // Get company_id + dashboard_notes from user_profiles
    let cId = companyId;
    if (!cId) {
      const { data: profile } = await supabase.from("user_profiles").select("company_id, dashboard_notes").eq("id", userId).single();
      cId = profile?.company_id || null;
      setCompanyId(cId);
      setDashboardNotes(profile?.dashboard_notes || "");
    } else {
      const { data: profile } = await supabase.from("user_profiles").select("dashboard_notes").eq("id", userId).single();
      setDashboardNotes(profile?.dashboard_notes || "");
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
    <DataCtx.Provider value={{ sedes, projects, tasks, documents, transactions, notifications, reports, dashboardNotes, setDashboardNotes, loading, reload: load, userId, companyId }}>
      {children}
    </DataCtx.Provider>
  );
}

// ─── UI Primitives ───
function Crd({ children, t, style: s, onClick, hoverable }) {
  const [hov, setHov] = useState(false);
  const interactive = !!onClick || hoverable;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => interactive && setHov(true)}
      onMouseLeave={() => interactive && setHov(false)}
      style={{
        background: t.card,
        borderRadius: 14,
        border: "1px solid " + (interactive && hov ? t.borderStrong : t.border),
        boxShadow: interactive && hov ? t.shadowLg : t.shadow,
        transform: interactive && hov ? "translateY(-1px)" : "translateY(0)",
        transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
        cursor: onClick ? "pointer" : "default",
        ...s,
      }}>
      {children}
    </div>
  );
}

function Badge({ label, color, bg, dot }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: bg, color, border: "1px solid " + color + "30", letterSpacing: 0.1 }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: "0 0 6px " + color + "80" }} />}
      {label}
    </span>
  );
}

// Estados unificados para tareas y proyectos
const STATUS_OPTIONS = [
  { value: "todo", label: "Pendiente" },
  { value: "in_progress", label: "En curso" },
  { value: "waiting_response", label: "Esperando respuesta" },
  { value: "pending_solution", label: "Pendiente solución" },
  { value: "done", label: "Listo" },
];

// Mapeo de project.status legacy (planning/in_progress/completed) a las labels nuevas
const PROJECT_STATUS_MAP = {
  planning: "todo",
  in_progress: "in_progress",
  completed: "done",
};

const normalizeProjectStatus = (s) => PROJECT_STATUS_MAP[s] || s;

function StatusBadge({ s, t }) {
  const m = {
    todo: { l: "Pendiente", c: t.orange, b: t.orangeBg },
    in_progress: { l: "En curso", c: t.blue, b: t.blueBg },
    waiting_response: { l: "Esperando respuesta", c: t.yellow, b: t.yellowBg },
    pending_solution: { l: "Pendiente solución", c: t.red, b: t.redBg },
    done: { l: "Listo", c: t.green, b: t.greenBg },
    // legacy projects
    planning: { l: "Pendiente", c: t.orange, b: t.orangeBg },
    completed: { l: "Listo", c: t.green, b: t.greenBg },
    active: { l: "En curso", c: t.blue, b: t.blueBg },
    // legacy/transactions
    cancelled: { l: "Cancelado", c: t.muted, b: t.hover },
    planned: { l: "Pendiente", c: t.orange, b: t.orangeBg },
    pending: { l: "Pendiente", c: t.orange, b: t.orangeBg },
    paid: { l: "Pagado", c: t.green, b: t.greenBg },
    partial: { l: "Parcial", c: t.yellow, b: t.yellowBg },
    overdue: { l: "Vencido", c: t.red, b: t.redBg },
  };
  const v = m[s] || { l: s || "—", c: t.dim, b: t.hover };
  return <Badge label={v.l} color={v.c} bg={v.b} dot />;
}

// Color helper para un estado (tareas o proyectos)
function statusColor(s, t) {
  const map = {
    todo: t.orange, planning: t.orange,
    in_progress: t.blue, active: t.blue,
    waiting_response: t.yellow,
    pending_solution: t.red,
    done: t.green, completed: t.green,
  };
  return map[s] || t.muted;
}

// Icono y color por tipo de proyecto — sustituye emojis viejos
const PROJECT_TYPES = {
  general:   { icon: Layers,       color: "accent",  label: "General" },
  obra:      { icon: Hammer,       color: "orange",  label: "Obra" },
  mejora:    { icon: Activity,     color: "cyan",    label: "Mejora" },
  academico: { icon: BookOpen,     color: "blue",    label: "Académico" },
  mri:       { icon: Stethoscope,  color: "pink",    label: "MRI" },
};
const projectTypeMeta = (type, t) => {
  const m = PROJECT_TYPES[type] || PROJECT_TYPES.general;
  return { Icon: m.icon, color: t[m.color] || t.accent, label: m.label };
};

// Prioridad → icono Flag
const PRIORITY_META = {
  high:   { color: "red",    label: "Alta" },
  medium: { color: "yellow", label: "Media" },
  low:    { color: "green",  label: "Baja" },
};
const priorityMeta = (pri, t) => {
  const m = PRIORITY_META[pri] || PRIORITY_META.medium;
  return { color: t[m.color], label: m.label };
};

function PBar({ v, h = 5, color, t, bg }) {
  const c = color || t.accent;
  return (
    <div style={{ height: h, borderRadius: h, background: bg || t.hover, overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: h, background: "linear-gradient(90deg, " + c + ", " + c + "CC)", width: Math.min(v, 100) + "%", transition: "width 0.4s ease", boxShadow: "0 0 12px " + c + "60" }} />
    </div>
  );
}

function Btn({ children, onClick, t, variant = "primary", size = "md", icon: Icon, disabled, style }) {
  const [hov, setHov] = useState(false);
  const sizes = {
    sm: { px: 12, py: 7, fs: 12, gap: 6, ic: 13 },
    md: { px: 18, py: 10, fs: 13, gap: 7, ic: 15 },
    lg: { px: 22, py: 12, fs: 14, gap: 8, ic: 16 },
  };
  const sz = sizes[size];
  const variants = {
    primary: { bg: t.grad, color: "#fff", border: "transparent", shadow: hov ? "0 6px 20px " + t.accentGlow : "0 2px 8px " + t.accentGlow + "80" },
    secondary: { bg: t.hover, color: t.text, border: t.border, shadow: "none" },
    ghost: { bg: hov ? t.hover : "transparent", color: t.muted, border: "transparent", shadow: "none" },
    danger: { bg: t.redBg, color: t.red, border: t.red + "40", shadow: "none" },
    success: { bg: t.greenBg, color: t.green, border: t.green + "40", shadow: "none" },
    accent: { bg: t.accentBg, color: t.accent, border: t.accent + "40", shadow: "none" },
  };
  const v = variants[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: sz.gap,
        padding: sz.py + "px " + sz.px + "px",
        borderRadius: 10, background: v.bg, color: v.color,
        border: "1px solid " + v.border,
        fontSize: sz.fs, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, outline: "none",
        boxShadow: v.shadow,
        transform: hov && !disabled ? "translateY(-1px)" : "translateY(0)",
        transition: "transform 140ms ease, box-shadow 140ms ease, background 140ms ease",
        ...style,
      }}>
      {Icon && <Icon size={sz.ic} />}
      {children}
    </button>
  );
}

function Inp({ label, val, onChange, t, placeholder, type = "text", style }) {
  const [foc, setFoc] = useState(false);
  return (
    <div style={{ marginBottom: 14, ...style }}>
      {label && <div style={{ fontSize: 11, fontWeight: 600, color: t.muted, marginBottom: 6, letterSpacing: 0.2, textTransform: "uppercase" }}>{label}</div>}
      <input value={val} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
        onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid " + (foc ? t.accent : t.border), background: t.hover, color: t.text, fontSize: 13, outline: "none", boxShadow: foc ? "0 0 0 3px " + t.accentBg : "none", transition: "border-color 140ms, box-shadow 140ms" }} />
    </div>
  );
}

function Select({ label, val, onChange, options, t, style }) {
  const [foc, setFoc] = useState(false);
  return (
    <div style={{ marginBottom: 14, ...style }}>
      {label && <div style={{ fontSize: 11, fontWeight: 600, color: t.muted, marginBottom: 6, letterSpacing: 0.2, textTransform: "uppercase" }}>{label}</div>}
      <select value={val} onChange={e => onChange(e.target.value)}
        onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid " + (foc ? t.accent : t.border), background: t.hover, color: t.text, fontSize: 13, outline: "none", boxShadow: foc ? "0 0 0 3px " + t.accentBg : "none", appearance: "none", cursor: "pointer", transition: "border-color 140ms, box-shadow 140ms" }}>
        {options.map(o => <option key={o.value} value={o.value} style={{ background: t.card, color: t.text }}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Modal({ open, onClose, title, children, t, width = 500 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 150ms ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.cardElev, border: "1px solid " + t.borderStrong, borderRadius: 16, padding: 26, width, maxWidth: "92vw", maxHeight: "88vh", overflowY: "auto", boxShadow: t.shadowLg, animation: "scaleIn 180ms ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: t.text, letterSpacing: -0.2 }}>{title}</span>
          <div onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: t.hover, transition: "background 140ms" }}>
            <X size={16} color={t.muted} />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// Mini anotador con autosave (debounce) — usado en Dashboard y SedeDetail.
// `summary` es un array de {label, value, color, icon} para el panel resumen.
function Notepad({ t, value, onSave, summary = [], title = "Anotador", placeholder = "Escribí lo que quieras...", style }) {
  const [text, setText] = useState(value || "");
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const tRef = useRef(null);

  useEffect(() => { setText(value || ""); }, [value]);

  const flush = async (next) => {
    if (next === (value || "")) return;
    setSaving(true);
    try { await onSave(next); setSaved(true); } finally { setSaving(false); }
  };

  const handleChange = (v) => {
    setText(v); setSaved(false);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => flush(v), 1000);
  };

  return (
    <Crd t={t} style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative", ...style }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 0% 0%, " + t.accentBg + ", transparent 50%)", pointerEvents: "none", opacity: 0.7 }} />
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid " + t.border }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: t.grad, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px " + t.accentGlow }}>
            <StickyNote size={15} color="#fff" strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, letterSpacing: -0.2 }}>{title}</div>
            <div style={{ fontSize: 10, color: saving ? t.accent : (saved ? t.green : t.muted), fontWeight: 600, letterSpacing: 0.3 }}>
              {saving ? "Guardando…" : saved ? "Guardado automáticamente" : "Cambios sin guardar"}
            </div>
          </div>
        </div>
        {!saved && !saving && <Btn t={t} variant="accent" size="sm" icon={Save} onClick={() => { if (tRef.current) clearTimeout(tRef.current); flush(text); }}>Guardar</Btn>}
      </div>

      {summary && summary.length > 0 && (
        <div style={{ position: "relative", padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, borderBottom: "1px solid " + t.border, background: t.hover + "60" }}>
          {summary.map((s, i) => (
            <div key={i} style={{ padding: "8px 10px", borderRadius: 9, background: t.card, border: "1px solid " + t.border, display: "flex", alignItems: "center", gap: 9 }}>
              {s.icon && <div style={{ width: 24, height: 24, borderRadius: 6, background: (s.color || t.accent) + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><s.icon size={12} color={s.color || t.accent} strokeWidth={2.4} /></div>}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 9, color: t.dim, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", lineHeight: 1.1 }}>{s.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: s.color || t.text, letterSpacing: -0.4, lineHeight: 1.1 }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={text}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        style={{ position: "relative", width: "100%", flex: 1, minHeight: 140, padding: "14px 18px", border: "none", background: "transparent", color: t.text, fontSize: 13, lineHeight: 1.65, resize: "vertical", outline: "none", fontFamily: "inherit" }}
      />
    </Crd>
  );
}

// Columna lateral derecha fija con el Notepad adentro — siempre visible mientras se gestiona.
function NotepadRail({ t, value, onSave, summary, title, placeholder }) {
  return (
    <aside style={{
      width: 380, flexShrink: 0,
      borderLeft: "1px solid " + t.border,
      background: t.bg,
      display: "flex", flexDirection: "column",
      padding: 16, height: "100%",
    }}>
      <Notepad
        t={t}
        value={value}
        onSave={onSave}
        summary={summary}
        title={title}
        placeholder={placeholder}
        style={{ flex: 1, minHeight: 0 }}
      />
    </aside>
  );
}

function EmptyState({ icon: Icon, title, sub, t, action, onAction }) {
  return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <div style={{ width: 60, height: 60, borderRadius: 16, background: t.gradGlow, border: "1px solid " + t.border, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Icon size={26} color={t.muted} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 4, letterSpacing: -0.2 }}>{title}</div>
      <div style={{ fontSize: 13, color: t.dim, marginBottom: action ? 18 : 0, lineHeight: 1.5 }}>{sub}</div>
      {action && <Btn t={t} onClick={onAction} icon={Plus}>{action}</Btn>}
    </div>
  );
}

// ─── Sidebar ───
function NavItem({ id, icon: Icon, label, indent, count, color, active, onNav, collapsed, t, hoverItem, setHoverItem }) {
  const isActive = active === id;
  const isHov = hoverItem === id;
  return (
    <div
      onClick={() => onNav(id)}
      onMouseEnter={() => setHoverItem(id)}
      onMouseLeave={() => setHoverItem(null)}
      style={{
        position: "relative",
        display: "flex", alignItems: "center", gap: 10,
        padding: collapsed ? "10px 12px" : "8px 12px",
        marginLeft: indent ? 16 : 0, marginBottom: 2,
        borderRadius: 8, cursor: "pointer", fontSize: 13,
        fontWeight: isActive ? 600 : 500,
        color: isActive ? t.text : (isHov ? t.text : t.muted),
        background: isActive ? t.accentBg : (isHov ? t.hover : "transparent"),
        transition: "color 140ms, background 140ms",
      }}>
      {isActive && <div style={{ position: "absolute", left: -6, top: "50%", transform: "translateY(-50%)", width: 3, height: 16, borderRadius: 2, background: t.accent, boxShadow: "0 0 8px " + t.accentGlow }} />}
      {color ? (
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: "0 0 6px " + color + "70" }} />
      ) : (
        Icon && <Icon size={15} color={isActive ? t.accent : "currentColor"} strokeWidth={isActive ? 2.4 : 2} />
      )}
      {!collapsed && <span style={{ flex: 1, letterSpacing: -0.1 }}>{label}</span>}
      {count > 0 && !collapsed && <span style={{ fontSize: 10, fontWeight: 700, color: t.red, background: t.redBg, padding: "1px 7px", borderRadius: 999 }}>{count}</span>}
    </div>
  );
}

function Sidebar({ active, onNav, collapsed, toggle, t }) {
  const { sedes } = useData();
  const [sedesOpen, setSedesOpen] = useState(true);
  const [hoverItem, setHoverItem] = useState(null);

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

  const navProps = { active, onNav, collapsed, t, hoverItem, setHoverItem };

  return (
    <div style={{ width: collapsed ? 60 : 232, background: t.sidebar, borderRight: "1px solid " + t.border, display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 200ms ease", overflow: "hidden" }}>
      {/* Logo */}
      <div onClick={toggle} style={{ padding: collapsed ? "18px 12px" : "18px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <div style={{ position: "relative", width: 32, height: 32, borderRadius: 10, background: "#E5A100", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 6px 20px rgba(229,161,0,0.45), inset 0 1px 0 rgba(255,255,255,0.2)" }}>
          <GuanacoIcon size={20} />
          <div style={{ position: "absolute", inset: 0, borderRadius: 10, boxShadow: "0 0 0 1px rgba(255,255,255,0.1)", pointerEvents: "none" }} />
        </div>
        {!collapsed && (
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: t.text, letterSpacing: -0.4, background: t.grad, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>Guanaco</span>
            <span style={{ fontSize: 10, color: t.dim, fontWeight: 500, letterSpacing: 0.3 }}>Gestor multi-sede</span>
          </div>
        )}
      </div>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, " + t.border + ", transparent)", margin: "0 12px" }} />

      {/* Nav */}
      <div style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        {navItems.map(item => {
          if (item.id === "_sedes") {
            return (
              <div key="sedes">
                <div
                  onClick={() => setSedesOpen(!sedesOpen)}
                  onMouseEnter={() => setHoverItem("_sedes")}
                  onMouseLeave={() => setHoverItem(null)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 2, borderRadius: 8, cursor: "pointer", color: hoverItem === "_sedes" ? t.text : t.muted, fontSize: 13, fontWeight: 500, background: hoverItem === "_sedes" ? t.hover : "transparent", transition: "color 140ms, background 140ms" }}>
                  <Building2 size={15} strokeWidth={2} />
                  {!collapsed && <>
                    <span style={{ flex: 1, letterSpacing: -0.1 }}>Sedes</span>
                    <span style={{ fontSize: 10, color: t.dim, fontWeight: 600 }}>{sedes.length}</span>
                    <ChevronDown size={13} style={{ transform: sedesOpen ? "rotate(0)" : "rotate(-90deg)", transition: "transform 160ms" }} />
                  </>}
                </div>
                {sedesOpen && !collapsed && sedes.map(s => (
                  <NavItem key={s.id} id={"sede:" + s.id} icon={MapPin} label={s.name} indent color={s.color} {...navProps} />
                ))}
                {sedesOpen && !collapsed && (
                  <div onClick={() => onNav("settings")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", marginLeft: 16, fontSize: 11, color: t.dim, cursor: "pointer", fontWeight: 500 }}>
                    <Plus size={12} /> Agregar sede
                  </div>
                )}
              </div>
            );
          }
          return <NavItem key={item.id} {...item} {...navProps} />;
        })}
      </div>

      {/* Bottom */}
      <div style={{ padding: "10px 8px", borderTop: "1px solid " + t.border }}>
        <NavItem id="settings" icon={Settings} label="Configuración" {...navProps} />
      </div>
    </div>
  );
}

// ─── TopBar ───
function IconBtn({ t, onClick, children, title, dot }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ position: "relative", width: 34, height: 34, borderRadius: 9, background: hov ? t.hover : "transparent", border: "1px solid " + (hov ? t.borderStrong : t.border), display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 140ms, border-color 140ms" }}>
      {children}
      {dot && <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: t.red, boxShadow: "0 0 6px " + t.red + "90", border: "1.5px solid " + t.topbar }} />}
    </div>
  );
}

function TopBar({ title, sub, theme, toggleTheme, t, onLogout }) {
  const { notifications } = useData();
  const unread = notifications.filter(n => !n.read).length;
  const [showNotif, setShowNotif] = useState(false);

  return (
    <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: t.topbar, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid " + t.border, flexShrink: 0, position: "relative", zIndex: 50 }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: t.text, letterSpacing: -0.3 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: t.muted, marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <IconBtn t={t} onClick={() => setShowNotif(!showNotif)} title="Notificaciones" dot={unread > 0}>
            <Bell size={15} color={t.muted} />
          </IconBtn>
          {showNotif && (
            <div style={{ position: "absolute", top: 42, right: 0, width: 340, background: t.cardElev, border: "1px solid " + t.borderStrong, borderRadius: 12, padding: 8, zIndex: 100, boxShadow: t.shadowLg }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, padding: "8px 12px", letterSpacing: -0.2 }}>Notificaciones {unread > 0 && <span style={{ fontSize: 10, color: t.accent, marginLeft: 6 }}>{unread} sin leer</span>}</div>
              {notifications.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: t.dim }}>Sin notificaciones</div>
              ) : notifications.slice(0, 8).map(n => (
                <div key={n.id} style={{ padding: "10px 12px", borderRadius: 8, background: n.read ? "transparent" : t.accentBg, marginBottom: 2, borderLeft: "2px solid " + (n.read ? "transparent" : t.accent) }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: t.dim, marginTop: 2 }}>{n.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <IconBtn t={t} onClick={toggleTheme} title={theme === "dark" ? "Modo claro" : "Modo oscuro"}>
          {theme === "dark" ? <Sun size={15} color={t.muted} /> : <Moon size={15} color={t.muted} />}
        </IconBtn>
        <IconBtn t={t} onClick={onLogout} title="Cerrar sesión">
          <LogOut size={15} color={t.muted} />
        </IconBtn>
      </div>
    </div>
  );
}

// ─── DASHBOARD ───
function Dashboard({ t, onNav }) {
  const { sedes, projects, tasks, dashboardNotes, setDashboardNotes, userId } = useData();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const today = now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  const overdueTasks = tasks.filter(tk => tk.due && tk.st !== "done" && new Date(tk.due) < new Date(todayStr));
  const pendingTasks = tasks.filter(tk => tk.st !== "done");
  const doneTasks = tasks.filter(tk => tk.st === "done");
  const activeProjects = projects.filter(p => p.status === "in_progress" || p.status === "active");
  const doneProjects = projects.filter(p => p.status === "done" || p.status === "completed");

  const dueSoon = tasks.filter(tk => {
    if (!tk.due || tk.st === "done") return false;
    const diff = (new Date(tk.due) - now) / (1000*60*60*24);
    return diff >= 0 && diff <= 7;
  }).sort((a, b) => new Date(a.due) - new Date(b.due));

  const saveDashboardNotes = async (notes) => {
    const { error } = await supabase.from("user_profiles").update({ dashboard_notes: notes }).eq("id", userId);
    if (error) {
      if (error.code === "PGRST204" || /column.*dashboard_notes/i.test(error.message || "")) {
        alert("La columna user_profiles.dashboard_notes no existe. Aplicá migrations/2026-04-28-add-notes.sql");
      } else alert("Error: " + error.message);
      return;
    }
    setDashboardNotes(notes);
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
      <div style={{ flex: 1, padding: "32px 32px 40px", overflowY: "auto", minWidth: 0 }}>
      {/* Hero header */}
      <div style={{ position: "relative", marginBottom: 28, padding: "8px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: t.accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Vista general</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: t.text, letterSpacing: -0.8, lineHeight: 1.15 }}>
              Buen día — {sedes.length} sede{sedes.length !== 1 ? "s" : ""} en gestión
            </div>
            <div style={{ fontSize: 13, color: t.muted, marginTop: 6, textTransform: "capitalize" }}>{today}</div>
          </div>
          {overdueTasks.length > 0 && (
            <div onClick={() => onNav("tasks")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, background: t.redBg, border: "1px solid " + t.red + "40", cursor: "pointer", boxShadow: "0 4px 14px " + t.red + "30" }}>
              <AlertCircle size={15} color={t.red} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.red, lineHeight: 1.1 }}>{overdueTasks.length} tarea{overdueTasks.length > 1 ? "s" : ""} vencida{overdueTasks.length > 1 ? "s" : ""}</div>
                <div style={{ fontSize: 10, color: t.red, opacity: 0.8 }}>Click para revisar</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Proyectos activos", val: activeProjects.length, sub: projects.length + " totales", icon: FolderKanban, color: t.accent, nav: "projects" },
          { label: "Tareas pendientes", val: pendingTasks.length, sub: doneTasks.length + " completadas", icon: CheckSquare, color: t.orange, nav: "tasks" },
          { label: "Tareas vencidas", val: overdueTasks.length, sub: overdueTasks.length > 0 ? "Requieren atención" : "Todo al día", icon: AlertCircle, color: overdueTasks.length > 0 ? t.red : t.green, nav: "tasks" },
          { label: "Sedes", val: sedes.length, sub: "En gestión", icon: Building2, color: t.green, nav: "settings" },
        ].map((k, i) => (
          <Crd key={i} t={t} onClick={() => onNav(k.nav)} style={{ padding: 20, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: k.color + "12", filter: "blur(28px)" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: t.muted, letterSpacing: 0.3 }}>{k.label}</span>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: k.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <k.icon size={14} color={k.color} strokeWidth={2.4} />
                </div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: t.text, letterSpacing: -1, lineHeight: 1 }}>{k.val}</div>
              {k.sub && <div style={{ fontSize: 11, color: t.dim, marginTop: 6, fontWeight: 500 }}>{k.sub}</div>}
            </div>
          </Crd>
        ))}
      </div>

      {/* Sedes Grid */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: t.text, letterSpacing: -0.3 }}>Tus sedes</div>
          <div style={{ fontSize: 12, color: t.dim, marginTop: 2 }}>Click para ver el detalle de cada una</div>
        </div>
      </div>
      {sedes.length === 0 ? (
        <Crd t={t} style={{ padding: 20, marginBottom: 28 }}>
          <EmptyState icon={Building2} title="Sin sedes todavía" sub="Agregá tu primera sede para empezar a gestionar proyectos" t={t} action="Agregar sede" onAction={() => onNav("settings")} />
        </Crd>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: sedes.length >= 3 ? "repeat(3,1fr)" : "repeat(" + Math.max(sedes.length, 1) + ",1fr)", gap: 14, marginBottom: 28 }}>
          {sedes.map(s => {
            const sedeProjects = projects.filter(p => p.sede_id === s.id);
            const sedeTasks = tasks.filter(tk => tk.sede_id === s.id || sedeProjects.some(p => p.id === tk.project_id));
            const sedeOverdue = sedeTasks.filter(tk => tk.due && tk.st !== "done" && new Date(tk.due) < new Date(todayStr));
            const sedePending = sedeTasks.filter(tk => tk.st !== "done");
            const budget = Number(s.budget || 0);
            const spent = sedeProjects.reduce((sum, p) => sum + (p.cost_spent || 0), 0);
            const sedeColor = s.color || t.accent;
            return (
              <Crd key={s.id} t={t} onClick={() => onNav("sede:" + s.id)} style={{ padding: 22, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "linear-gradient(180deg, " + sedeColor + ", " + sedeColor + "60)", boxShadow: "0 0 14px " + sedeColor + "60" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: sedeColor + "20", border: "1px solid " + sedeColor + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{s.icon || "🏢"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: t.text, letterSpacing: -0.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                    {s.address && <div style={{ fontSize: 11, color: t.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.address}</div>}
                  </div>
                  <ArrowUpRight size={16} color={t.dim} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: t.hover }}>
                    <div style={{ fontSize: 9, color: t.dim, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 }}>Proyectos</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: t.text, lineHeight: 1 }}>{sedeProjects.length}</div>
                  </div>
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: sedePending.length > 0 ? t.orangeBg : t.hover }}>
                    <div style={{ fontSize: 9, color: t.dim, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 }}>Pendientes</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: sedePending.length > 0 ? t.orange : t.text, lineHeight: 1 }}>{sedePending.length}</div>
                  </div>
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: sedeOverdue.length > 0 ? t.redBg : t.greenBg }}>
                    <div style={{ fontSize: 9, color: t.dim, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 }}>Vencidas</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: sedeOverdue.length > 0 ? t.red : t.green, lineHeight: 1 }}>{sedeOverdue.length}</div>
                  </div>
                </div>

                {budget > 0 && (
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: t.hover, marginBottom: sedeProjects.length > 0 ? 12 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                      <span style={{ fontSize: 10, color: t.dim, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>Presupuesto</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: pct(spent, budget) > 90 ? t.red : pct(spent, budget) > 70 ? t.orange : t.green }}>{pct(spent, budget)}%</span>
                    </div>
                    <div style={{ fontSize: 11, color: t.muted, fontWeight: 500 }}>{fmt(spent)} <span style={{ color: t.dim }}>de</span> {fmt(budget)}</div>
                  </div>
                )}

                {sedeProjects.length > 0 && (
                  <div style={{ borderTop: "1px solid " + t.border, paddingTop: 10 }}>
                    {sedeProjects.slice(0, 3).map(p => (
                      <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", gap: 8 }}>
                        <span style={{ fontSize: 12, color: t.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.name}</span>
                        <StatusBadge s={p.status} t={t} />
                      </div>
                    ))}
                    {sedeProjects.length > 3 && <div style={{ fontSize: 11, color: t.accent, marginTop: 4, fontWeight: 600 }}>+{sedeProjects.length - 3} más →</div>}
                  </div>
                )}
              </Crd>
            );
          })}
        </div>
      )}

      {/* Tasks + Projects */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: 16 }}>
        <Crd t={t} style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.text, letterSpacing: -0.3 }}>Próximas tareas</div>
              <div style={{ fontSize: 11, color: t.dim, marginTop: 1 }}>Vencidas y de los próximos 7 días</div>
            </div>
            <span onClick={() => onNav("tasks")} style={{ fontSize: 12, color: t.accent, cursor: "pointer", fontWeight: 600, padding: "4px 10px", borderRadius: 6, background: t.accentBg }}>Ver todas →</span>
          </div>
          {[...overdueTasks, ...dueSoon].length === 0 ? (
            <div style={{ padding: 28, textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: t.greenBg, border: "1px solid " + t.green + "40", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <CheckCircle2 size={24} color={t.green} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.green }}>Todo al día</div>
              <div style={{ fontSize: 12, color: t.dim, marginTop: 2 }}>No hay tareas urgentes</div>
            </div>
          ) : [...overdueTasks, ...dueSoon].slice(0, 8).map(tk => {
            const isOverdue = tk.due && new Date(tk.due) < new Date(todayStr);
            return (
              <div key={tk.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, marginBottom: 4, borderLeft: "3px solid " + (isOverdue ? t.red : t.accent), background: isOverdue ? t.redBg : t.hover }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: t.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.title}</div>
                  <div style={{ fontSize: 11, color: t.dim, marginTop: 1 }}>{tk.project}{tk.sede ? " · " + tk.sede : ""}</div>
                </div>
                {tk.due && <span style={{ fontSize: 11, fontWeight: 700, color: isOverdue ? t.red : t.muted, padding: "3px 8px", borderRadius: 6, background: isOverdue ? t.red + "20" : t.card }}>{isOverdue ? "Vencida" : fmtDate(tk.due)}</span>}
              </div>
            );
          })}
        </Crd>

        <Crd t={t} style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text, letterSpacing: -0.3 }}>Proyectos activos</div>
            <span onClick={() => onNav("projects")} style={{ fontSize: 12, color: t.accent, cursor: "pointer", fontWeight: 600 }}>→</span>
          </div>
          {activeProjects.length === 0 ? (
            <div style={{ fontSize: 12, color: t.dim, textAlign: "center", padding: 18 }}>Sin proyectos activos</div>
          ) : activeProjects.slice(0, 6).map(p => (
            <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid " + t.border }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.name}</span>
                <StatusBadge s={p.status} t={t} />
              </div>
              <div style={{ fontSize: 10, color: t.dim }}>{p.sede?.name || "Sin sede"}{p.deadline ? " · " + fmtDate(p.deadline) : ""}</div>
            </div>
          ))}
        </Crd>
      </div>
      </div>
      <NotepadRail
        t={t}
        value={dashboardNotes}
        onSave={saveDashboardNotes}
        title="Anotador general"
        placeholder="Resumen, prioridades de la semana, ideas, recordatorios…"
        summary={[
          { label: "Sedes", value: sedes.length, icon: Building2, color: t.accent },
          { label: "Proyectos", value: projects.length, icon: FolderKanban, color: t.blue },
          { label: "En curso", value: activeProjects.length, icon: Activity, color: t.blue },
          { label: "Listos", value: doneProjects.length, icon: CheckCircle2, color: t.green },
          { label: "T. pend.", value: pendingTasks.length, icon: ListChecks, color: pendingTasks.length > 0 ? t.orange : t.green },
          { label: "Vencidas", value: overdueTasks.length, icon: AlertCircle, color: overdueTasks.length > 0 ? t.red : t.green },
        ]}
      />
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
  const [expandedProjects, setExpandedProjects] = useState({});

  if (!sede) return <div style={{ padding: 40, textAlign: "center", color: t.dim }}>Sede no encontrada</div>;

  const sedeProjects = projects.filter(p => p.sede_id === sedeId);
  const allSedeTasks = tasks.filter(tk => sedeProjects.some(p => p.id === tk.project_id) || tk.sede_id === sedeId);
  const budget = Number(sede.budget || 0);
  const spent = sedeProjects.reduce((s, p) => s + (p.cost_spent || 0), 0);
  const todayStr = new Date().toISOString().split("T")[0];
  const overdueTasks = allSedeTasks.filter(tk => tk.due && tk.st !== "done" && new Date(tk.due) < new Date(todayStr));
  const pendingTasks = allSedeTasks.filter(tk => tk.st !== "done");
  const doneTasks = allSedeTasks.filter(tk => tk.st === "done");
  const activeProjects = sedeProjects.filter(p => p.status === "in_progress" || p.status === "active");
  const doneProjects = sedeProjects.filter(p => p.status === "completed" || p.status === "done");
  const toggleExpand = (id) => setExpandedProjects(s => ({ ...s, [id]: !s[id] }));

  // CRUD functions
  const saveProject = async () => {
    const { error } = await supabase.from("projects").insert({
      company_id: companyId, sede_id: sedeId, name: form.name, type: form.type,
      deadline: form.deadline || null, cost: Number(form.cost) || 0, description: form.description || null,
      status: "todo",
    });
    if (error) {
      alert("Error: " + error.message + (error.code === "23514" ? "\n\nLa DB no soporta este estado. Aplicá la migración SQL." : ""));
      return;
    }
    setShowForm(false);
    setForm({ name: "", type: "general", deadline: "", cost: "", description: "" });
    reload();
  };

  const quickStatus = async (id, status) => {
    const { error } = await supabase.from("projects").update({ status }).eq("id", id);
    if (error && error.code === "23514") alert("La DB no soporta este estado todavía. Aplicá la migración SQL en migrations/extend-project-status.sql.");
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
    // Cycle through todo → in_progress → done → todo (skip blocked states for quick toggle)
    const next = st === "todo" ? "in_progress" : st === "in_progress" ? "done" : "todo";
    await supabase.from("tasks").update({ status: next }).eq("id", id);
    reload();
  };

  const setTaskStatus = async (id, status) => {
    await supabase.from("tasks").update({ status }).eq("id", id);
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

  const saveSedeNotes = async (notes) => {
    const { error } = await supabase.from("sedes").update({ notes }).eq("id", sedeId);
    if (error) {
      if (error.code === "PGRST204" || /column.*notes/i.test(error.message || "")) {
        alert("La columna sedes.notes no existe. Aplicá la migración en migrations/2026-04-28-add-notes.sql");
      } else alert("Error: " + error.message);
      return;
    }
    reload();
  };

  const priColor = { high: t.red, medium: t.orange, low: t.green };
  const priLabel = { high: "Alta", medium: "Media", low: "Baja" };

  const sedeColor = sede.color || t.accent;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
      <div style={{ flex: 1, padding: "32px 32px 40px", overflowY: "auto", minWidth: 0 }}>
      <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => { if (uploadTarget) uploadDoc(e.target.files, uploadTarget); e.target.value = ""; }} />

      {/* Breadcrumb */}
      <div onClick={() => onNav("dashboard")} style={{ fontSize: 12, color: t.muted, cursor: "pointer", marginBottom: 16, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, background: t.hover, border: "1px solid " + t.border }}>
        <ChevronLeft size={13} /> Dashboard
      </div>

      {/* Sede Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg, " + sedeColor + "30, " + sedeColor + "08)", border: "1px solid " + sedeColor + "40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, boxShadow: "0 8px 24px " + sedeColor + "20" }}>{sede.icon || "🏢"}</div>
          <div>
            <div style={{ fontSize: 11, color: sedeColor, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Sede</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: -0.8, lineHeight: 1.1 }}>{sede.name}</div>
            <div style={{ fontSize: 13, color: t.muted, marginTop: 4 }}>{sede.address || "Sin dirección"} · <span style={{ color: t.text, fontWeight: 600 }}>{sedeProjects.length}</span> proyecto{sedeProjects.length !== 1 ? "s" : ""}</div>
          </div>
        </div>
        <Btn t={t} onClick={() => setShowForm(true)} icon={Plus} size="lg">Nuevo proyecto</Btn>
      </div>

      {/* Dashboard KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Proyectos", val: sedeProjects.length, sub: activeProjects.length + " en curso", color: t.accent, icon: FolderKanban },
          { label: "Listos", val: doneProjects.length, sub: "Proyectos completados", color: t.green, icon: CheckCircle2 },
          { label: "Tareas pend.", val: pendingTasks.length, sub: doneTasks.length + " completadas", color: t.orange, icon: CheckSquare },
          { label: "Vencidas", val: overdueTasks.length, sub: overdueTasks.length > 0 ? "Atención" : "Todo al día", color: overdueTasks.length > 0 ? t.red : t.green, icon: AlertCircle },
          { label: "Presupuesto", val: budget > 0 ? pct(spent, budget) + "%" : "—", sub: budget > 0 ? fmt(spent) + " / " + fmt(budget) : "Sin asignar", color: budget > 0 && pct(spent, budget) > 90 ? t.red : t.green, icon: Wallet },
        ].map((k, i) => (
          <Crd key={i} t={t} style={{ padding: 18, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 70, height: 70, borderRadius: "50%", background: k.color + "15", filter: "blur(20px)" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: t.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>{k.label}</span>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: k.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <k.icon size={13} color={k.color} strokeWidth={2.4} />
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: t.text, letterSpacing: -0.7, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: t.dim, marginTop: 4, fontWeight: 500 }}>{k.sub}</div>
            </div>
          </Crd>
        ))}
      </div>

      {/* Projects — each one is a full workspace card */}
      {sedeProjects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Sin proyectos en esta sede" sub="Creá tu primer proyecto para empezar" t={t} action="Nuevo proyecto" onAction={() => setShowForm(true)} />
      ) : sedeProjects.map(p => {
        const pTasks = tasks.filter(tk => tk.project_id === p.id);
        const pDocs = documents.filter(d => d.project_id === p.id);
        const pending = pTasks.filter(tk => tk.st !== "done");
        const done = pTasks.filter(tk => tk.st === "done");
        const daysLeft = p.deadline ? Math.ceil((new Date(p.deadline) - new Date()) / (1000*60*60*24)) : null;
        const ptype = projectTypeMeta(p.type, t);
        const projColor = statusColor(p.status, t);
        const isExpanded = expandedProjects[p.id] !== false; // default expanded
        return (
          <Crd key={p.id} t={t} style={{ marginBottom: 14, overflow: "hidden", padding: 0, position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "linear-gradient(180deg, " + projColor + ", " + projColor + "60)", boxShadow: "0 0 14px " + projColor + "60" }} />
            {/* Project header */}
            <div style={{ padding: "18px 22px", background: t.gradGlow, borderBottom: isExpanded ? "1px solid " + t.border : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div onClick={() => toggleExpand(p.id)} style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0, cursor: "pointer" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: t.hover, border: "1px solid " + t.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 200ms ease" }}>
                    <ChevronDown size={16} color={t.muted} style={{ transform: isExpanded ? "rotate(0)" : "rotate(-90deg)", transition: "transform 200ms" }} />
                  </div>
                  <div style={{ width: 44, height: 44, borderRadius: 11, background: ptype.color + "18", border: "1px solid " + ptype.color + "40", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 14px " + ptype.color + "20" }}><ptype.Icon size={20} color={ptype.color} strokeWidth={2.2} /></div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: t.text, letterSpacing: -0.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: t.muted, marginTop: 2, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, color: ptype.color }}>{ptype.label}</span>
                      {p.deadline && <><span style={{ color: t.dim }}>•</span><span>{fmtDate(p.deadline)}</span></>}
                      {daysLeft !== null && (
                        <><span style={{ color: t.dim }}>•</span>
                        <span style={{ color: daysLeft < 0 ? t.red : daysLeft <= 7 ? t.orange : t.muted, fontWeight: 600 }}>
                          {daysLeft < 0 ? "Vencido hace " + Math.abs(daysLeft) + "d" : daysLeft + "d"}
                        </span></>
                      )}
                      <span style={{ color: t.dim }}>•</span>
                      <span><b style={{ color: pending.length > 0 ? t.orange : t.green }}>{pending.length}</b> pend · <b style={{ color: t.green }}>{done.length}</b> listas · <b style={{ color: t.text }}>{pDocs.length}</b> docs</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  <select value={p.status} onChange={e => quickStatus(p.id, e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid " + projColor + "50", background: projColor + "15", color: projColor, fontSize: 12, cursor: "pointer", fontWeight: 700, outline: "none" }}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: t.card, color: t.text }}>{o.label}</option>)}
                  </select>
                  <Btn t={t} variant="danger" size="sm" icon={Trash2} onClick={() => deleteProject(p.id)} />
                </div>
              </div>
            </div>

            {/* Project content area — sólo cuando está expandido */}
            {isExpanded && (
            <div style={{ padding: "16px 24px" }}>
              {/* NOTES section */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><StickyNote size={12} strokeWidth={2.4} /> Notas</div>
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
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.dim, textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 6 }}><ListChecks size={12} strokeWidth={2.4} /> Tareas <span style={{ color: t.text, fontWeight: 800 }}>{pTasks.length}</span></span>
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
                      <option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option>
                    </select>
                    <button onClick={() => addTask(p.id)} disabled={!taskForm.title} style={{ padding: "8px 18px", borderRadius: 8, background: t.accent, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: taskForm.title ? 1 : 0.5 }}>Crear</button>
                  </div>
                )}

                {/* Task list */}
                {pTasks.map(tk => {
                  const isOverdue = tk.due && tk.st !== "done" && new Date(tk.due) < new Date(todayStr);
                  const stColor = isOverdue && tk.st !== "done" ? t.red : statusColor(tk.st, t);
                  return (
                    <div key={tk.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: isOverdue ? t.redBg : t.hover, borderLeft: "3px solid " + stColor }}>
                        <div onClick={() => toggleTask(tk.id, tk.st)} style={{ cursor: "pointer", padding: 2 }} title="Cambiar estado">
                          {tk.st === "done" ? <CheckCircle2 size={20} color={t.green} /> : <Circle size={20} color={t.dim} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 14, color: t.text, fontWeight: 600, textDecoration: tk.st === "done" ? "line-through" : "none" }}>{tk.title}</span>
                        </div>
                        <StatusBadge s={tk.st} t={t} />
                        <Badge label={priLabel[tk.pri]} color={priColor[tk.pri] || t.accent} bg={(priColor[tk.pri] || t.accent) + "18"} />
                        {tk.due && <span style={{ fontSize: 11, fontWeight: 600, color: isOverdue ? t.red : t.muted, padding: "3px 8px", borderRadius: 6, background: isOverdue ? t.red + "20" : t.card }}>{fmtDate(tk.due)}</span>}
                        <select value={tk.st} onChange={e => setTaskStatus(tk.id, e.target.value)} style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid " + statusColor(tk.st, t) + "60", background: statusColor(tk.st, t) + "15", color: statusColor(tk.st, t), fontSize: 11, cursor: "pointer", fontWeight: 700, outline: "none" }}>
                          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: t.card, color: t.text }}>{o.label}</option>)}
                        </select>
                        <div onClick={() => { if (editingTaskNote === tk.id) { setEditingTaskNote(null); } else { setEditingTaskNote(tk.id); setTaskNoteText(tk.raw?.notes || ""); } }} style={{ padding: "5px 8px", borderRadius: 7, background: tk.raw?.notes ? t.yellowBg : t.hover, color: tk.raw?.notes ? t.yellow : t.dim, cursor: "pointer" }} title="Notas">
                          <Edit2 size={13} />
                        </div>
                        <div onClick={() => deleteTask(tk.id)} style={{ padding: "5px 8px", borderRadius: 7, background: t.redBg, color: t.red, cursor: "pointer" }} title="Borrar">
                          <Trash2 size={13} />
                        </div>
                      </div>
                      {/* Task note inline */}
                      {editingTaskNote === tk.id && (
                        <div style={{ marginLeft: 32, marginTop: 6, padding: "10px 12px", borderRadius: 10, background: t.hover, border: "1px solid " + t.border }}>
                          <textarea value={taskNoteText} onChange={e => setTaskNoteText(e.target.value)} placeholder="Nota de la tarea..." autoFocus
                            style={{ width: "100%", minHeight: 60, padding: 8, borderRadius: 6, border: "none", background: "transparent", color: t.text, fontSize: 12, resize: "vertical", outline: "none", fontFamily: "inherit" }} />
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <Btn t={t} variant="primary" size="sm" onClick={() => saveTaskNote(tk.id)}>Guardar</Btn>
                          </div>
                        </div>
                      )}
                      {!editingTaskNote && tk.raw?.notes && (
                        <div style={{ marginLeft: 42, marginTop: 4, fontSize: 11, color: t.dim, lineHeight: 1.5, whiteSpace: "pre-wrap", padding: "6px 10px", borderRadius: 6, background: t.yellowBg + "60", borderLeft: "2px solid " + t.yellow }}>{tk.raw.notes}</div>
                      )}
                    </div>
                  );
                })}
                {pTasks.length === 0 && <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: t.dim }}>Sin tareas — usá "+ Agregar" para crear una</div>}
              </div>

              {/* DOCUMENTS section */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.dim, textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 6 }}><FileText size={12} strokeWidth={2.4} /> Documentos <span style={{ color: t.text, fontWeight: 800 }}>{pDocs.length}</span></span>
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
            )}
          </Crd>
        );
      })}

      {sedeProjects.length > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8, marginBottom: 16 }}>
          <Btn t={t} variant="ghost" size="sm" onClick={() => { const all = {}; sedeProjects.forEach(p => { all[p.id] = false; }); setExpandedProjects(all); }}>Colapsar todos</Btn>
          <Btn t={t} variant="ghost" size="sm" onClick={() => setExpandedProjects({})}>Expandir todos</Btn>
        </div>
      )}

      {/* New project modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo proyecto" t={t}>
        <Inp label="Nombre" val={form.name} onChange={v => setForm({...form, name: v})} t={t} placeholder="Ej: Reforma aula 3" />
        <Select label="Tipo" val={form.type} onChange={v => setForm({...form, type: v})} t={t} options={[
          { value: "general", label: "General" }, { value: "obra", label: "Obra" }, { value: "mejora", label: "Mejora" },
          { value: "academico", label: "Académico" }, { value: "mri", label: "MRI" },
        ]} />
        <Inp label="Deadline" val={form.deadline} onChange={v => setForm({...form, deadline: v})} t={t} type="date" />
        <Inp label="Costo estimado" val={form.cost} onChange={v => setForm({...form, cost: v})} t={t} type="number" placeholder="$0" />
        <Inp label="Descripción" val={form.description} onChange={v => setForm({...form, description: v})} t={t} placeholder="Notas iniciales..." />
        <Btn t={t} onClick={saveProject} disabled={!form.name} size="lg" style={{ width: "100%", marginTop: 4 }}>Crear proyecto</Btn>
      </Modal>
      </div>
      <NotepadRail
        t={t}
        value={sede.notes || ""}
        onSave={saveSedeNotes}
        title={"Anotador — " + sede.name}
        placeholder="Notas, ideas, recordatorios sobre esta sede…"
        summary={[
          { label: "Proyectos", value: sedeProjects.length, icon: FolderKanban, color: t.accent },
          { label: "Tareas pend.", value: pendingTasks.length, icon: ListChecks, color: pendingTasks.length > 0 ? t.orange : t.green },
          { label: "Vencidas", value: overdueTasks.length, icon: AlertCircle, color: overdueTasks.length > 0 ? t.red : t.green },
          { label: "Listos", value: doneProjects.length, icon: CheckCircle2, color: t.green },
          { label: "Documentos", value: documents.filter(d => d.sede_id === sedeId || sedeProjects.some(p => p.id === d.project_id)).length, icon: FileText, color: t.blue },
        ]}
      />
    </div>
  );
}
// ─── PROJECTS PAGE ───
function ProjectsPage({ t, onNav }) {
  const { projects, tasks, sedes, documents, reload, userId, companyId } = useData();
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", type: "general", sede_id: "", deadline: "", cost: "", description: "", status: "todo", progress: "" });
  const [collapsedProjects, setCollapsedProjects] = useState({});
  const toggleCollapsed = (id) => setCollapsedProjects(s => ({ ...s, [id]: !s[id] }));

  const filtered = filter === "all" ? projects : projects.filter(p => p.sede_id === filter || p.type === filter || p.status === filter);

  const openEdit = (p) => {
    setForm({ name: p.name, type: p.type || "general", sede_id: p.sede_id || "", deadline: p.deadline || "", cost: String(p.cost || ""), description: p.description || "", status: normalizeProjectStatus(p.status) || "todo" });
    setEditId(p.id);
    setShowForm(true);
  };

  const saveProject = async () => {
    const data = { name: form.name, type: form.type, sede_id: form.sede_id || null, deadline: form.deadline || null, cost: Number(form.cost) || 0, description: form.description || null, status: form.status };
    if (editId) {
      const { error } = await supabase.from("projects").update(data).eq("id", editId);
      if (error) { alert("Error: " + error.message + (error.code === "23514" ? "\n\nLa DB no soporta este estado todavía. Aplicá la migración SQL en migrations/extend-project-status.sql." : "")); return; }
    } else {
      data.company_id = companyId;
      const { error } = await supabase.from("projects").insert(data);
      if (error) { alert("Error al crear: " + error.message + (error.code === "23514" ? "\n\nLa DB no soporta este estado todavía. Aplicá la migración SQL en migrations/extend-project-status.sql." : "")); return; }
    }
    setShowForm(false); setEditId(null);
    setForm({ name: "", type: "general", sede_id: "", deadline: "", cost: "", description: "", status: "todo" });
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

  // typeEmoji deprecated — usar projectTypeMeta()

  return (
    <div style={{ padding: "32px 32px 40px", overflowY: "auto", height: "calc(100vh - 56px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 12, color: t.accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Workspace</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: -0.7 }}>Proyectos</div>
          <div style={{ fontSize: 13, color: t.muted, marginTop: 4 }}><span style={{ color: t.text, fontWeight: 700 }}>{projects.length}</span> en total · <span style={{ color: t.accent, fontWeight: 700 }}>{projects.filter(p => p.status === "in_progress").length}</span> en curso · <span style={{ color: t.green, fontWeight: 700 }}>{projects.filter(p => p.status === "completed").length}</span> completados</div>
        </div>
        <Btn t={t} onClick={() => { setEditId(null); setForm({ name: "", type: "general", sede_id: "", deadline: "", cost: "", description: "", status: "todo" }); setShowForm(true); }} icon={Plus} size="lg">Nuevo proyecto</Btn>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {[{ id: "all", label: "Todos" }, ...sedes.map(s => ({ id: s.id, label: s.name })), { id: "obra", label: "🏗️ Obras" }, { id: "mejora", label: "🔧 Mejoras" }].map(f => (
          <div key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", background: filter === f.id ? t.grad : t.hover, color: filter === f.id ? "#fff" : t.muted, border: "1px solid " + (filter === f.id ? "transparent" : t.border), transition: "all 0.15s", boxShadow: filter === f.id ? "0 4px 14px " + t.accentGlow : "none" }}>{f.label}</div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Sin proyectos" sub="Creá tu primer proyecto para empezar a organizar el trabajo" t={t} action="Crear proyecto" onAction={() => setShowForm(true)} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {filtered.map(p => {
            const pTasks = tasks.filter(tk => tk.project_id === p.id);
            const pDocs = documents.filter(d => d.project_id === p.id);
            const pendingTasks = pTasks.filter(tk => tk.st !== "done");
            const doneTasks = pTasks.filter(tk => tk.st === "done");
            const daysLeft = p.deadline ? Math.ceil((new Date(p.deadline) - new Date()) / (1000*60*60*24)) : null;
            const projColor = statusColor(p.status, t);
            const isCollapsed = !!collapsedProjects[p.id];
            const ptype = projectTypeMeta(p.type, t);

            return (
              <Crd key={p.id} t={t} hoverable style={{ padding: 0, overflow: "hidden", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "linear-gradient(180deg, " + projColor + ", " + projColor + "60)", boxShadow: "0 0 12px " + projColor + "60" }} />
                {/* Header */}
                <div style={{ padding: "20px 22px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 10 }}>
                    <div onClick={() => toggleCollapsed(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1, cursor: "pointer" }}>
                      <ChevronDown size={16} color={t.muted} style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)", transition: "transform 200ms", flexShrink: 0 }} />
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: ptype.color + "18", border: "1px solid " + ptype.color + "40", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px " + ptype.color + "20" }}><ptype.Icon size={17} color={ptype.color} strokeWidth={2.2} /></div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: t.text, letterSpacing: -0.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: t.muted, marginTop: 1, fontWeight: 500 }}>{p.sede?.name || "Sin sede"} · <span style={{ color: ptype.color, fontWeight: 600 }}>{ptype.label}</span></div>
                      </div>
                    </div>
                    <select value={p.status} onChange={e => quickStatus(p.id, e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid " + projColor + "50", background: projColor + "15", color: projColor, fontSize: 12, cursor: "pointer", fontWeight: 700, outline: "none", flexShrink: 0 }}>
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: t.card, color: t.text }}>{o.label}</option>)}
                    </select>
                  </div>
                  {p.description && !isCollapsed && <div style={{ fontSize: 12, color: t.dim, marginTop: 8, lineHeight: 1.5, paddingLeft: 26 }}>{p.description}</div>}
                </div>

                {!isCollapsed && (
                  <>
                    {/* Stats row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderTop: "1px solid " + t.border, borderBottom: "1px solid " + t.border }}>
                      <div style={{ padding: "14px 12px", textAlign: "center", borderRight: "1px solid " + t.border }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: pendingTasks.length > 0 ? t.orange : t.green, letterSpacing: -0.5 }}>{pendingTasks.length}</div>
                        <div style={{ fontSize: 10, color: t.dim, marginTop: 2, fontWeight: 600, letterSpacing: 0.3 }}>Pendientes</div>
                      </div>
                      <div style={{ padding: "14px 12px", textAlign: "center", borderRight: "1px solid " + t.border }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: t.green, letterSpacing: -0.5 }}>{doneTasks.length}</div>
                        <div style={{ fontSize: 10, color: t.dim, marginTop: 2, fontWeight: 600, letterSpacing: 0.3 }}>Listas</div>
                      </div>
                      <div style={{ padding: "14px 12px", textAlign: "center", borderRight: "1px solid " + t.border }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: t.text, letterSpacing: -0.5 }}>{pDocs.length}</div>
                        <div style={{ fontSize: 10, color: t.dim, marginTop: 2, fontWeight: 600, letterSpacing: 0.3 }}>Docs</div>
                      </div>
                      <div style={{ padding: "14px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: daysLeft !== null && daysLeft < 0 ? t.red : daysLeft !== null && daysLeft <= 7 ? t.orange : t.text, letterSpacing: -0.5 }}>{daysLeft !== null ? (daysLeft < 0 ? "Vencido" : daysLeft + "d") : "—"}</div>
                        <div style={{ fontSize: 10, color: t.dim, marginTop: 2, fontWeight: 600, letterSpacing: 0.3 }}>Deadline</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ padding: "12px 16px", display: "flex", gap: 8 }}>
                      <Btn t={t} variant="secondary" size="sm" icon={Edit2} onClick={() => openEdit(p)} style={{ flex: 1 }}>Editar</Btn>
                      <Btn t={t} variant="danger" size="sm" icon={Trash2} onClick={() => deleteProject(p.id)} />
                    </div>
                  </>
                )}
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
            { value: "general", label: "General" }, { value: "obra", label: "Obra" }, { value: "mejora", label: "Mejora" },
            { value: "academico", label: "Académico" }, { value: "mri", label: "MRI" },
          ]} />
          <Select label="Estado" val={form.status} onChange={v => setForm({...form, status: v})} t={t} options={STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Inp label="Deadline" val={form.deadline} onChange={v => setForm({...form, deadline: v})} t={t} type="date" />
          <Inp label="Costo estimado" val={form.cost} onChange={v => setForm({...form, cost: v})} t={t} type="number" placeholder="$0" />
        </div>
        <Inp label="Descripción / Notas" val={form.description} onChange={v => setForm({...form, description: v})} t={t} placeholder="Notas, observaciones..." />
        <Btn t={t} onClick={saveProject} disabled={!form.name} size="lg" style={{ width: "100%", marginTop: 4 }}>{editId ? "Guardar cambios" : "Crear proyecto"}</Btn>
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
  // 5 columnas: pendiente, en curso, esperando respuesta, pendiente solución, listo
  const columns = STATUS_OPTIONS.map(o => ({ id: o.value, label: o.label, color: statusColor(o.value, t), bg: statusColor(o.value, t) + "1F" }));

  const TaskCard = ({ tk }) => {
    const isOverdue = tk.due && tk.st !== "done" && new Date(tk.due) < new Date(todayStr);
    const daysLeft = tk.due ? Math.ceil((new Date(tk.due) - new Date()) / (1000*60*60*24)) : null;
    const stColor = isOverdue && tk.st !== "done" ? t.red : statusColor(tk.st, t);
    return (
      <Crd t={t} hoverable style={{ padding: 14, marginBottom: 8, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: stColor, boxShadow: "0 0 8px " + stColor + "60" }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 6, paddingLeft: 6, lineHeight: 1.35 }}>{tk.title}</div>
        <div style={{ fontSize: 11, color: t.muted, marginBottom: 10, paddingLeft: 6 }}>{tk.project}{tk.sede ? " · " + tk.sede : ""}</div>
        <div style={{ display: "flex", gap: 5, marginBottom: 10, paddingLeft: 6, flexWrap: "wrap" }}>
          <Badge label={priLabels[tk.pri] || "Media"} color={priColors[tk.pri] || t.accent} bg={(priColors[tk.pri] || t.accent) + "18"} dot />
          {tk.due && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: isOverdue ? t.redBg : t.hover, color: isOverdue ? t.red : t.dim, border: "1px solid " + (isOverdue ? t.red : t.border) + "40" }}>
            {isOverdue ? "Vencida" : daysLeft === 0 ? "Hoy" : daysLeft === 1 ? "Mañana" : daysLeft + "d"}
          </span>}
        </div>
        <div style={{ display: "flex", gap: 5, paddingLeft: 6 }}>
          {tk.st === "todo" && <Btn t={t} variant="accent" size="sm" onClick={() => updateStatus(tk.id, "in_progress")} style={{ flex: 1 }}>Iniciar</Btn>}
          {tk.st === "in_progress" && <Btn t={t} variant="success" size="sm" icon={CheckCircle2} onClick={() => updateStatus(tk.id, "done")} style={{ flex: 1 }}>Completar</Btn>}
          {(tk.st === "waiting_response" || tk.st === "pending_solution") && <Btn t={t} variant="accent" size="sm" onClick={() => updateStatus(tk.id, "in_progress")} style={{ flex: 1 }}>Reanudar</Btn>}
          {tk.st === "done" && <Btn t={t} variant="ghost" size="sm" onClick={() => updateStatus(tk.id, "todo")} style={{ flex: 1 }}>Reabrir</Btn>}
          <Btn t={t} variant="danger" size="sm" icon={Trash2} onClick={() => deleteTask(tk.id)} />
        </div>
      </Crd>
    );
  };

  return (
    <div style={{ padding: "32px 32px 40px", overflowY: "auto", height: "calc(100vh - 56px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: t.accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Workspace</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: -0.7 }}>Tareas</div>
          <div style={{ fontSize: 13, color: t.muted, marginTop: 4 }}><span style={{ color: t.orange, fontWeight: 700 }}>{tasks.filter(tk => tk.st !== "done").length}</span> pendientes · <span style={{ color: t.green, fontWeight: 700 }}>{tasks.filter(tk => tk.st === "done").length}</span> completadas</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid " + t.border, background: t.hover, padding: 3 }}>
            {["kanban", "list"].map(v => (
              <div key={v} onClick={() => setView(v)} style={{ padding: "7px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 7, background: view === v ? t.card : "transparent", color: view === v ? t.text : t.muted, transition: "all 140ms", boxShadow: view === v ? t.shadow : "none" }}>{v === "kanban" ? "Kanban" : "Lista"}</div>
            ))}
          </div>
          <Btn t={t} onClick={() => setShowForm(true)} icon={Plus} size="lg">Nueva tarea</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 22, flexWrap: "wrap" }}>
        {[{ id: "all", label: "Todas" }, ...sedes.map(s => ({ id: s.id, label: s.name }))].map(f => (
          <div key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", background: filter === f.id ? t.grad : t.hover, color: filter === f.id ? "#fff" : t.muted, border: "1px solid " + (filter === f.id ? "transparent" : t.border), boxShadow: filter === f.id ? "0 4px 14px " + t.accentGlow : "none" }}>{f.label}</div>
        ))}
      </div>

      {view === "kanban" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(220px, 1fr))", gap: 12, alignItems: "flex-start", overflowX: "auto" }}>
          {columns.map(col => {
            const colTasks = filtered.filter(tk => tk.st === col.id);
            return (
              <div key={col.id} style={{ minWidth: 0 }}>
                <div style={{ padding: "10px 14px", borderRadius: 10, background: col.bg, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid " + col.color + "30" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: col.color, boxShadow: "0 0 8px " + col.color + "90" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: col.color, letterSpacing: 0.2 }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: col.color, background: col.color + "20", padding: "2px 8px", borderRadius: 999 }}>{colTasks.length}</span>
                </div>
                {colTasks.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", fontSize: 11, color: t.dim, borderRadius: 10, border: "1.5px dashed " + t.border, background: t.hover + "60" }}>Sin tareas</div>
                ) : colTasks.map(tk => <TaskCard key={tk.id} tk={tk} />)}
              </div>
            );
          })}
        </div>
      ) : (
        filtered.length === 0 ? <EmptyState icon={CheckSquare} title="Sin tareas" sub="Creá tu primera tarea" t={t} action="Nueva tarea" onAction={() => setShowForm(true)} /> :
        filtered.map(tk => {
          const isOverdue = tk.due && tk.st !== "done" && new Date(tk.due) < new Date(todayStr);
          const stColor = isOverdue && tk.st !== "done" ? t.red : statusColor(tk.st, t);
          return (
            <div key={tk.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, marginBottom: 8, background: t.card, border: "1px solid " + t.border, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: stColor, boxShadow: "0 0 8px " + stColor + "60" }} />
              <div onClick={() => updateStatus(tk.id, tk.st === "done" ? "todo" : tk.st === "todo" ? "in_progress" : "done")} style={{ cursor: "pointer", padding: 4, marginLeft: 4 }}>
                {tk.st === "done" ? <CheckCircle2 size={22} color={t.green} /> : <Circle size={22} color={t.dim} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: t.text, fontWeight: 600, textDecoration: tk.st === "done" ? "line-through" : "none" }}>{tk.title}</div>
                <div style={{ fontSize: 11, color: t.dim, marginTop: 2 }}>{tk.project}{tk.sede ? " · " + tk.sede : ""}</div>
              </div>
              <Badge label={priLabels[tk.pri]} color={priColors[tk.pri] || t.accent} bg={(priColors[tk.pri] || t.accent) + "18"} dot />
              <StatusBadge s={tk.st} t={t} />
              {tk.due && <span style={{ fontSize: 11, fontWeight: 600, color: isOverdue ? t.red : t.muted, padding: "3px 8px", borderRadius: 6, background: isOverdue ? t.red + "20" : t.hover }}>{fmtDate(tk.due)}</span>}
              <Btn t={t} variant="danger" size="sm" icon={Trash2} onClick={() => deleteTask(tk.id)} />
            </div>
          );
        })
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nueva tarea" t={t} width={480}>
        <Inp label="¿Qué hay que hacer?" val={form.title} onChange={v => setForm({...form, title: v})} t={t} placeholder="Describí la tarea..." />
        <Select label="Proyecto" val={form.project_id} onChange={v => setForm({...form, project_id: v})} t={t} options={[{ value: "", label: "Sin proyecto" }, ...projects.map(p => ({ value: p.id, label: p.name }))]} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Select label="Sede" val={form.sede_id} onChange={v => setForm({...form, sede_id: v})} t={t} options={[{ value: "", label: "Sin sede" }, ...sedes.map(s => ({ value: s.id, label: s.name }))]} />
          <Select label="Prioridad" val={form.priority} onChange={v => setForm({...form, priority: v})} t={t} options={[{ value: "high", label: "Alta" }, { value: "medium", label: "Media" }, { value: "low", label: "Baja" }]} />
        </div>
        <Inp label="Fecha límite" val={form.due_date} onChange={v => setForm({...form, due_date: v})} t={t} type="date" />
        <Btn t={t} onClick={saveTask} disabled={!form.title} size="lg" style={{ width: "100%", marginTop: 4 }}>Crear tarea</Btn>
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
    <div style={{ padding: "32px 32px 40px", overflowY: "auto", height: "calc(100vh - 56px)" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, color: t.accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Finanzas</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: -0.7 }}>Presupuestos</div>
        <div style={{ fontSize: 13, color: t.muted, marginTop: 4 }}>Control de gasto por sede y proyecto</div>
      </div>

      {/* Global KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Budget total", val: fmt(totalBudget), color: t.text, icon: Wallet },
          { label: "Asignado", val: fmt(totalAllocated), color: t.blue, icon: Target },
          { label: "Gastado", val: fmt(totalSpent), color: t.orange, icon: TrendingUp },
          { label: "Disponible", val: fmt(totalBudget - totalSpent), color: totalBudget - totalSpent >= 0 ? t.green : t.red, icon: DollarSign },
        ].map((k, i) => (
          <Crd key={i} t={t} style={{ padding: 20, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: k.color + "15", filter: "blur(28px)" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: t.muted, letterSpacing: 0.3, textTransform: "uppercase" }}>{k.label}</span>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: k.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <k.icon size={14} color={k.color} strokeWidth={2.4} />
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: k.color, letterSpacing: -0.7, lineHeight: 1 }}>{k.val}</div>
            </div>
          </Crd>
        ))}
      </div>

      {/* By sede */}
      <div style={{ fontSize: 17, fontWeight: 700, color: t.text, marginBottom: 14, letterSpacing: -0.3 }}>Por sede</div>
      {sedes.map(s => {
        const sedeProjects = projects.filter(p => p.sede_id === s.id);
        const sedeBudget = Number(s.budget || 0);
        const sedeSpent = sedeProjects.reduce((sum, p) => sum + (p.cost_spent || 0), 0);
        const usedPct = sedeBudget > 0 ? pct(sedeSpent, sedeBudget) : 0;
        const usageColor = usedPct > 90 ? t.red : usedPct > 70 ? t.orange : t.green;
        const sc = s.color || t.accent;
        return (
          <Crd key={s.id} t={t} style={{ padding: 24, marginBottom: 16, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "linear-gradient(180deg, " + sc + ", " + sc + "60)", boxShadow: "0 0 14px " + sc + "70" }} />
            <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: usageColor + "15", filter: "blur(40px)" }} />
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, " + sc + "30, " + sc + "10)", border: "1px solid " + sc + "40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 16px " + sc + "30" }}>{s.icon || "🏢"}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: t.text, letterSpacing: -0.4 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: t.dim, marginTop: 2 }}>{sedeProjects.length} proyecto{sedeProjects.length !== 1 ? "s" : ""}{s.address ? " · " + s.address : ""}</div>
                </div>
              </div>
              {sedeBudget > 0 ? (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: t.dim, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 2 }}>Ejecutado</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 36, fontWeight: 800, color: usageColor, letterSpacing: -1.2, lineHeight: 1 }}>{usedPct}</span>
                    <span style={{ fontSize: 16, color: t.dim, fontWeight: 700 }}>%</span>
                  </div>
                </div>
              ) : (
                <Badge label="Sin presupuesto" color={t.dim} bg={t.hover} />
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: sedeProjects.length > 0 ? 16 : 0 }}>
              <div style={{ padding: "10px 12px", borderRadius: 10, background: t.hover }}>
                <div style={{ fontSize: 10, color: t.dim, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 4 }}>Budget</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>{fmt(sedeBudget)}</div>
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 10, background: t.orangeBg }}>
                <div style={{ fontSize: 10, color: t.dim, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 4 }}>Gastado</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.orange }}>{fmt(sedeSpent)}</div>
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 10, background: (sedeBudget - sedeSpent >= 0 ? t.greenBg : t.redBg) }}>
                <div style={{ fontSize: 10, color: t.dim, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 4 }}>Disponible</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: sedeBudget - sedeSpent >= 0 ? t.green : t.red }}>{fmt(sedeBudget - sedeSpent)}</div>
              </div>
            </div>

            {sedeProjects.length > 0 && (
              <div style={{ borderTop: "1px solid " + t.border, paddingTop: 12 }}>
                <div style={{ fontSize: 10, color: t.dim, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 8 }}>Detalle por proyecto</div>
                {sedeProjects.map(p => {
                  const pUsed = p.cost > 0 ? pct(p.cost_spent, p.cost) : 0;
                  return (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, background: t.hover, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>{p.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: t.muted, fontSize: 12 }}>{fmt(p.cost_spent)} <span style={{ color: t.dim }}>/</span> {fmt(p.cost)}</span>
                        {p.cost > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: pUsed > 90 ? t.red : pUsed > 70 ? t.orange : t.green, minWidth: 38, textAlign: "right" }}>{pUsed}%</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Crd>
        );
      })}

      {/* Unassigned projects */}
      {projects.filter(p => !p.sede_id && p.cost > 0).length > 0 && (
        <Crd t={t} style={{ padding: 22, marginTop: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 12, letterSpacing: -0.3 }}>Proyectos sin sede</div>
          {projects.filter(p => !p.sede_id && p.cost > 0).map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, background: t.hover, marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>{p.name}</span>
              <span style={{ color: t.muted, fontSize: 12 }}>{fmt(p.cost_spent)} <span style={{ color: t.dim }}>/</span> {fmt(p.cost)}</span>
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
    <div style={{ padding: "32px 32px 40px", overflowY: "auto", height: "calc(100vh - 56px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: t.accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Repositorio</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: -0.7 }}>Documentos</div>
          <div style={{ fontSize: 13, color: t.muted, marginTop: 4 }}><span style={{ color: t.text, fontWeight: 700 }}>{documents.length}</span> archivos en total</div>
        </div>
        <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => { handleUpload(e.target.files); e.target.value = ""; }} />
        <Btn t={t} onClick={() => fileRef.current?.click()} icon={Upload} size="lg">Subir archivo</Btn>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 22, flexWrap: "wrap" }}>
        {[{ id: "all", label: "Todos (" + documents.length + ")" }, { id: "unlinked", label: "Sin vincular" }, ...sedes.map(s => ({ id: s.id, label: s.name }))].map(f => (
          <div key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "7px 14px", borderRadius: 999, fontSize: 12, cursor: "pointer", background: filter === f.id ? t.grad : t.hover, color: filter === f.id ? "#fff" : t.muted, fontWeight: 600, border: "1px solid " + (filter === f.id ? "transparent" : t.border), boxShadow: filter === f.id ? "0 4px 14px " + t.accentGlow : "none" }}>{f.label}</div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="Sin documentos" sub="Subí archivos para organizarlos por proyecto o sede" t={t} action="Subir archivo" onAction={() => fileRef.current?.click()} />
      ) : filtered.map(d => {
        const ext = d.name?.split(".").pop()?.toLowerCase() || "";
        const fileColor = ["xlsx","csv","xls","tsv"].includes(ext) ? t.green : ["pdf"].includes(ext) ? t.red : ["doc","docx"].includes(ext) ? t.blue : t.accent;
        return (
          <Crd key={d.id} t={t} hoverable style={{ padding: "14px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(180deg, " + fileColor + ", " + fileColor + "60)", boxShadow: "0 0 10px " + fileColor + "60" }} />
            <div style={{ width: 44, height: 44, borderRadius: 11, background: "linear-gradient(135deg, " + fileColor + "30, " + fileColor + "10)", border: "1px solid " + fileColor + "40", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 14px " + fileColor + "20", marginLeft: 6 }}>
              <FileText size={19} color={fileColor} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: -0.2 }}>{d.name}</div>
              <div style={{ fontSize: 11, color: t.dim, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ padding: "1px 7px", borderRadius: 5, background: fileColor + "20", color: fileColor, fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>{ext || "file"}</span>
                <span>•</span>
                <span>{d.date}</span>
                {d.raw?.size && <><span>•</span><span>{d.raw.size}</span></>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {d.file_url && (
                <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: t.accent, textDecoration: "none", padding: "8px 14px", background: t.accentBg, borderRadius: 9, fontWeight: 700, border: "1px solid " + t.accent + "40", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 140ms" }}><Eye size={13} strokeWidth={2.4} /> Ver</a>
              )}
              <Btn t={t} variant="danger" size="sm" icon={Trash2} onClick={() => deleteDoc(d.id)} disabled={deleting === d.id} />
            </div>
          </Crd>
        );
      })}
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
    <div style={{ padding: "32px 32px 40px", overflowY: "auto", height: "calc(100vh - 56px)" }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: t.grad, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px " + t.accentGlow }}>
          <Sparkles size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 12, color: t.accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>Inteligencia artificial</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: t.text, letterSpacing: -0.7 }}>Informes IA</div>
          <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>Subí un archivo y obtené un análisis automático</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: currentResult ? "1.1fr 1fr" : "1fr", gap: 18 }}>
        {/* Left: controls */}
        <div>
          {/* Report type selection */}
          <div style={{ fontSize: 11, fontWeight: 700, color: t.dim, marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>Tipo de análisis</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
            {reportTypes.map(r => {
              const sel = reportType === r.value;
              return (
                <Crd key={r.value} t={t} hoverable onClick={() => setReportType(r.value)} style={{ padding: 14, position: "relative", overflow: "hidden", border: "1px solid " + (sel ? t.accent : t.border), background: sel ? t.gradGlow : t.card }}>
                  {sel && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: t.grad, boxShadow: "0 0 12px " + t.accentGlow }} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: sel ? t.grad : t.hover, border: "1px solid " + (sel ? "transparent" : t.border), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: sel ? "0 4px 14px " + t.accentGlow : "none" }}>
                      <r.icon size={15} color={sel ? "#fff" : t.muted} strokeWidth={2.4} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: sel ? t.text : t.text, letterSpacing: -0.2 }}>{r.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: t.dim, lineHeight: 1.4, paddingLeft: 42 }}>{r.desc}</div>
                </Crd>
              );
            })}
          </div>

          {reportType === "custom" && (
            <Crd t={t} style={{ padding: 14, marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.dim, marginBottom: 8, letterSpacing: 0.4, textTransform: "uppercase" }}>Instrucciones personalizadas</div>
              <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Ej: Analizá las ventas por mes y decime cuáles son los 3 productos más rentables…" style={{ width: "100%", height: 90, padding: 12, borderRadius: 9, border: "1px solid " + t.border, background: t.hover, color: t.text, fontSize: 13, lineHeight: 1.5, resize: "vertical", outline: "none", fontFamily: "inherit" }} />
            </Crd>
          )}

          {/* File upload */}
          <div style={{ fontSize: 11, fontWeight: 700, color: t.dim, marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>Archivo</div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.tsv,.txt" style={{ display: "none" }} onChange={e => { handleFileSelect(e.target.files); e.target.value = ""; }} />
          <div onClick={() => fileRef.current?.click()} style={{
            position: "relative", overflow: "hidden",
            border: "1.5px dashed " + (selectedFile ? t.green : t.borderStrong),
            borderRadius: 14, padding: "32px 24px", textAlign: "center",
            cursor: "pointer", marginBottom: 18, background: selectedFile ? t.greenBg : t.hover + "60", transition: "all 180ms ease",
          }}>
            {selectedFile && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, " + t.green + "12, transparent 60%)", pointerEvents: "none" }} />}
            <div style={{ position: "relative" }}>
              {selectedFile ? (
                <>
                  <div style={{ width: 50, height: 50, margin: "0 auto 10px", borderRadius: 12, background: t.green + "20", border: "1px solid " + t.green + "40", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px " + t.green + "40" }}>
                    <FileText size={24} color={t.green} strokeWidth={2.2} />
                  </div>
                  <div style={{ fontSize: 14, color: t.text, fontWeight: 700, letterSpacing: -0.2, marginBottom: 2 }}>{selectedFile}</div>
                  <div style={{ fontSize: 11, color: t.dim }}>Click para cambiar archivo</div>
                </>
              ) : (
                <>
                  <div style={{ width: 50, height: 50, margin: "0 auto 10px", borderRadius: 12, background: t.hover, border: "1px solid " + t.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Upload size={22} color={t.muted} strokeWidth={2.2} />
                  </div>
                  <div style={{ fontSize: 14, color: t.text, fontWeight: 600, marginBottom: 4 }}>Subí tu archivo</div>
                  <div style={{ fontSize: 11, color: t.dim }}>Excel · CSV · TSV · TXT — máx 15 MB</div>
                </>
              )}
            </div>
          </div>

          <button onClick={generateReport} disabled={!fileData || generating} style={{
            width: "100%", padding: "14px 22px", borderRadius: 11, background: t.grad, color: "#fff", border: "none",
            fontSize: 14, fontWeight: 700, cursor: !fileData || generating ? "not-allowed" : "pointer",
            opacity: fileData && !generating ? 1 : 0.55, boxShadow: "0 8px 24px " + t.accentGlow,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "transform 140ms, box-shadow 140ms",
            fontFamily: "inherit", letterSpacing: 0.1,
          }}>
            {generating ? <><Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> Analizando datos…</> : <><Sparkles size={16} strokeWidth={2.4} /> Generar informe</>}
          </button>

          {/* History */}
          {reports.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.dim, marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>Informes anteriores ({reports.length})</div>
              {reports.slice(0, 10).map(r => {
                const sel = activeReport?.id === r.id;
                return (
                  <div key={r.id} onClick={() => { setActiveReport(r); setResult(null); }} style={{
                    padding: "11px 14px", borderRadius: 10, marginBottom: 6, cursor: "pointer",
                    background: sel ? t.accentBg : t.hover,
                    border: "1px solid " + (sel ? t.accent + "60" : t.border),
                    boxShadow: sel ? "0 4px 16px " + t.accentGlow + "40" : "none",
                    transition: "all 140ms",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: sel ? t.grad : t.card, border: "1px solid " + (sel ? "transparent" : t.border), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Sparkles size={13} color={sel ? "#fff" : t.muted} strokeWidth={2.4} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                      <div style={{ fontSize: 10, color: t.dim, marginTop: 1 }}>{r.created_at?.split("T")[0]} · <span style={{ textTransform: "capitalize" }}>{(r.report_type || "").replace(/_/g, " ")}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: result */}
        {currentResult && (
          <Crd t={t} style={{ padding: 0, alignSelf: "flex-start", maxHeight: "calc(100vh - 120px)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: t.grad, boxShadow: "0 0 18px " + t.accentGlow }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid " + t.border, background: t.gradGlow }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: t.grad, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px " + t.accentGlow }}>
                  <Sparkles size={15} color="#fff" strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.text, letterSpacing: -0.2 }}>Resultado del análisis</div>
                  <div style={{ fontSize: 10, color: t.dim }}>Generado por IA · revisá antes de compartir</div>
                </div>
              </div>
              <div onClick={() => { setResult(null); setActiveReport(null); }} style={{ width: 28, height: 28, borderRadius: 7, background: t.hover, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={14} color={t.muted} /></div>
            </div>
            <div style={{ padding: 22, fontSize: 13, color: t.text, lineHeight: 1.75, whiteSpace: "pre-wrap", overflowY: "auto" }}>{currentResult}</div>
          </Crd>
        )}
      </div>
    </div>
  );
}

// ─── CALENDAR PAGE ───
// Tipos de entrada en el calendario:
//   - tarea (default)        — tasks normales
//   - reunion                — tasks con tag "reunion"
//   - evento                 — tasks con tag "evento"
//   - deadline (de proyecto) — derivado de projects.deadline
const CAL_TYPES = {
  tarea:    { label: "Tarea",    icon: CheckSquare, key: "task" },
  reunion:  { label: "Reunión",  icon: Users,       key: "meeting" },
  evento:   { label: "Evento",   icon: Sparkles,    key: "event" },
};

const tagsHas = (tags, v) => Array.isArray(tags) && tags.some(x => String(x).toLowerCase() === v);

function CalendarPage({ t, onNav }) {
  const { tasks, projects, reload, companyId } = useData();
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", type: "tarea", project_id: "", priority: "medium" });
  const [filter, setFilter] = useState("all"); // all | tarea | reunion | evento | deadline
  const year = month.getFullYear();
  const mo = month.getMonth();
  const firstDay = new Date(year, mo, 1).getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  const colorFor = (kind, st) => {
    if (kind === "reunion") return t.cyan;
    if (kind === "evento") return t.pink;
    if (kind === "deadline") return t.purple;
    // tarea: usar color del estado
    return statusColor(st, t);
  };

  const events = useMemo(() => {
    const ev = [];
    tasks.forEach(tk => {
      if (!tk.due) return;
      const tags = tk.tags || tk.raw?.tags || [];
      const kind = tagsHas(tags, "reunion") ? "reunion" : tagsHas(tags, "evento") ? "evento" : "tarea";
      ev.push({ date: tk.due, label: tk.title, kind, color: colorFor(kind, tk.st), id: tk.id, status: tk.st });
    });
    projects.forEach(p => {
      if (!p.deadline) return;
      ev.push({ date: p.deadline, label: p.name, kind: "deadline", color: colorFor("deadline"), id: p.id });
    });
    return ev;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, projects, t]);

  const filteredEvents = filter === "all" ? events : events.filter(e => e.kind === filter);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const monthName = month.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const selectedEvents = selectedDate ? filteredEvents.filter(e => e.date === selectedDate) : [];

  const addEntry = async () => {
    if (!form.title || !selectedDate) return;
    const tags = form.type === "reunion" ? ["reunion"] : form.type === "evento" ? ["evento"] : [];
    const { error } = await supabase.from("tasks").insert({
      company_id: companyId, title: form.title, due_date: selectedDate,
      project_id: form.project_id || null, priority: form.priority, status: "todo", tags,
    });
    if (error) { alert("Error: " + error.message); return; }
    setShowForm(false);
    setForm({ title: "", type: "tarea", project_id: "", priority: "medium" });
    reload();
  };

  return (
    <div style={{ padding: "32px 32px 40px", overflowY: "auto", height: "calc(100vh - 56px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: t.accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Timeline</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: -0.7 }}>Calendario</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 4, background: t.hover, borderRadius: 10, border: "1px solid " + t.border }}>
          <Btn t={t} variant="ghost" size="sm" onClick={() => setMonth(new Date())}>Hoy</Btn>
          <div onClick={() => setMonth(new Date(year, mo - 1))} style={{ padding: 7, borderRadius: 7, cursor: "pointer", display: "flex", background: t.card, border: "1px solid " + t.border }}>
            <ChevronLeft size={15} color={t.muted} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: t.text, textTransform: "capitalize", minWidth: 160, textAlign: "center", letterSpacing: -0.2 }}>{monthName}</span>
          <div onClick={() => setMonth(new Date(year, mo + 1))} style={{ padding: 7, borderRadius: 7, cursor: "pointer", display: "flex", background: t.card, border: "1px solid " + t.border }}>
            <ChevronRight size={15} color={t.muted} />
          </div>
        </div>
      </div>

      {/* Filtros por tipo */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { id: "all", label: "Todos", color: t.muted },
          { id: "tarea", label: "Tareas", color: t.blue },
          { id: "reunion", label: "Reuniones", color: t.cyan },
          { id: "evento", label: "Eventos", color: t.pink },
          { id: "deadline", label: "Deadlines", color: t.purple },
        ].map(f => (
          <div key={f.id} onClick={() => setFilter(f.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", background: filter === f.id ? f.color + "20" : t.hover, color: filter === f.id ? f.color : t.muted, border: "1px solid " + (filter === f.id ? f.color + "60" : t.border), transition: "all 140ms" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: f.color, boxShadow: filter === f.id ? "0 0 8px " + f.color + "90" : "none" }} />
            {f.label}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedDate ? "1fr 340px" : "1fr", gap: 18 }}>
        <Crd t={t} style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d, i) => (
              <div key={d} style={{ padding: "10px 4px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: i === 0 || i === 6 ? t.accent : t.dim, letterSpacing: 0.6, textTransform: "uppercase" }}>{d}</div>
            ))}
            {days.map((d, i) => {
              if (!d) return <div key={i} />;
              const dateStr = `${year}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const dayEvents = filteredEvents.filter(e => e.date === dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const dow = new Date(dateStr + "T12:00:00").getDay();
              const isWeekend = dow === 0 || dow === 6;
              return (
                <div key={i} onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)} style={{
                  position: "relative", minHeight: 92, padding: 8,
                  border: "1px solid " + (isSelected ? t.accent : isToday ? t.accent + "70" : t.border),
                  borderRadius: 11,
                  background: isSelected ? t.gradGlow : isToday ? t.accentBg : isWeekend ? t.bg + "40" : t.hover + "30",
                  cursor: "pointer", transition: "all 180ms ease",
                  boxShadow: isSelected ? "0 8px 24px " + t.accentGlow + "60, 0 0 0 1px " + t.accent : isToday ? "0 4px 14px " + t.accentGlow + "30" : "none",
                  overflow: "hidden",
                }}>
                  {isToday && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: t.grad, boxShadow: "0 0 8px " + t.accentGlow }} />}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: isToday ? 22 : "auto", height: isToday ? 22 : "auto",
                      minWidth: isToday ? 22 : "auto",
                      borderRadius: isToday ? 7 : 0,
                      background: isToday ? t.grad : "transparent",
                      color: isToday ? "#fff" : t.text,
                      fontSize: 12, fontWeight: isToday ? 800 : 600,
                      boxShadow: isToday ? "0 4px 12px " + t.accentGlow : "none",
                      padding: isToday ? "0" : "0",
                    }}>{d}</span>
                    {dayEvents.length > 0 && !isToday && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: t.muted, background: t.hover, padding: "1px 6px", borderRadius: 999, border: "1px solid " + t.border }}>{dayEvents.length}</span>
                    )}
                  </div>
                  {dayEvents.slice(0, 3).map((e, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, padding: "2px 6px", borderRadius: 5, background: e.color + "1F", color: e.color, marginBottom: 2, overflow: "hidden", whiteSpace: "nowrap", fontWeight: 600 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: e.color, boxShadow: "0 0 6px " + e.color, flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{e.label}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div style={{ fontSize: 9, color: t.accent, fontWeight: 700, marginTop: 2 }}>+{dayEvents.length - 3} más</div>}
                </div>
              );
            })}
          </div>
        </Crd>

        {/* Day detail panel */}
        {selectedDate && (
          <Crd t={t} style={{ padding: 18, alignSelf: "flex-start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.text, textTransform: "capitalize", letterSpacing: -0.3 }}>{new Date(selectedDate + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</div>
              <div onClick={() => setSelectedDate(null)} style={{ width: 26, height: 26, borderRadius: 7, background: t.hover, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={14} color={t.muted} /></div>
            </div>

            {selectedEvents.length === 0 ? (
              <div style={{ padding: 18, textAlign: "center", fontSize: 12, color: t.dim }}>Sin entradas este día</div>
            ) : selectedEvents.map((e, i) => {
              const meta = e.kind === "deadline" ? "Deadline de proyecto" : (CAL_TYPES[e.kind]?.label || "Tarea");
              return (
                <div key={i} style={{ padding: "10px 12px", borderRadius: 9, background: t.hover, marginBottom: 6, borderLeft: "3px solid " + e.color, display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: e.color + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {e.kind === "reunion" ? <Users size={13} color={e.color} /> : e.kind === "evento" ? <Sparkles size={13} color={e.color} /> : e.kind === "deadline" ? <Target size={13} color={e.color} /> : <CheckSquare size={13} color={e.color} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{e.label}</div>
                    <div style={{ fontSize: 10, color: t.dim }}>{meta}{e.status ? " · " + (STATUS_OPTIONS.find(o => o.value === e.status)?.label || e.status) : ""}</div>
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 14, borderTop: "1px solid " + t.border, paddingTop: 14 }}>
              {!showForm ? (
                <Btn t={t} onClick={() => setShowForm(true)} icon={Plus} size="md" style={{ width: "100%" }}>Agregar al día</Btn>
              ) : (
                <div>
                  <Select label="Tipo" val={form.type} onChange={v => setForm({...form, type: v})} t={t} options={[
                    { value: "tarea", label: "Tarea" },
                    { value: "reunion", label: "Reunión" },
                    { value: "evento", label: "Evento" },
                  ]} />
                  <Inp label="Título" val={form.title} onChange={v => setForm({...form, title: v})} t={t} placeholder={form.type === "reunion" ? "Reunión con..." : form.type === "evento" ? "Nombre del evento" : "Nombre de la tarea"} />
                  <Select label="Proyecto" val={form.project_id} onChange={v => setForm({...form, project_id: v})} t={t} options={[{ value: "", label: "Sin proyecto" }, ...projects.map(p => ({ value: p.id, label: p.name }))]} />
                  {form.type === "tarea" && (
                    <Select label="Prioridad" val={form.priority} onChange={v => setForm({...form, priority: v})} t={t} options={[
                      { value: "high", label: "Alta" }, { value: "medium", label: "Media" }, { value: "low", label: "Baja" }
                    ]} />
                  )}
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <Btn t={t} variant="secondary" size="sm" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancelar</Btn>
                    <Btn t={t} size="sm" onClick={addEntry} disabled={!form.title} style={{ flex: 1 }}>Crear</Btn>
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
  const [sedeForm, setSedeForm] = useState({ name: "", address: "", budget: "", color: "#7C5CFF", icon: "🏢" });
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
    setSedeForm({ name: "", address: "", budget: "", color: "#7C5CFF", icon: "🏢" });
    reload();
  };

  const deleteSede = async (id) => {
    if (!window.confirm("¿Eliminar esta sede? Los proyectos asociados quedarán sin sede.")) return;
    await supabase.from("sedes").delete().eq("id", id);
    reload();
  };

  const editSede = (s) => {
    setSedeForm({ name: s.name, address: s.address || "", budget: String(s.budget || ""), color: s.color || "#7C5CFF", icon: s.icon || "🏢" });
    setEditId(s.id);
    setShowSedeForm(true);
  };

  const icons = ["🏢", "🏛️", "🏖️", "🏠", "🏗️", "📍", "🎓", "💼", "🏥", "🏭"];
  const colors = ["#7C5CFF", "#3DDC84", "#FFA34D", "#FF4D6D", "#FF6FB5", "#4DA8FF", "#FFD93D", "#B86BFF"];

  return (
    <div style={{ padding: "32px 32px 40px", overflowY: "auto", height: "calc(100vh - 56px)" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: t.accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Sistema</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: -0.7 }}>Configuración</div>
      </div>

      {/* Profile */}
      <Crd t={t} style={{ padding: 22, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: t.dim, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 14 }}>Perfil</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: t.grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#fff", fontWeight: 800, boxShadow: "0 6px 20px " + t.accentGlow }}>
            {(user?.user_metadata?.full_name || user?.email || "L")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text, letterSpacing: -0.3 }}>{user?.user_metadata?.full_name || "Lucho"}</div>
            <div style={{ fontSize: 13, color: t.muted }}>{user?.email}</div>
          </div>
        </div>
      </Crd>

      {/* Sedes management */}
      <Crd t={t} style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: t.dim, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 }}>Tus sedes</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: t.text, letterSpacing: -0.3 }}>Gestión de sedes</div>
          </div>
          <Btn t={t} icon={Plus} onClick={() => { setShowSedeForm(true); setEditId(null); setSedeForm({ name: "", address: "", budget: "", color: "#7C5CFF", icon: "🏢" }); }}>Nueva sede</Btn>
        </div>
        {sedes.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: t.dim }}>No hay sedes todavía</div>
        ) : sedes.map(s => {
          const sc = s.color || t.accent;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 11, background: t.hover, marginBottom: 8, border: "1px solid " + t.border, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: sc, boxShadow: "0 0 10px " + sc + "70" }} />
              <div style={{ width: 42, height: 42, borderRadius: 11, background: "linear-gradient(135deg, " + sc + "30, " + sc + "10)", border: "1px solid " + sc + "40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginLeft: 6, boxShadow: "0 4px 14px " + sc + "30" }}>{s.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text, letterSpacing: -0.2 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: t.dim, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>{s.address || "Sin dirección"}</span>
                  <span>•</span>
                  <span>Budget: <span style={{ color: t.text, fontWeight: 700 }}>{fmt(Number(s.budget || 0))}</span></span>
                </div>
              </div>
              <Btn t={t} variant="accent" size="sm" icon={Edit2} onClick={() => editSede(s)}>Editar</Btn>
              <Btn t={t} variant="danger" size="sm" icon={Trash2} onClick={() => deleteSede(s.id)} />
            </div>
          );
        })}
      </Crd>

      <Modal open={showSedeForm} onClose={() => setShowSedeForm(false)} title={editId ? "Editar sede" : "Nueva sede"} t={t}>
        <Inp label="Nombre" val={sedeForm.name} onChange={v => setSedeForm({...sedeForm, name: v})} t={t} placeholder="Ej: Belgrano" />
        <Inp label="Dirección" val={sedeForm.address} onChange={v => setSedeForm({...sedeForm, address: v})} t={t} placeholder="Opcional" />
        <Inp label="Presupuesto anual" val={sedeForm.budget} onChange={v => setSedeForm({...sedeForm, budget: v})} t={t} type="number" placeholder="0" />
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.muted, marginBottom: 6, letterSpacing: 0.2, textTransform: "uppercase" }}>Icono</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{icons.map(ic => (
            <div key={ic} onClick={() => setSedeForm({...sedeForm, icon: ic})} style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, cursor: "pointer", background: sedeForm.icon === ic ? t.accentBg : t.hover, border: sedeForm.icon === ic ? "2px solid " + t.accent : "1px solid " + t.border, transition: "all 140ms" }}>{ic}</div>
          ))}</div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.muted, marginBottom: 6, letterSpacing: 0.2, textTransform: "uppercase" }}>Color</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{colors.map(c => (
            <div key={c} onClick={() => setSedeForm({...sedeForm, color: c})} style={{ width: 30, height: 30, borderRadius: 9, background: c, cursor: "pointer", border: sedeForm.color === c ? "2px solid " + t.text : "2px solid transparent", boxShadow: sedeForm.color === c ? "0 0 0 3px " + c + "40, 0 4px 14px " + c + "60" : "0 2px 8px " + c + "30", transition: "all 140ms" }} />
          ))}</div>
        </div>
        <Btn t={t} onClick={saveSede} disabled={!sedeForm.name} size="lg" style={{ width: "100%" }}>{editId ? "Guardar cambios" : "Crear sede"}</Btn>
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
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg, position: "relative", overflow: "hidden" }}>
      {/* Animated background gradient */}
      <div style={{ position: "absolute", top: "20%", left: "20%", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, " + t.accent + "30 0%, transparent 60%)", filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "15%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, " + t.purple + "25 0%, transparent 60%)", filter: "blur(80px)", pointerEvents: "none" }} />

      <div onSubmit={e => { e.preventDefault(); handleLogin(); }} style={{ width: 400, padding: 36, background: t.cardElev, borderRadius: 20, border: "1px solid " + t.borderStrong, boxShadow: t.shadowLg, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#E5A100", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 12px 32px rgba(229,161,0,0.45)" }}>
            <GuanacoIcon size={34} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: t.text, letterSpacing: -0.6 }}>Guanaco</div>
          <div style={{ fontSize: 13, color: t.muted, marginTop: 4 }}>Gestor de proyectos</div>
        </div>
        <Inp label="Email" val={email} onChange={setEmail} t={t} placeholder="tu@email.com" />
        <Inp label="Contraseña" val={pass} onChange={setPass} t={t} type="password" placeholder="••••••••" />
        {error && (
          <div style={{ fontSize: 12, color: t.red, marginBottom: 14, padding: "10px 12px", background: t.redBg, borderRadius: 9, border: "1px solid " + t.red + "40", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
        <Btn t={t} onClick={handleLogin} disabled={loading || !email || !pass} size="lg" style={{ width: "100%", marginTop: 4 }}>
          {loading ? "Ingresando..." : "Ingresar"}
        </Btn>
        <div style={{ textAlign: "center", marginTop: 18, fontSize: 11, color: t.dim }}>
          Hecho con <span style={{ color: t.accent, fontWeight: 700 }}>♥</span> para gestionar sedes
        </div>
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
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0F", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "#E5A100", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 32px rgba(229,161,0,0.5)", animation: "pulse 1.6s ease-in-out infinite" }}>
        <GuanacoIcon size={34} />
      </div>
      <div style={{ fontSize: 13, color: "#A0A0AE", fontFamily: "'Inter', sans-serif" }}>Cargando Guanaco...</div>
      <style>{"@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(0.95);opacity:0.85}}"}</style>
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
    : pageTitles[page] || ["Guanaco", ""];

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
      <div style={{ display: "flex", height: "100vh", background: t.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: t.text, fontFeatureSettings: "'cv02', 'cv03', 'cv04', 'cv11'", position: "relative", overflow: "hidden" }}>
        {/* Background grid + ambient orbs */}
        <div aria-hidden style={{ position: "fixed", inset: 0, backgroundImage: t.grid, backgroundSize: "32px 32px", pointerEvents: "none", maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)" }} />
        <div aria-hidden style={{ position: "fixed", top: "-10%", right: "-10%", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, " + t.accentGlow + " 0%, transparent 70%)", filter: "blur(80px)", pointerEvents: "none", opacity: 0.5 }} />
        <div aria-hidden style={{ position: "fixed", bottom: "-10%", left: "10%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, " + (t.accent2 || t.accentGlow) + "55 0%, transparent 70%)", filter: "blur(80px)", pointerEvents: "none", opacity: 0.4 }} />

        <style>{
          "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');" +
          "*{box-sizing:border-box;margin:0;padding:0}" +
          "html,body{font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}" +
          "button{font-family:inherit}" +
          "input,select,textarea{font-family:inherit}" +
          "@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}" +
          "@keyframes fadeIn{from{opacity:0}to{opacity:1}}" +
          "@keyframes scaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}" +
          "@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}" +
          "@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(0.95);opacity:0.85}}" +
          "@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}" +
          "::-webkit-scrollbar{width:8px;height:8px}" +
          "::-webkit-scrollbar-track{background:transparent}" +
          "::-webkit-scrollbar-thumb{background:" + t.border + ";border-radius:4px}" +
          "::-webkit-scrollbar-thumb:hover{background:" + t.borderStrong + "}" +
          "::selection{background:" + t.accentBg + ";color:" + t.text + "}" +
          "@media (prefers-reduced-motion: reduce){*{animation-duration:0.01ms!important;transition-duration:0.01ms!important}}"
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
