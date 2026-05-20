// Estados unificados de tareas y proyectos + helpers visuales.

import { Layers, Hammer, Activity, BookOpen, Stethoscope } from "lucide-react";

export const STATUS_OPTIONS = [
  { value: "todo", label: "Pendiente" },
  { value: "in_progress", label: "En curso" },
  { value: "waiting_response", label: "Esperando respuesta" },
  { value: "pending_solution", label: "Pendiente solución" },
  { value: "done", label: "Listo" },
];

// Mapeo legacy project.status → labels nuevas.
export const PROJECT_STATUS_MAP = {
  planning: "todo",
  in_progress: "in_progress",
  completed: "done",
};

export const normalizeProjectStatus = (s) => PROJECT_STATUS_MAP[s] || s;

// Color de un estado (tareas o proyectos).
export function statusColor(s, t) {
  const map = {
    todo: t.orange, planning: t.orange,
    in_progress: t.blue, active: t.blue,
    waiting_response: t.yellow,
    pending_solution: t.red,
    done: t.green, completed: t.green,
  };
  return map[s] || t.muted;
}

// Tipos de proyecto: ícono + color + label.
export const PROJECT_TYPES = {
  general:   { icon: Layers,       color: "accent",  label: "General" },
  obra:      { icon: Hammer,       color: "orange",  label: "Obra" },
  mejora:    { icon: Activity,     color: "cyan",    label: "Mejora" },
  academico: { icon: BookOpen,     color: "blue",    label: "Académico" },
  mri:       { icon: Stethoscope,  color: "pink",    label: "MRI" },
};

export const projectTypeMeta = (type, t) => {
  const m = PROJECT_TYPES[type] || PROJECT_TYPES.general;
  return { Icon: m.icon, color: t[m.color] || t.accent, label: m.label };
};

// Prioridad de tareas: color + label.
export const PRIORITY_META = {
  high:   { color: "red",    label: "Alta" },
  medium: { color: "yellow", label: "Media" },
  low:    { color: "green",  label: "Baja" },
};

export const priorityMeta = (pri, t) => {
  const m = PRIORITY_META[pri] || PRIORITY_META.medium;
  return { color: t[m.color], label: m.label };
};

// Helper para chequear tags de tareas (reunion/evento).
export const tagsHas = (tags, v) =>
  Array.isArray(tags) && tags.some(x => String(x).toLowerCase() === v);
