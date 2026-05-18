// Telegram bot para Guanaco — gestión de proyectos UADE.
// Recibe webhooks de Telegram, consulta Supabase, llama a Claude y responde por Telegram.
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

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

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
};

async function loadCompanyId(): Promise<string | null> {
  // Hay un solo usuario en el sistema — tomamos el primer perfil.
  const { data, error } = await supabase
    .from("user_profiles")
    .select("company_id")
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("loadCompanyId error:", error);
    return null;
  }
  return data?.company_id ?? null;
}

async function loadSnapshot(companyId: string): Promise<Snapshot> {
  const [sedes, projects, tasks, documents] = await Promise.all([
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
  ]);
  return {
    sedes: sedes.data ?? [],
    projects: projects.data ?? [],
    tasks: tasks.data ?? [],
    documents: documents.data ?? [],
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

function buildContext(snap: Snapshot): string {
  const lines: string[] = [];
  lines.push("# Estado actual de Guanaco");
  lines.push("");

  // Sedes
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
      `- *${s.name}* (id=${s.id}) — ${sedeProjects.length} proyectos, ${pendientes.length} tareas pendientes, ${vencidas.length} vencidas`,
    );
    const desc = htmlToPlain(s.description);
    if (desc) {
      lines.push(`  anotador: ${desc.slice(0, 400)}${desc.length > 400 ? "…" : ""}`);
    }
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

const SYSTEM_PROMPT = `Sos el asistente del bot de Telegram de *Guanaco*, una app de gestión de proyectos multi-sede de UADE (Universidad Argentina de la Empresa). El usuario te consulta por Telegram para saber el estado de sus sedes, proyectos, tareas y documentos.

Reglas estrictas de respuesta:
- Español argentino (voseo: "tenés", "fijate", "mirá"). Términos: "sede", "tarea", "proyecto", "pendiente", "vencida".
- Respondé SOLO lo que te preguntan. Nada de volcar el contexto entero — filtrá y resumí lo justo.
- Formato Telegram Markdown: *negrita* con un asterisco, _itálica_ con guión bajo. Usá emojis con moderación (📍 sede, 📋 proyecto, ✅ listo, ⏳ pendiente, ⚠️ vencida, 📄 documento).
- Respuestas cortas y directas. Si la respuesta es una lista, usá bullets (• o -). Evitá párrafos largos.
- Si el usuario saluda ("hola", "buenas") respondé un saludo breve y ofrecé ayuda en una línea. No listes nada.
- Si agradece o cierra ("gracias", "listo", "no necesito más") respondé corto y amable.
- Sos *solo lectura*: no podés crear, modificar ni borrar nada. Si te piden algo así, decí que solo podés consultar.
- Si no hay datos relevantes, decilo claro ("no encontré tareas vencidas").
- Para "panorama general" / "resumen" / "cómo está todo": dame 1-2 líneas por sede con números clave, no detalle de cada tarea.
- Fechas en formato dd/mm o "hace N días". Nada de timestamps crudos.`;

async function askClaude(question: string, context: string): Promise<string> {
  const userMessage = `Datos actuales de Guanaco:\n\n${context}\n\n---\n\nPregunta del usuario:\n${question}`;

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
      "👋 Hola, soy el bot de *Guanaco*.\nPreguntame por sedes, proyectos, tareas o documentos.",
    );
    return new Response("ok", { status: 200 });
  }

  try {
    const companyId = await loadCompanyId();
    if (!companyId) {
      await sendTelegramMessage(chatId, "⚠️ No encontré el perfil de la empresa.");
      return new Response("ok", { status: 200 });
    }

    const snap = await loadSnapshot(companyId);
    const context = buildContext(snap);
    const reply = await askClaude(text, context);

    for (const part of chunkForTelegram(reply)) {
      await sendTelegramMessage(chatId, part);
    }
  } catch (err) {
    console.error("handler error:", err);
    await sendTelegramMessage(chatId, "⚠️ Ups, algo falló procesando tu pregunta.");
  }

  return new Response("ok", { status: 200 });
});
