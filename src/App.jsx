import { useState } from "react";
import {
  LayoutDashboard, Users, FolderKanban, Receipt, Wallet, FileText, Bell, Search,
  Plus, MoreHorizontal, ArrowUpRight, ArrowDownRight, Eye, Calendar, Clock,
  CheckCircle2, AlertCircle, Phone, Mail, MapPin, Tag, MessageSquare, BarChart3,
  CreditCard, FileUp, Download, Zap, ChevronLeft, X, Check, Bot, CircleDollarSign,
  Layers, Target, Activity, Archive, Sun, Moon, Upload, Link2, List, Grid3X3,
  FileSpreadsheet, Printer, Share2, DollarSign, TrendingUp, Briefcase
} from "lucide-react";

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

const handlePrint = (title) => {
  const printWin = window.open("", "_blank");
  const content = document.querySelector("[data-report]");
  if (!printWin) return;
  printWin.document.write("<html><head><title>" + title + "</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5;font-weight:600}h1{font-size:18px;margin-bottom:4px}h2{font-size:13px;color:#666;margin-bottom:16px;font-weight:400}</style></head><body>");
  printWin.document.write("<h1>GestiónAI — " + title + "</h1><h2>Febrero 2026</h2>");
  if (content) printWin.document.write(content.innerHTML);
  printWin.document.write("</body></html>");
  printWin.document.close();
  printWin.print();
};

const CLIENTS = [
  { id:1, name:"Constructora Vial SA", type:"customer", balance:4250000, contact:"Martín Rodríguez", phone:"+54 11 5555-1234", email:"martin@vialsa.com", city:"Buenos Aires", tags:["VIP","Construcción"], projects:3, lastAct:"Hace 2h" },
  { id:2, name:"Hierros del Sur SRL", type:"supplier", balance:-1850000, contact:"Laura García", phone:"+54 11 5555-5678", email:"laura@hierrossur.com", city:"Rosario", tags:["Proveedor clave"], projects:5, lastAct:"Hace 1 día" },
  { id:3, name:"Inmobiliaria Costa", type:"customer", balance:2100000, contact:"Diego Fernández", phone:"+54 11 5555-9012", email:"diego@costa.com", city:"Mar del Plata", tags:["Inmobiliaria"], projects:2, lastAct:"Hace 3h" },
  { id:4, name:"Ferretería López", type:"supplier", balance:-920000, contact:"Ana López", phone:"+54 11 5555-3456", email:"ana@ferrelopez.com", city:"Córdoba", tags:["Proveedor"], projects:4, lastAct:"Hace 5h" },
  { id:5, name:"Estudio Arq. Méndez", type:"customer", balance:780000, contact:"Sofía Méndez", phone:"+54 11 5555-7890", email:"sofia@mendez.arq", city:"Buenos Aires", tags:["Arquitectura"], projects:1, lastAct:"Hace 2 días" },
  { id:6, name:"Transportes Rápido", type:"supplier", balance:-340000, contact:"Carlos Ruiz", phone:"+54 11 5555-2345", email:"carlos@rapido.com", city:"Buenos Aires", tags:["Logística"], projects:6, lastAct:"Ayer" },
];

const PROJECTS = [
  { id:1, name:"Torre Belgrano 22 pisos", client:"Constructora Vial SA", status:"in_progress", progress:65, budget:45000000, spent:29250000, deadline:"Mar 2026", priority:"high", desc:"Edificio residencial premium de 22 pisos en Belgrano con 88 unidades.", tasks:12, done:7, docs:24 },
  { id:2, name:"Complejo Nordelta Fase 2", client:"Inmobiliaria Costa", status:"in_progress", progress:40, budget:32000000, spent:12800000, deadline:"Ago 2026", priority:"high", desc:"45 unidades de 2 y 3 ambientes con vista al lago.", tasks:18, done:5, docs:16 },
  { id:3, name:"Remodelación Oficinas CABA", client:"Estudio Arq. Méndez", status:"planning", progress:10, budget:8500000, spent:850000, deadline:"Jun 2026", priority:"medium", desc:"Remodelación integral 1200m2 en Microcentro.", tasks:8, done:1, docs:6 },
  { id:4, name:"Nave Industrial Pilar", client:"Constructora Vial SA", status:"in_progress", progress:85, budget:22000000, spent:18700000, deadline:"Abr 2026", priority:"medium", desc:"Nave de 3000m2 con estructura metálica.", tasks:15, done:12, docs:31 },
  { id:5, name:"Puente Peatonal Costanera", client:"Constructora Vial SA", status:"completed", progress:100, budget:15000000, spent:14250000, deadline:"Feb 2026", priority:"low", desc:"Puente peatonal con iluminación LED.", tasks:10, done:10, docs:42 },
];

const TXS = [
  { id:1, date:"12/02", desc:"Certificado Obra #47 — Torre Belgrano", contact:"Constructora Vial SA", amount:3200000, status:"paid", project:"Torre Belgrano 22 pisos", pid:1 },
  { id:2, date:"11/02", desc:"Compra barras Ø12 — 500 unidades", contact:"Hierros del Sur SRL", amount:-1850000, status:"pending", project:"Torre Belgrano 22 pisos", pid:1 },
  { id:3, date:"10/02", desc:"Anticipo Fase 2 — Nordelta", contact:"Inmobiliaria Costa", amount:5000000, status:"paid", project:"Complejo Nordelta Fase 2", pid:2 },
  { id:4, date:"09/02", desc:"Materiales eléctricos varios", contact:"Ferretería López", amount:-420000, status:"paid", project:"Nave Industrial Pilar", pid:4 },
  { id:5, date:"08/02", desc:"Flete materiales a obra", contact:"Transportes Rápido", amount:-185000, status:"paid", project:"Torre Belgrano 22 pisos", pid:1 },
  { id:6, date:"07/02", desc:"Honorarios diseño", contact:"Estudio Arq. Méndez", amount:780000, status:"overdue", project:"Remodelación Oficinas CABA", pid:3 },
  { id:7, date:"06/02", desc:"Cemento Portland x200", contact:"Ferretería López", amount:-500000, status:"paid", project:"Complejo Nordelta Fase 2", pid:2 },
  { id:8, date:"05/02", desc:"Certificado Final — Puente", contact:"Constructora Vial SA", amount:7500000, status:"pending", project:"Puente Peatonal Costanera", pid:5 },
];

const TASKS = [
  { id:1, title:"Enviar presupuesto remodelación", project:"Remodelación Oficinas", pid:3, who:"MR", pri:"high", due:"2026-02-14", st:"todo", tag:"Ventas" },
  { id:2, title:"Revisar planos Nordelta", project:"Complejo Nordelta", pid:2, who:"SF", pri:"medium", due:"2026-02-15", st:"todo", tag:"Ingeniería" },
  { id:3, title:"Contactar proveedor vidrios", project:"Torre Belgrano", pid:1, who:"AL", pri:"low", due:"2026-02-18", st:"todo", tag:"Compras" },
  { id:4, title:"Reconciliación bancaria feb", project:"Admin", pid:0, who:"LG", pri:"high", due:"2026-02-13", st:"in_progress", tag:"Contabilidad" },
  { id:5, title:"Certificación avance Pilar", project:"Nave Industrial", pid:4, who:"MR", pri:"medium", due:"2026-02-14", st:"in_progress", tag:"Obras" },
  { id:6, title:"Factura electrónica #892", project:"Torre Belgrano", pid:1, who:"LG", pri:"medium", due:"2026-02-12", st:"review", tag:"Facturación" },
  { id:7, title:"Pago proveedores sem 6", project:"Admin", pid:0, who:"LG", pri:"high", due:"2026-02-10", st:"done", tag:"Tesorería" },
  { id:8, title:"Informe mensual enero", project:"Admin", pid:0, who:"SF", pri:"medium", due:"2026-02-07", st:"done", tag:"Reportes" },
  { id:9, title:"Inspección cimientos Nordelta", project:"Complejo Nordelta", pid:2, who:"MR", pri:"high", due:"2026-02-20", st:"todo", tag:"Obras" },
  { id:10, title:"Liquidación sueldos feb", project:"Admin", pid:0, who:"LG", pri:"high", due:"2026-02-28", st:"todo", tag:"RRHH" },
];

const DOCS = [
  { id:1, name:"Factura FE-2026-0892.pdf", type:"invoice", size:"245 KB", date:"12/02", contact:"Hierros del Sur SRL", project:"Torre Belgrano", pid:1, txId:2, status:"processed" },
  { id:2, name:"Remito R-00451.jpg", type:"receipt", size:"1.2 MB", date:"11/02", contact:"Ferretería López", project:"Nave Industrial", pid:4, txId:4, status:"processed" },
  { id:3, name:"Certificado_Obra_47.pdf", type:"cert", size:"890 KB", date:"10/02", contact:"Constructora Vial SA", project:"Torre Belgrano", pid:1, txId:1, status:"processed" },
  { id:4, name:"Presupuesto_Vidrios.pdf", type:"quote", size:"340 KB", date:"09/02", contact:null, project:"Torre Belgrano", pid:1, txId:null, status:"pending" },
  { id:5, name:"Contrato_Remodelacion.pdf", type:"contract", size:"2.1 MB", date:"05/02", contact:"Estudio Arq. Méndez", project:"Remodelación Oficinas", pid:3, txId:null, status:"filed" },
];

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

function Sidebar({ active, onNav, collapsed, toggle, t }) {
  const nav = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "clients", icon: Users, label: "Clientes / Proveedores" },
    { id: "projects", icon: FolderKanban, label: "Proyectos / Obras" },
    { id: "tasks", icon: Target, label: "Tareas" },
    { id: "transactions", icon: Receipt, label: "Transacciones" },
    { id: "accounting", icon: Layers, label: "Contabilidad" },
    { id: "treasury", icon: Wallet, label: "Tesorería" },
    { id: "documents", icon: FileText, label: "Documentos" },
    { id: "reports", icon: BarChart3, label: "Reportes" },
  ];
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: collapsed ? "8px 6px" : "10px 12px", background: "rgba(37,211,102,0.06)", borderRadius: 9, border: "1px solid rgba(37,211,102,0.12)" }}>
          <MessageSquare size={16} color="#25D366" />
          {!collapsed && <div><div style={{ fontSize: 11, fontWeight: 600, color: "#25D366" }}>WhatsApp</div><div style={{ fontSize: 10, color: t.dim }}>Conectado</div></div>}
        </div>
      </div>
    </div>
  );
}

function TopBar({ title, sub, theme, toggleTheme, t }) {
  return (
    <div style={{ padding: "11px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid " + t.border, background: t.topbar, minHeight: 54 }}>
      <div>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: t.text, margin: 0 }}>{title}</h1>
        {sub && <p style={{ fontSize: 11, color: t.muted, margin: "1px 0 0" }}>{sub}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: t.card, border: "1px solid " + t.border, borderRadius: 7, padding: "5px 10px", width: 180 }}>
          <Search size={13} color={t.dim} />
          <input placeholder="Buscar..." style={{ background: "transparent", border: "none", padding: 0, fontSize: 12, color: t.text, outline: "none", width: "100%" }} />
        </div>
        <div onClick={toggleTheme} style={{ width: 30, height: 30, borderRadius: 7, background: t.card, border: "1px solid " + t.border, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {theme === "dark" ? <Sun size={14} color={t.yellow} /> : <Moon size={14} color={t.accent} />}
        </div>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: t.card, border: "1px solid " + t.border, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <Bell size={14} color={t.muted} />
          <div style={{ position: "absolute", top: 5, right: 5, width: 6, height: 6, background: t.red, borderRadius: "50%", border: "2px solid " + t.topbar }} />
        </div>
        <Av name="Usuario Demo" size={30} />
      </div>
    </div>
  );
}

function Dashboard({ t }) {
  return (
    <div style={{ padding: 24, overflowY: "auto", height: "calc(100vh - 54px)" }}>
      {/* KPI Row - bigger */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { icon: CircleDollarSign, label: "Saldo disponible", val: "$18.4M", ch: "+12.3%", pos: true, data: [12,14,13,16,15,18,18.4], cc: "#34D399", bg: "rgba(52,211,153,0.08)" },
          { icon: ArrowUpRight, label: "Ingresos del mes", val: "$16.5M", ch: "+8.7%", pos: true, data: [8,10,12,11,14,16,16.5], cc: t.accent, bg: t.accentBg },
          { icon: ArrowDownRight, label: "Egresos del mes", val: "$9.8M", ch: "-3.2%", pos: true, data: [11,10.5,10,9.5,10.2,9.9,9.8], cc: "#60A5FA", bg: "rgba(96,165,250,0.08)" },
          { icon: AlertCircle, label: "CxC vencidas", val: "$2.1M", ch: "+5.1%", pos: false, data: [1.5,1.8,1.6,2,1.9,2.2,2.1], cc: "#FBBF24", bg: "rgba(251,191,36,0.08)" },
        ].map((k, i) => (
          <Crd key={i} t={t} style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><k.icon size={19} color={k.cc} /></div>
              <Chart data={k.data} color={k.cc} w={90} h={32} />
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: t.muted, marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: t.text, letterSpacing: "-0.5px" }}>{k.val}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, padding: "4px 8px", borderRadius: 6, background: k.pos ? t.greenBg : t.redBg, width: "fit-content" }}>
              {k.pos ? <ArrowUpRight size={12} color={t.green} /> : <ArrowDownRight size={12} color={t.red} />}
              <span style={{ fontSize: 11, color: k.pos ? t.green : t.red, fontWeight: 600 }}>{k.ch}</span>
              <span style={{ fontSize: 10, color: t.dim, marginLeft: 2 }}>vs mes ant.</span>
            </div>
          </Crd>
        ))}
      </div>

      {/* Cash flow chart - bigger */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14, marginBottom: 20 }}>
        <Crd t={t} style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Cash Flow — 6 meses</div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: t.accent }} /><span style={{ fontSize: 10, color: t.muted }}>Ingresos</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: t.blue + "60" }} /><span style={{ fontSize: 10, color: t.muted }}>Egresos</span></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, height: 180, alignItems: "flex-end" }}>
            {[["Sep",65,50],["Oct",70,45],["Nov",55,60],["Dic",80,55],["Ene",75,48],["Feb",85,52]].map(([m,inc,out], i) => (
              <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 160, width: "100%" }}>
                  <div style={{ flex: 1, height: inc + "%", background: "linear-gradient(180deg, " + t.accent + ", " + t.accent + "60)", borderRadius: "5px 5px 0 0", transition: "height 0.5s" }} />
                  <div style={{ flex: 1, height: out + "%", background: "linear-gradient(180deg, " + t.blue + "80, " + t.blue + "30)", borderRadius: "5px 5px 0 0", transition: "height 0.5s" }} />
                </div>
                <span style={{ fontSize: 11, color: t.dim, fontWeight: 500 }}>{m}</span>
              </div>
            ))}
          </div>
        </Crd>
        <Crd t={t} style={{ padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 14 }}>Próximos 7 días</div>
          {[
            { l: "Cobro Vial SA — Cert. #47", a: "+$3.2M", d: "20 Feb", inc: true },
            { l: "Pago Hierros del Sur", a: "-$1.85M", d: "21 Feb", inc: false },
            { l: "Cobro Costa — Anticipo", a: "+$5.0M", d: "22 Feb", inc: true },
            { l: "Pago Ferretería López", a: "-$420K", d: "23 Feb", inc: false },
            { l: "Cobro Méndez", a: "+$780K", d: "24 Feb", inc: true },
          ].map((u, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 10px", borderRadius: 8, background: t.hover, marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: u.inc ? t.greenBg : t.redBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {u.inc ? <ArrowUpRight size={12} color={t.green} /> : <ArrowDownRight size={12} color={t.red} />}
                </div>
                <div><div style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{u.l}</div><div style={{ fontSize: 10, color: t.dim }}>{u.d}</div></div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: u.inc ? t.green : t.red }}>{u.a}</span>
            </div>
          ))}
        </Crd>
      </div>

      {/* Last transactions */}
      <Crd t={t} style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Últimas transacciones</div>
          <Btn t={t} onClick={() => exportCSV("transacciones", ["Fecha","Descripción","Contacto","Monto","Estado"], TXS.map(tx => [tx.date, tx.desc, tx.contact, tx.amount, tx.status]))}><Download size={12} />Exportar</Btn>
        </div>
        {TXS.slice(0, 5).map(tx => (
          <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid " + t.border + "15" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: tx.amount > 0 ? t.greenBg : t.redBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {tx.amount > 0 ? <ArrowUpRight size={12} color={t.green} /> : <ArrowDownRight size={12} color={t.red} />}
              </div>
              <div><div style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>{tx.desc}</div><div style={{ fontSize: 11, color: t.dim }}>{tx.date} · {tx.contact}</div></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: tx.amount > 0 ? t.green : t.red }}>{fmt(tx.amount)}</span>
              <Badge s={tx.status} t={t} />
            </div>
          </div>
        ))}
      </Crd>
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
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [clients, setClients] = useState(CLIENTS);
  const [nf, setNf] = useState({ name: "", type: "customer", contact: "", phone: "", email: "", city: "" });
  const list = clients.filter(c => filter === "all" || c.type === filter);

  const saveNew = () => {
    if (!nf.name.trim()) return;
    setClients([...clients, { ...nf, id: Date.now(), balance: 0, tags: [], projects: 0, lastAct: "Ahora" }]);
    setNf({ name: "", type: "customer", contact: "", phone: "", email: "", city: "" });
    setShowNew(false);
  };

  if (sel) {
    const c = clients.find(x => x.id === sel);
    if (!c) { setSel(null); return null; }
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
          <Crd t={t} style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>Historial</div>
            {TXS.filter(tx => tx.contact === c.name).length ? TXS.filter(tx => tx.contact === c.name).map(tx => (
              <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid " + t.border + "15" }}>
                <div><div style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{tx.desc}</div><div style={{ fontSize: 10, color: t.dim }}>{tx.date}</div></div>
                <span style={{ fontSize: 12, fontWeight: 600, color: tx.amount > 0 ? t.green : t.red }}>{fmt(tx.amount)}</span>
              </div>
            )) : <div style={{ fontSize: 12, color: t.dim, textAlign: "center", padding: 24 }}>Sin movimientos aún</div>}
          </Crd>
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
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState(null);
  const list = PROJECTS.filter(p => filter === "all" ? true : filter === "active" ? (p.status === "in_progress" || p.status === "planning") : p.status === "completed");
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
          {[["Presupuesto",fmt(p.budget)],["Gastado",fmt(p.spent)+" ("+Math.round(p.spent/p.budget*100)+"%)"],["Tareas",p.done+"/"+p.tasks],["Docs",""+p.docs]].map(([l,v],i) => (
            <Crd key={i} t={t} style={{ padding: 12 }}><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>{l}</div><div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{v}</div></Crd>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: t.muted }}>Avance</span><span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{p.progress}%</span></div><PBar v={p.progress} h={8} color={p.progress > 80 ? t.green : t.accent} t={t} /></div>
        <p style={{ fontSize: 12, color: t.muted, marginBottom: 18 }}>{p.desc}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Crd t={t} style={{ padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 10 }}>Transacciones</div>
            {TXS.filter(tx => tx.pid === p.id).map(tx => (
              <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid " + t.border + "15" }}>
                <div><div style={{ fontSize: 11, color: t.text }}>{tx.desc}</div><div style={{ fontSize: 10, color: t.dim }}>{tx.date}</div></div>
                <span style={{ fontSize: 12, fontWeight: 600, color: tx.amount > 0 ? t.green : t.red }}>{fmt(tx.amount)}</span>
              </div>
            ))}
          </Crd>
          <Crd t={t} style={{ padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 10 }}>Tareas</div>
            {TASKS.filter(tk => tk.pid === p.id).map(tk => (
              <div key={tk.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid " + t.border + "15" }}>
                <span style={{ fontSize: 11, color: t.text, textDecoration: tk.st === "done" ? "line-through" : "none" }}>{tk.title}</span>
                <Badge s={tk.pri} t={t} />
              </div>
            ))}
          </Crd>
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: 22, overflowY: "auto", height: "calc(100vh - 54px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <Tabs t={t} active={filter} onChange={setFilter} items={[{ id: "all", label: "Todos", icon: Layers }, { id: "active", label: "En curso", icon: Activity }, { id: "done", label: "Completados", icon: Archive }]} />
        <Btn primary t={t}><Plus size={12} />Nuevo proyecto</Btn>
      </div>
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
  const [view, setView] = useState("board");
  const [tasks, setTasks] = useState(TASKS);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const cols = [{ id: "todo", label: "Por hacer", color: t.muted, icon: Clock }, { id: "in_progress", label: "En progreso", color: t.blue, icon: Activity }, { id: "review", label: "Revisión", color: t.yellow, icon: Eye }, { id: "done", label: "Completado", color: t.green, icon: CheckCircle2 }];

  const openEdit = (tk) => { setEditing(tk.id); setEditForm({ ...tk }); };
  const saveEdit = () => {
    setTasks(tasks.map(tk => tk.id === editing ? { ...editForm } : tk));
    setEditing(null); setEditForm(null);
  };
  const addTask = () => {
    const nt = { id: Date.now(), title: "Nueva tarea", project: "Admin", pid: 0, who: "MR", pri: "medium", due: "2026-02-20", st: "todo", tag: "General" };
    setTasks([nt, ...tasks]);
    openEdit(nt);
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
      <Inp label="Fecha (YYYY-MM-DD)" val={editForm.due} onChange={v => setEditForm({...editForm, due: v})} t={t} />
      <Inp label="Etiqueta" val={editForm.tag} onChange={v => setEditForm({...editForm, tag: v})} t={t} />
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <Btn t={t} onClick={() => { setEditing(null); setEditForm(null); }}>Cancelar</Btn>
        <Btn primary t={t} onClick={saveEdit}><Check size={12} />Guardar</Btn>
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
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 10, color: t.dim }}>{tk.due.slice(8)}/{tk.due.slice(5, 7)}</span><Av name={tk.who} size={18} /></div>
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
                <td style={{ padding: "9px 12px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{tk.due.slice(8)}/{tk.due.slice(5, 7)}</td>
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
  const [tab, setTab] = useState("all");
  const [sel, setSel] = useState(null);
  const list = TXS.filter(tx => tab === "income" ? tx.amount > 0 : tab === "expense" ? tx.amount < 0 : tab === "pending" ? (tx.status === "pending" || tx.status === "overdue") : true);

  if (sel) {
    const tx = TXS.find(x => x.id === sel);
    const linkedDocs = DOCS.filter(d => d.txId === tx.id);
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
                <Btn primary t={t}><Check size={12} />Marcar como pagado</Btn>
                <Btn t={t}><Mail size={12} />Enviar recordatorio</Btn>
              </div>
            )}
          </div>
          <div>
            <Crd t={t} style={{ padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 10 }}>Documentos vinculados</div>
              {linkedDocs.length ? linkedDocs.map(d => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid " + t.border + "15" }}>
                  <FileText size={16} color={t.accentL} />
                  <div><div style={{ fontSize: 11, color: t.text, fontWeight: 500 }}>{d.name}</div><div style={{ fontSize: 10, color: t.dim }}>{d.size} · <Badge s={d.type} t={t} /></div></div>
                </div>
              )) : (
                <div style={{ textAlign: "center", padding: 16 }}>
                  <div style={{ fontSize: 11, color: t.dim, marginBottom: 8 }}>Sin documentos</div>
                  <Btn t={t}><Upload size={12} />Adjuntar factura</Btn>
                </div>
              )}
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
        <Tabs t={t} active={tab} onChange={setTab} items={[{ id: "all", label: "Todas" }, { id: "income", label: "Ingresos" }, { id: "expense", label: "Egresos" }, { id: "pending", label: "Pendientes" }]} />
        <Btn primary t={t}><Plus size={12} />Nueva</Btn>
      </div>
      {tab === "pending" && (
        <div style={{ background: t.orangeBg, border: "1px solid " + t.orange + "25", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={15} color={t.orange} />
          <div style={{ fontSize: 12, color: t.text }}>
            <b>Pendientes</b> son cobros o pagos registrados que aún no fueron efectivizados. Los <b style={{ color: t.red }}>vencidos</b> pasaron su fecha límite.
          </div>
        </div>
      )}
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
  const accounts = [
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
  ];
  const totalBal = accounts.reduce((s, a) => s + a.bal, 0);

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

      {/* Forecast */}
      <Crd t={t} style={{ padding: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Forecast — Próximas 4 semanas</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Bot size={12} color={t.accentL} /><span style={{ fontSize: 10, color: t.accentL }}>Proyección IA</span></div>
        </div>
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
          { icon: AlertCircle, color: t.red, title: "Pago vencido — Hierros del Sur SRL", desc: "Factura por $1.85M venció hace 5 días. Contactar para gestionar pago.", action: "Gestionar" },
          { icon: Clock, color: t.orange, title: "Cobro próximo — Certificado #47 Vial SA", desc: "Vence en 2 días. Confirmar recepción de factura con el cliente.", action: "Recordar" },
          { icon: TrendingUp, color: t.blue, title: "Semana 2 con flujo negativo proyectado", desc: "La semana del 24-28 Feb tiene más pagos ($4.2M) que cobros ($3.5M). Considerar diferir pagos.", action: "Ver forecast" },
          { icon: Bot, color: t.accent, title: "Sugerencia IA: transferir excedente", desc: "Mercado Pago tiene $1.2M sin rendimiento. Transferir a plazo fijo o FCI podría generar $8K/mes.", action: "Evaluar" },
        ].map((alert, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: t.hover, borderRadius: 8, marginBottom: 6, borderLeft: "3px solid " + alert.color }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <alert.icon size={16} color={alert.color} />
              <div><div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{alert.title}</div><div style={{ fontSize: 10, color: t.muted, marginTop: 1 }}>{alert.desc}</div></div>
            </div>
            <Btn t={t}>{alert.action}</Btn>
          </div>
        ))}
      </Crd>
    </div>
  );
}

function DocumentsPage({ t }) {
  const [showUp, setShowUp] = useState(false);
  const [filterContact, setFilterContact] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterType, setFilterType] = useState("");
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
              <select style={{ width: "100%", ...selStyle }}>
                <option>Factura</option><option>Remito</option><option>Certificado</option><option>Contrato</option><option>Otro</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Contacto</div>
              <select style={{ width: "100%", ...selStyle }}>
                <option value="">— Seleccionar —</option>
                {CLIENTS.map(c => <option key={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Proyecto</div>
              <select style={{ width: "100%", ...selStyle }}>
                <option value="">— Seleccionar —</option>
                {PROJECTS.map(p => <option key={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Transacción (opcional)</div>
            <select style={{ width: "100%", ...selStyle }}>
              <option value="">— Sin vincular —</option>
              {TXS.map(tx => <option key={tx.id}>{tx.date} — {tx.desc}</option>)}
            </select>
          </div>
          <div style={{ border: "2px dashed " + t.border, borderRadius: 10, padding: 28, textAlign: "center", marginBottom: 12, background: t.hover, cursor: "pointer" }}>
            <Upload size={24} color={t.dim} />
            <div style={{ fontSize: 12, color: t.text, fontWeight: 500, marginTop: 6 }}>Arrastrá archivos o hacé click</div>
            <div style={{ fontSize: 10, color: t.dim, marginTop: 3 }}>PDF, JPG, PNG — Máx 25MB</div>
            <div style={{ fontSize: 10, color: t.accentL, marginTop: 6 }}>También por WhatsApp</div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <Btn t={t} onClick={() => setShowUp(false)}>Cancelar</Btn>
            <Btn primary t={t}><Upload size={12} />Subir y OCR</Btn>
          </div>
        </Crd>
      )}
      <div style={{ fontSize: 11, color: t.muted, marginBottom: 8 }}>{filtered.length} de {DOCS.length} documentos</div>
      <Crd t={t} style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: t.hover }}>{["Documento","Tipo","Fecha","Contacto","Proyecto","Vinculado","Estado"].map(h => <th key={h} style={{ padding: "9px 10px", fontSize: 10, fontWeight: 600, color: t.dim, textAlign: "left", textTransform: "uppercase", borderBottom: "1px solid " + t.border }}>{h}</th>)}</tr></thead>
          <tbody>{filtered.length === 0 ? (
            <tr><td colSpan={7} style={{ padding: 30, textAlign: "center", color: t.dim, fontSize: 12 }}>No hay documentos con estos filtros</td></tr>
          ) : filtered.map(d => (
            <tr key={d.id}>
              <td style={{ padding: "9px 10px", borderBottom: "1px solid " + t.border + "15" }}><div style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{d.name}</div><div style={{ fontSize: 10, color: t.dim }}>{d.size}</div></td>
              <td style={{ padding: "9px 10px", borderBottom: "1px solid " + t.border + "15" }}><Badge s={d.type} t={t} /></td>
              <td style={{ padding: "9px 10px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{d.date}</td>
              <td style={{ padding: "9px 10px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{d.contact || "—"}</td>
              <td style={{ padding: "9px 10px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{d.project}</td>
              <td style={{ padding: "9px 10px", borderBottom: "1px solid " + t.border + "15" }}>{d.txId ? <span style={pill(t.greenBg, t.green)}><Link2 size={9} /> Sí</span> : <span style={{ fontSize: 10, color: t.dim }}>No</span>}</td>
              <td style={{ padding: "9px 10px", borderBottom: "1px solid " + t.border + "15" }}><Badge s={d.status} t={t} /></td>
            </tr>
          ))}</tbody>
        </table>
      </Crd>
    </div>
  );
}

function Reports({ t }) {
  const [active, setActive] = useState("pnl");
  const reps = [
    { id: "pnl", label: "Estado de Resultados", icon: BarChart3 },
    { id: "balance", label: "Balance General", icon: Layers },
    { id: "cashflow", label: "Flujo de Efectivo", icon: Activity },
    { id: "project", label: "Por Proyecto", icon: FolderKanban },
    { id: "aging", label: "Aging Cartera", icon: Clock },
  ];

  const renderPnl = () => {
    const pnl = [
      { cat: "Ingresos", items: [["Servicios", 16480000], ["Otros", 320000]], total: 16800000 },
      { cat: "Costos Directos", items: [["Materiales", -6200000], ["Mano de Obra", -3400000], ["Subcontratistas", -1800000]], total: -11400000 },
      { cat: "Gastos Operativos", items: [["Administrativos", -890000], ["Transporte", -420000], ["Alquileres", -350000]], total: -1660000 },
    ];
    const net = 16800000 - 11400000 - 1660000;
    return (
      <div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Estado de Resultados</div><div style={{ fontSize: 11, color: t.muted }}>Febrero 2026</div></div>
          <div style={{ display: "flex", gap: 5 }}><Btn t={t} onClick={() => handlePrint("Estado de Resultados")}><Printer size={12} />Imprimir</Btn><Btn t={t} onClick={() => exportCSV("estado_resultados", ["Categoría","Concepto","Monto"], [["Ingresos","Servicios","16480000"],["Ingresos","Otros","320000"],["Costos","Materiales","-6200000"],["Costos","Mano de Obra","-3400000"],["Costos","Subcontratistas","-1800000"],["Gastos","Administrativos","-890000"],["Gastos","Transporte","-420000"],["Gastos","Alquileres","-350000"],["","RESULTADO NETO","3740000"]])}><Download size={12} />Excel</Btn></div>
        </div>
        <div style={{ padding: 16 }}>
          {pnl.map((cat, ci) => (
            <div key={ci} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.text, textTransform: "uppercase", marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid " + t.border }}>{cat.cat}</div>
              {cat.items.map(([name, amt], ii) => (
                <div key={ii} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0 4px 14px" }}>
                  <span style={{ fontSize: 12, color: t.muted }}>{name}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: amt >= 0 ? t.text : t.red }}>{fmt(amt)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 6px 14px", borderTop: "1px solid " + t.border + "20", marginTop: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Total</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: cat.total >= 0 ? t.green : t.red }}>{fmt(cat.total)}</span>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: t.accentBg, borderRadius: 9 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>RESULTADO NETO</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: net >= 0 ? t.green : t.red }}>{fmt(net)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderBalance = () => (
    <div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Balance General</div>
        <div style={{ fontSize: 11, color: t.muted }}>Al 13/02/2026</div>
      </div>
      <div style={{ padding: 16 }}>
        {[
          { cat: "ACTIVOS", items: [["Caja y Bancos", 18400000], ["Cuentas por Cobrar", 13700000], ["Materiales en Obra", 4200000], ["Activos Fijos", 28000000]], total: 64300000 },
          { cat: "PASIVOS", items: [["Cuentas por Pagar", -8760000], ["Préstamos Bancarios", -12000000], ["Anticipos de Clientes", -5000000], ["Deudas Fiscales", -3200000]], total: -28960000 },
          { cat: "PATRIMONIO", items: [["Capital Social", 20000000], ["Resultados Acumulados", 11600000], ["Resultado del Ejercicio", 3740000]], total: 35340000 },
        ].map((sec, si) => (
          <div key={si} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.text, textTransform: "uppercase", marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid " + t.border }}>{sec.cat}</div>
            {sec.items.map(([n, a], ii) => (
              <div key={ii} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0 4px 14px" }}>
                <span style={{ fontSize: 12, color: t.muted }}>{n}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{fmt(Math.abs(a))}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 6px 14px", borderTop: "1px solid " + t.border + "20", marginTop: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Total {sec.cat}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>{fmt(Math.abs(sec.total))}</span>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: t.greenBg, borderRadius: 9, marginTop: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>ACTIVOS = PASIVOS + PATRIMONIO</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.green }}>{fmt(64300000)} = {fmt(28960000)} + {fmt(35340000)}</span>
        </div>
      </div>
    </div>
  );

  const renderCashflow = () => (
    <div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Flujo de Efectivo</div>
        <div style={{ fontSize: 11, color: t.muted }}>Febrero 2026</div>
      </div>
      <div style={{ padding: 16 }}>
        {[
          { cat: "Actividades Operativas", items: [["Cobros de clientes", 16480000], ["Pagos a proveedores", -8955000], ["Sueldos y cargas", -3400000], ["Gastos operativos", -1660000]], total: 2465000 },
          { cat: "Actividades de Inversión", items: [["Compra de equipos", -1200000], ["Mejoras en obras", -800000]], total: -2000000 },
          { cat: "Actividades de Financiamiento", items: [["Cuota préstamo bancario", -500000], ["Aportes de socios", 0]], total: -500000 },
        ].map((sec, si) => (
          <div key={si} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.text, textTransform: "uppercase", marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid " + t.border }}>{sec.cat}</div>
            {sec.items.map(([n, a], ii) => (
              <div key={ii} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0 4px 14px" }}>
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
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: t.accentBg, borderRadius: 9 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>VARIACIÓN NETA DE EFECTIVO</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: t.red }}>{fmt(-35000)}</span>
        </div>
      </div>
    </div>
  );

  const renderProject = () => (
    <div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Rentabilidad por Proyecto</div>
        <div style={{ fontSize: 11, color: t.muted }}>Febrero 2026</div>
      </div>
      <div style={{ padding: 16 }}>
        {PROJECTS.map(p => {
          const ing = TXS.filter(tx => tx.pid === p.id && tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
          const eg = TXS.filter(tx => tx.pid === p.id && tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
          const net = ing - eg;
          const margin = ing > 0 ? Math.round(net / ing * 100) : 0;
          return (
            <div key={p.id} style={{ padding: 12, borderRadius: 9, background: t.hover, marginBottom: 8, border: "1px solid " + t.border }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div><div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{p.name}</div><div style={{ fontSize: 10, color: t.dim }}>{p.client}</div></div>
                <Badge s={p.status} t={t} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
                <div><div style={{ fontSize: 10, color: t.dim }}>Presupuesto</div><div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{fmt(p.budget)}</div></div>
                <div><div style={{ fontSize: 10, color: t.dim }}>Ingresos</div><div style={{ fontSize: 12, fontWeight: 600, color: t.green }}>{fmt(ing)}</div></div>
                <div><div style={{ fontSize: 10, color: t.dim }}>Egresos</div><div style={{ fontSize: 12, fontWeight: 600, color: t.red }}>{fmt(eg)}</div></div>
                <div><div style={{ fontSize: 10, color: t.dim }}>Resultado</div><div style={{ fontSize: 12, fontWeight: 700, color: net >= 0 ? t.green : t.red }}>{fmt(net)}</div></div>
                <div><div style={{ fontSize: 10, color: t.dim }}>Margen</div><div style={{ fontSize: 12, fontWeight: 700, color: margin > 20 ? t.green : margin > 0 ? t.orange : t.red }}>{margin}%</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderAging = () => (
    <div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Aging de Cartera</div>
        <div style={{ fontSize: 11, color: t.muted }}>Antigüedad de CxC y CxP</div>
      </div>
      <div style={{ padding: 16 }}>
        {[
          { title: "Cuentas por Cobrar", data: [["Vigentes", 7500000, t.green, 55], ["1-30 días", 3200000, t.orange, 23], ["31-60 días", 1800000, t.red, 13], ["+60 días", 1200000, "#FF4757", 9]] },
          { title: "Cuentas por Pagar", data: [["Vigentes", 4200000, t.green, 48], ["1-30 días", 2100000, t.orange, 24], ["31-60 días", 1500000, t.red, 17], ["+60 días", 960000, "#FF4757", 11]] },
        ].map((sec, si) => (
          <div key={si} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 10 }}>{sec.title}</div>
            {sec.data.map(([l, a, c, p], i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: t.muted }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{fmt(a)}</span>
                </div>
                <PBar v={p} color={c} h={5} t={t} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const content = { pnl: renderPnl, balance: renderBalance, cashflow: renderCashflow, project: renderProject, aging: renderAging };

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

export default function App() {
  const [view, setView] = useState("landing");
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState("dark");
  const t = themes[theme];

  if (view === "landing") return <Landing onEnter={() => setView("app")} />;

  const meta = {
    dashboard: ["Dashboard", "Resumen financiero"], clients: ["Clientes / Proveedores", "Gestión de contactos"],
    projects: ["Proyectos / Obras", "Seguimiento y presupuestos"], tasks: ["Tareas", "Gestión de actividades"],
    transactions: ["Transacciones", "Ingresos y egresos"], accounting: ["Contabilidad", "Libro diario y estados"],
    treasury: ["Tesorería", "Cuentas y cash flow"], documents: ["Documentos", "Facturas y comprobantes"],
    reports: ["Reportes", "Informes financieros"],
  };
  const pages = { dashboard: Dashboard, clients: Clients, projects: ProjectsPage, tasks: TasksPage, transactions: Transactions, accounting: Accounting, treasury: Treasury, documents: DocumentsPage, reports: Reports };
  const Page = pages[page] || Dashboard;

  return (
    <>
      <style>{
        "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');" +
        "*{box-sizing:border-box;margin:0;padding:0}" +
        "body{font-family:'DM Sans',-apple-system,sans-serif}" +
        "::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:" + t.border + ";border-radius:3px}" +
        "input::placeholder{color:" + t.dim + "}" +
        "select{color:" + t.text + "}option{background:" + t.card + ";color:" + t.text + "}"
      }</style>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: t.bg, transition: "background 0.25s" }}>
        <Sidebar active={page} onNav={setPage} collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} t={t} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <TopBar title={meta[page] ? meta[page][0] : ""} sub={meta[page] ? meta[page][1] : ""} theme={theme} toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} t={t} />
          <Page t={t} />
        </div>
      </div>
    </>
  );
}
