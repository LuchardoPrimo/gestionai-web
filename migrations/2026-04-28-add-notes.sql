-- Agrega anotadores libres por sede y un anotador global por usuario.
-- Aplicar en Supabase SQL editor.

-- 1) Mini anotador por sede
ALTER TABLE sedes ADD COLUMN IF NOT EXISTS notes text;

-- 2) Anotador general en el dashboard (uno por usuario)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dashboard_notes text;
