import { useState, useEffect, createContext, useContext, useRef } from "react";
import { supabase } from "./lib/supabase";

// File upload helper — stores file in Supabase Storage and returns URL
const uploadFile = async (file) => {
  const ext = file.name.split(".").pop();
  const path = Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext;
  const { error } = await supabase.storage.from("documents").upload(path, file);
  if (error) {
    console.error("Upload error:", error);
    if (error.message?.includes("not found") || error.message?.includes("Bucket")) {
      window.alert("Error: El bucket 'documents' no existe en Supabase Storage.\n\nCorré el SQL 'supabase_bank_accounts_v2.sql' o crealo manualmente:\nSupabase → Storage → New Bucket → Name: documents → ✅ Public → Create");
    } else if (error.message?.includes("security") || error.message?.includes("policy") || error.message?.includes("RLS")) {
      window.alert("Error de permisos en Storage. Corré el SQL 'supabase_bank_accounts_v2.sql' para crear las políticas de Storage.");
    } else {
      window.alert("Error al subir archivo: " + error.message);
    }
    return null;
  }
  const { data } = supabase.storage.from("documents").getPublicUrl(path);
  return data?.publicUrl || null;
};
import {
  LayoutDashboard, Users, FolderKanban, Receipt, Wallet, FileText, Bell, Search,
  Plus, MoreHorizontal, ArrowUpRight, ArrowDownRight, Eye, Calendar, Clock,
  CheckCircle2, AlertCircle, Phone, Mail, MapPin, Tag, MessageSquare, BarChart3,
  CreditCard, FileUp, Download, Zap, ChevronLeft, X, Check, Bot, CircleDollarSign,
  Layers, Target, Activity, Archive, Sun, Moon, Upload, Link2, List, Grid3X3,
  FileSpreadsheet, Printer, Share2, DollarSign, TrendingUp, Briefcase, LogOut, Lock, UserPlus, Shield, Building2, ExternalLink, ChevronRight, RefreshCw, Trash2, HelpCircle, Sparkles, BookOpen, Play, Info, ChevronDown
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
  const [bankAccounts, setBankAccounts] = useState([]);
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

      const [cRes, pRes, tRes, tkRes, dRes, baRes] = await Promise.all([
        supabase.from("clients").select("*").order("name"),
        supabase.from("projects").select("*, client:clients(name)").order("name"),
        supabase.from("transactions").select("*, contact:clients(name), project:projects(name)").order("date", { ascending: false }),
        supabase.from("tasks").select("*, project:projects(name)").order("due_date"),
        supabase.from("documents").select("*, contact:clients(name), project:projects(name)").order("created_at", { ascending: false }),
        supabase.from("bank_accounts").select("*").order("created_at"),
      ]);

      if (cRes.data) {
        // Build a map of contact_id → sum of transaction amounts for balance
        const txByContact = {};
        const projByClient = {};
        if (tRes.data) tRes.data.forEach(tx => {
          if (tx.contact_id) txByContact[tx.contact_id] = (txByContact[tx.contact_id] || 0) + Number(tx.amount || 0);
        });
        if (pRes.data) pRes.data.forEach(p => {
          if (p.client_id) projByClient[p.client_id] = (projByClient[p.client_id] || 0) + 1;
        });
        setClients(cRes.data.map(c => ({
          ...c, tags: c.tags || [], lastAct: "Reciente",
          projects: projByClient[c.id] || 0, contact: c.contact || "",
          balance: txByContact[c.id] || 0,
        })));
      }

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
        account_id: tx.account_id || null,
      })));

      if (baRes.data) setBankAccounts(baRes.data);

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
    <DataContext.Provider value={{ clients, projects, transactions, tasks, documents, bankAccounts, loading, reload: load, companyId, setClients, setProjects, setTransactions, setTasks, setDocuments }}>
      {children}
    </DataContext.Provider>
  );
}

// ─── Demo Data Provider (datos ficticios para mostrar la plataforma) ───
function DemoDataProvider({ children }) {
  const demoClients = [
    { id: "d1", name: "Inmobiliaria Costa del Sol", type: "customer", phone: "11-4532-8877", email: "info@costadelsol.com.ar", city: "CABA", tags: ["VIP"], lastAct: "Ayer", projects: 2, contact: "Martín Costa", balance: 20000000 },
    { id: "d2", name: "Desarrollos Urbanos SA", type: "customer", phone: "11-5567-3344", email: "contacto@desurbanos.com", city: "Rosario", tags: [], lastAct: "Hace 3 días", projects: 1, contact: "Laura Méndez", balance: 2500000 },
    { id: "d3", name: "Corralón El Constructor", type: "supplier", phone: "11-4421-5500", email: "ventas@elconstructor.com", city: "Pilar", tags: ["Materiales"], lastAct: "Hoy", projects: 0, contact: "Roberto Sánchez", balance: -6150000 },
    { id: "d4", name: "Estudio Arq. Vega & Asoc.", type: "supplier", phone: "11-6698-2211", email: "estudio@vegaarq.com", city: "CABA", tags: ["Profesional"], lastAct: "Hace 1 semana", projects: 3, contact: "Ana Vega", balance: -950000 },
    { id: "d5", name: "Familia Rodríguez", type: "customer", phone: "2254-55-1234", email: "jrodriguez@gmail.com", city: "Pinamar", tags: [], lastAct: "Hace 2 días", projects: 1, contact: "Jorge Rodríguez", balance: 2500000 },
    { id: "d6", name: "Grupo Inversor del Plata", type: "customer", phone: "11-3345-7890", email: "info@inversordelplata.com.ar", city: "CABA", tags: ["VIP", "Inversor"], lastAct: "Hoy", projects: 1, contact: "Sebastián Morales", balance: 35000000 },
    { id: "d7", name: "Hormigonera del Litoral", type: "supplier", phone: "341-455-2200", email: "ventas@hormidellitoral.com", city: "Rosario", tags: ["Materiales", "Hormigón"], lastAct: "Hace 5 días", projects: 0, contact: "Pedro Giménez", balance: -2800000 },
    { id: "d8", name: "Municipalidad de Pinamar", type: "customer", phone: "2254-49-1100", email: "obras@pinamar.gob.ar", city: "Pinamar", tags: ["Gobierno"], lastAct: "Hace 1 semana", projects: 1, contact: "Lic. María Torres", balance: 0 },
  ];
  const demoProjects = [
    { id: "p1", name: "Torre Norte - CABA", status: "in_progress", budget: 85000000, progress: 65, spent: 38500000, client: "Inmobiliaria Costa del Sol", client_id: "d1", tasks: 12, done: 8, docs: 15, deadline: "dic. 2026", description: "Edificio 8 pisos, 24 departamentos premium en Palermo. Estructura de hormigón armado, acabados de alta gama." },
    { id: "p2", name: "Casa Pinamar 2026", status: "planning", budget: 15000000, progress: 10, spent: 1200000, client: "Familia Rodríguez", client_id: "d5", tasks: 5, done: 1, docs: 3, deadline: "mar. 2027", description: "Casa familiar en La Frontera, 180m², 3 dormitorios, pileta" },
    { id: "p3", name: "Oficinas Rosario Centro", status: "in_progress", budget: 42000000, progress: 40, spent: 14000000, client: "Desarrollos Urbanos SA", client_id: "d2", tasks: 8, done: 3, docs: 9, deadline: "ago. 2026", description: "Remodelación planta baja comercial, 400m². Open space + 6 privados" },
    { id: "p4", name: "Duplex Belgrano R", status: "completed", budget: 28000000, progress: 100, spent: 27200000, client: "Inmobiliaria Costa del Sol", client_id: "d1", tasks: 20, done: 20, docs: 22, deadline: "ene. 2026", description: "2 duplex premium finalizados y entregados" },
    { id: "p5", name: "Complejo Costero Pinamar", status: "planning", budget: 120000000, progress: 5, spent: 3500000, client: "Grupo Inversor del Plata", client_id: "d6", tasks: 4, done: 0, docs: 6, deadline: "dic. 2027", description: "Complejo de 12 departamentos frente al mar. Etapa de anteproyecto y permisos." },
    { id: "p6", name: "Paseo Costero Municipal", status: "in_progress", budget: 18000000, progress: 25, spent: 4200000, client: "Municipalidad de Pinamar", client_id: "d8", tasks: 6, done: 1, docs: 5, deadline: "oct. 2026", description: "Refacción paseo peatonal costero, 600 metros lineales" },
  ];
  const demoTransactions = [
    { id: "t1", desc: "Anticipo Torre Norte", description: "Anticipo Torre Norte", amount: 12000000, status: "paid", date: "20/02", contact: "Inmobiliaria Costa del Sol", project: "Torre Norte - CABA", pid: "p1" },
    { id: "t2", desc: "Cemento x 200 bolsas", description: "Cemento x 200 bolsas", amount: -1850000, status: "paid", date: "18/02", contact: "Corralón El Constructor", project: "Torre Norte - CABA", pid: "p1" },
    { id: "t3", desc: "Honorarios arquitectura feb", description: "Honorarios arquitectura feb", amount: -950000, status: "pending", date: "15/02", contact: "Estudio Arq. Vega & Asoc.", project: "Oficinas Rosario Centro", pid: "p3" },
    { id: "t4", desc: "Cuota 2/6 Casa Pinamar", description: "Cuota 2/6 Casa Pinamar", amount: 2500000, status: "pending", date: "10/02", contact: "Familia Rodríguez", project: "Casa Pinamar 2026", pid: "p2" },
    { id: "t5", desc: "Hierro estructural 12mm", description: "Hierro estructural 12mm", amount: -3200000, status: "overdue", date: "05/02", contact: "Corralón El Constructor", project: "Torre Norte - CABA", pid: "p1" },
    { id: "t6", desc: "Cuota final Duplex Belgrano", description: "Cuota final Duplex Belgrano", amount: 8000000, status: "paid", date: "28/01", contact: "Inmobiliaria Costa del Sol", project: "Duplex Belgrano R", pid: "p4" },
    { id: "t7", desc: "Electricidad y cableado", description: "Electricidad y cableado", amount: -1100000, status: "paid", date: "25/01", contact: "Corralón El Constructor", project: "Oficinas Rosario Centro", pid: "p3" },
    { id: "t8", desc: "Anticipo Complejo Costero", description: "Anticipo Complejo Costero - 1ra cuota", amount: 35000000, status: "paid", date: "22/02", contact: "Grupo Inversor del Plata", project: "Complejo Costero Pinamar", pid: "p5" },
    { id: "t9", desc: "Hormigón elaborado x 40m³", description: "Hormigón elaborado x 40m³ H21", amount: -2800000, status: "paid", date: "19/02", contact: "Hormigonera del Litoral", project: "Torre Norte - CABA", pid: "p1" },
    { id: "t10", desc: "Certificado obra #1 Paseo", description: "Certificado obra #1 Paseo Costero", amount: 4500000, status: "pending", date: "24/02", contact: "Municipalidad de Pinamar", project: "Paseo Costero Municipal", pid: "p6" },
    { id: "t11", desc: "Sueldos Febrero 2026", description: "Liquidación sueldos equipo - Febrero", amount: -4850000, status: "paid", date: "01/02", contact: null, project: null, pid: null },
    { id: "t12", desc: "Alquiler obrador Torre Norte", description: "Alquiler mensual obrador + depósito", amount: -380000, status: "paid", date: "05/02", contact: null, project: "Torre Norte - CABA", pid: "p1" },
  ];
  const demoTasks = [
    { id: "k1", title: "Inspección estructura piso 6", project: "Torre Norte - CABA", pid: "p1", who: "Lucas García", pri: "high", due: "2026-02-26", st: "todo", tag: "obra" },
    { id: "k2", title: "Pedir presupuesto sanitarios", project: "Casa Pinamar 2026", pid: "p2", who: "Ana Vega", pri: "medium", due: "2026-02-28", st: "todo", tag: "compras" },
    { id: "k3", title: "Enviar certificado avance a Costa", project: "Torre Norte - CABA", pid: "p1", who: "Carolina López", pri: "high", due: "2026-02-25", st: "in_progress", tag: "admin" },
    { id: "k4", title: "Revisar planos eléctricos oficina", project: "Oficinas Rosario Centro", pid: "p3", who: "Martín Ruiz", pri: "medium", due: "2026-03-01", st: "todo", tag: "diseño" },
    { id: "k5", title: "Contratar pintor para duplex", project: "Duplex Belgrano R", pid: "p4", who: "Lucas García", pri: "low", due: "2026-01-15", st: "done", tag: "contratos" },
    { id: "k6", title: "Buscar terreno La Frontera", project: "Casa Pinamar 2026", pid: "p2", who: "Lucas García", pri: "high", due: "2026-03-10", st: "todo", tag: "gestión" },
    { id: "k7", title: "Presentar anteproyecto al inversor", project: "Complejo Costero Pinamar", pid: "p5", who: "Martín Ruiz", pri: "high", due: "2026-03-05", st: "todo", tag: "diseño" },
    { id: "k8", title: "Gestionar permiso municipal", project: "Paseo Costero Municipal", pid: "p6", who: "Carolina López", pri: "medium", due: "2026-03-15", st: "in_progress", tag: "gestión" },
    { id: "k9", title: "Solicitar estudio de suelo", project: "Complejo Costero Pinamar", pid: "p5", who: "Lucas García", pri: "medium", due: "2026-03-20", st: "todo", tag: "obra" },
    { id: "k10", title: "Auditoría de seguridad obra", project: "Torre Norte - CABA", pid: "p1", who: "Diego Fernández", pri: "high", due: "2026-02-27", st: "todo", tag: "obra" },
  ];
  const demoDocuments = [
    { id: "dc1", name: "Factura Corralón #4521", type: "invoice", status: "approved", contact: "Corralón El Constructor", project: "Torre Norte - CABA", pid: "p1", date: "20/02", size: "245 KB" },
    { id: "dc2", name: "Plano estructura P6.dwg", type: "blueprint", status: "active", contact: null, project: "Torre Norte - CABA", pid: "p1", date: "18/02", size: "1.2 MB" },
    { id: "dc3", name: "Contrato Rodríguez", type: "contract", status: "approved", contact: "Familia Rodríguez", project: "Casa Pinamar 2026", pid: "p2", date: "15/02", size: "380 KB" },
    { id: "dc4", name: "Presupuesto sanitarios", type: "budget", status: "pending", contact: "Estudio Arq. Vega & Asoc.", project: "Oficinas Rosario Centro", pid: "p3", date: "12/02", size: "156 KB" },
    { id: "dc5", name: "Convenio Municipal Pinamar", type: "contract", status: "approved", contact: "Municipalidad de Pinamar", project: "Paseo Costero Municipal", pid: "p6", date: "10/02", size: "520 KB" },
    { id: "dc6", name: "Render Complejo Costero.pdf", type: "blueprint", status: "active", contact: "Grupo Inversor del Plata", project: "Complejo Costero Pinamar", pid: "p5", date: "22/02", size: "4.8 MB" },
    { id: "dc7", name: "Factura hormigón H21 #890", type: "invoice", status: "pending", contact: "Hormigonera del Litoral", project: "Torre Norte - CABA", pid: "p1", date: "19/02", size: "198 KB" },
    { id: "dc8", name: "Recibo sueldos Feb 2026", type: "receipt", status: "approved", contact: null, project: null, pid: null, date: "01/02", size: "340 KB" },
  ];

  // Demo team members
  const demoTeam = [
    { id: "tm1", full_name: "Lucas García", role: "owner", email: "lucas@constructorademo.com", created_at: "2025-06-15T00:00:00Z", user: { email: "lucas@constructorademo.com" } },
    { id: "tm2", full_name: "Carolina López", role: "admin", email: "carolina@constructorademo.com", created_at: "2025-07-01T00:00:00Z", user: { email: "carolina@constructorademo.com" } },
    { id: "tm3", full_name: "Martín Ruiz", role: "pm", email: "martin@constructorademo.com", created_at: "2025-08-10T00:00:00Z", user: { email: "martin@constructorademo.com" } },
    { id: "tm4", full_name: "Sofía Pereyra", role: "accountant", email: "sofia@constructorademo.com", created_at: "2025-09-20T00:00:00Z", user: { email: "sofia@constructorademo.com" } },
    { id: "tm5", full_name: "Diego Fernández", role: "employee", email: "diego@constructorademo.com", created_at: "2025-10-05T00:00:00Z", user: { email: "diego@constructorademo.com" } },
    { id: "tm6", full_name: "Valentina Sosa", role: "employee", email: "vale@constructorademo.com", created_at: "2025-11-12T00:00:00Z", user: { email: "vale@constructorademo.com" } },
  ];

  // Demo payroll
  const demoPayroll = [
    // Febrero 2026
    { id: "pr1", employee_name: "Lucas García", role: "Socio Gerente", period: "2026-02", base_salary: 1800000, overtime: 0, bonus: 200000, deductions: 380000, total: 1620000, status: "paid", payment_date: "2026-02-05", notes: null },
    { id: "pr2", employee_name: "Carolina López", role: "Administrativa", period: "2026-02", base_salary: 950000, overtime: 85000, bonus: 0, deductions: 196000, total: 839000, status: "paid", payment_date: "2026-02-05", notes: null },
    { id: "pr3", employee_name: "Martín Ruiz", role: "Director de Obra", period: "2026-02", base_salary: 1200000, overtime: 150000, bonus: 100000, deductions: 275000, total: 1175000, status: "paid", payment_date: "2026-02-05", notes: "Bono por entrega anticipada Duplex" },
    { id: "pr4", employee_name: "Sofía Pereyra", role: "Contadora", period: "2026-02", base_salary: 850000, overtime: 0, bonus: 0, deductions: 161000, total: 689000, status: "paid", payment_date: "2026-02-05", notes: null },
    { id: "pr5", employee_name: "Diego Fernández", role: "Capataz de Obra", period: "2026-02", base_salary: 780000, overtime: 220000, bonus: 0, deductions: 190000, total: 810000, status: "paid", payment_date: "2026-02-05", notes: "Horas extra Torre Norte piso 6" },
    { id: "pr6", employee_name: "Valentina Sosa", role: "Asistente Administrativa", period: "2026-02", base_salary: 620000, overtime: 0, bonus: 0, deductions: 117000, total: 503000, status: "paid", payment_date: "2026-02-05", notes: null },
    // Enero 2026
    { id: "pr7", employee_name: "Lucas García", role: "Socio Gerente", period: "2026-01", base_salary: 1800000, overtime: 0, bonus: 0, deductions: 342000, total: 1458000, status: "paid", payment_date: "2026-01-05", notes: null },
    { id: "pr8", employee_name: "Carolina López", role: "Administrativa", period: "2026-01", base_salary: 950000, overtime: 40000, bonus: 0, deductions: 188000, total: 802000, status: "paid", payment_date: "2026-01-05", notes: null },
    { id: "pr9", employee_name: "Martín Ruiz", role: "Director de Obra", period: "2026-01", base_salary: 1200000, overtime: 100000, bonus: 0, deductions: 247000, total: 1053000, status: "paid", payment_date: "2026-01-05", notes: null },
    { id: "pr10", employee_name: "Sofía Pereyra", role: "Contadora", period: "2026-01", base_salary: 850000, overtime: 0, bonus: 0, deductions: 161000, total: 689000, status: "paid", payment_date: "2026-01-05", notes: null },
    { id: "pr11", employee_name: "Diego Fernández", role: "Capataz de Obra", period: "2026-01", base_salary: 780000, overtime: 180000, bonus: 0, deductions: 182000, total: 778000, status: "paid", payment_date: "2026-01-05", notes: null },
    { id: "pr12", employee_name: "Valentina Sosa", role: "Asistente Administrativa", period: "2026-01", base_salary: 620000, overtime: 0, bonus: 0, deductions: 117000, total: 503000, status: "paid", payment_date: "2026-01-05", notes: null },
    // Marzo 2026 (draft)
    { id: "pr13", employee_name: "Lucas García", role: "Socio Gerente", period: "2026-03", base_salary: 1800000, overtime: 0, bonus: 0, deductions: 342000, total: 1458000, status: "draft", payment_date: null, notes: null },
    { id: "pr14", employee_name: "Carolina López", role: "Administrativa", period: "2026-03", base_salary: 950000, overtime: 0, bonus: 0, deductions: 180000, total: 770000, status: "draft", payment_date: null, notes: null },
    { id: "pr15", employee_name: "Martín Ruiz", role: "Director de Obra", period: "2026-03", base_salary: 1200000, overtime: 0, bonus: 0, deductions: 228000, total: 972000, status: "draft", payment_date: null, notes: null },
  ];

  const noop = () => {};
  return (
    <DataContext.Provider value={{
      clients: demoClients, projects: demoProjects, transactions: demoTransactions,
      tasks: demoTasks, documents: demoDocuments, bankAccounts: [],
      demoTeam, demoPayroll,
      loading: false, reload: noop, companyId: "demo",
      setClients: noop, setProjects: noop, setTransactions: noop, setTasks: noop, setDocuments: noop
    }}>
      {children}
    </DataContext.Provider>
  );
}

const themes = {
  dark: {
    // Bg hierarchy: bg (deepest) → sidebar/topbar → card → hover (lightest surface)
    bg:"#0B0E14", card:"#161B26", hover:"#1E2433", sidebar:"#101520", topbar:"#101520",
    border:"#2A3142", text:"#E8ECF4", muted:"#94A0B8", dim:"#5E6B82",
    accent:"#7C6DF0", accentL:"#A899FF", accentBg:"rgba(124,109,240,0.12)",
    green:"#34D399", greenBg:"rgba(52,211,153,0.12)",
    red:"#F87171", redBg:"rgba(248,113,113,0.12)",
    orange:"#FBBF24", orangeBg:"rgba(251,191,36,0.12)",
    blue:"#60A5FA", blueBg:"rgba(96,165,250,0.12)",
    yellow:"#FACC15", yellowBg:"rgba(250,204,21,0.12)",
    shadow:"0 2px 8px rgba(0,0,0,0.35)",
  },
  light: {
    // Bg hierarchy: bg (lightest) → sidebar/topbar → card → hover (subtle tint)
    bg:"#EFF1F5", card:"#FFFFFF", hover:"#F5F6FA", sidebar:"#FFFFFF", topbar:"#FFFFFF",
    border:"#D0D5DD", text:"#1A1D2A", muted:"#4B5167", dim:"#868EA5",
    accent:"#6C5CE7", accentL:"#5A4BD6", accentBg:"rgba(108,92,231,0.08)",
    green:"#059669", greenBg:"rgba(5,150,105,0.08)",
    red:"#DC2626", redBg:"rgba(220,38,38,0.08)",
    orange:"#D97706", orangeBg:"rgba(217,119,6,0.08)",
    blue:"#2563EB", blueBg:"rgba(37,99,235,0.08)",
    yellow:"#CA8A04", yellowBg:"rgba(202,138,4,0.08)",
    shadow:"0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)",
  },
};

const fmt = (n) => {
  if (n === undefined || n === null || isNaN(n)) return "$0";
  const a = Math.abs(n);
  if (a >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + Number(n).toLocaleString("es-AR");
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
  printWin.document.write("<h1>GestiónAI — " + title + "</h1><h2>" + mesLabel + "</h2>");
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
    client:[t.greenBg,t.green,"Cliente"], provider:[t.blueBg,t.blue,"Proveedor"],
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

function Crd({ children, t, style: s, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <div style={{ background: t.card, borderRadius: 13, border: "1px solid " + t.border, boxShadow: t.shadow, transition: "box-shadow 0.15s ease", ...s }} onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {children}
    </div>
  );
}

function Sidebar({ active, onNav, collapsed, toggle, t, user, onLogout, role, profile, isDemo }) {
  const [showWaModal, setShowWaModal] = useState(false);
  
  // Platform-wide Twilio number — shared by all companies
  const PLATFORM_WA = "14155238886";
  const companyName = profile?.company?.name || "Mi Empresa";
  const waLink = `https://wa.me/${PLATFORM_WA}?text=${encodeURIComponent("Hola " + companyName + " 👋")}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(waLink)}&format=png`;
  const isSuperAdmin = user?.email === "lucastomas13@gmail.com";
  const allNav = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["owner","admin","accountant","pm","employee"] },
    { id: "clients", icon: Users, label: "Clientes / Proveedores", roles: ["owner","admin","accountant"] },
    { id: "projects", icon: FolderKanban, label: "Proyectos / Obras", roles: ["owner","admin","pm","employee"] },
    { id: "tasks", icon: Target, label: "Tareas", roles: ["owner","admin","pm","employee"] },
    { id: "transactions", icon: Receipt, label: "Finanzas", roles: ["owner","admin","accountant"] },
    { id: "payroll", icon: CreditCard, label: "Sueldos", roles: ["owner","admin","accountant"] },
    { id: "treasury", icon: Wallet, label: "Tesorería", roles: ["owner","admin"] },
    { id: "documents", icon: FileText, label: "Documentos", roles: ["owner","admin","accountant","pm"] },
    { id: "reports", icon: BarChart3, label: "Reportes", roles: ["owner","admin","accountant"] },
    { id: "team", icon: UserPlus, label: "Equipo", roles: ["owner","admin"] },
    { id: "help", icon: HelpCircle, label: "Ayuda", roles: ["owner","admin","accountant","pm","employee"] },
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
        {isSuperAdmin && (
          <>
            {!collapsed && <div style={{ fontSize: 9, fontWeight: 700, color: t.orange, textTransform: "uppercase", letterSpacing: "1.2px", padding: "16px 10px 6px", marginBottom: 2, borderTop: "1px solid " + t.border, marginTop: 8 }}>Super Admin</div>}
            {collapsed && <div style={{ borderTop: "1px solid " + t.border, marginTop: 8, marginBottom: 8 }} />}
            <div onClick={() => onNav("superadmin")} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: collapsed ? "10px 16px" : "9px 12px",
              borderRadius: 9, cursor: "pointer", marginBottom: 2,
              background: active === "superadmin" ? "rgba(251,191,36,0.10)" : "transparent",
              borderLeft: active === "superadmin" ? "3px solid " + t.orange : "3px solid transparent",
            }}>
              <Shield size={17} color={active === "superadmin" ? t.orange : t.dim} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ fontSize: 13, fontWeight: active === "superadmin" ? 600 : 400, color: active === "superadmin" ? t.orange : t.muted }}>Panel de Control</span>}
            </div>
          </>
        )}
      </div>
      <div style={{ padding: collapsed ? 10 : 14, borderTop: "1px solid " + t.border }}>
        <div onClick={() => setShowWaModal(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: collapsed ? "8px 6px" : "10px 12px", background: "rgba(37,211,102,0.06)", borderRadius: 9, border: "1px solid rgba(37,211,102,0.12)", marginBottom: 8, cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(37,211,102,0.12)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(37,211,102,0.06)"}>
          <MessageSquare size={16} color="#25D366" />
          {!collapsed && <div><div style={{ fontSize: 11, fontWeight: 600, color: "#25D366" }}>WhatsApp</div><div style={{ fontSize: 10, color: t.dim }}>Conectado ✓</div></div>}
        </div>

        {/* WhatsApp QR Modal */}
        {showWaModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowWaModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: t.card, borderRadius: 20, border: "1px solid " + t.border, padding: 28, width: 400, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(37,211,102,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MessageSquare size={20} color="#25D366" />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>WhatsApp Bot</div>
                    <div style={{ fontSize: 11, color: t.muted }}>{companyName}</div>
                  </div>
                </div>
                <div onClick={() => setShowWaModal(false)} style={{ cursor: "pointer", width: 28, height: 28, borderRadius: 7, background: t.hover, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={14} color={t.muted} />
                </div>
              </div>

              {/* QR Code - always visible */}
              <div style={{ background: "#ffffff", borderRadius: 16, padding: 20, textAlign: "center", marginBottom: 16, border: "1px solid " + t.border }}>
                <img src={qrUrl} alt="QR WhatsApp" style={{ width: 220, height: 220, borderRadius: 8 }} />
              </div>

              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 14, color: t.text, fontWeight: 700, marginBottom: 4 }}>Compartí este QR con tus clientes</div>
                <div style={{ fontSize: 11, color: t.muted }}>Al escanearlo, abren WhatsApp y hablan directo con la IA de {companyName}</div>
              </div>

              {/* Main CTA */}
              <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "12px 0", borderRadius: 10, background: "#25D366", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", cursor: "pointer", border: "none", marginBottom: 10 }}>
                <MessageSquare size={16} /> Abrir WhatsApp
              </a>

              {/* Share buttons row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                <div onClick={() => { navigator.clipboard.writeText(waLink); window.alert("Link copiado ✓"); }} style={{ cursor: "pointer", padding: "9px 0", borderRadius: 8, background: t.hover, border: "1px solid " + t.border, textAlign: "center", fontSize: 12, fontWeight: 600, color: t.text }}>
                  📋 Copiar link
                </div>
                <div onClick={() => { 
                  const shareText = `Hola! Hablá con el asistente de ${companyName} por WhatsApp: ${waLink}`;
                  if (navigator.share) { navigator.share({ title: companyName + " - WhatsApp", text: shareText, url: waLink }); }
                  else { navigator.clipboard.writeText(shareText); window.alert("Texto copiado para compartir ✓"); }
                }} style={{ cursor: "pointer", padding: "9px 0", borderRadius: 8, background: t.accentBg, border: "1px solid " + t.accent + "30", textAlign: "center", fontSize: 12, fontWeight: 600, color: t.accentL }}>
                  📤 Compartir
                </div>
              </div>

              {/* How it works */}
              <div style={{ padding: 12, background: t.hover, borderRadius: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.text, marginBottom: 8 }}>¿Cómo funciona?</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    ["1.", "El cliente escanea el QR o hace click en el link"],
                    ["2.", "Se abre WhatsApp con un mensaje pre-armado"],
                    ["3.", "La IA identifica al cliente por su número de teléfono"],
                    ["4.", "Responde como asistente de " + companyName],
                  ].map(([n, txt], i) => (
                    <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: t.accent, minWidth: 14 }}>{n}</span>
                      <span style={{ fontSize: 11, color: t.muted, lineHeight: 1.4 }}>{txt}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 10, color: t.dim, textAlign: "center" }}>Para que la IA identifique al cliente, asegurate de que su teléfono esté cargado en Clientes/Proveedores</div>
            </div>
          </div>
        )}
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
  const todayStr2 = new Date().toISOString().split("T")[0];
  const overdueTasks2 = tasks.filter(tk => tk.due && tk.st !== "done" && new Date(tk.due) < new Date(todayStr2));
  const dueSoonTasks = tasks.filter(tk => {
    if (!tk.due || tk.st === "done") return false;
    const d = new Date(tk.due); const now = new Date(); const diff = (d - now) / (1000*60*60*24);
    return diff >= 0 && diff <= 3;
  });
  const notifs = [
    ...overdueTx.map(tx => ({ icon: AlertCircle, color: t.red, text: "Pago vencido: " + tx.desc, sub: fmt(tx.amount), nav: "transactions" })),
    ...overdueTasks2.map(tk => ({ icon: Target, color: t.red, text: "Tarea vencida: " + tk.title, sub: tk.project, nav: "tasks" })),
    ...dueSoonTasks.map(tk => ({ icon: Clock, color: t.orange, text: "Vence pronto: " + tk.title, sub: tk.due, nav: "tasks" })),
    ...pendingTx.slice(0, 3).map(tx => ({ icon: Clock, color: t.orange, text: "Pendiente: " + tx.desc, sub: fmt(tx.amount), nav: "transactions" })),
  ];
  const notiCount = overdueTx.length + overdueTasks2.length + dueSoonTasks.length;

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";
  const userCompany = profile?.company?.name || user?.user_metadata?.company || "";
  const userPhone = profile?.phone_number || user?.user_metadata?.phone || "";
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
            <>
            <div onClick={() => setNotiOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
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
            </>
          )}
        </div>

        {/* Profile */}
        <div style={{ position: "relative" }}>
          <div onClick={() => { setProfileOpen(!profileOpen); setNotiOpen(false); }} style={{ cursor: "pointer" }}>
            <Av name={userName} size={30} />
          </div>
          {profileOpen && (
            <>
            <div onClick={() => setProfileOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
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
                {/* Phone number for WA notifications */}
                {!userPhone && (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: t.accentBg, borderRadius: 7, border: "1px solid " + t.accent + "20" }}>
                    <div style={{ fontSize: 10, color: t.accentL, fontWeight: 600, marginBottom: 6 }}>📱 Agregá tu teléfono para recibir recordatorios por WhatsApp</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input id="profile-phone-input" placeholder="+54 9 11 5555 1234" style={{ flex: 1, padding: "5px 8px", borderRadius: 5, border: "1px solid " + t.border, background: t.hover, color: t.text, fontSize: 11, outline: "none", fontFamily: "monospace" }} />
                      <button onClick={async () => {
                        const inp = document.getElementById("profile-phone-input");
                        const val = inp?.value?.replace(/[^0-9+]/g, "");
                        if (!val || val.length < 8) { window.alert("Ingresá un teléfono válido con código de país"); return; }
                        const { error } = await supabase.from("user_profiles").update({ phone_number: val }).eq("id", user.id);
                        if (error) { window.alert("Error: " + error.message); return; }
                        window.alert("✅ Teléfono guardado. Vas a recibir recordatorios por WhatsApp.");
                        window.location.reload();
                      }} style={{ padding: "5px 10px", borderRadius: 5, background: t.accent, color: "#fff", border: "none", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Guardar</button>
                    </div>
                  </div>
                )}
              </div>
              <div onMouseDown={onLogout} style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: t.red, fontSize: 12, fontWeight: 600 }} onMouseEnter={e => e.currentTarget.style.background = t.hover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <LogOut size={14} /> Cerrar sesión
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ t, onNav }) {
  const { transactions: TXS, tasks, clients, projects, documents } = useData();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // Tasks categorized by actual dates
  const overdueTasks = tasks.filter(tk => {
    if (!tk.due || tk.st === "done") return false;
    return new Date(tk.due) < new Date(todayStr);
  });
  const todayTasks = tasks.filter(tk => {
    if (!tk.due || tk.st === "done") return false;
    return tk.due.startsWith(todayStr);
  });
  const pendingTasks = tasks.filter(tk => tk.st === "todo" || tk.st === "in_progress");
  const tasksForToday = [...overdueTasks, ...todayTasks]; // overdue + due today
  const urgentTasks = overdueTasks; // truly urgent = overdue

  const pendingTx = TXS.filter(tx => tx.status === "pending" || tx.status === "overdue");
  const overdueTx = TXS.filter(tx => tx.status === "overdue");
  const recentDocs = documents.slice(0, 5);
  const today = now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  // Tasks due soon (next 7 days, NOT including overdue)
  const dueSoon = tasks.filter(tk => {
    if (!tk.due || tk.st === "done") return false;
    const d = new Date(tk.due); const diff = (d - now) / (1000*60*60*24);
    return diff >= 0 && diff <= 7;
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
          { icon: Target, label: "Tareas pendientes", val: pendingTasks.length, sub: overdueTasks.length > 0 ? overdueTasks.length + " vencidas" : "Todo al día", color: t.accent, bg: t.accentBg, nav: "tasks" },
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
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>
              {tasksForToday.length > 0 ? "Tareas para hoy" : "Próximas tareas"}
              {overdueTasks.length > 0 && <span style={{ fontSize: 11, color: t.red, fontWeight: 600, marginLeft: 8 }}>({overdueTasks.length} vencidas)</span>}
            </div>
            <span onClick={() => onNav && onNav("tasks")} style={{ fontSize: 11, color: t.accentL, cursor: "pointer", fontWeight: 500 }}>Ver todas →</span>
          </div>
          {(tasksForToday.length > 0 ? tasksForToday : dueSoon).length === 0 ? (
            <div style={{ padding: 30, textAlign: "center" }}>
              <CheckCircle2 size={28} color={t.green} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: t.green, fontWeight: 600 }}>Todo al día</div>
              <div style={{ fontSize: 11, color: t.dim }}>No hay tareas pendientes</div>
            </div>
          ) : (tasksForToday.length > 0 ? tasksForToday : dueSoon).slice(0, 8).map(tk => {
            const isOverdue = tk.due && new Date(tk.due) < new Date(todayStr);
            return (
            <div key={tk.id} onClick={() => onNav && onNav("tasks")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: isOverdue ? t.redBg : t.hover, marginBottom: 5, borderLeft: "3px solid " + (isOverdue ? t.red : tk.pri === "high" ? t.orange : tk.pri === "medium" ? t.blue : t.green), cursor: "pointer" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{tk.title}</div>
                <div style={{ fontSize: 10, color: t.dim }}>{tk.project} · {tk.who || "Sin asignar"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                {tk.due && <div style={{ fontSize: 10, fontWeight: 600, color: isOverdue ? t.red : t.dim }}>{isOverdue ? "Vencida" : tk.due}</div>}
                <Badge s={tk.st} t={t} />
              </div>
            </div>
            );
          })}
          {(tasksForToday.length > 0 ? tasksForToday : dueSoon).length > 8 && <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: t.accentL }}>+{(tasksForToday.length > 0 ? tasksForToday : dueSoon).length - 8} tareas más</div>}
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
        <input type={type} value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 9px", color: t.text, fontSize: 12, outline: "none", colorScheme: t.bg === "#0B0F1A" ? "dark" : "light" }} />
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

  const deleteClient = async (id, name) => {
    if (!window.confirm("¿Eliminar a " + name + "? Las transacciones y documentos vinculados perderán la referencia al contacto.")) return;
    // Nullify FK references first
    await supabase.from("transactions").update({ contact_id: null }).eq("contact_id", id);
    await supabase.from("documents").update({ contact_id: null }).eq("contact_id", id);
    await supabase.from("projects").update({ client_id: null }).eq("client_id", id);
    await supabase.from("clients").delete().eq("id", id);
    await reload();
    setSel(null);
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
            <button onClick={() => deleteClient(c.id, c.name)} style={{ marginTop: 14, width: "100%", padding: "8px 0", borderRadius: 7, border: "1px solid " + t.red + "30", background: t.redBg, color: t.red, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Trash2 size={12} />Eliminar contacto</button>
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
                  if (!fileUrl) return;
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
  const list = PROJECTS.filter(p => filter === "all" ? true : filter === "active" ? (p.status === "in_progress" || p.status === "planning" || p.status === "active") : p.status === "completed");

  const saveProject = async () => {
    if (!nf.name.trim()) return;
    await supabase.from("projects").insert([{ name: nf.name, client_id: nf.client_id || null, budget: Number(nf.budget) || 0, deadline: nf.deadline || null, priority: nf.priority, description: nf.description, status: "planning", progress: 0, spent: 0, company_id: companyId }]);
    await reload();
    setNf({ name: "", client_id: "", budget: "", deadline: "", priority: "medium", description: "" });
    setShowNew(false);
  };

  const deleteProject = async (id, name) => {
    if (!window.confirm("¿Eliminar el proyecto \"" + name + "\"? Las transacciones, tareas y documentos vinculados perderán la referencia.")) return;
    // Nullify FK references first
    await supabase.from("transactions").update({ project_id: null }).eq("project_id", id);
    await supabase.from("tasks").update({ project_id: null }).eq("project_id", id);
    await supabase.from("documents").update({ project_id: null }).eq("project_id", id);
    await supabase.from("projects").delete().eq("id", id);
    await reload();
    setSel(null);
  };

  const updateProgress = async (id, val) => {
    const status = val === 100 ? "completed" : val > 0 ? "in_progress" : "planning";
    await supabase.from("projects").update({ progress: val, status }).eq("id", id);
    const curSel = sel;
    await reload();
    setSel(curSel);
  };

  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", assignee: "", priority: "medium", due_date: "", tag: "obra" });

  if (sel) {
    const p = PROJECTS.find(x => x.id === sel);
    if (!p) { setSel(null); return null; }
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
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: t.muted }}>Avance</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{p.progress}%</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}><PBar v={p.progress} h={8} color={p.progress > 80 ? t.green : t.accent} t={t} /></div>
            <input type="range" min={0} max={100} step={5} value={p.progress} onChange={async (e) => {
              const val = Number(e.target.value);
              await updateProgress(p.id, val);
            }} style={{ width: 120, accentColor: p.progress > 80 ? "#34D399" : "#7C6DF0" }} />
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            {[0,25,50,75,100].map(v => (
              <button key={v} onClick={() => updateProgress(p.id, v)} style={{ flex: 1, padding: "4px 0", borderRadius: 5, border: "1px solid " + (p.progress === v ? t.accent : t.border), background: p.progress === v ? t.accentBg : t.hover, color: p.progress === v ? t.accent : t.dim, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{v}%</button>
            ))}
          </div>
        </div>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Tareas y pendientes</div>
              <Btn t={t} onClick={() => setShowNewTask(!showNewTask)}><Plus size={12} />{showNewTask ? "Cancelar" : "Nueva tarea"}</Btn>
            </div>
            {showNewTask && (
              <div style={{ padding: 12, background: t.hover, borderRadius: 8, marginBottom: 10, border: "1px dashed " + t.accent + "40" }}>
                <Inp label="Título de la tarea" val={newTask.title} onChange={v => setNewTask({...newTask, title: v})} t={t} placeholder="Ej: Revisar planos..." />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                  <Inp label="Responsable" val={newTask.assignee} onChange={v => setNewTask({...newTask, assignee: v})} t={t} placeholder="Nombre" />
                  <Inp label="Fecha límite" val={newTask.due_date} onChange={v => setNewTask({...newTask, due_date: v})} t={t} type="date" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                  <div>
                    <div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Prioridad</div>
                    <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})} style={{ width: "100%", background: t.card, border: "1px solid " + t.border, borderRadius: 7, padding: "7px 9px", color: t.text, fontSize: 12 }}>
                      <option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Etiqueta</div>
                    <select value={newTask.tag} onChange={e => setNewTask({...newTask, tag: e.target.value})} style={{ width: "100%", background: t.card, border: "1px solid " + t.border, borderRadius: 7, padding: "7px 9px", color: t.text, fontSize: 12 }}>
                      <option value="obra">Obra</option><option value="compras">Compras</option><option value="admin">Admin</option><option value="diseño">Diseño</option><option value="contratos">Contratos</option><option value="gestión">Gestión</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <Btn primary t={t} onClick={async () => {
                    if (!newTask.title.trim()) return;
                    await supabase.from("tasks").insert([{ title: newTask.title, project_id: p.id, assignee: newTask.assignee || null, priority: newTask.priority, due_date: newTask.due_date || null, status: "todo", tag: newTask.tag, company_id: companyId }]);
                    setNewTask({ title: "", assignee: "", priority: "medium", due_date: "", tag: "obra" });
                    setShowNewTask(false);
                    const curSel = sel; await reload(); setSel(curSel);
                  }}><Check size={12} />Crear tarea</Btn>
                </div>
              </div>
            )}
            {TASKS.filter(tk => tk.pid === p.id).length ? TASKS.filter(tk => tk.pid === p.id).map(tk => (
              <div key={tk.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid " + t.border + "15" }}>
                <div>
                  <span style={{ fontSize: 11, color: t.text, textDecoration: tk.st === "done" ? "line-through" : "none" }}>{tk.title}</span>
                  <div style={{ fontSize: 10, color: t.dim }}>{tk.due || "Sin fecha"} · {tk.who}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}><Badge s={tk.st} t={t} /><Badge s={tk.pri} t={t} /></div>
              </div>
            )) : !showNewTask && <div style={{ fontSize: 11, color: t.dim, textAlign: "center", padding: 16 }}>Sin tareas</div>}
          </Crd>
        </div>
        <Crd t={t} style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Documentos y facturas</div>
            <input ref={projFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={async (e) => {
              const f = e.target.files[0]; if (!f) return;
              const fileUrl = await uploadFile(f);
              if (!fileUrl) return;
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
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => deleteProject(p.id, p.name)} style={{ padding: "9px 18px", borderRadius: 7, border: "1px solid " + t.red + "30", background: t.redBg, color: t.red, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Trash2 size={13} />Eliminar proyecto</button>
        </div>
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
            <Inp label="Fecha límite" val={nf.deadline} onChange={v => setNf({ ...nf, deadline: v })} t={t} type="date" />
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
  const [calDate, setCalDate] = useState(new Date());
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
    const todayDate = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from("tasks").insert([{ title: "Nueva tarea", assignee: "", priority: "medium", due_date: todayDate, status: "todo", tag: "General", company_id: companyId }]).select();
    if (data && data[0]) {
      const nt = { ...data[0], project: "Admin", pid: null, who: data[0].assignee, pri: data[0].priority, due: data[0].due_date, st: data[0].status, tag: data[0].tag };
      setTasks([nt, ...tasks]);
      openEdit(nt);
    }
  };

  const editPanel = editForm && (
    <div onClick={() => { setEditing(null); setEditForm(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 440, maxWidth: "90vw", maxHeight: "85vh", background: t.card, borderRadius: 16, border: "1px solid " + t.border, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: t.text }}>Editar tarea</span>
          <div onClick={() => { setEditing(null); setEditForm(null); }} style={{ cursor: "pointer", width: 28, height: 28, borderRadius: 7, background: t.hover, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} color={t.muted} /></div>
        </div>
        <Inp label="Título" val={editForm.title} onChange={v => setEditForm({...editForm, title: v})} t={t} />
        <Inp label="Proyecto" val={editForm.project} onChange={v => setEditForm({...editForm, project: v})} t={t} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Inp label="Asignado" val={editForm.who} onChange={v => setEditForm({...editForm, who: v})} t={t} />
          <Inp label="Fecha de vencimiento" val={editForm.due} onChange={v => setEditForm({...editForm, due: v})} t={t} type="date" />
        </div>
        <Inp label="Etiqueta" val={editForm.tag} onChange={v => setEditForm({...editForm, tag: v})} t={t} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid " + t.border }}>
          <Btn t={t} onClick={() => deleteTask(editForm.id)} style={{ color: t.red }}><X size={12} />Eliminar</Btn>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn t={t} onClick={() => { setEditing(null); setEditForm(null); }}>Cancelar</Btn>
            <Btn primary t={t} onClick={saveEdit}><Check size={12} />Guardar</Btn>
          </div>
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
      {view === "calendar" && (() => {
        const [calYear, calMonth] = [calDate.getFullYear(), calDate.getMonth()];
        const firstDay = new Date(calYear, calMonth, 1).getDay();
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const blanks = firstDay === 0 ? 6 : firstDay - 1; // Monday start
        const todayStr = new Date().toISOString().slice(0, 10);
        const monthName = new Date(calYear, calMonth).toLocaleDateString("es-AR", { month: "long", year: "numeric" });

        return (
        <Crd t={t} style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <button onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))} style={{ background: t.hover, border: "1px solid " + t.border, borderRadius: 6, padding: "6px 10px", cursor: "pointer", color: t.text, fontSize: 14, fontWeight: 600 }}>‹</button>
            <span style={{ fontSize: 16, fontWeight: 700, color: t.text, textTransform: "capitalize", minWidth: 180, textAlign: "center" }}>{monthName}</span>
            <button onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))} style={{ background: t.hover, border: "1px solid " + t.border, borderRadius: 6, padding: "6px 10px", cursor: "pointer", color: t.text, fontSize: 14, fontWeight: 600 }}>›</button>
            <button onClick={() => setCalDate(new Date())} style={{ background: t.accentBg, border: "1px solid " + t.accent + "40", borderRadius: 6, padding: "5px 12px", cursor: "pointer", color: t.accentL, fontSize: 11, fontWeight: 600 }}>Hoy</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
            {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: t.dim, padding: "8px 0", borderBottom: "2px solid " + t.border }}>
                {d}
              </div>
            ))}
            {Array(blanks).fill(null).map((_, i) => <div key={"e" + i} style={{ minHeight: 80 }} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const ds = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const dt = tasks.filter(tk => tk.due === ds);
              const isToday = ds === todayStr;
              const dow = new Date(calYear, calMonth, d).getDay();
              const isWeekend = dow === 0 || dow === 6;
              return (
                <div key={d} style={{
                  minHeight: 80, padding: 6, borderRadius: 8,
                  border: isToday ? "2px solid " + t.accent : "1px solid " + t.border + "30",
                  background: isToday ? t.accentBg : isWeekend ? t.hover + "50" : "transparent",
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: isToday ? 800 : 500,
                    color: isToday ? t.accentL : isWeekend ? t.dim : t.text,
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
        );
      })()}
    </div>
  );
}

function Transactions({ t }) {
  const { transactions: TXS, documents: DOCS, clients, projects, bankAccounts, reload, companyId } = useData();
  const [tab, setTab] = useState("all");
  const [sel, setSel] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [filterProject, setFilterProject] = useState("");
  const [nf, setNf] = useState({ description: "", contact_id: "", project_id: "", account_id: "", amount: "", status: "pending", date: new Date().toISOString().slice(0, 10) });

  const saveTx = async () => {
    if (!nf.description.trim() || !nf.amount) return;
    await supabase.from("transactions").insert([{ description: nf.description, contact_id: nf.contact_id || null, project_id: nf.project_id || null, account_id: nf.account_id || null, amount: Number(nf.amount), status: nf.status, date: nf.date, company_id: companyId }]);
    await reload();
    setNf({ description: "", contact_id: "", project_id: "", account_id: "", amount: "", status: "pending", date: new Date().toISOString().slice(0, 10) });
    setShowNew(false);
  };

  const markPaid = async (id, accountId) => {
    const update = { status: "paid" };
    if (accountId) update.account_id = accountId;
    await supabase.from("transactions").update(update).eq("id", id);
    await reload();
    setSel(null);
  };

  const assignAccount = async (txId, accountId) => {
    await supabase.from("transactions").update({ account_id: accountId || null }).eq("id", txId);
    await reload();
  };

  const deleteTx = async (id) => {
    if (!window.confirm("¿Eliminar esta transacción? Esta acción no se puede deshacer.")) return;
    await supabase.from("transactions").delete().eq("id", id);
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
      if (!fileUrl) return;
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
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {bankAccounts.length > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <select id={"pay-acc-" + tx.id} defaultValue={tx.account_id || ""} style={{ background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "7px 9px", color: t.text, fontSize: 11 }}>
                      <option value="">Efectivo (sin cuenta)</option>
                      {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <Btn primary t={t} onClick={() => { const accEl = document.getElementById("pay-acc-" + tx.id); markPaid(tx.id, accEl?.value || null); }}><Check size={12} />Marcar pagado</Btn>
                  </div>
                ) : (
                  <Btn primary t={t} onClick={() => markPaid(tx.id, null)}><Check size={12} />Marcar como pagado</Btn>
                )}
                <Btn t={t} onClick={() => window.alert("📱 Recordatorio para " + tx.contact + ":\n\nHola, le recordamos que tiene un pago/cobro pendiente:\n• " + tx.desc + "\n• Monto: " + fmt(tx.amount) + "\n\n(Próximamente se enviará por WhatsApp automáticamente)")}><Mail size={12} />Enviar recordatorio</Btn>
                <Btn t={t} onClick={() => deleteTx(tx.id)} style={{ color: t.red }}><Trash2 size={12} />Eliminar</Btn>
              </div>
            )}
            {tx.status === "paid" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: t.muted }}>Cuenta:</span>
                  <select value={tx.account_id || ""} onChange={e => assignAccount(tx.id, e.target.value)} style={{ background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "7px 9px", color: t.text, fontSize: 11 }}>
                    <option value="">Efectivo (sin asignar)</option>
                    {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <Btn t={t} onClick={() => deleteTx(tx.id)} style={{ color: t.red }}><Trash2 size={12} />Eliminar</Btn>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Contacto</div><select value={nf.contact_id} onChange={e => setNf({ ...nf, contact_id: e.target.value })} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 9px", color: t.text, fontSize: 12 }}><option value="">— Seleccionar —</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Proyecto</div><select value={nf.project_id} onChange={e => setNf({ ...nf, project_id: e.target.value })} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 9px", color: t.text, fontSize: 12 }}><option value="">— Seleccionar —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <Inp label="Fecha" val={nf.date} onChange={v => setNf({ ...nf, date: v })} t={t} type="date" />
            <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Estado</div><select value={nf.status} onChange={e => setNf({ ...nf, status: e.target.value })} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 9px", color: t.text, fontSize: 12 }}><option value="paid">Pagado</option><option value="pending">Pendiente</option></select></div>
            <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10, color: t.muted, marginBottom: 3 }}>Cuenta</div><select value={nf.account_id} onChange={e => setNf({ ...nf, account_id: e.target.value })} style={{ width: "100%", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 9px", color: t.text, fontSize: 12 }}><option value="">Efectivo (sin cuenta)</option>{bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
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
  const { transactions: TXS, companyId } = useData();
  const [tab, setTab] = useState("journal");
  const [selEntry, setSelEntry] = useState(null);

  // Generate accounting entries from real transactions
  const generateEntries = () => {
    if (companyId === "demo") {
      return [
        { id:1, date:"12/02/2026", desc:"Certificado Obra #47 — Torre Belgrano", st:"posted", dr:"Cuentas por Cobrar", cr:"Ingresos por Servicios", amt:3200000, src:"ai", note:"Asiento generado automáticamente desde factura.", txRef:"Certificado Obra #47", contact:"Constructora Vial SA" },
        { id:2, date:"11/02/2026", desc:"Compra barras Ø12 — 500 unidades", st:"proposed", dr:"Materiales de Obra", cr:"Cuentas por Pagar", amt:1850000, src:"ai", note:"Propuesto por IA: compra de materiales.", txRef:"Compra barras Ø12", contact:"Hierros del Sur SRL" },
        { id:3, date:"10/02/2026", desc:"Anticipo Fase 2 — Nordelta", st:"posted", dr:"Banco Cta Cte", cr:"Anticipos de Clientes", amt:5000000, src:"user", note:"Anticipo recibido por transferencia.", txRef:"Anticipo Fase 2", contact:"Inmobiliaria Costa" },
        { id:4, date:"09/02/2026", desc:"Materiales eléctricos varios", st:"proposed", dr:"Materiales de Obra", cr:"Banco Cta Cte", amt:420000, src:"ai", note:"Pago con débito directo por materiales eléctricos.", txRef:"Materiales eléctricos", contact:"Ferretería López" },
      ];
    }
    if (!TXS || TXS.length === 0) return [];
    return TXS.map((tx, i) => ({
      id: i + 1,
      date: tx.date || "—",
      desc: tx.desc || tx.description || "Transacción",
      st: tx.status === "paid" ? "posted" : "proposed",
      dr: tx.amount > 0 ? "Banco / Cuentas por Cobrar" : (tx.project !== "—" ? "Costos de Obra" : "Gastos Generales"),
      cr: tx.amount > 0 ? "Ingresos" : "Banco / Cuentas por Pagar",
      amt: Math.abs(tx.amount),
      src: "user",
      note: tx.project !== "—" ? "Proyecto: " + tx.project : "",
      txRef: tx.desc || tx.description || "",
      contact: tx.contact || "—",
    }));
  };

  const [entries, setEntries] = useState(generateEntries());
  useEffect(() => { setEntries(generateEntries()); }, [TXS, companyId]);
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
    // Dynamic: extract all unique account names from entries
    const allAccounts = [...new Set(entries.flatMap(e => [e.dr, e.cr]))].filter(Boolean);
    const getMovs = (acc) => entries.filter(e => e.st === "posted" && (e.dr === acc || e.cr === acc));
    const accountsWithMovs = allAccounts.filter(a => getMovs(a).length > 0);
    return (
      <div>
        {accountsWithMovs.length === 0 && <div style={{ padding: 30, textAlign: "center", color: t.dim, fontSize: 12 }}>No hay asientos contabilizados. Aprobá asientos en el Libro Diario para ver el Mayor.</div>}
        {accountsWithMovs.map(acc => (
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
    // Build trial balance from entries dynamically
    const postedEntries = entries.filter(e => e.st === "posted");
    const accMap = {};
    postedEntries.forEach(e => {
      if (e.dr) { if (!accMap[e.dr]) accMap[e.dr] = { debe: 0, haber: 0 }; accMap[e.dr].debe += e.amt; }
      if (e.cr) { if (!accMap[e.cr]) accMap[e.cr] = { debe: 0, haber: 0 }; accMap[e.cr].haber += e.amt; }
    });
    const accounts = Object.entries(accMap).map(([name, v]) => ({ name, debe: v.debe, haber: v.haber }));
    const now2 = new Date();
    const trialLabel = now2.toLocaleDateString("es-AR", { month: "short", year: "numeric" });
    const totalD = accounts.reduce((s, a) => s + a.debe, 0);
    const totalH = accounts.reduce((s, a) => s + a.haber, 0);
    return (
      <Crd t={t} style={{ overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid " + t.border }}><div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Balance de Comprobación — {trialLabel.charAt(0).toUpperCase() + trialLabel.slice(1)}</div></div>
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
  const { transactions: TXS, bankAccounts, companyId, reload } = useData();
  const [selAcc, setSelAcc] = useState(null);
  const [showNewAcc, setShowNewAcc] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: "", type: "ARS", bal: "", cbu: "", alias: "" });
  const [accounts, setAccounts] = useState([]);
  const [loadingAccs, setLoadingAccs] = useState(true);
  const colors = [t.accent, t.blue, t.green, t.orange, t.red, "#EC4899"];

  // Sync accounts from context
  useEffect(() => {
    if (companyId === "demo") {
      setAccounts([
        { id: "d1", name: "Banco Galicia — Cta Cte", currency: "ARS", balance: 12400000, cbu: "0070999030004123456789", alias: "GESTION.AI.GALICIA" },
        { id: "d2", name: "Banco Macro — Cta Cte", currency: "ARS", balance: 4800000, cbu: "2850999030004987654321", alias: "GESTION.AI.MACRO" },
        { id: "d3", name: "Mercado Pago", currency: "ARS", balance: 1200000, cbu: "—", alias: "GESTION.AI.MP" },
      ]);
    } else {
      // Enrich bank accounts with calculated balance from assigned transactions
      const paidByAccount = {};
      TXS.filter(tx => tx.status === "paid" && tx.account_id).forEach(tx => {
        paidByAccount[tx.account_id] = (paidByAccount[tx.account_id] || 0) + tx.amount;
      });
      setAccounts((bankAccounts || []).map(acc => ({
        ...acc,
        balance: Number(acc.balance || 0) + (paidByAccount[acc.id] || 0),
        txBalance: paidByAccount[acc.id] || 0,
        txCount: TXS.filter(tx => tx.status === "paid" && tx.account_id === acc.id).length,
      })));
    }
    setLoadingAccs(false);
  }, [companyId, bankAccounts, TXS]);

  const pendingIncome = TXS.filter(tx => tx.amount > 0 && (tx.status === "pending" || tx.status === "overdue"));
  const pendingExpense = TXS.filter(tx => tx.amount < 0 && (tx.status === "pending" || tx.status === "overdue"));
  // "Sin asignar" = paid transactions WITHOUT account_id
  const unassignedTx = TXS.filter(tx => tx.status === "paid" && !tx.account_id);
  const unassignedBalance = unassignedTx.reduce((s, tx) => s + tx.amount, 0);

  const cxc = companyId === "demo" ? [
    { contact: "Constructora Vial SA", amt: 7500000, days: 0, status: "vigente" },
    { contact: "Inmobiliaria Costa", amt: 2100000, days: 15, status: "1-30" },
  ] : pendingIncome.map(tx => ({ contact: tx.contact || "—", amt: tx.amount, days: 0, status: tx.status === "overdue" ? "+60" : "vigente" }));
  const cxp = companyId === "demo" ? [
    { contact: "Hierros del Sur SRL", amt: 1850000, days: 5, status: "vigente" },
    { contact: "Ferretería López", amt: 920000, days: 20, status: "1-30" },
  ] : pendingExpense.map(tx => ({ contact: tx.contact || "—", amt: Math.abs(tx.amount), days: 0, status: tx.status === "overdue" ? "+60" : "vigente" }));
  
  const bankBal = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  const totalBal = bankBal + unassignedBalance;
  const totalCxC = cxc.reduce((s, c) => s + c.amt, 0);
  const totalCxP = cxp.reduce((s, c) => s + c.amt, 0);
  const ratioLiq = totalCxP > 0 ? (totalBal / totalCxP) : accounts.length > 0 || unassignedTx.length > 0 ? 99.9 : 0;

  const addAccount = async () => {
    if (!newAcc.name.trim()) return;
    if (companyId === "demo") return;
    const { data, error } = await supabase.from("bank_accounts").insert({
      company_id: companyId, name: newAcc.name, currency: newAcc.type,
      balance: Number(newAcc.bal) || 0, cbu: newAcc.cbu || null, alias: newAcc.alias || null,
    }).select().single();
    if (error) {
      console.error("Add account error:", error.message);
      window.alert("Error al guardar la cuenta: " + error.message + "\n\nAsegurate de haber corrido el SQL 'supabase_bank_accounts_v2.sql' en Supabase.");
      return;
    }
    await reload();
    setNewAcc({ name: "", type: "ARS", bal: "", cbu: "", alias: "" });
    setShowNewAcc(false);
  };

  const removeAccount = async (id) => {
    if (!window.confirm("¿Eliminar esta cuenta? Los movimientos asignados quedarán sin cuenta.")) return;
    if (companyId !== "demo") {
      // Unassign transactions from this account
      await supabase.from("transactions").update({ account_id: null }).eq("account_id", id);
      await supabase.from("bank_accounts").delete().eq("id", id);
    }
    await reload();
    setSelAcc(null);
  };

  const getMovements = (acc) => {
    if (companyId === "demo") {
      if (acc.id === "d1") return [{ date: "13/02", desc: "Cobro Cert. Obra #47", amt: 3200000 },{ date: "12/02", desc: "Pago proveedores", amt: -1850000 },{ date: "11/02", desc: "Cobro anticipo Nordelta", amt: 5000000 }];
      if (acc.id === "d2") return [{ date: "12/02", desc: "Cobro factura #887", amt: 1500000 },{ date: "10/02", desc: "Transferencia a Galicia", amt: -2000000 }];
      return [{ date: "13/02", desc: "Cobro QR", amt: 85000 }];
    }
    // Show transactions assigned to THIS account
    return TXS.filter(tx => tx.status === "paid" && tx.account_id === acc.id).slice(0, 15).map(tx => ({
      date: tx.date || "—",
      desc: tx.desc || tx.description || "—", amt: tx.amount,
    }));
  };

  if (selAcc) {
    const acc = accounts.find(a => a.id === selAcc);
    if (!acc) { setSelAcc(null); return null; }
    const movs = getMovements(acc);
    const color = colors[accounts.indexOf(acc) % colors.length];
    return (
      <div style={{ padding: 22, overflowY: "auto", height: "calc(100vh - 54px)" }}>
        <div onClick={() => setSelAcc(null)} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 16, cursor: "pointer", color: t.muted, fontSize: 12 }}><ChevronLeft size={14} /> Volver</div>
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 14 }}>
          <div>
            <Crd t={t} style={{ padding: 16, borderTop: "3px solid " + color, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><CreditCard size={18} color={color} /><div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{acc.name}</div></div>
              <div style={{ fontSize: 24, fontWeight: 800, color: t.text }}>{fmt(Number(acc.balance || 0))}</div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid " + t.border }}>
                {[["CBU", acc.cbu || "—"], ["Alias", acc.alias || "—"], ["Moneda", acc.currency || "ARS"]].map(([l, v], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: t.dim }}>{l}</span>
                    <span style={{ fontSize: 11, color: t.text, fontFamily: "monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => removeAccount(acc.id)} style={{ marginTop: 10, width: "100%", padding: "7px 0", borderRadius: 7, border: "1px solid " + t.red + "30", background: t.redBg, color: t.red, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Eliminar cuenta</button>
            </Crd>
            <Crd t={t} style={{ padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 8 }}>Resumen</div>
              {(() => {
                const ingresos = movs.filter(m => m.amt > 0).reduce((s, m) => s + m.amt, 0);
                const egresos = movs.filter(m => m.amt < 0).reduce((s, m) => s + Math.abs(m.amt), 0);
                return (<div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: t.green }}>Ingresos</span><span style={{ fontSize: 12, fontWeight: 600, color: t.green }}>{fmt(ingresos)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: t.red }}>Egresos</span><span style={{ fontSize: 12, fontWeight: 600, color: t.red }}>{fmt(egresos)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid " + t.border }}><span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>Neto</span><span style={{ fontSize: 13, fontWeight: 700, color: ingresos - egresos >= 0 ? t.green : t.red }}>{fmt(ingresos - egresos)}</span></div>
                </div>);
              })()}
            </Crd>
          </div>
          <Crd t={t} style={{ overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Últimos movimientos</span>
              <Btn t={t} onClick={() => exportCSV("movimientos_" + acc.name.replace(/\s/g,"_"), ["Fecha","Descripción","Monto"], movs.map(m => [m.date, m.desc, m.amt]))}><Download size={12} />Exportar</Btn>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: t.hover }}>{["Fecha","Descripción","Monto"].map(h => <th key={h} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 600, color: t.dim, textAlign: "left", textTransform: "uppercase", borderBottom: "1px solid " + t.border }}>{h}</th>)}</tr></thead>
              <tbody>{movs.length > 0 ? movs.map((m, i) => (
                <tr key={i}>
                  <td style={{ padding: "9px 14px", fontSize: 11, color: t.muted, borderBottom: "1px solid " + t.border + "15" }}>{m.date}</td>
                  <td style={{ padding: "9px 14px", fontSize: 12, color: t.text, fontWeight: 500, borderBottom: "1px solid " + t.border + "15" }}>{m.desc}</td>
                  <td style={{ padding: "9px 14px", fontSize: 12, fontWeight: 600, color: m.amt > 0 ? t.green : t.red, borderBottom: "1px solid " + t.border + "15" }}>{m.amt > 0 ? "+" : ""}{fmt(m.amt)}</td>
                </tr>
              )) : <tr><td colSpan={3} style={{ padding: 30, textAlign: "center", color: t.dim, fontSize: 12 }}>Sin movimientos registrados</td></tr>}</tbody>
            </table>
          </Crd>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 22, overflowY: "auto", height: "calc(100vh - 54px)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Disponible total", val: fmt(totalBal), color: t.accent, icon: CircleDollarSign, sub: accounts.length > 0 ? accounts.length + " cuentas" + (unassignedTx.length > 0 ? " + efectivo" : "") : unassignedTx.length > 0 ? "Calculado de movimientos" : "Sin movimientos" },
          { label: "CxC total", val: fmt(totalCxC), color: t.green, icon: ArrowUpRight, sub: cxc.length + " cobros pendientes" },
          { label: "CxP total", val: fmt(totalCxP), color: t.red, icon: ArrowDownRight, sub: cxp.length + " pagos pendientes" },
          { label: "Ratio liquidez", val: ratioLiq > 99 ? "∞" : ratioLiq.toFixed(1) + "x", color: t.blue, icon: TrendingUp, sub: ratioLiq > 2 ? "Saludable" : ratioLiq > 0 ? "Ajustado" : "—" },
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Cuentas y efectivo</div>
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
      {loadingAccs ? <div style={{ textAlign: "center", padding: 30, color: t.dim }}>Cargando cuentas...</div> : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        {/* Efectivo - only shows UNASSIGNED paid transactions */}
        {companyId !== "demo" && unassignedTx.length > 0 && (
          <Crd t={t} style={{ padding: 14, borderTop: "3px solid #FBBF24", cursor: "default" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>Efectivo / Sin asignar</div>
              <Wallet size={15} color="#FBBF24" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: unassignedBalance >= 0 ? t.green : t.red, marginBottom: 4 }}>{fmt(unassignedBalance)}</div>
            <div style={{ marginTop: 4, fontSize: 10, color: t.orange }}>{unassignedTx.length} movimiento{unassignedTx.length !== 1 ? "s" : ""} sin cuenta asignada</div>
            <div style={{ marginTop: 6, fontSize: 10, color: t.dim }}>Asignalos desde Finanzas → click en el movimiento → seleccioná la cuenta</div>
          </Crd>
        )}
        {accounts.map((acc, idx) => (
          <Crd key={acc.id} t={t} style={{ padding: 14, borderTop: "3px solid " + colors[idx % colors.length], cursor: "pointer" }}>
            <div onClick={() => setSelAcc(acc.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{acc.name}</div>
                <CreditCard size={15} color={colors[idx % colors.length]} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 4 }}>{fmt(Number(acc.balance || 0))}</div>
              <div style={{ marginTop: 8, fontSize: 10, color: t.dim }}>{acc.currency || "ARS"}{acc.txCount > 0 ? " · " + acc.txCount + " movimientos" : ""} · Click para ver detalle</div>
            </div>
          </Crd>
        ))}
        {accounts.length === 0 && companyId === "demo" && <div style={{ gridColumn: "1/-1", padding: 30, textAlign: "center", color: t.dim, fontSize: 12 }}>No hay cuentas bancarias. Usá "Nueva cuenta" para agregar.</div>}
      </div>
      )}

      <Crd t={t} style={{ padding: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Proyección de flujo de caja</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Bot size={12} color={t.accentL} /><span style={{ fontSize: 10, color: t.accentL }}>Estimación IA</span></div>
        </div>
        <div style={{ fontSize: 11, color: t.muted, marginBottom: 12 }}>Cuánta plata se estima que entra y sale — basado en cobros pendientes, pagos programados y patrones.</div>
        {companyId === "demo" ? (<>
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
        <div style={{ padding: 10, background: t.accentBg, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: t.text }}>Saldo proyectado al 14/03</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: t.accent }}>{fmt(totalBal + (8200000-2455000) + (3500000-4200000) + (6800000-3100000) + (2200000-5400000))}</span>
        </div>
        </>) : (
          TXS.length > 0 ? (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
                <div style={{ padding: 14, background: t.hover, borderRadius: 9, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: t.green, marginBottom: 4 }}>Cobros pendientes</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: t.green }}>{fmt(totalCxC)}</div>
                  <div style={{ fontSize: 10, color: t.dim }}>{pendingIncome.length} movimientos</div>
                </div>
                <div style={{ padding: 14, background: t.hover, borderRadius: 9, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: t.red, marginBottom: 4 }}>Pagos pendientes</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: t.red }}>{fmt(totalCxP)}</div>
                  <div style={{ fontSize: 10, color: t.dim }}>{pendingExpense.length} movimientos</div>
                </div>
                <div style={{ padding: 14, background: t.hover, borderRadius: 9, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: t.accent, marginBottom: 4 }}>Saldo proyectado</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: (totalBal + totalCxC - totalCxP) >= 0 ? t.green : t.red }}>{fmt(totalBal + totalCxC - totalCxP)}</div>
                  <div style={{ fontSize: 10, color: t.dim }}>Disponible + CxC - CxP</div>
                </div>
              </div>
              {/* Visual bar */}
              <div style={{ display: "flex", gap: 0, height: 20, borderRadius: 6, overflow: "hidden" }}>
                {totalBal > 0 && <div style={{ flex: totalBal, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 8, color: "#fff", fontWeight: 700 }}>Disponible</span></div>}
                {totalCxC > 0 && <div style={{ flex: totalCxC, background: t.green, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 8, color: "#fff", fontWeight: 700 }}>CxC</span></div>}
                {totalCxP > 0 && <div style={{ flex: totalCxP, background: t.red, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 8, color: "#fff", fontWeight: 700 }}>CxP</span></div>}
              </div>
            </div>
          ) : (
          <div style={{ padding: 30, textAlign: "center" }}>
            <TrendingUp size={28} color={t.dim} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 12, color: t.muted }}>Registrá transacciones para generar proyecciones automáticas</div>
          </div>
          )
        )}
      </Crd>

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
          {cxc.length === 0 && <div style={{ padding: 16, textAlign: "center", color: t.dim, fontSize: 11 }}>Sin cobros pendientes</div>}
        </Crd>

        <Crd t={t} style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Cuentas por Pagar</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.red }}>{fmt(totalCxP)}</span>
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
          {cxp.length === 0 && <div style={{ padding: 16, textAlign: "center", color: t.dim, fontSize: 11 }}>Sin pagos pendientes</div>}
        </Crd>
      </div>

      <Crd t={t} style={{ padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Alertas y recordatorios</div>
        {(() => {
          const overdueTx = TXS.filter(tx => tx.status === "overdue");
          const pendTx = TXS.filter(tx => tx.status === "pending");
          const alerts = companyId === "demo" ? [
            { icon: AlertCircle, color: t.red, title: "Pago vencido — Hierros del Sur SRL", desc: "Factura por $1.85M venció hace 5 días." },
            { icon: Clock, color: t.orange, title: "Cobro próximo — Certificado #47 Vial SA", desc: "Vence en 2 días. Confirmar recepción." },
            { icon: TrendingUp, color: t.blue, title: "Flujo negativo proyectado", desc: "Semana 24-28 Feb: más pagos que cobros." },
          ] : [
            ...overdueTx.map(tx => ({ icon: AlertCircle, color: t.red, title: "Vencido: " + (tx.desc || tx.description || "Transacción"), desc: fmt(Math.abs(tx.amount)) + " · " + (tx.contact || "—") })),
            ...pendTx.slice(0, 3).map(tx => ({ icon: Clock, color: t.orange, title: "Pendiente: " + (tx.desc || tx.description || "Transacción"), desc: fmt(Math.abs(tx.amount)) + " · " + (tx.contact || "—") })),
          ];
          if (alerts.length === 0) return <div style={{ padding: 20, textAlign: "center", color: t.dim, fontSize: 12 }}>No hay alertas pendientes</div>;
          return alerts.map((al, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: t.hover, borderRadius: 8, marginBottom: 6, borderLeft: "3px solid " + al.color }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <al.icon size={16} color={al.color} />
                <div><div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{al.title}</div><div style={{ fontSize: 10, color: t.muted, marginTop: 1 }}>{al.desc}</div></div>
              </div>
            </div>
          ));
        })()}
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
    if (!fileUrl) return; // uploadFile ya mostró el error
    const { error } = await supabase.from("documents").insert([{
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
    if (error) { window.alert("Error al guardar documento: " + error.message); return; }
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
  const { projects: PROJECTS, transactions: TXS, tasks, clients, documents, companyId } = useData();
  const [active, setActive] = useState("pnl");

  // Dynamic date labels
  const now = new Date();
  const mesActual = now.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const mesLabel = mesActual.charAt(0).toUpperCase() + mesActual.slice(1);
  const fechaHoy = now.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const mesKey = now.toISOString().substring(0, 7); // "2026-02"

  // Monthly grouping helper (used by charts)
  const getMonthlyData = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().substring(0, 7);
      const label = d.toLocaleDateString("es-AR", { month: "short" });
      months.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), inc: 0, eg: 0 });
    }
    TXS.forEach(tx => {
      let txDate = tx.date;
      if (txDate && txDate.includes("/") && txDate.length <= 5) {
        txDate = now.getFullYear() + "-" + txDate.split("/").reverse().join("-");
      }
      const txMonth = txDate ? txDate.substring(0, 7) : null;
      const m = months.find(mo => mo.key === txMonth);
      if (m) {
        if (tx.amount > 0) m.inc += tx.amount;
        else m.eg += Math.abs(tx.amount);
      }
    });
    return months;
  };

  const reps = [
    { id: "pnl", label: "Estado de Resultados", icon: BarChart3 },
    { id: "balance", label: "Balance General", icon: Layers },
    { id: "cashflow", label: "Flujo de Efectivo", icon: Activity },
    { id: "project", label: "Por Proyecto", icon: FolderKanban },
    { id: "aging", label: "Aging Cartera", icon: Clock },
    { id: "kpi", label: "KPIs y Métricas", icon: TrendingUp },
  ];

  const renderPnl = () => {
    const totalInc = TXS.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
    const totalEg = TXS.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const net = totalInc - totalEg;
    const margenBruto = totalInc > 0 ? Math.round((totalInc - totalEg * 0.7) / totalInc * 100) : 0;
    const margenNeto = totalInc > 0 ? Math.round(net / totalInc * 100) : 0;

    // Group transactions by project for real data
    const incByProject = {};
    const egByProject = {};
    TXS.forEach(tx => {
      const proj = tx.project && tx.project !== "—" ? tx.project : "Sin proyecto";
      if (tx.amount > 0) { incByProject[proj] = (incByProject[proj] || 0) + tx.amount; }
      else { egByProject[proj] = (egByProject[proj] || 0) + Math.abs(tx.amount); }
    });

    const pnl = companyId === "demo" ? [
      { cat: "Ingresos", items: [["Certificados de obra", 12800000], ["Servicios profesionales", 3680000], ["Otros ingresos", 320000]], total: 16800000 },
      { cat: "Costos Directos", items: [["Materiales de construcción", -6200000], ["Mano de obra directa", -3400000], ["Subcontratistas", -1800000], ["Fletes y logística", -580000]], total: -11980000 },
      { cat: "Gastos Operativos", items: [["Sueldos administrativos", -890000], ["Alquiler oficina/obrador", -350000], ["Transporte y combustible", -420000], ["Seguros y ART", -280000], ["Servicios (luz, gas, tel)", -180000], ["Software y tecnología", -90000]], total: -2210000 },
      { cat: "Impuestos y Retenciones", items: [["IVA neto a pagar", -420000], ["IIBB", -168000], ["Retenciones sufridas", -85000]], total: -673000 },
    ] : [
      { cat: "Ingresos", items: Object.entries(incByProject).map(([k, v]) => [k, v]), total: totalInc },
      { cat: "Egresos", items: Object.entries(egByProject).map(([k, v]) => [k, -v]), total: -totalEg },
    ];

    if (companyId === "demo") {
      const demoInc = 16800000; const demoCost = 11980000 + 2210000 + 673000; const demoNet = demoInc - demoCost;
      var finalInc = demoInc, finalNet = demoNet, finalMargenBruto = Math.round((demoInc - 11980000) / demoInc * 100), finalMargenNeto = Math.round(demoNet / demoInc * 100);
    } else {
      var finalInc = totalInc, finalNet = net, finalMargenBruto = margenBruto, finalMargenNeto = margenNeto;
    }
    return (
      <div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Estado de Resultados</div><div style={{ fontSize: 11, color: t.muted }}>{mesLabel}</div></div>
          <div style={{ display: "flex", gap: 5 }}><Btn t={t} onClick={() => handlePrint("Estado de Resultados", [["<th>Categoría</th>","<th>Concepto</th>","<th>Monto</th>"],...pnl.flatMap(c => c.items.map(([n, a]) => [c.cat, n, fmt(a)])),["<b>RESULTADO</b>","<b>NETO</b>","<b>" + fmt(finalNet) + "</b>"]])}><Printer size={12} />Imprimir</Btn><Btn t={t} onClick={() => exportCSV("estado_resultados", ["Categoría","Concepto","Monto"], pnl.flatMap(c => c.items.map(([n, a]) => [c.cat, n, a])))}><Download size={12} />Excel</Btn></div>
        </div>
        {/* KPI Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, padding: "12px 16px", borderBottom: "1px solid " + t.border + "30" }}>
          {[
            { l: "Ingresos totales", v: fmt(finalInc), c: t.green },
            { l: "Costos totales", v: fmt(finalInc - finalNet), c: t.red },
            { l: "Margen bruto", v: finalMargenBruto + "%", c: finalMargenBruto > 25 ? t.green : t.orange },
            { l: "Margen neto", v: finalMargenNeto + "%", c: finalMargenNeto > 10 ? t.green : t.orange },
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
          <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", background: finalNet >= 0 ? t.greenBg : t.redBg, borderRadius: 9, border: "1px solid " + (finalNet >= 0 ? t.green : t.red) + "20" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>RESULTADO NETO</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: finalNet >= 0 ? t.green : t.red }}>{fmt(finalNet)}</span>
          </div>
          {/* Monthly comparison */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 8 }}>Comparación mensual (últimos 6 meses)</div>
            <div style={{ display: "flex", gap: 10, height: 120, alignItems: "flex-end" }}>
              {(() => {
                // Build real monthly data from transactions
                const now = new Date();
                const months = [];
                for (let i = 5; i >= 0; i--) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  const key = d.toISOString().substring(0, 7);
                  const label = d.toLocaleDateString("es-AR", { month: "short" });
                  months.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), inc: 0, cost: 0 });
                }
                TXS.forEach(tx => {
                  let txDate = tx.date;
                  if (txDate && txDate.includes("/") && txDate.length <= 5) {
                    txDate = "2026-" + txDate.split("/").reverse().join("-");
                  }
                  const txMonth = txDate ? txDate.substring(0, 7) : null;
                  const m = months.find(mo => mo.key === txMonth);
                  if (m) {
                    if (tx.amount > 0) m.inc += tx.amount;
                    else m.cost += Math.abs(tx.amount);
                  }
                });
                const maxVal = Math.max(...months.map(m => Math.max(m.inc, m.cost)), 1);
                return months.map(m => (
                  <div key={m.key} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 2, justifyContent: "center", alignItems: "flex-end", height: 95 }}>
                      <div style={{ width: 14, height: Math.max(2, m.inc / maxVal * 95) + "px", background: t.green, borderRadius: "3px 3px 0 0" }} title={"Ingresos: " + fmt(m.inc)} />
                      <div style={{ width: 14, height: Math.max(2, m.cost / maxVal * 95) + "px", background: t.red + "60", borderRadius: "3px 3px 0 0" }} title={"Costos: " + fmt(m.cost)} />
                    </div>
                    <div style={{ fontSize: 10, color: t.dim, marginTop: 4 }}>{m.label}</div>
                  </div>
                ));
              })()}
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
    const totalIncBal = TXS.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
    const totalEgBal = TXS.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const cxcBal = TXS.filter(tx => tx.amount > 0 && tx.status === "pending").reduce((s, tx) => s + tx.amount, 0);
    const cxpBal = TXS.filter(tx => tx.amount < 0 && tx.status === "pending").reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const cajaBal = TXS.filter(tx => tx.status === "paid").reduce((s, tx) => s + tx.amount, 0);

    const activos = companyId === "demo"
      ? [["Caja y Bancos", 18400000], ["Cuentas por Cobrar", 13700000], ["Materiales en Obra", 4200000], ["Anticipos a Proveedores", 1500000], ["Activos Fijos (neto)", 28000000], ["Intangibles", 600000]]
      : [["Caja y Bancos", Math.max(0, cajaBal)], ["Cuentas por Cobrar", cxcBal]].filter(([,v]) => v > 0);
    const pasivos = companyId === "demo"
      ? [["Cuentas por Pagar", 8760000], ["Préstamos Bancarios", 12000000], ["Anticipos de Clientes", 5000000], ["Deudas Fiscales", 3200000], ["Provisiones", 1440000]]
      : [["Cuentas por Pagar", cxpBal]].filter(([,v]) => v > 0);
    const patrimonio = companyId === "demo"
      ? [["Capital Social", 20000000], ["Reservas", 4000000], ["Resultados Acumulados", 7600000], ["Resultado del Ejercicio", 1937000]]
      : [["Resultado del Ejercicio", totalIncBal - totalEgBal]].filter(([,v]) => v !== 0);
    const totalA = activos.reduce((s, [,a]) => s + a, 0);
    const totalP = pasivos.reduce((s, [,a]) => s + a, 0);
    const totalPat = patrimonio.reduce((s, [,a]) => s + a, 0);
    return (
      <div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Balance General</div><div style={{ fontSize: 11, color: t.muted }}>Al {fechaHoy}</div></div>
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
              { l: "Liquidez corriente", v: totalP > 0 ? (totalA / totalP).toFixed(2) : "—", ok: totalP > 0 && (totalA / totalP) > 1 },
              { l: "Endeudamiento", v: totalA > 0 ? Math.round(totalP / totalA * 100) + "%" : "0%", ok: totalA > 0 && (totalP / totalA) < 0.6 },
              { l: "Solvencia", v: totalP > 0 ? (totalA / totalP).toFixed(2) : "—", ok: totalP > 0 && (totalA / totalP) > 1.5 },
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
    const paidTxs = TXS.filter(tx => tx.status === "paid");
    const paidInc = paidTxs.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
    const paidEg = paidTxs.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const pendInc = TXS.filter(tx => tx.amount > 0 && tx.status !== "paid").reduce((s, tx) => s + tx.amount, 0);
    const pendEg = TXS.filter(tx => tx.amount < 0 && tx.status !== "paid").reduce((s, tx) => s + Math.abs(tx.amount), 0);

    // Group paid transactions by contact for richer breakdown
    const incByContact = {};
    const egByContact = {};
    paidTxs.forEach(tx => {
      const key = tx.contact || (tx.project && tx.project !== "—" ? tx.project : "Otros");
      if (tx.amount > 0) incByContact[key] = (incByContact[key] || 0) + tx.amount;
      else egByContact[key] = (egByContact[key] || 0) + Math.abs(tx.amount);
    });

    const secciones = companyId === "demo" ? [
      { cat: "Actividades Operativas", items: [["Cobros de clientes", 16480000], ["Pagos a proveedores", -8955000], ["Sueldos y cargas sociales", -3400000], ["Impuestos pagados", -673000], ["Gastos operativos", -2210000]], total: 1242000 },
      { cat: "Actividades de Inversión", items: [["Compra de equipos", -1200000], ["Mejoras en obras", -800000], ["Venta de activos", 350000]], total: -1650000 },
      { cat: "Actividades de Financiamiento", items: [["Cuota préstamo bancario", -500000], ["Intereses pagados", -180000], ["Aportes de socios", 0]], total: -680000 },
    ] : [
      { cat: "Cobros realizados", items: Object.keys(incByContact).length > 0 ? Object.entries(incByContact).map(([k, v]) => [k, v]) : [["Sin cobros en el período", 0]], total: paidInc },
      { cat: "Pagos realizados", items: Object.keys(egByContact).length > 0 ? Object.entries(egByContact).map(([k, v]) => [k, -v]) : [["Sin pagos en el período", 0]], total: -paidEg },
      ...(pendInc > 0 || pendEg > 0 ? [{ cat: "Pendientes (no ejecutados)", items: [...(pendInc > 0 ? [["Cobros pendientes", pendInc]] : []), ...(pendEg > 0 ? [["Pagos pendientes", -pendEg]] : [])], total: pendInc - pendEg }] : []),
    ];
    const variacion = companyId === "demo" ? secciones.reduce((s, sec) => s + sec.total, 0) : paidInc - paidEg;
    const saldoInicial = companyId === "demo" ? 18400000 : 0; // Real: would need bank balance from previous period
    const monthlyData = getMonthlyData();
    const maxChart = Math.max(...monthlyData.map(m => Math.max(m.inc, m.eg)), 1);
    return (
      <div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Flujo de Efectivo</div><div style={{ fontSize: 11, color: t.muted }}>{mesLabel}</div></div>
          <div style={{ display: "flex", gap: 5 }}><Btn t={t} onClick={() => handlePrint("Flujo de Efectivo", [["<th>Actividad</th>","<th>Concepto</th>","<th>Monto</th>"],...secciones.flatMap(s => s.items.map(([n,a]) => [s.cat, n, fmt(a)]))])}><Printer size={12} />Imprimir</Btn><Btn t={t} onClick={() => exportCSV("flujo_efectivo", ["Actividad","Concepto","Monto"], secciones.flatMap(s => s.items.map(([n,a]) => [s.cat,n,a])))}><Download size={12} />Excel</Btn></div>
        </div>
        {/* Cash Flow chart - real monthly data */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border + "30" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.text, marginBottom: 8 }}>Flujo mensual (6 meses)</div>
          <div style={{ display: "flex", gap: 12, height: 100, alignItems: "flex-end" }}>
            {monthlyData.map(m => (
              <div key={m.key} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ display: "flex", gap: 2, justifyContent: "center", alignItems: "flex-end", height: 80 }}>
                  <div style={{ width: 12, height: Math.max(2, m.inc / maxChart * 80) + "px", background: "linear-gradient(180deg, " + t.accent + ", " + t.accent + "60)", borderRadius: "3px 3px 0 0" }} title={"Cobros: " + fmt(m.inc)} />
                  <div style={{ width: 12, height: Math.max(2, m.eg / maxChart * 80) + "px", background: "linear-gradient(180deg, " + t.red + "80, " + t.red + "30)", borderRadius: "3px 3px 0 0" }} title={"Pagos: " + fmt(m.eg)} />
                </div>
                <div style={{ fontSize: 10, color: t.dim, marginTop: 3 }}>{m.label}</div>
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
        <div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Rentabilidad por Proyecto</div><div style={{ fontSize: 11, color: t.muted }}>{mesLabel}</div></div>
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

  const renderAging = () => {
    const realCxC = TXS.filter(tx => tx.amount > 0 && (tx.status === "pending" || tx.status === "overdue"));
    const realCxP = TXS.filter(tx => tx.amount < 0 && (tx.status === "pending" || tx.status === "overdue"));
    const totalCxC = realCxC.reduce((s, tx) => s + tx.amount, 0);
    const totalCxP = realCxP.reduce((s, tx) => s + Math.abs(tx.amount), 0);

    const agingData = companyId === "demo" ? [
      { title: "Cuentas por Cobrar", total: 13700000, data: [["Vigentes", 7500000, t.green, 55], ["1-30 días", 3200000, t.orange, 23], ["31-60 días", 1800000, t.red, 13], ["+60 días", 1200000, "#FF4757", 9]],
        detail: [["Constructora Vial SA", 7500000, 0, "vigente"], ["Inmobiliaria Costa", 2100000, 15, "1-30"], ["Estudio Arq. Méndez", 1800000, 45, "31-60"], ["Varios menores", 2300000, 70, "+60"]] },
      { title: "Cuentas por Pagar", total: 8760000, data: [["Vigentes", 4200000, t.green, 48], ["1-30 días", 2100000, t.orange, 24], ["31-60 días", 1500000, t.red, 17], ["+60 días", 960000, "#FF4757", 11]],
        detail: [["Hierros del Sur SRL", 1850000, 5, "vigente"], ["Ferretería López", 920000, 20, "1-30"], ["Transportes Rápido", 1500000, 50, "31-60"], ["Varios proveedores", 4490000, 30, "1-30"]] },
    ] : [
      { title: "Cuentas por Cobrar", total: totalCxC, data: totalCxC > 0 ? [["Pendientes", totalCxC, t.green, 100]] : [],
        detail: realCxC.map(tx => [tx.contact || "—", tx.amount, 0, tx.status === "overdue" ? "+60" : "vigente"]) },
      { title: "Cuentas por Pagar", total: totalCxP, data: totalCxP > 0 ? [["Pendientes", totalCxP, t.red, 100]] : [],
        detail: realCxP.map(tx => [tx.contact || "—", Math.abs(tx.amount), 0, tx.status === "overdue" ? "+60" : "vigente"]) },
    ];

    return (
    <div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid " + t.border, display: "flex", justifyContent: "space-between" }}>
        <div><div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Aging de Cartera</div><div style={{ fontSize: 11, color: t.muted }}>Antigüedad de CxC y CxP</div></div>
        <Btn t={t} onClick={() => exportCSV("aging_cartera", ["Tipo","Contacto","Monto","Estado"], agingData.flatMap(sec => sec.detail.map(([n,a,,s]) => [sec.title,n,a,s])))}><Download size={12} />Excel</Btn>
      </div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "12px 16px", borderBottom: "1px solid " + t.border + "30" }}>
        <div style={{ textAlign: "center", padding: 10, background: t.greenBg, borderRadius: 7 }}><div style={{ fontSize: 10, color: t.green }}>Total CxC</div><div style={{ fontSize: 18, fontWeight: 700, color: t.green }}>{fmt(totalCxC)}</div></div>
        <div style={{ textAlign: "center", padding: 10, background: t.redBg, borderRadius: 7 }}><div style={{ fontSize: 10, color: t.red }}>Total CxP</div><div style={{ fontSize: 18, fontWeight: 700, color: t.red }}>{fmt(totalCxP)}</div></div>
      </div>
      <div style={{ padding: 16 }}>
        {agingData.map((sec, si) => (
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
  };

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
          <div style={{ fontSize: 11, color: t.muted }}>Resumen ejecutivo — {mesLabel}</div>
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
              { l: "CxC pendientes", v: fmt(TXS.filter(tx => tx.amount > 0 && tx.status === "pending").reduce((s, tx) => s + tx.amount, 0)), c: t.blue, sub: TXS.filter(tx => tx.amount > 0 && tx.status === "pending").length + " cobros pendientes" },
              { l: "CxP pendientes", v: fmt(TXS.filter(tx => tx.amount < 0 && tx.status === "pending").reduce((s, tx) => s + Math.abs(tx.amount), 0)), c: t.orange, sub: TXS.filter(tx => tx.amount < 0 && tx.status === "pending").length + " pagos pendientes" },
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
              { l: "Clientes activos", v: clients.length, c: t.blue, sub: clients.filter(c => c.type === "customer" || c.type === "client").length + " clientes, " + clients.filter(c => c.type === "supplier" || c.type === "provider").length + " proveedores" },
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
            const taskProg = pTasks.length > 0 ? Math.round(done / pTasks.length * 100) : 0;
            const prog = p.progress > 0 ? p.progress : taskProg;
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

function Landing({ onEnter, onLogin, isLoggedIn }) {
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
          <span onClick={() => document.getElementById("pricing").scrollIntoView({ behavior: "smooth" })} style={{ color: "#8890A8", textDecoration: "none", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cómo funciona</span>
          <button onClick={onLogin} style={{ background: isLoggedIn ? "linear-gradient(135deg, #34D399, #10B981)" : "transparent", color: "#ECF0F6", border: isLoggedIn ? "none" : "1px solid rgba(255,255,255,0.15)", borderRadius: 9, padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {isLoggedIn ? "Ir a mi cuenta" : "Iniciar sesión"}
          </button>
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
          <button onClick={onLogin} style={{
            background: "linear-gradient(135deg, #7C6DF0, #A78BFA)", color: "#fff", border: "none",
            borderRadius: 12, padding: "15px 36px", fontSize: 16, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 24px rgba(124,109,240,0.4)", display: "flex", alignItems: "center", gap: 8,
          }}>
            {isLoggedIn ? "Ir a mi cuenta" : "Iniciar sesión"} <ArrowUpRight size={18} />
          </button>
          <button onClick={onEnter} style={{
            background: "rgba(255,255,255,0.04)", color: "#ECF0F6", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: "15px 30px", fontSize: 16, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            Ver demo interactiva
          </button>
          <a href="https://wa.me/542926540590?text=Hola%20%F0%9F%91%8B%20Quiero%20info%20sobre%20Gesti%C3%B3nAI" target="_blank" rel="noopener noreferrer" style={{
            background: "rgba(255,255,255,0.04)", color: "#ECF0F6", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: "15px 30px", fontSize: 16, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, textDecoration: "none",
          }}>
            <MessageSquare size={16} color="#25D366" /> Contactar por WhatsApp
          </a>
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

      {/* How it works */}
      <section id="pricing" style={{ padding: "100px 40px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#FBBF24", textTransform: "uppercase", letterSpacing: 2 }}>Cómo funciona</span>
          <h2 style={{ fontSize: 40, fontWeight: 900, marginTop: 12, letterSpacing: "-1px" }}>Tu plataforma, diseñada a medida</h2>
          <p style={{ fontSize: 16, color: "#8890A8", marginTop: 12, maxWidth: 600, margin: "12px auto 0" }}>Cada empresa es única. Por eso armamos un plan personalizado que se adapta a tu operación, tus obras y tu equipo.</p>
        </div>

        {/* Steps */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginBottom: 60 }}>
          {[
            { step: "01", title: "Nos contactás", desc: "Nos contás sobre tu empresa, tus obras activas, tu equipo y qué necesitás automatizar.", icon: MessageSquare },
            { step: "02", title: "Diseñamos tu plan", desc: "Configuramos GestiónAI a medida: módulos, integraciones, usuarios y branding de tu empresa.", icon: LayoutDashboard },
            { step: "03", title: "Arrancás a operar", desc: "En menos de 48hs tenés tu plataforma lista, con onboarding para todo tu equipo.", icon: Zap },
          ].map((s, i) => (
            <div key={i} style={{ padding: 28, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", position: "relative" }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: "rgba(124,109,240,0.15)", position: "absolute", top: 16, right: 20 }}>{s.step}</div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(124,109,240,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <s.icon size={20} color="#9F92FF" />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "#8890A8", lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* What's included */}
        <div style={{
          padding: 40, borderRadius: 20,
          background: "linear-gradient(160deg, rgba(124,109,240,0.1), rgba(52,211,153,0.04))",
          border: "1px solid rgba(124,109,240,0.2)",
        }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Todas las implementaciones incluyen</div>
            <div style={{ fontSize: 13, color: "#8890A8" }}>Sin sorpresas, sin costos ocultos</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            {[
              "Dashboard inteligente en tiempo real",
              "Gestión de obras, clientes y proveedores",
              "Control financiero con IA",
              "Liquidación de sueldos integrada",
              "WhatsApp Bot con OCR de facturas",
              "Reportes automáticos personalizados",
              "App web responsive (PC + celular)",
              "Branding de tu empresa en la plataforma",
              "Soporte técnico dedicado",
              "Actualizaciones continuas sin costo extra",
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                <CheckCircle2 size={15} color="#34D399" />
                <span style={{ fontSize: 13, color: "#B0B8CC" }}>{f}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <a href="https://wa.me/542926540590?text=Hola%20%F0%9F%91%8B%20Quiero%20info%20sobre%20Gesti%C3%B3nAI%20para%20mi%20empresa" target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 40px", borderRadius: 12,
              background: "#25D366", color: "#fff", fontSize: 16, fontWeight: 700, textDecoration: "none", cursor: "pointer",
              boxShadow: "0 4px 20px rgba(37,211,102,0.3)",
            }}>
              <MessageSquare size={18} /> Hablemos por WhatsApp
            </a>
            <div style={{ fontSize: 12, color: "#555B75", marginTop: 10 }}>Respondemos en menos de 2 horas</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "100px 40px", textAlign: "center" }}>
        <div style={{
          maxWidth: 700, margin: "0 auto", padding: "60px 40px", borderRadius: 24,
          background: "linear-gradient(160deg, rgba(124,109,240,0.1), rgba(52,211,153,0.05))",
          border: "1px solid rgba(124,109,240,0.15)",
        }}>
          <h2 style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-1px" }}>¿Listo para profesionalizar tu gestión?</h2>
          <p style={{ fontSize: 16, color: "#8890A8", marginTop: 12, marginBottom: 28 }}>Dejá las planillas de Excel. Armamos tu plataforma a medida en menos de 48 horas.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <a href="https://wa.me/542926540590?text=Hola%20%F0%9F%91%8B%20Quiero%20una%20demo%20personalizada%20de%20Gesti%C3%B3nAI" target="_blank" rel="noopener noreferrer" style={{
              background: "linear-gradient(135deg, #7C6DF0, #A78BFA)", color: "#fff", border: "none",
              borderRadius: 12, padding: "16px 40px", fontSize: 16, fontWeight: 700, cursor: "pointer", textDecoration: "none",
              boxShadow: "0 4px 24px rgba(124,109,240,0.4)", display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              Solicitar demo personalizada <ArrowUpRight size={18} />
            </a>
            <button onClick={onEnter} style={{
              background: "transparent", color: "#ECF0F6", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12, padding: "16px 30px", fontSize: 16, fontWeight: 600, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              Ver demo
            </button>
          </div>
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

function AppContent({ user, profile, onLogout, isDemo, onRegister }) {
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [showWelcome, setShowWelcome] = useState(isDemo);
  const { loading } = useData();
  const t = themes[theme];
  const role = isDemo ? "owner" : (profile?.role || user?.user_metadata?.role || "owner");

  if (loading) return <LoadingScreen t={t} />;

  const meta = {
    dashboard: ["Dashboard", "Resumen financiero"], clients: ["Clientes / Proveedores", "Gestión de contactos"],
    projects: ["Proyectos / Obras", "Seguimiento y presupuestos"], tasks: ["Tareas", "Gestión de actividades"],
    transactions: ["Finanzas", "Transacciones y contabilidad"],
    payroll: ["Sueldos", "Liquidación de haberes"],
    treasury: ["Tesorería", "Cuentas y cash flow"], documents: ["Documentos", "Facturas y comprobantes"],
    reports: ["Reportes", "Informes financieros"],
    team: ["Equipo", "Gestión de usuarios e invitaciones"],
    help: ["Ayuda", "Tutoriales y guía de uso"],
    superadmin: ["Panel de Control", "Administración de todas las empresas"],
  };
  const pages = { dashboard: Dashboard, clients: Clients, projects: ProjectsPage, tasks: TasksPage, transactions: Transactions, payroll: PayrollPage, treasury: Treasury, documents: DocumentsPage, reports: Reports, team: TeamPage, help: HelpPage, superadmin: SuperAdminPage };
  const Page = pages[page] || Dashboard;

  return (
    <>
      <style>{
        "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');" +
        "@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}" +
        "@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}" +
        "*{box-sizing:border-box;margin:0;padding:0}" +
        "body{font-family:'DM Sans',-apple-system,sans-serif}" +
        "::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:" + t.border + ";border-radius:3px}" +
        "input::placeholder{color:" + t.dim + "}" +
        "select{color:" + t.text + "}option{background:" + t.card + ";color:" + t.text + "}"
      }</style>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: t.bg, transition: "background 0.25s", flexDirection: "column" }}>
        {isDemo && (
          <div style={{ background: "linear-gradient(90deg, #7C6DF0, #34D399)", padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>🎯 Estás viendo la demo con datos ficticios</span>
            <a href="https://wa.me/542926540590?text=Hola%20%F0%9F%91%8B%20Vi%20la%20demo%20y%20quiero%20mi%20plataforma%20GestiónAI" target="_blank" rel="noopener noreferrer" style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "5px 16px", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <MessageSquare size={12} /> Solicitar mi plataforma →
            </a>
          </div>
        )}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar active={page} onNav={setPage} collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} t={t} user={user} onLogout={onLogout} role={role} profile={profile} isDemo={isDemo} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <TopBar title={meta[page] ? meta[page][0] : ""} sub={meta[page] ? meta[page][1] : ""} theme={theme} toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} t={t} user={user} profile={profile} onLogout={onLogout} onNav={setPage} />
          <Page t={t} onNav={setPage} user={user} profile={profile} isDemo={isDemo} />
        </div>
        </div>
        {/* Welcome toast for demo users */}
        {showWelcome && isDemo && (
          <div style={{ position: "fixed", bottom: 24, right: 24, width: 340, background: t.card, border: "1px solid " + t.accent + "30", borderRadius: 14, padding: 18, boxShadow: "0 12px 40px rgba(0,0,0,0.3)", zIndex: 150, animation: "fadeUp 0.5s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, " + t.accent + ", #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={18} color="#fff" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>¡Bienvenido a GestiónAI!</div>
              </div>
              <div onClick={() => setShowWelcome(false)} style={{ cursor: "pointer", color: t.dim, fontSize: 16 }}>✕</div>
            </div>
            <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.6, marginBottom: 14 }}>Estás viendo datos ficticios de ejemplo. ¿Querés un recorrido rápido por la plataforma?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowWelcome(false); setPage("help"); }} style={{ flex: 1, padding: "9px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, " + t.accent + ", #A78BFA)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Ver tutorial
              </button>
              <button onClick={() => setShowWelcome(false)} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid " + t.border, background: t.hover, color: t.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Explorar solo
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── PAYROLL PAGE ───
function PayrollPage({ t }) {
  const { companyId, demoPayroll } = useData();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [period, setPeriod] = useState(new Date().toISOString().substring(0, 7)); // "2026-02"
  const [form, setForm] = useState({ employee_name: "", role: "", base_salary: "", overtime: "", bonus: "", deductions: "", notes: "" });
  const [editId, setEditId] = useState(null);
  const [viewMode, setViewMode] = useState("period"); // "period" | "employees"
  const [selEmployee, setSelEmployee] = useState(null);

  const loadPayroll = async () => {
    setLoading(true);
    if (companyId === "demo") {
      setRecords(demoPayroll || []);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("payroll").select("*").eq("company_id", companyId).order("period", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (companyId) loadPayroll(); else setLoading(false); }, [companyId]);

  const handleSave = async () => {
    const payload = {
      company_id: companyId,
      employee_name: form.employee_name,
      role: form.role || null,
      period,
      base_salary: Number(form.base_salary) || 0,
      overtime: Number(form.overtime) || 0,
      bonus: Number(form.bonus) || 0,
      deductions: Number(form.deductions) || 0,
      notes: form.notes || null,
    };
    if (editId) {
      await supabase.from("payroll").update(payload).eq("id", editId);
    } else {
      await supabase.from("payroll").insert(payload);
    }
    setShowForm(false);
    setEditId(null);
    setForm({ employee_name: "", role: "", base_salary: "", overtime: "", bonus: "", deductions: "", notes: "" });
    loadPayroll();
  };

  const editRecord = (r) => {
    setForm({ employee_name: r.employee_name, role: r.role || "", base_salary: String(r.base_salary), overtime: String(r.overtime), bonus: String(r.bonus), deductions: String(r.deductions), notes: r.notes || "" });
    setPeriod(r.period);
    setEditId(r.id);
    setShowForm(true);
  };

  const deleteRecord = async (id) => {
    if (!window.confirm("¿Eliminar esta liquidación?")) return;
    await supabase.from("payroll").delete().eq("id", id);
    loadPayroll();
  };

  const updateStatus = async (id, status) => {
    const updates = { status };
    if (status === "paid") updates.payment_date = new Date().toISOString().split("T")[0];
    await supabase.from("payroll").update(updates).eq("id", id);
    loadPayroll();
  };

  const periodRecords = records.filter(r => r.period === period);
  const allPeriods = [...new Set(records.map(r => r.period))].sort().reverse();
  const totalPeriod = periodRecords.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalPaid = periodRecords.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.total || 0), 0);
  const totalPending = totalPeriod - totalPaid;
  const employees = [...new Set(records.map(r => r.employee_name))].sort();

  const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid " + t.border, background: t.hover, color: t.text, fontSize: 13, outline: "none" };

  // Employee detail view
  if (selEmployee) {
    const empRecords = records.filter(r => r.employee_name === selEmployee).sort((a, b) => b.period.localeCompare(a.period));
    const empTotal = empRecords.reduce((s, r) => s + Number(r.total || 0), 0);
    const empRole = empRecords[0]?.role || "—";
    return (
      <div style={{ padding: 24, overflowY: "auto", height: "calc(100vh - 54px)" }}>
        <div onClick={() => setSelEmployee(null)} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 16, cursor: "pointer", color: t.muted, fontSize: 12 }}><ChevronLeft size={14} /> Volver</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Av name={selEmployee} size={48} />
            <div><div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>{selEmployee}</div><div style={{ fontSize: 12, color: t.muted }}>{empRole} · {empRecords.length} liquidaciones</div></div>
          </div>
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ employee_name: selEmployee, role: empRole !== "—" ? empRole : "", base_salary: empRecords[0] ? String(empRecords[0].base_salary) : "", overtime: "", bonus: "", deductions: empRecords[0] ? String(empRecords[0].deductions) : "", notes: "" }); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9, background: t.accent, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={15} /> Liquidar nuevo mes
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
          <Crd t={t}><div style={{ fontSize: 11, color: t.dim }}>Total histórico</div><div style={{ fontSize: 24, fontWeight: 800, color: t.text }}>{fmt(empTotal)}</div></Crd>
          <Crd t={t}><div style={{ fontSize: 11, color: t.dim }}>Último sueldo</div><div style={{ fontSize: 24, fontWeight: 800, color: t.accent }}>{fmt(Number(empRecords[0]?.total || 0))}</div></Crd>
          <Crd t={t}><div style={{ fontSize: 11, color: t.dim }}>Meses liquidados</div><div style={{ fontSize: 24, fontWeight: 800, color: t.blue }}>{empRecords.length}</div></Crd>
        </div>

        {showForm && (
          <Crd t={t} style={{ marginBottom: 20, border: "1px solid " + t.accent + "30" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 14 }}>{editId ? "Editar" : "Nueva"} liquidación — {selEmployee}</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Período</div><input type="month" value={period} onChange={e => setPeriod(e.target.value)} style={inputStyle} /></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Cargo</div><input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="Ej: Capataz" style={inputStyle} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Sueldo básico *</div><input type="number" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} placeholder="0" style={inputStyle} /></div>
              <div><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Horas extra</div><input type="number" value={form.overtime} onChange={e => setForm({ ...form, overtime: e.target.value })} placeholder="0" style={inputStyle} /></div>
              <div><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Bonificación</div><input type="number" value={form.bonus} onChange={e => setForm({ ...form, bonus: e.target.value })} placeholder="0" style={inputStyle} /></div>
              <div><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Deducciones</div><input type="number" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} placeholder="0" style={inputStyle} /></div>
            </div>
            <div><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Notas</div><input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones..." style={inputStyle} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: t.accent }}>Total: {fmt((Number(form.base_salary) || 0) + (Number(form.overtime) || 0) + (Number(form.bonus) || 0) - (Number(form.deductions) || 0))}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ padding: "9px 20px", borderRadius: 8, background: t.hover, color: t.muted, border: "1px solid " + t.border, fontSize: 12, cursor: "pointer" }}>Cancelar</button>
                <button onClick={handleSave} disabled={!form.base_salary} style={{ padding: "9px 24px", borderRadius: 8, background: t.accent, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: !form.base_salary ? 0.5 : 1 }}>Guardar</button>
              </div>
            </div>
          </Crd>
        )}

        <Crd t={t}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>Historial de liquidaciones</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr>{["Período", "Básico", "Extras", "Bonif.", "Deduc.", "Total", "Estado", ""].map((h, i) => <th key={i} style={{ textAlign: "left", padding: "10px", color: t.dim, fontWeight: 600, borderBottom: "1px solid " + t.border, fontSize: 11 }}>{h}</th>)}</tr></thead>
            <tbody>
              {empRecords.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid " + t.border + "60" }}>
                  <td style={{ padding: "10px", color: t.text, fontWeight: 600 }}>{r.period}</td>
                  <td style={{ padding: "10px", color: t.text }}>{fmt(Number(r.base_salary))}</td>
                  <td style={{ padding: "10px", color: t.blue }}>{r.overtime > 0 ? "+" + fmt(Number(r.overtime)) : "—"}</td>
                  <td style={{ padding: "10px", color: t.green }}>{r.bonus > 0 ? "+" + fmt(Number(r.bonus)) : "—"}</td>
                  <td style={{ padding: "10px", color: t.red }}>{r.deductions > 0 ? "-" + fmt(Number(r.deductions)) : "—"}</td>
                  <td style={{ padding: "10px", fontWeight: 800, color: t.accent }}>{fmt(Number(r.total))}</td>
                  <td style={{ padding: "10px" }}>
                    <span style={pill(r.status === "paid" ? t.greenBg : r.status === "approved" ? t.blueBg : t.orangeBg, r.status === "paid" ? t.green : r.status === "approved" ? t.blue : t.orange)}>
                      {r.status === "paid" ? "Pagado" : r.status === "approved" ? "Aprobado" : "Borrador"}
                    </span>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {r.status === "draft" && <div onClick={() => updateStatus(r.id, "approved")} style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 6, background: t.blueBg, fontSize: 10, color: t.blue, fontWeight: 600 }}>Aprobar</div>}
                      {r.status === "approved" && <div onClick={() => updateStatus(r.id, "paid")} style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 6, background: t.greenBg, fontSize: 10, color: t.green, fontWeight: 600 }}>Pagar</div>}
                      <div onClick={() => editRecord(r)} style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 6, background: t.hover, fontSize: 10, color: t.muted }}>Editar</div>
                      <div onClick={() => deleteRecord(r.id)} style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 6, background: t.redBg, fontSize: 10, color: t.red }}>×</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Crd>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, overflowY: "auto", height: "calc(100vh - 54px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>Liquidación de Sueldos</div>
          <div style={{ fontSize: 12, color: t.muted }}>{viewMode === "period" ? periodRecords.length + " liquidaciones en " + period : employees.length + " empleados registrados"}</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Tabs t={t} active={viewMode} onChange={setViewMode} items={[{ id: "period", label: "Por período" }, { id: "employees", label: "Por empleado" }]} />
          {viewMode === "period" && <input type="month" value={period} onChange={e => setPeriod(e.target.value)} style={{ ...inputStyle, width: 160 }} />}
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ employee_name: "", role: "", base_salary: "", overtime: "", bonus: "", deductions: "", notes: "" }); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9, background: t.accent, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={15} /> Nueva liquidación
          </button>
        </div>
      </div>

      {viewMode === "period" && <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <Crd t={t}><div style={{ fontSize: 11, color: t.dim }}>Total período</div><div style={{ fontSize: 24, fontWeight: 800, color: t.text }}>{fmt(totalPeriod)}</div></Crd>
        <Crd t={t}><div style={{ fontSize: 11, color: t.dim }}>Pagado</div><div style={{ fontSize: 24, fontWeight: 800, color: t.green }}>{fmt(totalPaid)}</div></Crd>
        <Crd t={t}><div style={{ fontSize: 11, color: t.dim }}>Pendiente</div><div style={{ fontSize: 24, fontWeight: 800, color: t.orange }}>{fmt(totalPending)}</div></Crd>
      </div>
      </>}

      {showForm && (
        <Crd t={t} style={{ marginBottom: 20, border: "1px solid " + t.accent + "30" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 14 }}>{editId ? "Editar" : "Nueva"} liquidación — {period}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Empleado *</div><input value={form.employee_name} onChange={e => setForm({ ...form, employee_name: e.target.value })} placeholder="Nombre completo" style={inputStyle} /></div>
            <div><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Cargo</div><input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="Ej: Albañil, Capataz" style={inputStyle} /></div>
            <div><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Sueldo básico *</div><input type="number" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} placeholder="0" style={inputStyle} /></div>
            <div><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Horas extra</div><input type="number" value={form.overtime} onChange={e => setForm({ ...form, overtime: e.target.value })} placeholder="0" style={inputStyle} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10, marginBottom: 10 }}>
            <div><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Bonificación</div><input type="number" value={form.bonus} onChange={e => setForm({ ...form, bonus: e.target.value })} placeholder="0" style={inputStyle} /></div>
            <div><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Deducciones</div><input type="number" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} placeholder="0" style={inputStyle} /></div>
            <div><div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Notas</div><input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones..." style={inputStyle} /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.accent }}>Total: {fmt((Number(form.base_salary) || 0) + (Number(form.overtime) || 0) + (Number(form.bonus) || 0) - (Number(form.deductions) || 0))}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ padding: "9px 20px", borderRadius: 8, background: t.hover, color: t.muted, border: "1px solid " + t.border, fontSize: 12, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleSave} disabled={!form.employee_name || !form.base_salary} style={{ padding: "9px 24px", borderRadius: 8, background: t.accent, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: !form.employee_name || !form.base_salary ? 0.5 : 1 }}>Guardar</button>
            </div>
          </div>
        </Crd>
      )}

      {viewMode === "employees" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {employees.length === 0 && <div style={{ padding: 40, textAlign: "center", color: t.dim, gridColumn: "1/-1" }}>No hay empleados registrados. Creá una liquidación para empezar.</div>}
          {employees.map(emp => {
            const empRecs = records.filter(r => r.employee_name === emp);
            const lastRec = empRecs.sort((a, b) => b.period.localeCompare(a.period))[0];
            const empTotal = empRecs.reduce((s, r) => s + Number(r.total || 0), 0);
            return (
              <Crd key={emp} t={t} style={{ padding: 16, cursor: "pointer" }} onClick={() => setSelEmployee(emp)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <Av name={emp} size={40} />
                  <div><div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{emp}</div><div style={{ fontSize: 11, color: t.muted }}>{lastRec?.role || "—"}</div></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><div style={{ fontSize: 10, color: t.dim }}>Último sueldo</div><div style={{ fontSize: 15, fontWeight: 700, color: t.accent }}>{fmt(Number(lastRec?.total || 0))}</div></div>
                  <div><div style={{ fontSize: 10, color: t.dim }}>Liquidaciones</div><div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{empRecs.length} meses</div></div>
                </div>
                <div style={{ marginTop: 8, fontSize: 10, color: t.dim }}>Total acumulado: {fmt(empTotal)}</div>
              </Crd>
            );
          })}
        </div>
      ) : (
      <Crd t={t}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>{["Empleado", "Cargo", "Básico", "Extras", "Bonif.", "Deduc.", "Total", "Estado", "Acciones"].map((h, i) => <th key={i} style={{ textAlign: "left", padding: "10px 10px", color: t.dim, fontWeight: 600, borderBottom: "1px solid " + t.border, fontSize: 11 }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {periodRecords.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid " + t.border + "60" }}>
                <td onClick={() => setSelEmployee(r.employee_name)} style={{ padding: "10px", color: t.text, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textDecorationColor: t.accent + "40" }}>{r.employee_name}</td>
                <td style={{ padding: "10px", color: t.muted }}>{r.role || "—"}</td>
                <td style={{ padding: "10px", color: t.text }}>{fmt(Number(r.base_salary))}</td>
                <td style={{ padding: "10px", color: t.blue }}>{r.overtime > 0 ? "+" + fmt(Number(r.overtime)) : "—"}</td>
                <td style={{ padding: "10px", color: t.green }}>{r.bonus > 0 ? "+" + fmt(Number(r.bonus)) : "—"}</td>
                <td style={{ padding: "10px", color: t.red }}>{r.deductions > 0 ? "-" + fmt(Number(r.deductions)) : "—"}</td>
                <td style={{ padding: "10px", fontWeight: 800, color: t.accent }}>{fmt(Number(r.total))}</td>
                <td style={{ padding: "10px" }}>
                  <span style={pill(r.status === "paid" ? t.greenBg : r.status === "approved" ? t.blueBg : t.orangeBg, r.status === "paid" ? t.green : r.status === "approved" ? t.blue : t.orange)}>
                    {r.status === "paid" ? "Pagado" : r.status === "approved" ? "Aprobado" : "Borrador"}
                  </span>
                </td>
                <td style={{ padding: "10px" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {r.status === "draft" && <div onClick={() => updateStatus(r.id, "approved")} style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 6, background: t.blueBg, fontSize: 10, color: t.blue, fontWeight: 600 }}>Aprobar</div>}
                    {r.status === "approved" && <div onClick={() => updateStatus(r.id, "paid")} style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 6, background: t.greenBg, fontSize: 10, color: t.green, fontWeight: 600 }}>Pagar</div>}
                    <div onClick={() => editRecord(r)} style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 6, background: t.hover, fontSize: 10, color: t.muted }}>Editar</div>
                    <div onClick={() => deleteRecord(r.id)} style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 6, background: t.redBg, fontSize: 10, color: t.red }}>×</div>
                  </div>
                </td>
              </tr>
            ))}
            {periodRecords.length === 0 && <tr><td colSpan={9} style={{ padding: 30, textAlign: "center", color: t.dim }}>No hay liquidaciones para {period}. Usá "Nueva liquidación" para agregar.</td></tr>}
          </tbody>
        </table>
      </Crd>
      )}

      {viewMode === "period" && allPeriods.length > 1 && (
        <div style={{ marginTop: 16, fontSize: 11, color: t.dim }}>
          Períodos anteriores: {allPeriods.filter(p => p !== period).map((p, i) => (
            <span key={p} onClick={() => setPeriod(p)} style={{ cursor: "pointer", color: t.accentL, marginLeft: i > 0 ? 8 : 4 }}>{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SUPER ADMIN PAGE ───
// ═══════════════════════════════════════════════════════════
// HELP PAGE — Interactive tutorial + module guides + FAQ
// ═══════════════════════════════════════════════════════════
function HelpPage({ t, onNav, isDemo }) {
  const [activeGuide, setActiveGuide] = useState(null);
  const [tutorialStep, setTutorialStep] = useState(-1); // -1 = not running
  const [expandedFaq, setExpandedFaq] = useState(null);

  const tutorialSteps = [
    { title: "Dashboard", icon: LayoutDashboard, nav: "dashboard", desc: "Tu centro de control. Acá ves el resumen financiero del día: tareas pendientes, cobros y pagos próximos, documentos por revisar y un vistazo general de todos tus proyectos.", tip: "Los números se actualizan en tiempo real con cada transacción que cargás." },
    { title: "Clientes / Proveedores", icon: Users, nav: "clients", desc: "Gestioná tu cartera de contactos. Podés cargar clientes, proveedores, subcontratistas — cada uno con teléfono, email, ciudad. Desde la ficha de cada contacto ves sus transacciones y documentos asociados.", tip: "Hacé click en cualquier contacto para ver su detalle completo." },
    { title: "Proyectos / Obras", icon: FolderKanban, nav: "projects", desc: "Cada obra es un proyecto. Cargá presupuesto, fechas, cliente, y hacé seguimiento del avance. Podés vincular tareas, transacciones y documentos a cada proyecto.", tip: "Usá los filtros 'En curso' y 'Completados' para organizar tu vista." },
    { title: "Tareas", icon: Target, nav: "tasks", desc: "Tablero Kanban con 4 columnas: Por hacer → En progreso → Revisión → Completado. También tenés vista de lista y calendario mensual. Asigná responsables y fechas de vencimiento.", tip: "Hacé click en una tarea para editarla. Arrastrá entre columnas si cambiás el estado." },
    { title: "Finanzas", icon: Receipt, nav: "transactions", desc: "Registrá ingresos y egresos vinculados a proyectos y contactos. Filtrá por tipo, estado o período. La pestaña Contabilidad te da los asientos automáticos.", tip: "Los cobros pendientes y pagos vencidos aparecen automáticamente en el Dashboard." },
    { title: "Sueldos", icon: CreditCard, nav: "payroll", desc: "Liquidación de sueldos para tu equipo. Cargá empleados, categoría, sueldo básico, antigüedad, y el sistema calcula aportes y cargas automáticamente.", tip: "Podés exportar cada recibo individual o el resumen general." },
    { title: "Tesorería", icon: Wallet, nav: "treasury", desc: "Visualizá tus cuentas bancarias, caja y flujo de efectivo. Los KPIs se calculan de tus transacciones reales: saldo disponible, proyección 30/60/90 días, concentración por cuenta.", tip: "Agregá tus cuentas bancarias y el sistema trackea los movimientos." },
    { title: "Documentos", icon: FileText, nav: "documents", desc: "Subí facturas, presupuestos, planos, certificados — cualquier archivo. Cada documento se vincula a un proyecto y/o contacto. Controlá estados: pendiente, aprobado, pagado.", tip: "Próximamente: OCR automático para leer facturas con IA." },
    { title: "Reportes", icon: BarChart3, nav: "reports", desc: "Informes financieros completos: Estado de Resultados, Balance General, Flujo de Efectivo y análisis por Proyecto. Todo generado automáticamente de tus datos.", tip: "Los reportes se actualizan en tiempo real. Exportalos en cualquier momento." },
    { title: "Equipo", icon: UserPlus, nav: "team", desc: "Invitá miembros a tu empresa con diferentes roles: Dueño, Admin, Contador, Director de Obra, Empleado. Cada rol tiene permisos diferentes.", tip: "Cargá el teléfono de cada miembro para que reciban recordatorios por WhatsApp." },
  ];

  const guides = [
    { id: "start", icon: Zap, title: "Primeros pasos", color: t.accent, items: [
      "Creá tu cuenta y empresa desde el formulario de registro",
      "Cargá tus primeros clientes/proveedores en la sección Clientes",
      "Creá tu primer proyecto/obra y vinculalo a un cliente",
      "Empezá a registrar transacciones (ingresos y egresos)",
      "Subí tus primeras facturas y documentos",
    ]},
    { id: "finance", icon: Receipt, title: "Cómo cargar transacciones", color: t.green, items: [
      "Ir a Finanzas → botón 'Nueva transacción'",
      "Elegir tipo: ingreso (positivo) o egreso (negativo)",
      "Vincular a un proyecto y contacto existente",
      "Marcar el estado: pagado o pendiente",
      "Las transacciones pendientes aparecen como alertas en el Dashboard",
    ]},
    { id: "tasks", icon: Target, title: "Gestión de tareas", color: t.blue, items: [
      "Usá la vista Board para Kanban o Lista para tabla",
      "Click en 'Nueva tarea' → se crea y abre el editor",
      "Asigná un responsable del equipo y fecha de vencimiento",
      "Cambiá el estado desde el editor: Por hacer → En progreso → Revisión → Done",
      "El calendario muestra las tareas organizadas por fecha",
    ]},
    { id: "docs", icon: FileText, title: "Documentos y archivos", color: t.orange, items: [
      "Ir a Documentos → 'Subir documento'",
      "Aceptamos PDF, imágenes, Excel, Word, etc.",
      "Vinculá cada documento a un proyecto y/o contacto",
      "Controlá el estado: pendiente, aprobado, pagado, vencido",
      "Los documentos se guardan en Supabase Storage de forma segura",
    ]},
    { id: "whatsapp", icon: MessageSquare, title: "WhatsApp e IA", color: "#25D366", items: [
      "GestiónAI integra un asistente de IA por WhatsApp",
      "Cada empresa usa un número compartido para consultas",
      "Mandá mensajes de texto, fotos de facturas o audios",
      "La IA responde con datos de TU empresa (clientes, saldos, obras)",
      "Los recordatorios diarios llegan automáticos a las 7 AM",
    ]},
  ];

  const faqs = [
    { q: "¿Mis datos están seguros?", a: "Sí. Usamos Supabase con Row Level Security: cada empresa solo ve sus propios datos. La base de datos está encriptada y los accesos controlados por roles." },
    { q: "¿Cuántos usuarios puede tener mi empresa?", a: "No hay límite de usuarios por empresa. Podés invitar a todo tu equipo y asignarles diferentes roles según lo que necesiten ver." },
    { q: "¿Puedo usar GestiónAI desde el celular?", a: "Sí, la plataforma es responsive y se adapta a cualquier pantalla. También podés usar el bot de WhatsApp para consultas rápidas desde el celular." },
    { q: "¿Qué pasa si necesito ayuda técnica?", a: "Contactanos directamente por WhatsApp al +54 292 654-0590. Respondemos en menos de 24 horas." },
    { q: "¿Se pueden exportar los datos?", a: "Los reportes se pueden exportar. Estamos trabajando en exportación masiva de todos los datos a Excel/CSV." },
    { q: "¿Cómo funcionan los recordatorios de WhatsApp?", a: "Todos los días a las 7 AM te llega un resumen por WhatsApp con: tareas que vencen hoy, cobros y pagos pendientes, y facturas sin pagar. Necesitás tener tu teléfono cargado en Equipo." },
  ];

  // Interactive tutorial overlay
  const tutorialOverlay = tutorialStep >= 0 && (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 520, maxWidth: "92vw", background: t.card, borderRadius: 20, border: "1px solid " + t.border, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
        {/* Progress bar */}
        <div style={{ height: 4, background: t.hover }}>
          <div style={{ height: 4, background: "linear-gradient(90deg, " + t.accent + ", #34D399)", width: ((tutorialStep + 1) / tutorialSteps.length * 100) + "%", transition: "width 0.3s", borderRadius: 4 }} />
        </div>
        {/* Header */}
        <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: t.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Tutorial interactivo</span>
            <span style={{ fontSize: 10, color: t.accent, fontWeight: 700, background: t.accentBg, padding: "2px 8px", borderRadius: 10 }}>{tutorialStep + 1}/{tutorialSteps.length}</span>
          </div>
          <div onClick={() => setTutorialStep(-1)} style={{ cursor: "pointer", width: 28, height: 28, borderRadius: 7, background: t.hover, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} color={t.muted} />
          </div>
        </div>
        {/* Content */}
        {(() => {
          const step = tutorialSteps[tutorialStep];
          const Icon = step.icon;
          return (
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: t.accentBg, border: "1px solid " + t.accent + "30", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={22} color={t.accentL} />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: t.text }}>{step.title}</div>
                  <div style={{ fontSize: 11, color: t.muted }}>Sección {tutorialStep + 1} de {tutorialSteps.length}</div>
                </div>
              </div>
              <div style={{ fontSize: 14, color: t.text, lineHeight: 1.7, marginBottom: 16 }}>{step.desc}</div>
              <div style={{ padding: "12px 14px", background: t.accentBg, borderRadius: 10, border: "1px solid " + t.accent + "20", marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: t.accentL, fontWeight: 600 }}>💡 Tip</div>
                <div style={{ fontSize: 12, color: t.text, marginTop: 4 }}>{step.tip}</div>
              </div>
              {/* Navigation */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => setTutorialStep(Math.max(0, tutorialStep - 1))} disabled={tutorialStep === 0} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid " + t.border, background: t.hover, color: tutorialStep === 0 ? t.dim : t.text, fontSize: 12, fontWeight: 600, cursor: tutorialStep === 0 ? "default" : "pointer", opacity: tutorialStep === 0 ? 0.4 : 1 }}>← Anterior</button>
                <button onClick={() => { if (onNav) onNav(step.nav); }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid " + t.accent + "40", background: t.accentBg, color: t.accentL, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Ir a {step.title} →
                </button>
                {tutorialStep < tutorialSteps.length - 1 ? (
                  <button onClick={() => setTutorialStep(tutorialStep + 1)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, " + t.accent + ", #A78BFA)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Siguiente →</button>
                ) : (
                  <button onClick={() => setTutorialStep(-1)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #34D399, #059669)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✅ ¡Listo!</button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, overflowY: "auto", height: "calc(100vh - 54px)" }}>
      {tutorialOverlay}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>Centro de Ayuda</div>
        <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>Aprendé a usar GestiónAI paso a paso</div>
      </div>

      {/* Start Tutorial CTA */}
      <Crd t={t} style={{ padding: 0, marginBottom: 20, overflow: "hidden", background: "linear-gradient(135deg, " + t.accent + "15, #A78BFA10)", border: "1px solid " + t.accent + "25" }}>
        <div style={{ padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, " + t.accent + ", #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 16px " + t.accent + "40" }}>
            <Play size={24} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>Tutorial interactivo</div>
            <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>Recorré las {tutorialSteps.length} secciones de la plataforma con explicaciones detalladas y tips.</div>
          </div>
          <button onClick={() => setTutorialStep(0)} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, " + t.accent + ", #A78BFA)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 10px " + t.accent + "30" }}>
            Empezar tutorial
          </button>
        </div>
      </Crd>

      {/* Quick Navigation */}
      <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 10 }}>Secciones de la plataforma</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8, marginBottom: 24 }}>
        {tutorialSteps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.nav} onClick={() => setTutorialStep(i)} style={{ padding: "14px 12px", background: t.card, border: "1px solid " + t.border, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "border-color 0.2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = t.accent} onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
              <Icon size={16} color={t.accentL} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{step.title}</div>
                <div style={{ fontSize: 9, color: t.dim }}>Click para ver guía</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Guides */}
      <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 10 }}>Guías paso a paso</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, marginBottom: 24 }}>
        {guides.map(guide => {
          const Icon = guide.icon;
          const open = activeGuide === guide.id;
          return (
            <Crd key={guide.id} t={t} style={{ padding: 0, overflow: "hidden" }}>
              <div onClick={() => setActiveGuide(open ? null : guide.id)} style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: guide.color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={18} color={guide.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{guide.title}</div>
                  <div style={{ fontSize: 10, color: t.dim }}>{guide.items.length} pasos</div>
                </div>
                <ChevronDown size={14} color={t.dim} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </div>
              {open && (
                <div style={{ padding: "0 18px 16px" }}>
                  {guide.items.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: i === 0 ? "1px solid " + t.border : "none" }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: guide.color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: guide.color }}>{i + 1}</span>
                      </div>
                      <div style={{ fontSize: 12, color: t.text, lineHeight: 1.5 }}>{item}</div>
                    </div>
                  ))}
                </div>
              )}
            </Crd>
          );
        })}
      </div>

      {/* FAQ */}
      <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 10 }}>Preguntas frecuentes</div>
      <Crd t={t} style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
        {faqs.map((faq, i) => (
          <div key={i}>
            <div onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderBottom: "1px solid " + t.border + "30" }} onMouseEnter={e => e.currentTarget.style.background = t.hover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <HelpCircle size={14} color={expandedFaq === i ? t.accentL : t.dim} />
              <div style={{ flex: 1, fontSize: 13, color: t.text, fontWeight: 500 }}>{faq.q}</div>
              <ChevronDown size={14} color={t.dim} style={{ transform: expandedFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>
            {expandedFaq === i && (
              <div style={{ padding: "10px 18px 14px 42px", fontSize: 12, color: t.muted, lineHeight: 1.6, background: t.hover + "50" }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </Crd>

      {/* Contact */}
      <Crd t={t} style={{ padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "#25D36615", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <MessageSquare size={20} color="#25D366" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>¿Necesitás ayuda personalizada?</div>
          <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>Contactanos directamente por WhatsApp y te respondemos rápido.</div>
        </div>
        <a href="https://wa.me/542926540590?text=Hola%20%F0%9F%91%8B%20Necesito%20ayuda%20con%20GestiónAI" target="_blank" rel="noopener noreferrer" style={{ padding: "10px 20px", borderRadius: 10, background: "#25D366", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Phone size={14} /> Contactar soporte
        </a>
      </Crd>
    </div>
  );
}

function SuperAdminPage({ t }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [tab, setTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [noteText, setNoteText] = useState("");
  const [loadError, setLoadError] = useState(null);

  const Crd2 = ({ children, style }) => <div style={{ background: t.card, borderRadius: 12, border: "1px solid " + t.border, padding: 20, ...style }}>{children}</div>;

  const loadCompanies = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_get_companies");
    if (error) {
      console.error("admin_get_companies error:", error);
      setLoadError("Error al cargar empresas: " + error.message + "\n\nAsegurate de haber corrido 'supabase_admin_fix.sql'");
    }
    setCompanies(data || []);
    setLoading(false);
  };

  const loadCompanyDetail = async (companyId) => {
    setRefreshing(true);
    setLoadError(null);
    const { data, error } = await supabase.rpc("admin_get_company_detail", { p_company_id: companyId });
    if (error) {
      console.error("admin_get_company_detail error:", error);
      setLoadError("Error al cargar detalle: " + error.message + "\n\nCorré 'supabase_admin_fix.sql' para actualizar las funciones.");
      setRefreshing(false);
      return;
    }
    if (data) {
      setCompanyData({
        users: data.users || [],
        clients: data.clients || [],
        projects: data.projects || [],
        transactions: data.transactions || [],
        tasks: data.tasks || [],
        documents: data.documents || [],
        payroll: data.payroll || [],
        bankAccounts: data.bank_accounts || [],
        waUsers: data.wa_users || [],
        waMessages: data.wa_messages || [],
      });
    } else {
      setCompanyData({ users: [], clients: [], projects: [], transactions: [], tasks: [], documents: [], payroll: [], bankAccounts: [], waUsers: [], waMessages: [] });
    }
    setRefreshing(false);
  };

  const selectCompany = (comp) => {
    setSelected(comp);
    setTab("overview");
    setNoteText(comp.admin_notes || "");
    setLoadError(null);
    loadCompanyDetail(comp.id);
  };

  const saveCompanyEdit = async () => {
    if (!editingCompany) return;
    await supabase.rpc("admin_update_company", {
      p_company_id: editingCompany.id,
      p_name: editForm.name || "",
      p_cuit: editForm.cuit || "",
      p_phone: editForm.phone || "",
      p_notes: editingCompany.admin_notes || "",
    });
    setEditingCompany(null);
    loadCompanies();
    if (selected?.id === editingCompany.id) setSelected({ ...selected, ...editForm });
  };

  const saveNote = async () => {
    if (!selected) return;
    await supabase.rpc("admin_update_company", {
      p_company_id: selected.id,
      p_name: selected.name,
      p_cuit: selected.cuit || "",
      p_phone: selected.phone || "",
      p_notes: noteText,
    });
    setSelected({ ...selected, admin_notes: noteText });
  };

  useEffect(() => { loadCompanies(); }, []);

  const statBadge = (val, label, color) => (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8, background: color + "15" }}>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{val}</span>
      <span style={{ fontSize: 10, color: t.dim }}>{label}</span>
    </div>
  );

  // ─── Company List ───
  if (!selected) {
    if (loading) return <div style={{ padding: 30, color: t.muted }}>Cargando empresas...</div>;
    if (loadError) return (
      <div style={{ padding: 30 }}>
        <div style={{ padding: 20, background: t.redBg, borderRadius: 10, border: "1px solid " + t.red + "30", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.red, marginBottom: 6 }}>Error</div>
          <div style={{ fontSize: 12, color: t.text, whiteSpace: "pre-wrap" }}>{loadError}</div>
        </div>
        <Btn primary t={t} onClick={loadCompanies}><RefreshCw size={12} />Reintentar</Btn>
      </div>
    );

    const totalUsers = companies.reduce((s, c) => s + (c.user_count || 0), 0);
    const totalMessages = companies.reduce((s, c) => s + (c.wa_message_count || 0), 0);

    return (
      <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Empresas", value: companies.length, icon: <Building2 size={18} color={t.accent} />, bg: t.accentBg },
            { label: "Usuarios totales", value: totalUsers, icon: <Users size={18} color={t.green} />, bg: t.greenBg },
            { label: "Mensajes WA", value: totalMessages, icon: <MessageSquare size={18} color="#25D366" />, bg: "rgba(37,211,102,0.1)" },
            { label: "Con actividad WA", value: companies.filter(c => (c.wa_message_count || 0) > 0).length, icon: <Activity size={18} color={t.orange} />, bg: t.orangeBg },
          ].map((s, i) => (
            <Crd2 key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: t.dim }}>{s.label}</div>
                </div>
              </div>
            </Crd2>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 14 }}>
          {companies.map(comp => (
            <Crd2 key={comp.id} style={{ cursor: "pointer" }}>
              <div onClick={() => selectCompany(comp)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, " + t.accent + ", #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Building2 size={18} color="#fff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{comp.name}</div>
                    <div style={{ fontSize: 11, color: t.dim }}>{comp.cuit || "Sin CUIT"} · {comp.phone || "Sin tel"}</div>
                  </div>
                  <ChevronRight size={16} color={t.dim} />
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {statBadge(comp.user_count || 0, "usuarios", t.accent)}
                  {statBadge(comp.client_count || 0, "clientes", t.green)}
                  {statBadge(comp.project_count || 0, "obras", t.blue)}
                  {statBadge(comp.transaction_count || 0, "movs", t.orange)}
                  {statBadge(comp.task_count || 0, "tareas", t.accentL)}
                  {statBadge(comp.document_count || 0, "docs", t.dim)}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 10, borderTop: "1px solid " + t.border }}>
                  <MessageSquare size={12} color="#25D366" />
                  <span style={{ fontSize: 11, color: t.dim }}>{comp.wa_message_count || 0} mensajes WA · {comp.wa_user_count || 0} vinculados</span>
                </div>
                <div style={{ fontSize: 10, color: t.dim, marginTop: 6 }}>Creada: {comp.created_at ? new Date(comp.created_at).toLocaleDateString("es-AR") : "—"}</div>
              </div>
            </Crd2>
          ))}
        </div>
      </div>
    );
  }

  // ─── Company Detail ───
  const tabs = [
    { id: "overview", label: "Resumen", icon: LayoutDashboard },
    { id: "users", label: "Usuarios", icon: Users },
    { id: "clients", label: "Clientes", icon: Users },
    { id: "projects", label: "Proyectos", icon: FolderKanban },
    { id: "transactions", label: "Finanzas", icon: Receipt },
    { id: "tasks", label: "Tareas", icon: Target },
    { id: "documents", label: "Documentos", icon: FileText },
    { id: "payroll", label: "Sueldos", icon: Receipt },
    { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  ];

  const totalIncome = (companyData?.transactions || []).filter(tx => Number(tx.amount) > 0).reduce((s, tx) => s + Number(tx.amount), 0);
  const totalExpense = (companyData?.transactions || []).filter(tx => Number(tx.amount) < 0).reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0);

  const statusPill = (status) => {
    const colors = { active: t.green, in_progress: t.blue, pending: t.orange, completed: t.accent, overdue: t.red, paid: t.green, done: t.green, planning: t.blue, draft: t.dim, approved: t.accent };
    const col = colors[status] || t.dim;
    return <span style={{ ...pill(col + "18", col) }}>{status || "—"}</span>;
  };

  const Table = ({ headers, rows }) => (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr>{headers.map((h, i) => <th key={i} style={{ textAlign: "left", padding: "8px 10px", color: t.dim, fontWeight: 600, borderBottom: "1px solid " + t.border, fontSize: 11 }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: "1px solid " + t.border + "60" }}>
              {row.map((cell, ci) => <td key={ci} style={{ padding: "8px 10px", color: t.text }}>{cell}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={headers.length} style={{ padding: 20, textAlign: "center", color: t.dim }}>Sin datos</td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div onClick={() => { setSelected(null); setCompanyData(null); setLoadError(null); }} style={{ cursor: "pointer", padding: "6px 12px", borderRadius: 8, background: t.hover, border: "1px solid " + t.border, display: "flex", alignItems: "center", gap: 6 }}>
          <ChevronLeft size={14} color={t.muted} /><span style={{ fontSize: 12, color: t.muted }}>Volver</span>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, " + t.accent + ", #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center" }}><Building2 size={20} color="#fff" /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>{selected.name}</div>
          <div style={{ fontSize: 12, color: t.dim }}>{selected.cuit || "—"} · {selected.phone || "—"}{selected.wa_phone ? " · WA: +" + selected.wa_phone : ""}</div>
        </div>
        <div onClick={() => { setEditingCompany(selected); setEditForm({ name: selected.name, cuit: selected.cuit || "", phone: selected.phone || "" }); }} style={{ cursor: "pointer", padding: "8px 16px", borderRadius: 8, background: t.accentBg, border: "1px solid " + t.accent + "30", fontSize: 12, fontWeight: 600, color: t.accentL }}>Editar</div>
        <div onClick={() => loadCompanyDetail(selected.id)} style={{ cursor: "pointer", padding: 8, borderRadius: 8, background: t.hover }}><RefreshCw size={14} color={refreshing ? t.accent : t.dim} /></div>
      </div>

      {editingCompany && (
        <Crd2 style={{ marginBottom: 16, border: "1px solid " + t.accent + "40" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[{ label: "Nombre", key: "name" }, { label: "CUIT", key: "cuit" }, { label: "Teléfono", key: "phone" }].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>{f.label}</div>
                <input value={editForm[f.key] || ""} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid " + t.border, background: t.hover, color: t.text, fontSize: 13, outline: "none" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={saveCompanyEdit} style={{ padding: "8px 20px", borderRadius: 8, background: t.accent, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Guardar</button>
            <button onClick={() => setEditingCompany(null)} style={{ padding: "8px 20px", borderRadius: 8, background: t.hover, color: t.muted, border: "1px solid " + t.border, fontSize: 12, cursor: "pointer" }}>Cancelar</button>
          </div>
        </Crd2>
      )}

      {/* Error banner */}
      {loadError && (
        <div style={{ padding: 14, background: t.redBg, borderRadius: 10, border: "1px solid " + t.red + "30", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: t.red, fontWeight: 600 }}>Error al cargar datos</div>
          <div style={{ fontSize: 11, color: t.text, whiteSpace: "pre-wrap", marginTop: 4 }}>{loadError}</div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid " + t.border, paddingBottom: 2, overflowX: "auto" }}>
        {tabs.map(tb => (
          <div key={tb.id} onClick={() => setTab(tb.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", cursor: "pointer", borderBottom: tab === tb.id ? "2px solid " + t.accent : "2px solid transparent", color: tab === tb.id ? t.accentL : t.dim, fontSize: 12, fontWeight: tab === tb.id ? 600 : 400, whiteSpace: "nowrap" }}>
            <tb.icon size={13} />{tb.label}
            {companyData && (
              <span style={{ fontSize: 9, background: tab === tb.id ? t.accentBg : t.hover, padding: "1px 5px", borderRadius: 8, color: tab === tb.id ? t.accentL : t.dim }}>
                {tb.id === "overview" ? "" : (companyData[tb.id === "whatsapp" ? "waMessages" : tb.id === "payroll" ? "payroll" : tb.id === "documents" ? "documents" : tb.id] || []).length}
              </span>
            )}
          </div>
        ))}
      </div>

      {refreshing && <div style={{ padding: 10, textAlign: "center", color: t.dim, fontSize: 12 }}>Actualizando...</div>}

      {tab === "overview" && companyData && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Crd2>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12 }}>📊 Estadísticas</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Usuarios", value: companyData.users.length, color: t.accent },
                { label: "Clientes", value: companyData.clients.length, color: t.green },
                { label: "Proyectos", value: companyData.projects.length, color: t.blue },
                { label: "Transacciones", value: companyData.transactions.length, color: t.orange },
                { label: "Tareas", value: companyData.tasks.length, color: t.accentL },
                { label: "Documentos", value: companyData.documents.length, color: t.dim },
                { label: "Liquidaciones", value: companyData.payroll.length, color: "#EC4899" },
                { label: "Ctas bancarias", value: companyData.bankAccounts.length, color: t.blue },
                { label: "Usuarios WA", value: companyData.waUsers.length, color: "#25D366" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 8, background: s.color + "10" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: t.muted }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Crd2>
          <Crd2>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12 }}>💰 Finanzas</div>
            {[
              { label: "Ingresos", value: fmt(totalIncome), color: t.green, bg: t.greenBg },
              { label: "Egresos", value: fmt(totalExpense), color: t.red, bg: t.redBg },
              { label: "Balance", value: fmt(totalIncome - totalExpense), color: totalIncome - totalExpense >= 0 ? t.green : t.red, bg: t.accentBg },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: 8, borderRadius: 8, background: r.bg, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: t.muted }}>{r.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: r.color }}>{r.value}</span>
              </div>
            ))}
            {companyData.bankAccounts.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid " + t.border }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.text, marginBottom: 6 }}>Cuentas bancarias</div>
                {companyData.bankAccounts.map((ba, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: t.muted }}>{ba.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{fmt(Number(ba.balance || 0))}</span>
                  </div>
                ))}
              </div>
            )}
          </Crd2>
          <Crd2 style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12 }}>📝 Notas internas</div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Notas sobre este cliente..." style={{ width: "100%", minHeight: 80, padding: 12, borderRadius: 8, border: "1px solid " + t.border, background: t.hover, color: t.text, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
            <button onClick={saveNote} style={{ marginTop: 8, padding: "8px 20px", borderRadius: 8, background: t.accent, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Guardar nota</button>
          </Crd2>
        </div>
      )}

      {tab === "users" && companyData && (
        <Crd2><Table headers={["Nombre", "Email", "Rol", "Creado"]} rows={companyData.users.map(u => [
          u.full_name || "—",
          u.email || (u.id ? u.id.substring(0, 8) + "..." : "—"),
          <span key="r" style={pill(t.accentBg, t.accentL)}>{u.role || "—"}</span>,
          u.created_at ? new Date(u.created_at).toLocaleDateString("es-AR") : "—"
        ])} /></Crd2>
      )}

      {tab === "clients" && companyData && (
        <Crd2><Table headers={["Nombre", "Tipo", "Teléfono", "Email", "Ciudad"]} rows={companyData.clients.map(c => [
          c.name,
          <span key="t" style={pill(c.type === "customer" || c.type === "client" ? t.greenBg : t.blueBg, c.type === "customer" || c.type === "client" ? t.green : t.blue)}>{c.type === "customer" || c.type === "client" ? "Cliente" : "Proveedor"}</span>,
          c.phone || "—", c.email || "—", c.city || "—"
        ])} /></Crd2>
      )}

      {tab === "projects" && companyData && (
        <Crd2><Table headers={["Nombre", "Cliente", "Estado", "Presupuesto", "Avance", "Deadline"]} rows={companyData.projects.map(p => [
          p.name,
          p.client_name || "—",
          statusPill(p.status),
          p.budget ? fmt(Number(p.budget)) : "—",
          <div key="prog" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 60, height: 6, borderRadius: 3, background: t.hover }}>
              <div style={{ width: (p.progress || 0) + "%", height: "100%", borderRadius: 3, background: (p.progress || 0) > 75 ? t.green : (p.progress || 0) > 40 ? t.orange : t.red }} />
            </div>
            <span style={{ fontSize: 11, color: t.muted }}>{p.progress || 0}%</span>
          </div>,
          p.deadline || "—"
        ])} /></Crd2>
      )}

      {tab === "transactions" && companyData && (
        <Crd2><Table headers={["Fecha", "Descripción", "Monto", "Contacto", "Proyecto", "Estado"]} rows={companyData.transactions.map(tx => [
          tx.date ? new Date(tx.date).toLocaleDateString("es-AR") : "—",
          tx.description || "—",
          <span key="a" style={{ fontWeight: 700, color: Number(tx.amount) >= 0 ? t.green : t.red }}>{fmt(Number(tx.amount))}</span>,
          tx.client_name || "—",
          tx.project_name || "—",
          statusPill(tx.status)
        ])} /></Crd2>
      )}

      {tab === "tasks" && companyData && (
        <Crd2><Table headers={["Tarea", "Proyecto", "Prioridad", "Asignado", "Vence", "Estado"]} rows={companyData.tasks.map(tk => [
          tk.title,
          tk.project_name || "—",
          <span key="p" style={pill(tk.priority === "high" ? t.redBg : tk.priority === "medium" ? t.orangeBg : t.greenBg, tk.priority === "high" ? t.red : tk.priority === "medium" ? t.orange : t.green)}>{tk.priority || "—"}</span>,
          tk.assignee || "—",
          tk.due_date || "—",
          statusPill(tk.status)
        ])} /></Crd2>
      )}

      {tab === "documents" && companyData && (
        <Crd2><Table headers={["Nombre", "Tipo", "Contacto", "Proyecto", "Estado", "Fuente", "Fecha", "Archivo"]} rows={companyData.documents.map(d => [
          d.name || "—",
          <span key="tp" style={pill(d.type === "invoice" ? t.orangeBg : t.blueBg, d.type === "invoice" ? t.orange : t.blue)}>{d.type || "otro"}</span>,
          d.client_name || "—",
          d.project_name || "—",
          statusPill(d.status),
          <span key="src" style={{ fontSize: 10, color: d.source === "whatsapp" ? "#25D366" : t.dim }}>{d.source || "web"}</span>,
          d.created_at ? new Date(d.created_at).toLocaleDateString("es-AR") : "—",
          d.file_url ? <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: t.accentL, textDecoration: "none", padding: "2px 8px", background: t.accentBg, borderRadius: 5 }}>Ver ↗</a> : <span style={{ fontSize: 10, color: t.dim }}>—</span>
        ])} /></Crd2>
      )}

      {tab === "payroll" && companyData && (
        <Crd2><Table headers={["Empleado", "Rol", "Período", "Básico", "Extras", "Bonif.", "Deduc.", "Total", "Estado"]} rows={companyData.payroll.map(p => [
          p.employee_name || "—",
          p.role || "—",
          p.period || "—",
          fmt(Number(p.base_salary || 0)),
          fmt(Number(p.overtime || 0)),
          fmt(Number(p.bonus || 0)),
          <span key="d" style={{ color: t.red }}>{fmt(Number(p.deductions || 0))}</span>,
          <span key="t" style={{ fontWeight: 700, color: t.text }}>{fmt(Number(p.total || 0))}</span>,
          statusPill(p.status)
        ])} /></Crd2>
      )}

      {tab === "whatsapp" && companyData && (
        <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 14 }}>
          <Crd2>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 10 }}>Usuarios WA</div>
            {companyData.waUsers.map(wu => (
              <div key={wu.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid " + t.border + "40" }}>
                <MessageSquare size={12} color="#25D366" />
                <div><div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{wu.name || "—"}</div><div style={{ fontSize: 10, color: t.dim }}>{wu.phone}</div></div>
                <span style={pill(wu.verified ? t.greenBg : t.redBg, wu.verified ? t.green : t.red)}>{wu.verified ? "✓" : "✗"}</span>
              </div>
            ))}
            {companyData.waUsers.length === 0 && <div style={{ fontSize: 11, color: t.dim }}>Sin usuarios vinculados</div>}
          </Crd2>
          <Crd2 style={{ maxHeight: 500, overflowY: "auto" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 10 }}>Mensajes recientes ({companyData.waMessages.length})</div>
            {companyData.waMessages.map(msg => (
              <div key={msg.id} style={{ marginBottom: 8, padding: 10, borderRadius: 8, background: msg.direction === "inbound" ? t.hover : t.accentBg, borderLeft: "3px solid " + (msg.direction === "inbound" ? t.blue : t.accent) }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: msg.direction === "inbound" ? t.blue : t.accentL }}>{msg.direction === "inbound" ? "📩 Usuario" : "🤖 IA"}</span>
                  <span style={{ fontSize: 10, color: t.dim }}>{new Date(msg.created_at).toLocaleString("es-AR")}</span>
                </div>
                <div style={{ fontSize: 12, color: t.text, lineHeight: 1.4, whiteSpace: "pre-wrap", maxHeight: 100, overflow: "auto" }}>{(msg.content || "—").substring(0, 400)}</div>
              </div>
            ))}
            {companyData.waMessages.length === 0 && <div style={{ fontSize: 11, color: t.dim }}>Sin mensajes</div>}
          </Crd2>
        </div>
      )}
    </div>
  );
}

function TeamPage({ t, user, profile }) {
  const { companyId, demoTeam } = useData();
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [invForm, setInvForm] = useState({ email: "", role: "employee", name: "", phone: "", channel: "whatsapp" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const roleLabels = { owner: "Dueño / Socio", admin: "Administrador", accountant: "Contador", pm: "Director de obra", employee: "Empleado" };
  const roleColors = { owner: t.accent, admin: "#A78BFA", accountant: t.blue, pm: t.orange, employee: t.green };

  const loadTeam = async () => {
    if (!companyId || companyId === "demo") {
      if (demoTeam) setMembers(demoTeam);
      return;
    }
    // Load profiles (without auth.users join which can fail due to RLS)
    const { data: m, error: mErr } = await supabase.from("user_profiles").select("*").eq("company_id", companyId);
    if (mErr) console.error("Load members error:", mErr.message);
    if (m) setMembers(m);
    const { data: inv } = await supabase.from("invitations").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    if (inv) setInvitations(inv);
  };

  useEffect(() => { loadTeam(); }, [companyId]);

  const sendInvite = async () => {
    setError(""); setSuccess("");
    if (!invForm.email.trim() || !invForm.email.includes("@")) { setError("Ingresá un email válido"); return; }
    if (invForm.channel === "whatsapp" && (!invForm.phone.trim() || invForm.phone.replace(/[^0-9+]/g, "").length < 8)) { setError("Ingresá un teléfono válido con código de país (+54...)"); return; }
    if (members.some(m => (m.email || m.full_name || "").toLowerCase() === invForm.email.toLowerCase())) { setError("Este email ya es miembro del equipo"); return; }
    if (invitations.some(i => i.email === invForm.email && i.status === "pending")) { setError("Ya hay una invitación pendiente para este email"); return; }
    setSending(true);
    try {
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const cleanPhone = invForm.phone ? invForm.phone.replace(/[^0-9+]/g, "") : "";

      const { data: comp } = await supabase.from("companies").select("name").eq("id", companyId).single();
      const companyName = comp?.name || "Tu empresa";

      const { error: dbErr } = await supabase.from("invitations").insert([{
        company_id: companyId,
        email: invForm.email.trim().toLowerCase(),
        role: invForm.role,
        invited_by: user?.id,
        phone: cleanPhone || null,
        name: invForm.name || null,
        invite_token: token,
      }]);
      if (dbErr) { setError(dbErr.message); setSending(false); return; }

      const appUrl = window.location.origin;
      const registerUrl = appUrl + "/?invite=" + token;
      const roleLabel = { admin: "Administrador", accountant: "Contador", pm: "Director de Obra", employee: "Empleado" }[invForm.role] || invForm.role;

      if (invForm.channel === "whatsapp") {
        const waMessage = [
          `🏗️ *Invitación a GestiónAI*`,
          ``,
          `Hola${invForm.name ? " " + invForm.name : ""} 👋`,
          ``,
          `*${companyName}* te invita a unirte a su plataforma de gestión.`,
          ``,
          `📋 Rol: *${roleLabel}*`,
          `📧 Registrate con: ${invForm.email.trim().toLowerCase()}`,
          ``,
          `👉 Link: ${registerUrl}`,
          ``,
          `Usá ese email para que la vinculación sea automática.`,
        ].join("\n");
        const waPhone = cleanPhone.replace("+", "");
        window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`, "_blank");
        setSuccess("✅ Se abrió WhatsApp con el mensaje. Si no se abrió, usá 'Copiar link' de la lista.");
      } else {
        // Email se envía automáticamente via trigger en la DB
        setSuccess("✅ Invitación enviada por email a " + invForm.email.trim().toLowerCase());
      }

      setInvForm({ email: "", role: "employee", name: "", phone: "", channel: invForm.channel });
      setShowInvite(false);
      await loadTeam();
    } catch (e) {
      setError("Error: " + e.message);
    }
    setSending(false);
  };

  const cancelInvite = async (id) => {
    if (!window.confirm("¿Cancelar esta invitación?")) return;
    await supabase.from("invitations").delete().eq("id", id);
    await loadTeam();
  };

  const changeMemberRole = async (memberId, newRole) => {
    await supabase.from("user_profiles").update({ role: newRole }).eq("id", memberId);
    await loadTeam();
  };

  const removeMember = async (memberId, email) => {
    if (!window.confirm("¿Eliminar a " + email + " del equipo? Ya no podrá acceder a los datos de la empresa.")) return;
    await supabase.from("user_profiles").update({ company_id: null }).eq("id", memberId);
    await loadTeam();
  };

  const myRole = profile?.role || "owner";
  const isOwner = myRole === "owner";

  return (
    <div style={{ padding: 24, overflowY: "auto", height: "calc(100vh - 54px)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>Equipo</div>
          <div style={{ fontSize: 12, color: t.muted }}>{members.length} miembros · {invitations.filter(i => i.status === "pending").length} invitaciones pendientes</div>
        </div>
        <button onClick={() => setShowInvite(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, " + t.accent + ", #A78BFA)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <UserPlus size={14} /> Invitar miembro
        </button>
      </div>

      {success && <div style={{ padding: "10px 14px", background: t.greenBg, border: "1px solid " + t.green + "25", borderRadius: 8, marginBottom: 14, fontSize: 12, color: t.green, display: "flex", justifyContent: "space-between", alignItems: "center" }}>{success}<span onClick={() => setSuccess("")} style={{ cursor: "pointer" }}>✕</span></div>}

      {/* Invite modal */}
      {showInvite && (
        <Crd t={t} style={{ padding: 20, marginBottom: 20, border: "1px solid " + t.accent + "30" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Invitar nuevo miembro</div>
            <span onClick={() => { setShowInvite(false); setError(""); }} style={{ cursor: "pointer", color: t.dim }}>✕</span>
          </div>
          {/* Channel selector */}
          <div style={{ display: "flex", gap: 0, marginBottom: 14, borderRadius: 8, overflow: "hidden", border: "1px solid " + t.border }}>
            {[{ id: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "#25D366" }, { id: "email", label: "Email", icon: Mail, color: t.accentL }].map(ch => {
              const active = invForm.channel === ch.id;
              const Icon = ch.icon;
              return (
                <button key={ch.id} onClick={() => setInvForm({ ...invForm, channel: ch.id })} style={{ flex: 1, padding: "10px 12px", background: active ? (ch.id === "whatsapp" ? "#25D36615" : t.accentBg) : t.hover, border: "none", color: active ? ch.color : t.dim, fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s" }}>
                  <Icon size={13} /> {ch.label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: t.muted, marginBottom: 14, padding: "8px 10px", background: t.hover, borderRadius: 6 }}>
            {invForm.channel === "whatsapp" 
              ? "Se abrirá WhatsApp con el mensaje listo para que lo envíes desde tu teléfono."
              : "Se envía un email automático con el link de registro al invitado."
            }
          </div>
          <div style={{ display: "grid", gridTemplateColumns: invForm.channel === "whatsapp" ? "1fr 1fr" : "1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: t.muted, marginBottom: 4 }}>Nombre del invitado</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 10px" }}>
                <Users size={13} color={t.dim} />
                <input value={invForm.name} onChange={e => setInvForm({ ...invForm, name: e.target.value })} placeholder="Juan Pérez" style={{ flex: 1, background: "transparent", border: "none", color: t.text, fontSize: 12, outline: "none" }} />
              </div>
            </div>
            {invForm.channel === "whatsapp" && (
              <div>
                <div style={{ fontSize: 11, color: t.muted, marginBottom: 4 }}>WhatsApp del invitado *</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 10px" }}>
                  <MessageSquare size={13} color="#25D366" />
                  <input value={invForm.phone} onChange={e => setInvForm({ ...invForm, phone: e.target.value })} placeholder="+54 9 11 5555 1234" style={{ flex: 1, background: "transparent", border: "none", color: t.text, fontSize: 12, outline: "none", fontFamily: "monospace" }} />
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: t.muted, marginBottom: 4 }}>Email del invitado *</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: t.hover, border: "1px solid " + t.border, borderRadius: 7, padding: "8px 10px" }}>
                <Mail size={13} color={t.dim} />
                <input value={invForm.email} onChange={e => setInvForm({ ...invForm, email: e.target.value })} placeholder="empleado@empresa.com" style={{ flex: 1, background: "transparent", border: "none", color: t.text, fontSize: 12, outline: "none" }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: t.muted, marginBottom: 4 }}>Rol asignado</div>
              <select value={invForm.role} onChange={e => setInvForm({ ...invForm, role: e.target.value })} style={{ width: "100%", padding: "8px 10px", background: t.hover, border: "1px solid " + t.border, borderRadius: 7, color: t.text, fontSize: 12 }}>
                {isOwner && <option value="admin">Administrador</option>}
                <option value="accountant">Contador</option>
                <option value="pm">Director de obra</option>
                <option value="employee">Empleado</option>
              </select>
            </div>
          </div>
          {/* Role description */}
          <div style={{ padding: "8px 10px", background: t.hover, borderRadius: 6, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: t.dim, marginBottom: 4 }}>Permisos del rol "{roleLabels[invForm.role]}":</div>
            <div style={{ fontSize: 11, color: t.muted }}>
              {invForm.role === "admin" && "Acceso completo: clientes, proyectos, tareas, finanzas, tesorería, documentos, reportes y equipo."}
              {invForm.role === "accountant" && "Acceso a: clientes, finanzas, documentos y reportes. Sin acceso a: proyectos, tareas, tesorería."}
              {invForm.role === "pm" && "Acceso a: proyectos, tareas y documentos. Sin acceso a: clientes, finanzas, tesorería, reportes."}
              {invForm.role === "employee" && "Acceso limitado a: proyectos y tareas asignadas. Sin acceso a: clientes, finanzas, documentos, reportes."}
            </div>
          </div>
          {error && <div style={{ padding: "8px 12px", background: t.redBg, border: "1px solid " + t.red + "25", borderRadius: 8, marginBottom: 12, fontSize: 12, color: t.red }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { setShowInvite(false); setError(""); }} style={{ padding: "8px 16px", borderRadius: 7, border: "1px solid " + t.border, background: t.hover, color: t.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
            <button onClick={sendInvite} disabled={sending} style={{ padding: "8px 20px", borderRadius: 7, border: "none", background: invForm.channel === "whatsapp" ? "linear-gradient(135deg, #25D366, #128C7E)" : "linear-gradient(135deg, " + t.accent + ", #A78BFA)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: sending ? "wait" : "pointer", opacity: sending ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
              {invForm.channel === "whatsapp" ? <MessageSquare size={12} /> : <Mail size={12} />}
              {sending ? "Enviando..." : invForm.channel === "whatsapp" ? "Invitar por WhatsApp" : "Enviar invitación por Email"}
            </button>
          </div>
        </Crd>
      )}

      {/* Members */}
      <Crd t={t} style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 14 }}>Miembros del equipo</div>
        {members.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: t.dim, fontSize: 12 }}>Sin miembros registrados</div>
        ) : members.map(m => {
          const name = m.full_name || "Usuario";
          const isMe = m.id === user?.id;
          const displayEmail = isMe ? user?.email : (invitations.find(i => i.status === "accepted" && i.role === m.role)?.email || "");
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid " + t.border + "20" }}>
              <Av name={name} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{name}</span>
                  {isMe && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: t.accentBg, color: t.accentL }}>Vos</span>}
                </div>
                {displayEmail && <div style={{ fontSize: 11, color: t.dim }}>{displayEmail}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  {m.phone_number ? (
                    <span style={{ fontSize: 10, color: t.muted, fontFamily: "monospace" }}>📱 {m.phone_number}</span>
                  ) : (
                    <span style={{ fontSize: 10, color: t.orange }}>⚠️ Sin teléfono (no recibirá recordatorios WA)</span>
                  )}
                  {isOwner && (
                    <span onClick={() => {
                      const phone = window.prompt("Teléfono de " + name + " (con código de país, ej: +5491155551234):", m.phone_number || "");
                      if (phone === null) return;
                      const clean = phone.replace(/[^0-9+]/g, "");
                      if (clean.length < 8 && clean.length > 0) { window.alert("Teléfono inválido"); return; }
                      supabase.from("user_profiles").update({ phone_number: clean || null }).eq("id", m.id).then(({ error }) => {
                        if (error) window.alert("Error: " + error.message);
                        else loadTeam();
                      });
                    }} style={{ fontSize: 9, color: t.accentL, cursor: "pointer", textDecoration: "underline" }}>
                      {m.phone_number ? "editar" : "agregar"}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isOwner && !isMe ? (
                  <select value={m.role} onChange={e => changeMemberRole(m.id, e.target.value)} style={{ padding: "4px 8px", background: t.hover, border: "1px solid " + t.border, borderRadius: 5, color: roleColors[m.role] || t.text, fontSize: 11, fontWeight: 600 }}>
                    <option value="admin">Admin</option>
                    <option value="accountant">Contador</option>
                    <option value="pm">Dir. obra</option>
                    <option value="employee">Empleado</option>
                  </select>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 600, color: roleColors[m.role] || t.muted, padding: "4px 8px", background: (roleColors[m.role] || t.muted) + "12", borderRadius: 5 }}>
                    {roleLabels[m.role] || m.role}
                  </span>
                )}
                {isOwner && !isMe && (
                  <button onClick={() => removeMember(m.id, name)} style={{ padding: "4px 8px", background: t.redBg, border: "1px solid " + t.red + "20", borderRadius: 5, color: t.red, fontSize: 10, cursor: "pointer" }}>Quitar</button>
                )}
              </div>
            </div>
          );
        })}
      </Crd>

      {/* Pending invitations */}
      <Crd t={t} style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 14 }}>Invitaciones pendientes</div>
        {invitations.filter(i => i.status === "pending").length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: t.dim, fontSize: 12 }}>Sin invitaciones pendientes</div>
        ) : invitations.filter(i => i.status === "pending").map(inv => (
          <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid " + t.border + "20" }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "#25D36612", border: "1px dashed #25D36640", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageSquare size={14} color="#25D366" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>{inv.name || inv.email}</div>
              <div style={{ fontSize: 10, color: t.dim }}>{inv.email}{inv.phone ? " · " + inv.phone : ""} · Enviado {new Date(inv.created_at).toLocaleDateString("es-AR")}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: roleColors[inv.role] || t.muted, padding: "4px 8px", background: (roleColors[inv.role] || t.muted) + "12", borderRadius: 5 }}>
              {roleLabels[inv.role] || inv.role}
            </span>
            {inv.invite_token && (
              <button onClick={() => { navigator.clipboard.writeText(window.location.origin + "/?invite=" + inv.invite_token); window.alert("Link copiado: " + window.location.origin + "/?invite=" + inv.invite_token); }} style={{ padding: "4px 8px", background: t.hover, border: "1px solid " + t.border, borderRadius: 5, color: t.accentL, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Link2 size={10} />Copiar link</button>
            )}
            <button onClick={() => cancelInvite(inv.id)} style={{ padding: "4px 8px", background: t.hover, border: "1px solid " + t.border, borderRadius: 5, color: t.red, fontSize: 10, cursor: "pointer" }}>Cancelar</button>
          </div>
        ))}
        {invitations.filter(i => i.status === "accepted").length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.dim, marginTop: 16, marginBottom: 8 }}>Invitaciones aceptadas</div>
            {invitations.filter(i => i.status === "accepted").map(inv => (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid " + t.border + "10" }}>
                <CheckCircle2 size={12} color={t.green} />
                <span style={{ fontSize: 11, color: t.muted }}>{inv.email}</span>
                <span style={{ fontSize: 10, color: t.dim }}>· {new Date(inv.created_at).toLocaleDateString("es-AR")}</span>
              </div>
            ))}
          </>
        )}
      </Crd>

      {/* Instructions */}
      <div style={{ marginTop: 20, padding: 16, background: t.hover, borderRadius: 10, border: "1px solid " + t.border }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 6 }}>¿Cómo funciona?</div>
        <div style={{ fontSize: 11, color: t.muted, lineHeight: 1.6 }}>
          1. Elegí cómo enviar: WhatsApp (se abre WA) o Email (se envía automáticamente).<br />
          2. Completá nombre, email y rol. Si elegís WhatsApp, agregá el teléfono.<br />
          3. El invitado recibe el mensaje con un link único de registro.<br />
          4. Se registra con el email indicado y queda en tu empresa automáticamente.
        </div>
      </div>
    </div>
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
  const [invitation, setInvitation] = useState(null); // {found, company_name, role}
  const [checkingInv, setCheckingInv] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const t = themes.dark;

  // Check for invite token in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (token) {
      setInviteToken(token);
      setIsLogin(false);
      // Resolve token to get invitation details
      (async () => {
        setCheckingInv(true);
        const { data } = await supabase.rpc("resolve_invite_token", { p_token: token });
        if (data?.found) {
          setInvitation(data);
          setEmail(data.email || "");
          setFullName(data.name || "");
        } else {
          setError("Este link de invitación no es válido o ya fue utilizado.");
        }
        setCheckingInv(false);
      })();
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const inputStyle = { display: "flex", alignItems: "center", gap: 8, background: t.hover, border: "1px solid " + t.border, borderRadius: 8, padding: "10px 12px" };
  const fieldStyle = { flex: 1, background: "transparent", border: "none", color: t.text, fontSize: 13, outline: "none", width: "100%" };
  const roleLabels = { admin: "Administrador", accountant: "Contador", pm: "Director de obra", employee: "Empleado", owner: "Dueño / Socio" };

  // Check if email has a pending invitation
  const checkInvitation = async (emailToCheck) => {
    if (!emailToCheck || !emailToCheck.includes("@")) { setInvitation(null); return; }
    setCheckingInv(true);
    const { data } = await supabase.rpc("check_invitation", { p_email: emailToCheck.trim().toLowerCase() });
    if (data?.found) {
      setInvitation(data);
    } else {
      setInvitation(null);
    }
    setCheckingInv(false);
  };

  const validateRegStep1 = () => {
    if (!email.trim() || !email.includes("@")) { setError("Ingresá un email válido"); return false; }
    if (!fullName.trim()) { setError("Ingresá tu nombre completo"); return false; }
    if (invitation?.found) { setError(""); return true; } // Skip company validation for invited users
    if (!company.trim()) { setError("Ingresá el nombre de tu empresa"); return false; }
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
          options: { data: { full_name: fullName || email.split("@")[0], company: invitation?.found ? invitation.company_name : company, phone, cuit, role: invitation?.found ? invitation.role : role } }
        });
        if (error) { setError(error.message); }
        else {
          if (data?.user) {
            if (invitation?.found) {
              // Accept invitation — join existing company
              await supabase.rpc("accept_invitation", {
                p_user_id: data.user.id,
                p_email: email.trim().toLowerCase(),
                p_full_name: fullName || email.split("@")[0],
              });
              window.alert("✅ Cuenta creada exitosamente.\n\nTe uniste a: " + invitation.company_name + "\nRol: " + (roleLabels[invitation.role] || invitation.role) + "\n\nYa podés iniciar sesión.");
            } else {
              // Create new company + profile
              await supabase.rpc("create_company_and_profile", {
                p_user_id: data.user.id,
                p_company_name: company,
                p_cuit: cuit || null,
                p_phone: phone || null,
                p_full_name: fullName,
                p_role: role,
              });
              window.alert("✅ Cuenta creada exitosamente.\n\nEmpresa: " + company + "\nUsuario: " + fullName + "\n\nYa podés iniciar sesión.");
            }
          }
          setIsLogin(true); setStep(1);
          setPass(""); setPass2("");
        }
      }
    } catch (e) { setError("Error de conexión"); }
    setLoading(false);
  };

  const switchMode = () => { setIsLogin(!isLogin); setError(""); setStep(1); setPass(""); setPass2(""); setInvitation(null); };

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
            <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>{isLogin ? "Iniciá sesión en tu cuenta" : step === 1 ? (invitation?.found ? "Te invitaron a " + invitation.company_name : "Paso 1 de 2 — Datos de tu empresa") : "Paso 2 de 2 — Datos de acceso"}</div>
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
                {/* Email first — for invitation detection */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: t.muted, marginBottom: 5 }}>Tu email *</div>
                  <div style={{ ...inputStyle, borderColor: invitation?.found ? t.green + "50" : t.border }}>
                    <Mail size={14} color={invitation?.found ? t.green : t.dim} />
                    <input value={email} onChange={e => setEmail(e.target.value)} onBlur={() => checkInvitation(email)} placeholder="tu@empresa.com" style={fieldStyle} />
                    {checkingInv && <div style={{ fontSize: 10, color: t.dim }}>...</div>}
                  </div>
                </div>

                {/* Invitation detected */}
                {invitation?.found && (
                  <div style={{ padding: "12px 14px", background: t.greenBg, border: "1px solid " + t.green + "25", borderRadius: 8, marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.green, marginBottom: 4 }}>¡Tenés una invitación!</div>
                    <div style={{ fontSize: 11, color: t.muted }}>Te invitaron a unirte a <b style={{ color: t.text }}>{invitation.company_name}</b> como <b style={{ color: t.text }}>{roleLabels[invitation.role] || invitation.role}</b>.</div>
                    <div style={{ fontSize: 10, color: t.dim, marginTop: 4 }}>Completá tu nombre y contraseña para unirte.</div>
                  </div>
                )}

                {/* Name — always shown */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: t.muted, marginBottom: 5 }}>Nombre completo *</div>
                  <div style={inputStyle}>
                    <Users size={14} color={t.dim} />
                    <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Juan Pérez" style={fieldStyle} />
                  </div>
                </div>

                {/* Company fields — only if NOT invited */}
                {!invitation?.found && (
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
                )}
              </>
            ) : (
              <>
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
                <div style={{ padding: "10px 12px", background: invitation?.found ? t.greenBg : t.hover, borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: t.muted, marginBottom: 4 }}>Resumen</div>
                  {invitation?.found ? (
                    <div style={{ fontSize: 12, color: t.text }}>Unirse a <b>{invitation.company_name}</b> · {fullName} · {roleLabels[invitation.role]}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: t.text }}><b>{company}</b> · {fullName} · {phone}</div>
                  )}
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
  // Detect invite token in URL before anything else
  const hasInviteToken = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("invite");
  const [view, setView] = useState(hasInviteToken ? "login" : "landing");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const loadProfile = async (userId) => {
    const { data } = await supabase.from("user_profiles").select("*, company:companies(name, wa_phone)").eq("id", userId).single();
    if (data) setProfile(data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id); }
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
        // After login/register, go to app (but not if we're showing invite registration)
        if (event === "SIGNED_IN") {
          const inviteParam = new URLSearchParams(window.location.search).has("invite");
          if (!inviteParam) setView("app");
        }
      } else {
        setUser(null); setProfile(null);
        setView("landing");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setView("landing");
  };

  if (!authReady) return <div style={{ minHeight: "100vh", background: "#0B0F1A", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", animation: "float 2s ease-in-out infinite" }}><Zap size={20} color="#fff" /></div></div>;

  if (view === "landing") return <Landing onEnter={() => setView("demo")} onLogin={() => { if (user) { setView("app"); } else { setView("login"); } }} isLoggedIn={!!user} />;
  if (view === "login") return <LoginPage onLogin={() => setView("app")} />;
  if (view === "demo") return (
    <DemoDataProvider>
      <AppContent user={{ email: "demo@gestionai.com", user_metadata: { full_name: "Usuario Demo" } }} profile={{ full_name: "Usuario Demo", role: "owner", company: { name: "Constructora Demo SA" } }} onLogout={() => setView("landing")} onRegister={() => setView("login")} isDemo={true} />
    </DemoDataProvider>
  );

  // view === "app"
  return (
    <DataProvider>
      <AppContent user={user} profile={profile} onLogout={handleLogout} isDemo={false} />
    </DataProvider>
  );
}
