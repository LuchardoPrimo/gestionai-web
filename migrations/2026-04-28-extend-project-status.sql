-- Extiende el CHECK constraint de projects.status para soportar los 5 estados
-- unificados con tasks: todo | in_progress | waiting_response | pending_solution | done
--
-- Aplicar en Supabase SQL editor (proyecto LuchoNeitor)
-- Después de aplicar, los projects pueden usar los mismos 5 estados que las tasks.

-- 1) Migrar valores existentes legacy → nuevos valores
UPDATE projects SET status = 'todo'        WHERE status = 'planning';
UPDATE projects SET status = 'done'        WHERE status = 'completed';
-- in_progress se queda como está
-- (active / cancelled / planned se ignoran porque ya no se usan)

-- 2) Reemplazar el CHECK constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('todo', 'in_progress', 'waiting_response', 'pending_solution', 'done'));

-- 3) (Opcional) Si tenés un default sobre projects.status, alinearlo
ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'todo';
