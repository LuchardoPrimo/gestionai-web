// Telegram bot para Guanaco — gestión de proyectos UADE.
// Recibe webhooks de Telegram, consulta Supabase, llama a Claude y responde por Telegram.
// Además puede ejecutar acciones de escritura (crear tareas, proyectos, anotar).
//
// Variables de entorno requeridas (Supabase secrets):
//   - TELEGRAM_BOT_TOKEN
//   - ANTHROPIC_API_KEY
//   - SUPABASE_URL              (inyectada por la plataforma)
//   - SUPABASE_SERVICE_ROLE_KEY (inyectada por la plataforma)

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

console.log("telegram-bot env check:", {
  hasTelegramToken: !!TELEGRAM_BOT_TOKEN,
  hasAnthropicKey: !!ANTHROPIC_API_KEY,
  hasSupabaseUrl: !!SUPABASE_URL,
  hasServiceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
  supabaseUrl: SUPABASE_URL,
});

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

const NOTEPAD_REPORT_TYPE = "notepad";
const NOTEPAD_REPORT_NAME = "Anotador general";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ───────────────── Telegram helpers ─────────────────

async function sendTelegramMessage(chatId: number | string, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Fallback sin Markdown si el formato rompe (caracteres especiales).
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
  }
}

// Telegram limita a 4096 caracteres por mensaje.
function chunkForTelegram(text: string, max = 3800): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > max) {
    let cut = remaining.lastIndexOf("\n\n", max);
    if (cut < max / 2) cut = remaining.lastIndexOf("\n", max);
    if (cut < max / 2) cut = max;
    parts.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

// ───────────────── Carga de datos de Guanaco ─────────────────

type Snapshot = {
  sedes: any[];
  projects: any[];
  tasks: any[];
  documents: any[];
  notepad: string;
};

type Profile = {
  companyId: string;
  userId: string | null;
};

async function loadProfile(): Promise<Profile | null> {
  // Intento 1: user_profiles (hay un solo usuario en el sistema).
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, company_id")
    .limit(1)
    .maybeSingle();
  if (data?.company_id) {
    return { companyId: data.company_id, userId: data.id ?? null };
  }

  console.error("loadProfile: user_profiles falló o no devolvió company_id", {
    error,
    hasData: !!data,
    data,
  });

  // Fallback: sacar company_id del primer proyecto existente.
  const { data: proj, error: projErr } = await supabase
    .from("projects")
    .select("company_id")
    .limit(1)
    .maybeSingle();
  if (proj?.company_id) {
    // No tenemos userId acá, pero la mayoría de operaciones usa companyId.
    return { companyId: proj.company_id, userId: null };
  }

  console.error("loadProfile: fallback projects también falló", {
    error: projErr,
    data: proj,
  });

  return null;
}

async function loadSnapshot(companyId: string): Promise<Snapshot> {
  const [sedes, projects, tasks, documents, notepad] = await Promise.all([
    supabase.from("sedes").select("*").order("name"),
    supabase
      .from("projects")
      .select("*, sede:sedes(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*, project:projects(name, sede_id), sede:sedes(name)")
      .eq("company_id", companyId)
      .order("due_date"),
    supabase
      .from("documents")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ai_reports")
      .select("result")
      .eq("report_type", NOTEPAD_REPORT_TYPE)
      .maybeSingle(),
  ]);
  return {
    sedes: sedes.data ?? [],
    projects: projects.data ?? [],
    tasks: tasks.data ?? [],
    documents: documents.data ?? [],
    notepad: notepad.data?.result ?? "",
  };
}

// ───────────────── Resumen compacto para el prompt ─────────────────

const STATUS_LABEL: Record<string, string> = {
  todo: "Pendiente",
  in_progress: "En curso",
  waiting_response: "Esperando respuesta",
  pending_solution: "Pendiente solución",
  done: "Listo",
  planning: "Pendiente",
  completed: "Listo",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "alta",
  medium: "media",
  low: "baja",
};

const VALID_TASK_PRIORITIES = new Set(["high", "medium", "low"]);
const VALID_PROJECT_TYPES = new Set(["general", "obra", "mejora", "academico", "mri"]);

function daysOverdue(due: string | null): number | null {
  if (!due) return null;
  const d = new Date(due);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  return diff > 0 ? diff : null;
}

function htmlToPlain(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeName(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findSedeByName(snap: Snapshot, name: string): any | null {
  if (!name) return null;
  const target = normalizeName(name);
  if (!target) return null;
  return (
    snap.sedes.find((s) => normalizeName(s.name) === target) ??
    snap.sedes.find((s) => normalizeName(s.name).startsWith(target)) ??
    snap.sedes.find((s) => normalizeName(s.name).includes(target)) ??
    null
  );
}

function findProjectByName(
  snap: Snapshot,
  name: string,
  sedeId?: string | null,
): any | null {
  if (!name) return null;
  const target = normalizeName(name);
  if (!target) return null;
  const pool = sedeId ? snap.projects.filter((p) => p.sede_id === sedeId) : snap.projects;
  return (
    pool.find((p) => normalizeName(p.name) === target) ??
    pool.find((p) => normalizeName(p.name).startsWith(target)) ??
    pool.find((p) => normalizeName(p.name).includes(target)) ??
    null
  );
}

function buildContext(snap: Snapshot): string {
  const lines: string[] = [];
  lines.push("# Estado actual de Guanaco");
  lines.push("");

  // Sedes (con anotador por sede en el campo `notes`)
  lines.push("## Sedes");
  if (!snap.sedes.length) lines.push("(sin sedes)");
  for (const s of snap.sedes) {
    const sedeProjects = snap.projects.filter((p) => p.sede_id === s.id);
    const sedeTasks = snap.tasks.filter(
      (t) => t.sede_id === s.id || sedeProjects.some((p) => p.id === t.project_id),
    );
    const pendientes = sedeTasks.filter((t) => t.status !== "done");
    const vencidas = pendientes.filter((t) => daysOverdue(t.due_date) !== null);
    lines.push(
      `- *${s.name}* — ${sedeProjects.length} proyectos, ${pendientes.length} tareas pendientes, ${vencidas.length} vencidas`,
    );
    const notes = htmlToPlain(s.notes);
    if (notes) {
      lines.push(`  anotador sede: ${notes.slice(0, 500)}${notes.length > 500 ? "…" : ""}`);
    }
  }
  lines.push("");

  // Anotador general (ai_reports.result con report_type='notepad')
  lines.push("## Anotador general");
  const notepadText = htmlToPlain(snap.notepad);
  if (notepadText) {
    lines.push(notepadText.slice(0, 2000) + (notepadText.length > 2000 ? "…" : ""));
  } else {
    lines.push("(anotador vacío)");
  }
  lines.push("");

  // Proyectos
  lines.push("## Proyectos");
  if (!snap.projects.length) lines.push("(sin proyectos)");
  for (const p of snap.projects) {
    const st = STATUS_LABEL[p.status] ?? p.status ?? "—";
    const sede = p.sede?.name ?? "sin sede";
    const dl = p.deadline ? ` · vence ${p.deadline}` : "";
    lines.push(`- *${p.name}* [${sede}] — ${st}${dl}`);
    if (p.description) {
      const d = htmlToPlain(p.description);
      if (d) lines.push(`  ${d.slice(0, 200)}${d.length > 200 ? "…" : ""}`);
    }
  }
  lines.push("");

  // Tareas pendientes (no done)
  lines.push("## Tareas pendientes");
  const pendingTasks = snap.tasks.filter((t) => t.status !== "done");
  if (!pendingTasks.length) lines.push("(sin tareas pendientes)");
  for (const t of pendingTasks) {
    const st = STATUS_LABEL[t.status] ?? t.status ?? "—";
    const pri = PRIORITY_LABEL[t.priority] ?? t.priority ?? "—";
    const sede = t.sede?.name ?? "sin sede";
    const proj = t.project?.name ?? "sin proyecto";
    const od = daysOverdue(t.due_date);
    const dueInfo = t.due_date
      ? od
        ? ` · VENCIDA hace ${od}d (${t.due_date})`
        : ` · vence ${t.due_date}`
      : "";
    lines.push(`- ${t.title} [${sede} / ${proj}] — ${st} · prio ${pri}${dueInfo}`);
  }
  lines.push("");

  // Documentos
  lines.push("## Documentos");
  if (!snap.documents.length) lines.push("(sin documentos)");
  for (const d of snap.documents.slice(0, 60)) {
    const proj = snap.projects.find((p) => p.id === d.project_id);
    const projName = proj?.name ?? "sin proyecto";
    const sede = snap.sedes.find((s) => s.id === d.sede_id);
    const sedeName = sede?.name ?? proj?.sede?.name ?? "sin sede";
    lines.push(`- ${d.name} (${d.type}) [${sedeName} / ${projName}]`);
  }

  return lines.join("\n");
}

// ───────────────── Claude API ─────────────────

const SYSTEM_PROMPT = `Sos el asistente del bot de Telegram de *Guanaco*, una app de gestión de proyectos multi-sede de UADE (Universidad Argentina de la Empresa). El usuario te consulta por Telegram para saber el estado o pedirte que crees cosas.

Reglas de respuesta:
- Español argentino (voseo: "tenés", "fijate", "mirá", "anotá"). Términos: "sede", "tarea", "proyecto", "pendiente", "vencida".
- Respondé SOLO lo que te preguntan o piden. Nada de volcar el contexto entero.
- Formato Telegram Markdown: *negrita* con un asterisco, _itálica_ con guión bajo. Usá emojis con moderación (📍 sede, 📋 proyecto, ✅ listo, ⏳ pendiente, ⚠️ vencida, 📄 documento, 📝 anotador).
- Respuestas cortas y directas. Si la respuesta es una lista, usá bullets (• o -). Evitá párrafos largos.
- Si el usuario saluda ("hola", "buenas") respondé un saludo breve. Si agradece o cierra, respondé corto.
- Si no hay datos relevantes, decilo claro ("no encontré tareas vencidas").
- Para "panorama general" / "resumen": 1-2 líneas por sede con números clave, no detalle de cada tarea.
- Fechas en formato dd/mm o "hace N días". Nada de timestamps crudos.

Acciones de escritura:
Podés ejecutar acciones cuando el usuario te lo pida explícitamente. Las acciones disponibles son:
- create_task: crear una tarea (campos: sede, project opcional, title, priority opcional: high|medium|low — default medium)
- create_project: crear un proyecto (campos: sede, name, type opcional: general|obra|mejora|academico|mri — default general)
- append_notepad: agregar texto al anotador general (campo: text)
- append_sede_notes: agregar texto al anotador de una sede (campos: sede, text)

Cuando el usuario pida una acción, respondé en lenguaje natural confirmando lo que vas a hacer Y AL FINAL del mensaje incluí un bloque exactamente con este formato (sin tildes en los marcadores, sin code fences):

___ACTIONS___
[{"action":"create_task","sede":"Belgrano","project":"Humedad 3er Piso","title":"Revisar presupuesto","priority":"medium"},
{"action":"create_project","sede":"Recoleta","name":"Pintura exterior","type":"obra"},
{"action":"append_notepad","text":"Llamar a proveedor el lunes"},
{"action":"append_sede_notes","sede":"Costa","text":"Revisar instalacion electrica"}]
___END___

Reglas para el bloque de acciones:
- El JSON debe ser un array válido. Usá comillas dobles. Nada de comentarios.
- Solo incluí el bloque si el usuario pidió crear/anotar algo. Para preguntas de consulta NO incluyas el bloque.
- Los nombres de sede y proyecto deben coincidir con los que aparecen en el contexto. Si no estás seguro, preguntale al usuario en vez de inventar.
- Si el usuario no especifica prioridad para una tarea, no la incluyas (se usa "medium" por default).
- El campo "project" es opcional en create_task — solo poné uno si el usuario nombró el proyecto.`;

async function askClaude(question: string, context: string): Promise<string> {
  const userMessage = `Datos actuales de Guanaco:\n\n${context}\n\n---\n\nMensaje del usuario:\n${question}`;

  const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Claude API error:", res.status, errText);
    return "⚠️ No pude conectarme con el asistente. Probá de nuevo en un rato.";
  }

  const data = await res.json();
  const text =
    data?.content?.find?.((c: any) => c.type === "text")?.text ??
    data?.content?.[0]?.text ??
    "";
  return text.trim() || "No tengo una respuesta para eso.";
}

// ───────────────── Parseo y ejecución de acciones ─────────────────

type ParsedActions = { cleanText: string; actions: any[] };

function parseActions(reply: string): ParsedActions {
  const match = reply.match(/___ACTIONS___([\s\S]*?)___END___/);
  if (!match) return { cleanText: reply.trim(), actions: [] };
  const raw = match[1].trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let actions: any[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) actions = parsed;
  } catch (err) {
    console.error("parseActions: JSON inválido en bloque ACTIONS", { raw, err });
  }
  const cleanText = reply.replace(/___ACTIONS___[\s\S]*?___END___/, "").trim();
  return { cleanText, actions };
}

type ActionResult = { ok: boolean; message: string };

async function executeCreateTask(
  action: any,
  snap: Snapshot,
  companyId: string,
): Promise<ActionResult> {
  const title: string = (action.title ?? "").toString().trim();
  if (!title) return { ok: false, message: "tarea sin título" };

  const sede = action.sede ? findSedeByName(snap, action.sede) : null;
  if (action.sede && !sede) {
    return { ok: false, message: `no encontré la sede "${action.sede}"` };
  }

  let projectId: string | null = null;
  if (action.project) {
    const proj = findProjectByName(snap, action.project, sede?.id);
    if (!proj) return { ok: false, message: `no encontré el proyecto "${action.project}"` };
    projectId = proj.id;
  }

  const priority = VALID_TASK_PRIORITIES.has(action.priority) ? action.priority : "medium";

  const { error } = await supabase.from("tasks").insert({
    company_id: companyId,
    sede_id: sede?.id ?? null,
    project_id: projectId,
    title,
    status: "todo",
    priority,
  });
  if (error) {
    console.error("create_task insert error:", error);
    return { ok: false, message: `no pude crear la tarea (${error.message})` };
  }
  return { ok: true, message: `tarea "${title}" creada${sede ? " en " + sede.name : ""}` };
}

async function executeCreateProject(
  action: any,
  snap: Snapshot,
  companyId: string,
): Promise<ActionResult> {
  const name: string = (action.name ?? "").toString().trim();
  if (!name) return { ok: false, message: "proyecto sin nombre" };

  const sede = action.sede ? findSedeByName(snap, action.sede) : null;
  if (action.sede && !sede) {
    return { ok: false, message: `no encontré la sede "${action.sede}"` };
  }

  const type = VALID_PROJECT_TYPES.has(action.type) ? action.type : "general";

  const { error } = await supabase.from("projects").insert({
    company_id: companyId,
    sede_id: sede?.id ?? null,
    name,
    type,
    status: "todo",
  });
  if (error) {
    console.error("create_project insert error:", error);
    return { ok: false, message: `no pude crear el proyecto (${error.message})` };
  }
  return { ok: true, message: `proyecto "${name}" creado${sede ? " en " + sede.name : ""}` };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function executeAppendNotepad(
  action: any,
  userId: string | null,
): Promise<ActionResult> {
  const text: string = (action.text ?? "").toString().trim();
  if (!text) return { ok: false, message: "texto vacío para el anotador" };

  // Buscar registro existente (filtramos solo por report_type porque hay un solo usuario).
  const { data: existing, error: selErr } = await supabase
    .from("ai_reports")
    .select("id, result")
    .eq("report_type", NOTEPAD_REPORT_TYPE)
    .maybeSingle();
  if (selErr) {
    console.error("append_notepad select error:", selErr);
    return { ok: false, message: "no pude leer el anotador" };
  }

  const prefix = (existing?.result || "").trim();
  const newBlock = `<div>${escapeHtml(text)}</div>`;
  const newResult = prefix ? `${prefix}${newBlock}` : newBlock;

  if (existing?.id) {
    const { error } = await supabase
      .from("ai_reports")
      .update({ result: newResult, name: NOTEPAD_REPORT_NAME })
      .eq("id", existing.id);
    if (error) {
      console.error("append_notepad update error:", error);
      return { ok: false, message: `no pude actualizar el anotador (${error.message})` };
    }
  } else {
    if (!userId) {
      console.error("append_notepad: no hay userId para insertar fila nueva");
      return { ok: false, message: "no pude crear el anotador (falta user_id)" };
    }
    const { error } = await supabase.from("ai_reports").insert({
      user_id: userId,
      name: NOTEPAD_REPORT_NAME,
      report_type: NOTEPAD_REPORT_TYPE,
      result: newResult,
    });
    if (error) {
      console.error("append_notepad insert error:", error);
      return { ok: false, message: `no pude crear el anotador (${error.message})` };
    }
  }
  return { ok: true, message: "anotado en el anotador general" };
}

async function executeAppendSedeNotes(action: any, snap: Snapshot): Promise<ActionResult> {
  const text: string = (action.text ?? "").toString().trim();
  if (!text) return { ok: false, message: "texto vacío para el anotador de sede" };

  const sede = findSedeByName(snap, action.sede);
  if (!sede) return { ok: false, message: `no encontré la sede "${action.sede}"` };

  const prev: string = (sede.notes || "").trim();
  const newNotes = prev ? `${prev}\n\n${text}` : text;

  const { error } = await supabase.from("sedes").update({ notes: newNotes }).eq("id", sede.id);
  if (error) {
    console.error("append_sede_notes update error:", error);
    return { ok: false, message: `no pude actualizar el anotador de ${sede.name} (${error.message})` };
  }
  return { ok: true, message: `anotado en ${sede.name}` };
}

async function executeActions(
  actions: any[],
  snap: Snapshot,
  companyId: string,
  userId: string | null,
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  for (const action of actions) {
    if (!action || typeof action !== "object") {
      results.push({ ok: false, message: "acción inválida" });
      continue;
    }
    try {
      switch (action.action) {
        case "create_task":
          results.push(await executeCreateTask(action, snap, companyId));
          break;
        case "create_project":
          results.push(await executeCreateProject(action, snap, companyId));
          break;
        case "append_notepad":
          results.push(await executeAppendNotepad(action, userId));
          break;
        case "append_sede_notes":
          results.push(await executeAppendSedeNotes(action, snap));
          break;
        default:
          results.push({ ok: false, message: `acción desconocida: ${action.action}` });
      }
    } catch (err) {
      console.error("executeActions: error en", action, err);
      results.push({ ok: false, message: "error ejecutando acción" });
    }
  }
  return results;
}

function formatActionFooter(results: ActionResult[]): string {
  if (!results.length) return "";
  const failures = results.filter((r) => !r.ok);
  if (!failures.length) return ""; // Claude ya confirmó en lenguaje natural.
  return "\n\n⚠️ " + failures.map((r) => r.message).join(" · ");
}

// ───────────────── Webhook handler ─────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("ok", { status: 200 });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const message = update?.message ?? update?.edited_message;
  const chatId = message?.chat?.id;
  const text: string = (message?.text ?? "").toString().trim();

  if (!chatId || !text) {
    return new Response("ok", { status: 200 });
  }

  // Comando /start: bienvenida corta.
  if (text === "/start") {
    await sendTelegramMessage(
      chatId,
      "👋 Hola, soy el bot de *Guanaco*.\nPreguntame por sedes, proyectos, tareas o documentos — o pedime que cree tareas, proyectos y anote cosas.",
    );
    return new Response("ok", { status: 200 });
  }

  try {
    const profile = await loadProfile();
    if (!profile) {
      await sendTelegramMessage(chatId, "⚠️ No encontré el perfil de la empresa.");
      return new Response("ok", { status: 200 });
    }

    const snap = await loadSnapshot(profile.companyId);
    const context = buildContext(snap);
    const reply = await askClaude(text, context);

    const { cleanText, actions } = parseActions(reply);
    const results = actions.length
      ? await executeActions(actions, snap, profile.companyId, profile.userId)
      : [];

    const finalText = (cleanText + formatActionFooter(results)).trim() || "Listo.";

    for (const part of chunkForTelegram(finalText)) {
      await sendTelegramMessage(chatId, part);
    }
  } catch (err) {
    console.error("handler error:", err);
    await sendTelegramMessage(chatId, "⚠️ Ups, algo falló procesando tu pregunta.");
  }

  return new Response("ok", { status: 200 });
});
