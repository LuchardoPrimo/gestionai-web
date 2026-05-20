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

// ───────────────── Adjuntos de Telegram ─────────────────

const TG_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/`;
const TG_FILE_API = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/`;
const MAX_TG_FILE_BYTES = 20 * 1024 * 1024; // Telegram bot API limita getFile a 20 MB.

type AttachedFile = {
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

function extractAttachment(message: any): AttachedFile | null {
  if (message?.document) {
    const d = message.document;
    return {
      fileId: d.file_id,
      fileName: d.file_name || `documento_${Date.now()}.bin`,
      mimeType: d.mime_type || "application/octet-stream",
      fileSize: d.file_size || 0,
    };
  }
  if (message?.photo && Array.isArray(message.photo) && message.photo.length) {
    const p = message.photo[message.photo.length - 1]; // la última es la de mayor resolución.
    return {
      fileId: p.file_id,
      fileName: `foto_${Date.now()}.jpg`,
      mimeType: "image/jpeg",
      fileSize: p.file_size || 0,
    };
  }
  if (message?.video) {
    const v = message.video;
    return {
      fileId: v.file_id,
      fileName: v.file_name || `video_${Date.now()}.mp4`,
      mimeType: v.mime_type || "video/mp4",
      fileSize: v.file_size || 0,
    };
  }
  return null;
}

async function downloadTelegramFile(fileId: string): Promise<ArrayBuffer | null> {
  const meta = await fetch(`${TG_API}getFile?file_id=${encodeURIComponent(fileId)}`).then((r) =>
    r.json(),
  );
  const filePath = meta?.result?.file_path;
  if (!filePath) {
    console.error("downloadTelegramFile: getFile sin file_path", meta);
    return null;
  }
  const res = await fetch(`${TG_FILE_API}${filePath}`);
  if (!res.ok) {
    console.error("downloadTelegramFile: descarga fallida", res.status);
    return null;
  }
  return await res.arrayBuffer();
}

function sanitizeStorageName(name: string): string {
  return (name || "archivo")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 180);
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "—";
  return bytes > 1048576
    ? (bytes / 1048576).toFixed(1) + " MB"
    : Math.round(bytes / 1024) + " KB";
}

function classifyFileType(name: string, mime: string): "pdf" | "excel" | "document" | "other" {
  const n = (name || "").toLowerCase();
  const m = (mime || "").toLowerCase();
  if (n.endsWith(".pdf") || m === "application/pdf") return "pdf";
  if (n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".csv") || m.includes("spreadsheet") || m.includes("excel"))
    return "excel";
  if (n.endsWith(".doc") || n.endsWith(".docx") || m.includes("wordprocessing") || m.includes("msword"))
    return "document";
  return "other";
}

// Busca el ítem (sede/proyecto/tarea) cuyo nombre aparece dentro de la caption.
// Gana el match más largo para evitar que "obra" pise a "obra exterior".
function findLongestMatch<T>(items: T[], caption: string, keyField: keyof T, minLen = 3): T | null {
  const normCaption = normalizeName(caption);
  if (!normCaption) return null;
  let best: T | null = null;
  let bestLen = 0;
  for (const item of items) {
    const raw = (item[keyField] as unknown as string) || "";
    if (raw.length < minLen) continue;
    const nk = normalizeName(raw);
    if (nk && normCaption.includes(nk) && nk.length > bestLen) {
      best = item;
      bestLen = nk.length;
    }
  }
  return best;
}

async function handleFileUpload(
  message: any,
  attachment: AttachedFile,
  snap: Snapshot,
  companyId: string,
): Promise<string> {
  if (attachment.fileSize && attachment.fileSize > MAX_TG_FILE_BYTES) {
    return "⚠️ Ese archivo supera el límite de 20 MB del bot. Subilo desde la web.";
  }

  const buf = await downloadTelegramFile(attachment.fileId);
  if (!buf) return "⚠️ No pude descargar el archivo de Telegram.";

  const safeName = sanitizeStorageName(attachment.fileName);
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`;

  const { error: upErr } = await supabase.storage.from("documents").upload(path, buf, {
    contentType: attachment.mimeType,
    upsert: false,
  });
  if (upErr) {
    console.error("storage upload error:", upErr);
    return `⚠️ No pude subir el archivo (${upErr.message}).`;
  }

  const { data: pubData } = supabase.storage.from("documents").getPublicUrl(path);
  const fileUrl = pubData?.publicUrl || null;
  const fileType = classifyFileType(attachment.fileName, attachment.mimeType);
  const sizeLabel = formatFileSize(attachment.fileSize);

  const caption: string = (message.caption ?? "").toString().trim();
  let matchedTask: any = null;
  let matchedProject: any = null;
  let matchedSede: any = null;

  if (caption) {
    matchedTask = findLongestMatch(snap.tasks, caption, "title");
    matchedProject = findLongestMatch(snap.projects, caption, "name");
    matchedSede = findLongestMatch(snap.sedes, caption, "name");

    // Si pegó una tarea, el proyecto/sede vienen de ella.
    if (matchedTask) {
      if (matchedTask.project_id && !matchedProject) {
        matchedProject = snap.projects.find((p) => p.id === matchedTask.project_id) || null;
      }
      if (matchedTask.sede_id && !matchedSede) {
        matchedSede = snap.sedes.find((s) => s.id === matchedTask.sede_id) || null;
      }
    } else if (matchedProject && !matchedSede && matchedProject.sede_id) {
      matchedSede = snap.sedes.find((s) => s.id === matchedProject.sede_id) || null;
    }
  }

  const { error: insErr } = await supabase.from("documents").insert({
    company_id: companyId,
    name: attachment.fileName,
    type: fileType,
    file_url: fileUrl,
    status: "pending",
    source: "telegram",
    size: sizeLabel,
    project_id: matchedProject?.id ?? null,
    sede_id: matchedSede?.id ?? null,
  });
  if (insErr) {
    console.error("documents insert error:", insErr);
    return `⚠️ Archivo subido pero no pude registrarlo (${insErr.message}).`;
  }

  // Si la caption mencionó una tarea, dejamos el link adjunto en sus notas.
  if (matchedTask && fileUrl) {
    const prev = (matchedTask.notes || "").toString().trim();
    const newLine = `📎 ${attachment.fileName}: ${fileUrl}`;
    const newNotes = prev ? `${prev}\n${newLine}` : newLine;
    await supabase.from("tasks").update({ notes: newNotes }).eq("id", matchedTask.id);
  }

  const lines: string[] = [`📎 *${attachment.fileName}* subido (${sizeLabel})`];
  if (matchedSede) lines.push(`📍 Sede: ${matchedSede.name}`);
  if (matchedProject) lines.push(`📋 Proyecto: ${matchedProject.name}`);
  if (matchedTask) lines.push(`📝 Tarea: ${matchedTask.title}`);
  if (!matchedSede && !matchedProject && !matchedTask) {
    lines.push("_Sin vincular — agregalo a un proyecto desde la web o reenvialo con caption._");
  }
  return lines.join("\n");
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
const VALID_TASK_STATUSES = new Set(["todo", "in_progress", "waiting_response", "pending_solution", "done"]);
const VALID_PROJECT_STATUSES = new Set(["planning", "in_progress", "completed"]);

function normalizeTaskStatus(raw: string): string | null {
  const s = (raw ?? "").toString().trim().toLowerCase();
  if (!s) return null;
  const map: Record<string, string> = {
    todo: "todo",
    pendiente: "todo",
    pendientes: "todo",
    "en curso": "in_progress",
    enprogreso: "in_progress",
    "en progreso": "in_progress",
    "waiting_response": "waiting_response",
    "esperando respuesta": "waiting_response",
    "pendiente response": "waiting_response",
    pending_solution: "pending_solution",
    "pendiente solución": "pending_solution",
    "pendiente solucion": "pending_solution",
    done: "done",
    listo: "done",
    terminado: "done",
    completado: "done",
  };
  return map[s] ?? (VALID_TASK_STATUSES.has(s) ? s : null);
}

function normalizeProjectStatus(raw: string): string | null {
  const s = (raw ?? "").toString().trim().toLowerCase();
  if (!s) return null;
  const map: Record<string, string> = {
    planning: "planning",
    planeado: "planning",
    pendiente: "planning",
    todo: "planning",
    "en curso": "in_progress",
    enprogreso: "in_progress",
    "en progreso": "in_progress",
    completed: "completed",
    terminado: "completed",
    listo: "completed",
    finalizado: "completed",
    done: "completed",
  };
  return map[s] ?? (VALID_PROJECT_STATUSES.has(s) ? s : null);
}

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

function findTaskByName(
  snap: Snapshot,
  name: string,
  projectId?: string | null,
  sedeId?: string | null,
): any | null {
  if (!name) return null;
  const target = normalizeName(name);
  if (!target) return null;
  let pool = snap.tasks;
  if (projectId) pool = pool.filter((t) => t.project_id === projectId);
  if (sedeId) pool = pool.filter((t) => t.sede_id === sedeId);
  return (
    pool.find((t) => normalizeName(t.title) === target) ??
    pool.find((t) => normalizeName(t.title).startsWith(target)) ??
    pool.find((t) => normalizeName(t.title).includes(target)) ??
    null
  );
}

function parseDateValue(raw: string): string | null {
  if (!raw) return null;
  const s = raw.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const european = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (european) {
    const day = european[1].padStart(2, "0");
    const month = european[2].padStart(2, "0");
    return `${european[3]}-${month}-${day}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
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
- update_task_status: cambiar el estado de una tarea (campos: task, status, project opcional, sede opcional)
- update_project_status: cambiar el estado de un proyecto (campos: project, status, sede opcional)
- update_task: editar una tarea o entrada de agenda existente. Para "modificar la agenda" siempre usá esta acción. Campos: task (título actual), project opcional, sede opcional, y al menos uno de: new_title, new_date (YYYY-MM-DD o null para quitar fecha), new_priority (high|medium|low), new_status, new_project, new_sede.
- delete_task: borrar una tarea o entrada de agenda (campos: task, project opcional, sede opcional)
- append_notepad: agregar texto al final del anotador general (campo: text)
- append_sede_notes: agregar texto al final del anotador de una sede (campos: sede, text)
- replace_notepad: reescribir POR COMPLETO el anotador general (campo: text con el contenido nuevo). Usalo cuando el usuario te pida modificar, corregir, reordenar o borrar algo del anotador. Reconstruí el texto completo a partir del estado actual visible en el contexto, conservando lo que el usuario no pidió cambiar. Si el usuario pide vaciarlo, mandá text vacío.
- replace_sede_notes: reescribir POR COMPLETO el anotador de una sede (campos: sede, text). Misma lógica que replace_notepad pero por sede.
- append_project_notes: agregar texto a la descripción de un proyecto (campos: project, text)
- append_task_notes: agregar texto a las notas de una tarea (campos: task, text, project opcional, sede opcional)
- create_calendar_entry: crear una entrada de calendario como tarea con fecha (campos: title, date en YYYY-MM-DD, project opcional, type opcional: reunion|evento|tarea — default tarea, priority opcional: high|medium|low)

Cuando el usuario pida una acción, respondé en lenguaje natural confirmando lo que vas a hacer Y AL FINAL del mensaje incluí un bloque exactamente con este formato (sin tildes en los marcadores, sin code fences):

___ACTIONS___
[{"action":"create_task","sede":"Belgrano","project":"Humedad 3er Piso","title":"Revisar presupuesto","priority":"medium"},
{"action":"create_project","sede":"Recoleta","name":"Pintura exterior","type":"obra"},
{"action":"update_task","task":"Reunion con proveedor","new_date":"2026-06-12"},
{"action":"delete_task","task":"Llamar al electricista"},
{"action":"replace_notepad","text":"Pendientes:\n- Llamar al proveedor\n- Revisar presupuesto Belgrano"},
{"action":"replace_sede_notes","sede":"Costa","text":"- Revisar instalacion electrica\n- Confirmar fecha de obra"},
{"action":"append_notepad","text":"Llamar a proveedor el lunes"},
{"action":"append_sede_notes","sede":"Costa","text":"Revisar instalacion electrica"}]
___END___

Reglas para el bloque de acciones:
- El JSON debe ser un array válido. Usá comillas dobles. Nada de comentarios.
- Solo incluí el bloque si el usuario pidió crear/modificar/borrar/anotar algo. Para preguntas de consulta NO incluyas el bloque.
- Los nombres de sede, proyecto y tarea deben coincidir con los que aparecen en el contexto. Si no estás seguro, preguntale al usuario en vez de inventar.
- Si el usuario no especifica prioridad para una tarea, no la incluyas (se usa "medium" por default).
- El campo "project" es opcional en create_task — solo poné uno si el usuario nombró el proyecto.
- Para reprogramar una entrada de agenda usá update_task con new_date. Para renombrarla usá new_title. Para sacarle la fecha mandá new_date: null.
- En replace_notepad / replace_sede_notes, devolvé SIEMPRE el texto entero resultante, no un diff ni un fragmento. Si el usuario solo quería borrar una línea, reconstruí el resto.`;

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
  const status = normalizeProjectStatus(action.status ?? "planning") ?? "planning";

  const { error } = await supabase.from("projects").insert({
    company_id: companyId,
    sede_id: sede?.id ?? null,
    name,
    type,
    status,
  });
  if (error) {
    console.error("create_project insert error:", error);
    return { ok: false, message: `no pude crear el proyecto (${error.message})` };
  }
  return { ok: true, message: `proyecto "${name}" creado${sede ? " en " + sede.name : ""}` };
}

async function executeUpdateTaskStatus(action: any, snap: Snapshot): Promise<ActionResult> {
  const title: string = (action.task ?? action.title ?? "").toString().trim();
  if (!title) return { ok: false, message: "no especificaste qué tarea" };

  let projectId: string | null = null;
  if (action.project) {
    const proj = findProjectByName(snap, action.project);
    if (!proj) return { ok: false, message: `no encontré el proyecto "${action.project}"` };
    projectId = proj.id;
  }

  let sedeId: string | null = null;
  if (action.sede) {
    const sede = findSedeByName(snap, action.sede);
    if (!sede) return { ok: false, message: `no encontré la sede "${action.sede}"` };
    sedeId = sede.id;
  }
  const task = findTaskByName(snap, title, projectId, sedeId);
  if (!task) return { ok: false, message: `no encontré la tarea "${title}"` };

  const status = normalizeTaskStatus(action.status ?? "");
  if (!status) return { ok: false, message: `estado inválido para la tarea: "${action.status ?? ""}"` };

  const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
  if (error) {
    console.error("update_task_status error:", error);
    return { ok: false, message: `no pude actualizar la tarea (${error.message})` };
  }
  return { ok: true, message: `tarea "${task.title}" actualizada a ${STATUS_LABEL[status] ?? status}` };
}

async function executeUpdateProjectStatus(action: any, snap: Snapshot): Promise<ActionResult> {
  const name: string = (action.project ?? "").toString().trim();
  if (!name) return { ok: false, message: "no especificaste qué proyecto" };

  let sedeId: string | null = null;
  if (action.sede) {
    const sede = findSedeByName(snap, action.sede);
    if (!sede) return { ok: false, message: `no encontré la sede "${action.sede}"` };
    sedeId = sede.id;
  }
  const project = findProjectByName(snap, name, sedeId);
  if (!project) return { ok: false, message: `no encontré el proyecto "${name}"` };

  const status = normalizeProjectStatus(action.status ?? "");
  if (!status) return { ok: false, message: `estado inválido para el proyecto: "${action.status ?? ""}"` };

  const { error } = await supabase.from("projects").update({ status }).eq("id", project.id);
  if (error) {
    console.error("update_project_status error:", error);
    return { ok: false, message: `no pude actualizar el proyecto (${error.message})` };
  }
  return { ok: true, message: `proyecto "${project.name}" actualizado a ${STATUS_LABEL[status] ?? status}` };
}

async function executeCreateCalendarEntry(
  action: any,
  snap: Snapshot,
  companyId: string,
): Promise<ActionResult> {
  const title: string = (action.title ?? "").toString().trim();
  if (!title) return { ok: false, message: "entrada de calendario sin título" };

  const date = parseDateValue(action.date ?? "");
  if (!date) return { ok: false, message: "fecha inválida para la entrada de calendario" };

  let projectId: string | null = null;
  if (action.project) {
    const proj = findProjectByName(snap, action.project);
    if (!proj) return { ok: false, message: `no encontré el proyecto "${action.project}"` };
    projectId = proj.id;
  }

  let sedeId: string | null = null;
  if (action.sede) {
    const sede = findSedeByName(snap, action.sede);
    if (!sede) return { ok: false, message: `no encontré la sede "${action.sede}"` };
    sedeId = sede.id;
  }

  const validType = ["tarea", "reunion", "evento"];
  const type = validType.includes(action.type) ? action.type : "tarea";
  const tags = type === "reunion" ? ["reunion"] : type === "evento" ? ["evento"] : [];
  const priority = VALID_TASK_PRIORITIES.has(action.priority) ? action.priority : "medium";

  const { error } = await supabase.from("tasks").insert({
    company_id: companyId,
    project_id: projectId,
    sede_id: sedeId,
    title,
    due_date: date,
    priority,
    status: "todo",
    tags,
  });
  if (error) {
    console.error("create_calendar_entry insert error:", error);
    return { ok: false, message: `no pude crear la entrada de calendario (${error.message})` };
  }
  return { ok: true, message: `entrada de calendario "${title}" creada para el ${date}` };
}

async function executeAppendProjectNotes(action: any, snap: Snapshot): Promise<ActionResult> {
  const text: string = (action.text ?? "").toString().trim();
  if (!text) return { ok: false, message: "texto vacío para las notas del proyecto" };

  const project = findProjectByName(snap, action.project);
  if (!project) return { ok: false, message: `no encontré el proyecto "${action.project}"` };

  const prev: string = (project.description ?? "").toString().trim();
  const newDescription = prev ? `${prev}\n\n${text}` : text;
  const { error } = await supabase.from("projects").update({ description: newDescription }).eq("id", project.id);
  if (error) {
    console.error("append_project_notes error:", error);
    return { ok: false, message: `no pude actualizar el proyecto (${error.message})` };
  }
  return { ok: true, message: `anotado en el proyecto ${project.name}` };
}

async function executeAppendTaskNotes(action: any, snap: Snapshot): Promise<ActionResult> {
  const text: string = (action.text ?? "").toString().trim();
  if (!text) return { ok: false, message: "texto vacío para las notas de la tarea" };

  const title: string = (action.task ?? action.title ?? "").toString().trim();
  if (!title) return { ok: false, message: "no especificaste qué tarea" };

  let projectId: string | null = null;
  if (action.project) {
    const proj = findProjectByName(snap, action.project);
    if (!proj) return { ok: false, message: `no encontré el proyecto "${action.project}"` };
    projectId = proj.id;
  }

  let sedeId: string | null = null;
  if (action.sede) {
    const sede = findSedeByName(snap, action.sede);
    if (!sede) return { ok: false, message: `no encontré la sede "${action.sede}"` };
    sedeId = sede.id;
  }
  const task = findTaskByName(snap, title, projectId, sedeId);
  if (!task) return { ok: false, message: `no encontré la tarea "${title}"` };

  const prev: string = (task.notes ?? "").toString().trim();
  const newNotes = prev ? `${prev}\n\n${text}` : text;
  const { error } = await supabase.from("tasks").update({ notes: newNotes }).eq("id", task.id);
  if (error) {
    console.error("append_task_notes error:", error);
    return { ok: false, message: `no pude actualizar la tarea (${error.message})` };
  }
  return { ok: true, message: `anotado en la tarea ${task.title}` };
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

async function executeUpdateTask(action: any, snap: Snapshot): Promise<ActionResult> {
  const targetName: string = (action.task ?? action.title ?? "").toString().trim();
  if (!targetName) return { ok: false, message: "no especificaste qué tarea editar" };

  let lookupSedeId: string | null = null;
  if (action.sede) {
    const sede = findSedeByName(snap, action.sede);
    if (!sede) return { ok: false, message: `no encontré la sede "${action.sede}"` };
    lookupSedeId = sede.id;
  }
  let lookupProjectId: string | null = null;
  if (action.project) {
    const proj = findProjectByName(snap, action.project, lookupSedeId);
    if (!proj) return { ok: false, message: `no encontré el proyecto "${action.project}"` };
    lookupProjectId = proj.id;
  }
  const task = findTaskByName(snap, targetName, lookupProjectId, lookupSedeId);
  if (!task) return { ok: false, message: `no encontré la tarea "${targetName}"` };

  const updates: Record<string, any> = {};

  if (typeof action.new_title === "string" && action.new_title.trim()) {
    updates.title = action.new_title.trim();
  }
  if ("new_date" in action) {
    if (action.new_date === null || action.new_date === "") {
      updates.due_date = null;
    } else {
      const d = parseDateValue(action.new_date);
      if (!d) return { ok: false, message: `fecha inválida "${action.new_date}"` };
      updates.due_date = d;
    }
  }
  if (action.new_priority) {
    if (!VALID_TASK_PRIORITIES.has(action.new_priority)) {
      return { ok: false, message: `prioridad inválida "${action.new_priority}"` };
    }
    updates.priority = action.new_priority;
  }
  if (action.new_status) {
    const s = normalizeTaskStatus(action.new_status);
    if (!s) return { ok: false, message: `estado inválido "${action.new_status}"` };
    updates.status = s;
  }
  if ("new_project" in action) {
    if (action.new_project === null || action.new_project === "") {
      updates.project_id = null;
    } else {
      const np = findProjectByName(snap, action.new_project);
      if (!np) return { ok: false, message: `no encontré el proyecto "${action.new_project}"` };
      updates.project_id = np.id;
      if (np.sede_id && !("new_sede" in action)) updates.sede_id = np.sede_id;
    }
  }
  if ("new_sede" in action) {
    if (action.new_sede === null || action.new_sede === "") {
      updates.sede_id = null;
    } else {
      const ns = findSedeByName(snap, action.new_sede);
      if (!ns) return { ok: false, message: `no encontré la sede "${action.new_sede}"` };
      updates.sede_id = ns.id;
    }
  }

  if (!Object.keys(updates).length) {
    return { ok: false, message: "no especificaste qué cambiar de la tarea" };
  }

  const { error } = await supabase.from("tasks").update(updates).eq("id", task.id);
  if (error) {
    console.error("update_task error:", error);
    return { ok: false, message: `no pude actualizar la tarea (${error.message})` };
  }
  return { ok: true, message: `tarea "${task.title}" actualizada` };
}

async function executeDeleteTask(action: any, snap: Snapshot): Promise<ActionResult> {
  const targetName: string = (action.task ?? action.title ?? "").toString().trim();
  if (!targetName) return { ok: false, message: "no especificaste qué tarea borrar" };

  let lookupSedeId: string | null = null;
  if (action.sede) {
    const sede = findSedeByName(snap, action.sede);
    if (!sede) return { ok: false, message: `no encontré la sede "${action.sede}"` };
    lookupSedeId = sede.id;
  }
  let lookupProjectId: string | null = null;
  if (action.project) {
    const proj = findProjectByName(snap, action.project, lookupSedeId);
    if (!proj) return { ok: false, message: `no encontré el proyecto "${action.project}"` };
    lookupProjectId = proj.id;
  }
  const task = findTaskByName(snap, targetName, lookupProjectId, lookupSedeId);
  if (!task) return { ok: false, message: `no encontré la tarea "${targetName}"` };

  const { error } = await supabase.from("tasks").delete().eq("id", task.id);
  if (error) {
    console.error("delete_task error:", error);
    return { ok: false, message: `no pude borrar la tarea (${error.message})` };
  }
  return { ok: true, message: `tarea "${task.title}" borrada` };
}

// Convierte un texto plano (con saltos de línea) al HTML que usa el anotador.
function textToNotepadHtml(text: string): string {
  if (!text.trim()) return "";
  return text
    .split("\n")
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
}

async function executeReplaceNotepad(
  action: any,
  userId: string | null,
): Promise<ActionResult> {
  const text: string = (action.text ?? "").toString();

  const { data: existing, error: selErr } = await supabase
    .from("ai_reports")
    .select("id")
    .eq("report_type", NOTEPAD_REPORT_TYPE)
    .maybeSingle();
  if (selErr) {
    console.error("replace_notepad select error:", selErr);
    return { ok: false, message: "no pude leer el anotador" };
  }

  const newResult = textToNotepadHtml(text);

  if (existing?.id) {
    const { error } = await supabase
      .from("ai_reports")
      .update({ result: newResult, name: NOTEPAD_REPORT_NAME })
      .eq("id", existing.id);
    if (error) {
      console.error("replace_notepad update error:", error);
      return { ok: false, message: `no pude actualizar el anotador (${error.message})` };
    }
  } else {
    if (!userId) {
      console.error("replace_notepad: falta user_id para insertar nueva fila");
      return { ok: false, message: "no pude crear el anotador (falta user_id)" };
    }
    const { error } = await supabase.from("ai_reports").insert({
      user_id: userId,
      name: NOTEPAD_REPORT_NAME,
      report_type: NOTEPAD_REPORT_TYPE,
      result: newResult,
    });
    if (error) {
      console.error("replace_notepad insert error:", error);
      return { ok: false, message: `no pude crear el anotador (${error.message})` };
    }
  }
  return { ok: true, message: text.trim() ? "anotador general actualizado" : "anotador general vaciado" };
}

async function executeReplaceSedeNotes(action: any, snap: Snapshot): Promise<ActionResult> {
  const sede = findSedeByName(snap, action.sede);
  if (!sede) return { ok: false, message: `no encontré la sede "${action.sede}"` };

  const text: string = (action.text ?? "").toString();
  const { error } = await supabase.from("sedes").update({ notes: text }).eq("id", sede.id);
  if (error) {
    console.error("replace_sede_notes update error:", error);
    return { ok: false, message: `no pude actualizar el anotador de ${sede.name} (${error.message})` };
  }
  return {
    ok: true,
    message: text.trim() ? `anotador de ${sede.name} actualizado` : `anotador de ${sede.name} vaciado`,
  };
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
        case "update_task_status":
          results.push(await executeUpdateTaskStatus(action, snap));
          break;
        case "update_task":
          results.push(await executeUpdateTask(action, snap));
          break;
        case "delete_task":
          results.push(await executeDeleteTask(action, snap));
          break;
        case "update_project_status":
          results.push(await executeUpdateProjectStatus(action, snap));
          break;
        case "create_calendar_entry":
          results.push(await executeCreateCalendarEntry(action, snap, companyId));
          break;
        case "append_notepad":
          results.push(await executeAppendNotepad(action, userId));
          break;
        case "replace_notepad":
          results.push(await executeReplaceNotepad(action, userId));
          break;
        case "append_sede_notes":
          results.push(await executeAppendSedeNotes(action, snap));
          break;
        case "replace_sede_notes":
          results.push(await executeReplaceSedeNotes(action, snap));
          break;
        case "append_project_notes":
          results.push(await executeAppendProjectNotes(action, snap));
          break;
        case "append_task_notes":
          results.push(await executeAppendTaskNotes(action, snap));
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
  const attachment = extractAttachment(message);

  if (!chatId || (!text && !attachment)) {
    return new Response("ok", { status: 200 });
  }

  // Comando /start: bienvenida corta.
  if (text === "/start") {
    await sendTelegramMessage(
      chatId,
      "👋 Hola, soy el bot de *Guanaco*.\nPreguntame por sedes, proyectos, tareas o documentos — o pedime que cree, modifique o borre tareas, proyectos y anotadores. También podés mandarme archivos o fotos con un caption tipo \"para el proyecto X de Y\" y los subo al Drive.",
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

    // Si vino un archivo/foto, lo procesamos por una ruta dedicada — no metemos a Claude
    // en una decisión que se resuelve bien con fuzzy match sobre la caption.
    if (attachment) {
      const reply = await handleFileUpload(message, attachment, snap, profile.companyId);
      for (const part of chunkForTelegram(reply)) {
        await sendTelegramMessage(chatId, part);
      }
      return new Response("ok", { status: 200 });
    }

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
