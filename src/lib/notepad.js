// Helpers para los anotadores (general + por sede).
// El anotador general se guarda en ai_reports con report_type='notepad'.

export const NOTEPAD_REPORT_TYPE = "notepad";
export const NOTEPAD_REPORT_NAME = "Anotador general";

export const normalizeTagName = (s) => (s || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]/g, "");

export const sedeToTagText = (name) => "#" + (name || "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/\s+/g, "");

export const tagSpanHtml = (sede, t, fallbackTag) => {
  const color = sede?.color || t.accent;
  const tagText = sede ? sedeToTagText(sede.name) : "#" + fallbackTag;
  const sid = sede ? ` data-sede-id="${sede.id}"` : "";
  const style = `background:${color}22;color:${color};padding:1px 8px;border-radius:999px;font-weight:700;font-size:0.92em;border:1px solid ${color}55;white-space:nowrap`;
  return `<span class="sede-tag"${sid} style="${style}">${tagText}</span>`;
};

// Extrae párrafos del anotador general agrupados por sede_id. Un párrafo es cada hijo
// directo del editor (div / p / li). Si contiene un .sede-tag con data-sede-id, queda
// asociado a esa sede. Un mismo párrafo con varias sedes aparece en cada una.
export function extractGeneralNotepadMentions(html) {
  if (!html || typeof window === "undefined" || !window.DOMParser) return {};
  let doc;
  try { doc = new DOMParser().parseFromString(`<div id="r">${html}</div>`, "text/html"); }
  catch { return {}; }
  const root = doc.getElementById("r");
  if (!root) return {};
  const out = {};
  const walk = (container) => {
    for (const node of Array.from(container.children)) {
      if (node.tagName === "UL" || node.tagName === "OL") { walk(node); continue; }
      const tags = node.querySelectorAll(".sede-tag[data-sede-id]");
      if (!tags.length) continue;
      const seen = new Set();
      for (const tag of tags) {
        const sid = tag.getAttribute("data-sede-id");
        if (!sid || seen.has(sid)) continue;
        seen.add(sid);
        if (!out[sid]) out[sid] = [];
        out[sid].push(node.outerHTML);
      }
    }
  };
  walk(root);
  return out;
}
