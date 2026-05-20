import { useState, useEffect, useRef, createContext, useContext } from "react";
import { supabase } from "../lib/supabase";
import { NOTEPAD_REPORT_TYPE, NOTEPAD_REPORT_NAME } from "../lib/notepad.js";

const DataCtx = createContext({});
export const useData = () => useContext(DataCtx);

export function DataProvider({ children, userId }) {
  const [companyId, setCompanyId] = useState(null);
  const [sedes, setSedes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notepadHtml, setNotepadHtml] = useState("");
  const [notepadLoaded, setNotepadLoaded] = useState(false);
  const notepadReportIdRef = useRef(null);
  const notepadQueueRef = useRef(Promise.resolve());

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    let cId = companyId;
    if (!cId) {
      const { data: profile } = await supabase.from("user_profiles").select("company_id").eq("id", userId).single();
      cId = profile?.company_id || null;
      setCompanyId(cId);
    }
    if (!cId) { setLoading(false); return; }

    const [se, pr, ta, doc, tx, notif, rep, np] = await Promise.all([
      supabase.from("sedes").select("*").eq("user_id", userId).order("name"),
      supabase.from("projects").select("*, sede:sedes(name, color, icon)").eq("company_id", cId).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*, project:projects(name, sede_id), sede:sedes(name)").eq("company_id", cId).order("due_date"),
      supabase.from("documents").select("*").eq("company_id", cId).order("created_at", { ascending: false }).limit(100),
      supabase.from("transactions").select("*, contact:clients(name), project:projects(name)").eq("company_id", cId).order("date", { ascending: false }).limit(100),
      supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("ai_reports").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("ai_reports").select("id, result").eq("user_id", userId).eq("report_type", NOTEPAD_REPORT_TYPE).maybeSingle(),
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
    notepadReportIdRef.current = np?.data?.id || null;
    setNotepadHtml(np?.data?.result || "");
    setNotepadLoaded(true);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  // ─── Optimistic update helpers ───
  // Cada uno devuelve una función de rollback para revertir si Supabase falla.
  // El patch usa los nombres de columnas de la DB (status, priority, due_date, etc.);
  // se mapean a los campos del shape local (st, pri, due, ...).

  const mapTaskPatch = (dbPatch) => {
    const m = {};
    if ("status" in dbPatch) m.st = dbPatch.status;
    if ("priority" in dbPatch) m.pri = dbPatch.priority;
    if ("due_date" in dbPatch) m.due = dbPatch.due_date;
    if ("title" in dbPatch) m.title = dbPatch.title;
    if ("project_id" in dbPatch) m.project_id = dbPatch.project_id;
    if ("sede_id" in dbPatch) m.sede_id = dbPatch.sede_id;
    if ("tags" in dbPatch) m.tags = dbPatch.tags;
    return m;
  };

  const patchTaskLocal = (id, dbPatch) => {
    const mapped = mapTaskPatch(dbPatch);
    let prev = null;
    setTasks(curr => curr.map(t => {
      if (t.id !== id) return t;
      prev = t;
      return { ...t, ...mapped, raw: { ...t.raw, ...dbPatch } };
    }));
    return () => { if (prev) setTasks(curr => curr.map(t => t.id === id ? prev : t)); };
  };

  const removeTaskLocal = (id) => {
    let prev = null;
    let prevIdx = -1;
    setTasks(curr => {
      prevIdx = curr.findIndex(t => t.id === id);
      if (prevIdx < 0) return curr;
      prev = curr[prevIdx];
      return curr.filter(t => t.id !== id);
    });
    return () => {
      if (prev) setTasks(curr => {
        if (curr.some(t => t.id === prev.id)) return curr;
        const next = curr.slice();
        next.splice(Math.min(prevIdx, next.length), 0, prev);
        return next;
      });
    };
  };

  const patchProjectLocal = (id, dbPatch) => {
    let prev = null;
    setProjects(curr => curr.map(p => {
      if (p.id !== id) return p;
      prev = p;
      return { ...p, ...dbPatch };
    }));
    return () => { if (prev) setProjects(curr => curr.map(p => p.id === id ? prev : p)); };
  };

  const removeProjectLocal = (id) => {
    let prev = null;
    let prevIdx = -1;
    setProjects(curr => {
      prevIdx = curr.findIndex(p => p.id === id);
      if (prevIdx < 0) return curr;
      prev = curr[prevIdx];
      return curr.filter(p => p.id !== id);
    });
    return () => {
      if (prev) setProjects(curr => {
        if (curr.some(p => p.id === prev.id)) return curr;
        const next = curr.slice();
        next.splice(Math.min(prevIdx, next.length), 0, prev);
        return next;
      });
    };
  };

  const patchSedeLocal = (id, dbPatch) => {
    let prev = null;
    setSedes(curr => curr.map(s => {
      if (s.id !== id) return s;
      prev = s;
      return { ...s, ...dbPatch };
    }));
    return () => { if (prev) setSedes(curr => curr.map(s => s.id === id ? prev : s)); };
  };

  // Save serializado para evitar inserts duplicados ante saves concurrentes.
  const saveNotepad = (html) => {
    if (!userId) return Promise.resolve();
    setNotepadHtml(html);
    const job = notepadQueueRef.current.then(async () => {
      if (!notepadReportIdRef.current) {
        const existing = await supabase
          .from("ai_reports")
          .select("id")
          .eq("user_id", userId)
          .eq("report_type", NOTEPAD_REPORT_TYPE)
          .maybeSingle();
        if (existing.data?.id) notepadReportIdRef.current = existing.data.id;
      }
      if (notepadReportIdRef.current) {
        const { error } = await supabase
          .from("ai_reports")
          .update({ result: html, name: NOTEPAD_REPORT_NAME })
          .eq("id", notepadReportIdRef.current);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("ai_reports")
          .insert({
            user_id: userId,
            name: NOTEPAD_REPORT_NAME,
            report_type: NOTEPAD_REPORT_TYPE,
            result: html,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (data?.id) notepadReportIdRef.current = data.id;
      }
    });
    notepadQueueRef.current = job.catch(() => {});
    return job;
  };

  return (
    <DataCtx.Provider value={{ sedes, projects, tasks, documents, transactions, notifications, reports, loading, reload: load, userId, companyId, notepadHtml, notepadLoaded, saveNotepad, patchTaskLocal, removeTaskLocal, patchProjectLocal, removeProjectLocal, patchSedeLocal }}>
      {children}
    </DataCtx.Provider>
  );
}
