# CLAUDE.md

Guía para Claude Code (claude.ai/code) cuando trabaja en este repositorio.

## Proyecto

**LuchoNeitor** — Aplicación de gestión de proyectos multi-sede. Una sola persona/empresa administra varias sedes, cada sede tiene proyectos, cada proyecto tiene tareas y documentos. Todo en español argentino.

## Stack

- **Frontend:** React 19 + Vite 7 (sin Next, sin router — navegación por estado interno en `App.jsx`)
- **Backend:** Supabase (Auth + Postgres + Storage + Edge Functions)
- **Iconos:** lucide-react
- **Estilos:** inline styles con tema dark/light parametrizado (objeto `themes` en `App.jsx`)
- **IA:** Edge Function `ai-analyze` desplegada en Supabase para los Informes IA
- **Deploy:** Vercel (`vercel.json`)

Variables de entorno necesarias:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Comandos:

```bash
npm run dev      # Vite en dev
npm run build    # build de producción
npm run lint     # eslint
```

## Arquitectura

App monolítica de un solo archivo grande: `src/App.jsx` (~1700 líneas). Toda la lógica vive ahí:

- **`App` (root)** — maneja sesión Supabase, tema (dark/light), navegación por `page` (string)
- **`DataProvider` + `DataCtx`** — context único que carga todo de Supabase en paralelo (sedes, projects, tasks, documents, transactions, notifications, ai_reports) y expone `reload()`. Cualquier componente que muta datos debe llamar a `reload()` después
- **`Sidebar`** — nav lateral con sedes expandibles. Nav a sede individual se hace con string `"sede:" + id` (no rutas reales)
- **Páginas:**
  - `Dashboard` — KPIs globales + grilla de sedes + próximas tareas + proyectos activos
  - `SedeDetail` — workspace completo de una sede: cada proyecto se renderiza como tarjeta expandida con notas, tareas inline y documentos en la misma vista
  - `ProjectsPage`, `TasksPage` (kanban + lista), `BudgetPage`, `DocumentsPage`, `AIReportsPage`, `CalendarPage`, `SettingsPage`
- **Primitivos UI:** `Crd`, `Badge`, `StatusBadge`, `PBar`, `Inp`, `Select`, `Modal`, `EmptyState`
- **Auth:** `LoginPage` con `supabase.auth.signInWithPassword`. Cierre de sesión desde el TopBar

Multi-tenancy: cada usuario tiene un `company_id` en `user_profiles`. Casi todas las consultas filtran por `company_id` (no por `user_id`) — ver bug conocido más abajo.

**Workspaces colaborativos (estilo Notion):** desde 2026-05-26 cada usuario puede pertenecer a varios *workspaces* compartidos. El `workspace_id` activo se guarda en `user_profiles.active_workspace_id` y se usa como `company_id` para filtrar/insertar (son lo mismo conceptualmente — el id de un workspace ES el company_id). Tablas nuevas: `workspaces` (id, name, owner_id), `workspace_members` (workspace_id, user_id) y `workspace_invitations` (workspace_id, email, accepted_at). Las sedes ahora también tienen `workspace_id` y se comparten entre miembros (la columna `sedes.user_id` se mantiene como "quién la creó" pero el filtro principal es por workspace). RLS filtra todo por `workspace_members`.

## Schema de base de datos (Supabase)

| Tabla | Campos clave |
|-------|--------------|
| `user_profiles` | `id` (= auth.users.id), `company_id` |
| `sedes` | `id`, `user_id`, `name`, `address`, `budget`, `color`, `icon`, `type`, `notes` (anotador por sede — **no** `description`) |
| `projects` | `id`, `company_id`, `sede_id`, `name`, `type` (general/obra/mejora/academico/mri), `status` (planning/in_progress/completed), `progress`, `cost`, `cost_spent`, `budget`, `deadline`, `description` |
| `tasks` | `id`, `company_id`, `project_id`, `sede_id`, `title`, `status` (ver sistema de 5 estados), `priority` (high/medium/low), `due_date`, `assignee`, `notes`, `tags` |
| `documents` | `id`, `company_id`, `project_id`, `sede_id`, `name`, `type` (pdf/excel/document/other), `status`, `source`, `file_url`, `size` |
| `transactions` | `id`, `company_id`, `project_id`, `description`, `amount`, `status` (pending/paid/partial/overdue), `date` |
| `notifications` | `id`, `user_id`, `title`, `message`, `read` |
| `ai_reports` | `id`, `user_id`, `name`, `source_file_name`, `report_type`, `prompt_used`, `result` |
| `clients` | referenciado por `transactions.contact` |

**Storage bucket:** `documents` (archivos subidos por la app, expuestos vía `getPublicUrl`).

**Edge Function:** `ai-analyze` — recibe `{ fileData, fileName, prompt, reportType }` y devuelve `{ result }`. Se invoca con `supabase.functions.invoke("ai-analyze", ...)`.

## Sistema de 5 estados de tareas

Las tareas usan estos cinco estados (orden de flujo natural):

| `status` | Etiqueta UI | Significado |
|----------|-------------|-------------|
| `todo` | Pendiente | Por hacer, todavía no empezada |
| `in_progress` | En curso | Trabajando activamente |
| `waiting_response` | Esperando respuesta | Bloqueada esperando a alguien externo (mail, llamada, decisión de tercero) |
| `pending_solution` | Pendiente de solución | Bloqueada por un problema técnico/operativo no resuelto |
| `done` | Listo | Completada |

Reglas:

- Toda tarea pendiente (≠ `done`) cuenta para los KPIs de "tareas pendientes"
- `waiting_response` y `pending_solution` deben verse distintas visualmente del `todo` clásico (color/badge propio) para que el usuario detecte de un vistazo qué está bloqueado y por qué
- El kanban tiene una columna por estado (5 columnas), no agrupar bloqueadas en una sola
- Los proyectos siguen su propio set: `planning` / `in_progress` / `completed` (no se mezclan con los estados de tareas)

## Bugs conocidos ya resueltos

Mantener estos arreglos — si reaparecen, no es regresión casual, es alguien revirtiendo el fix.

### 1. `company_id` vs `userId` en inserts

Los inserts en `projects`, `tasks`, `documents`, `transactions` deben llevar **`company_id`**, no `user_id`. Sólo `sedes`, `notifications` y `ai_reports` se filtran/insertan por `user_id`. El `companyId` se obtiene una vez al cargar `DataProvider` desde `user_profiles` y se expone por contexto. Inserts sin `company_id` rompen RLS y la fila no aparece tras el reload.

### 2. `sanitizePath` para uploads a Storage

Los nombres de archivo van a `supabase.storage.from("documents").upload(path, file)`. El path debe sanitizarse: prefijo `Date.now() + "_" + random + "_"` para evitar colisiones, y limpiar caracteres no permitidos del `file.name`. Sin sanitización, archivos con espacios/acentos/`/` rompen el upload o generan URLs no accesibles.

### 3. CHECK constraints de Supabase

Varias columnas tienen `CHECK` constraints en Postgres. Insertar valores fuera del enum tira error 23514. Valores válidos actuales:

- `projects.status`: `planning` | `in_progress` | `completed` (no usar `active`, `cancelled` aunque la UI los muestre)
- `projects.type`: `general` | `obra` | `mejora` | `academico` | `mri`
- `tasks.status`: `todo` | `in_progress` | `waiting_response` | `pending_solution` | `done`
- `tasks.priority`: `high` | `medium` | `low`
- `documents.type`: `pdf` | `excel` | `document` | `other`
- `transactions.status`: `pending` | `paid` | `partial` | `overdue`

Antes de agregar un valor nuevo en la UI hay que actualizar el CHECK en la DB.

### 4. Drag-and-drop sólo desde el handle

En el kanban de tareas y en las listas reordenables, el drag debe iniciarse **únicamente desde el handle dedicado** (icono de agarre), no desde toda la tarjeta. Si se hace draggable la tarjeta entera, los clicks en botones internos (cambiar estado, borrar, editar nota) terminan disparando el drag y arruinan la interacción. `draggable={true}` va en el handle, no en el contenedor.

### 5. Anotador de sede vive en `sedes.notes`, no en `sedes.description`

La columna canónica para el anotador libre por sede es **`sedes.notes`** (text). No hay columna `sedes.description` — toda la app (DataProvider, `SedeDetail.saveSedeNotes`, `NotesPage`, bot de Telegram) lee y escribe `sede.notes`. La migración que la crea es `migrations/2026-04-28-add-notes.sql`.

Notas de **proyecto** sí van en `projects.description` (no confundir). Si aparece código tocando `sede.description`, es un bug — la columna ni existe en el schema.

### 6. Herencia de `sede_id` en tareas

Cuando una tarea se crea desde dentro de un proyecto (ej. `SedeDetail`, sección de tareas de un proyecto), el `sede_id` debe heredarse automáticamente del proyecto. Si la tarea se crea suelta (calendario, página de tareas), el `sede_id` se setea explícito o queda `null`. La query del Dashboard arma "tareas de la sede" como:

```js
tasks.filter(tk => tk.sede_id === s.id || sedeProjects.some(p => p.id === tk.project_id))
```

Es decir, considera tanto `sede_id` directo como herencia vía `project_id`. Si se rompe la herencia, las tareas creadas dentro de un proyecto desaparecen del conteo de la sede.

## Preferencias del usuario

Estas no son sugerencias — son reglas firmes para cualquier UI que se agregue o modifique:

- **Español argentino.** Voseo (`agregá`, `creá`, `subí`), no tuteo. Términos: "sede" no "sucursal", "tarea" no "task", "proyecto", "presupuesto", "vencida", "pendiente". Fechas con `toLocaleDateString("es-AR")`. Montos con `Intl.NumberFormat("es-AR")` o el helper `fmt()`
- **Sin barras de progreso.** No usar `PBar` para representar el avance de proyectos/tareas/presupuestos. Mostrar el dato de manera directa: porcentaje grande, números crudos (gastado vs. total), badges de estado, contadores. Si una vista vieja todavía tiene `PBar`, reemplazarla cuando se la toque
- **Botones grandes.** Padding vertical mínimo `12px` en botones primarios, `font-size` ≥ `14px`, `font-weight` 600+. Nada de botoncitos chiquitos para acciones importantes (crear, completar, iniciar, borrar). Los iconos solos (sin texto) sólo se permiten para acciones secundarias evidentes
- **Todo visible sin cambiar de pestaña.** El patrón clave es `SedeDetail`: cada proyecto muestra notas, tareas y documentos inline en la misma tarjeta, no en sub-tabs. Evitar tabs internas, modales innecesarios, "ver más" que ocultan info. Si una sección no entra, reorganizar el layout antes de esconder algo detrás de un click extra. Los modales sólo se usan para crear/editar, nunca para mostrar
