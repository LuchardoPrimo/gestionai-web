-- Workspaces colaborativos estilo Notion: múltiples espacios por usuario,
-- invitaciones por email, miembros que comparten sedes/proyectos/tareas/etc.
--
-- "workspace_id" es conceptualmente lo mismo que "company_id" que ya usaban
-- projects/tasks/documents/transactions — mantenemos esos nombres de columna
-- para no romper la app; el id de un workspace ES el company_id.
--
-- Aplicar en Supabase SQL editor.

-- ─── 1) Tablas nuevas ───

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (workspace_id, email)
);

CREATE INDEX IF NOT EXISTS workspace_invitations_email_idx
  ON workspace_invitations (lower(email)) WHERE accepted_at IS NULL;

-- ─── 2) Columnas nuevas en tablas existentes ───

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS active_workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;

ALTER TABLE sedes
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;

-- ─── 3) Backfill: cada usuario existente conserva su company_id como workspace ───

-- 3a) workspaces
INSERT INTO workspaces (id, name, owner_id)
SELECT DISTINCT up.company_id, 'Mi espacio', up.id
FROM user_profiles up
WHERE up.company_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = up.company_id);

-- 3b) membership: el dueño es miembro de su workspace
INSERT INTO workspace_members (workspace_id, user_id)
SELECT up.company_id, up.id
FROM user_profiles up
WHERE up.company_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3c) active_workspace_id apunta al company_id por defecto
UPDATE user_profiles
SET active_workspace_id = company_id
WHERE active_workspace_id IS NULL AND company_id IS NOT NULL;

-- 3d) sedes existentes: workspace_id = company_id del owner
UPDATE sedes s
SET workspace_id = up.company_id
FROM user_profiles up
WHERE s.user_id = up.id
  AND s.workspace_id IS NULL
  AND up.company_id IS NOT NULL;

-- ─── 4) Trigger: nuevo usuario → perfil + workspace propio + membership + auto-aceptar invitaciones ───

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws_id uuid;
BEGIN
  -- Workspace propio: id = user_id por simplicidad (un workspace personal por user)
  INSERT INTO public.workspaces (id, name, owner_id)
  VALUES (NEW.id, 'Mi espacio', NEW.id)
  ON CONFLICT (id) DO NOTHING;

  ws_id := NEW.id;

  -- Membership al propio workspace
  INSERT INTO public.workspace_members (workspace_id, user_id)
  VALUES (ws_id, NEW.id)
  ON CONFLICT DO NOTHING;

  -- Perfil con company_id = active_workspace = workspace propio
  INSERT INTO public.user_profiles (id, company_id, active_workspace_id)
  VALUES (NEW.id, ws_id, ws_id)
  ON CONFLICT (id) DO UPDATE SET
    active_workspace_id = COALESCE(public.user_profiles.active_workspace_id, EXCLUDED.active_workspace_id);

  -- Auto-aceptar invitaciones pendientes que apuntaban a este email
  INSERT INTO public.workspace_members (workspace_id, user_id)
  SELECT inv.workspace_id, NEW.id
  FROM public.workspace_invitations inv
  WHERE lower(inv.email) = lower(NEW.email) AND inv.accepted_at IS NULL
  ON CONFLICT DO NOTHING;

  UPDATE public.workspace_invitations
  SET accepted_at = now()
  WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 5) Helper: workspace ids del usuario actual (evita recursión en policies) ───

CREATE OR REPLACE FUNCTION public.user_workspace_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid();
$$;

-- ─── 6) RLS ───

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 6a) workspaces
DROP POLICY IF EXISTS "workspaces select members" ON workspaces;
CREATE POLICY "workspaces select members" ON workspaces FOR SELECT
  USING (id IN (SELECT public.user_workspace_ids()));

DROP POLICY IF EXISTS "workspaces insert own" ON workspaces;
CREATE POLICY "workspaces insert own" ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "workspaces update owner" ON workspaces;
CREATE POLICY "workspaces update owner" ON workspaces FOR UPDATE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "workspaces delete owner" ON workspaces;
CREATE POLICY "workspaces delete owner" ON workspaces FOR DELETE
  USING (auth.uid() = owner_id);

-- 6b) workspace_members
DROP POLICY IF EXISTS "members select" ON workspace_members;
CREATE POLICY "members select" ON workspace_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );

DROP POLICY IF EXISTS "members insert" ON workspace_members;
CREATE POLICY "members insert" ON workspace_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "members delete" ON workspace_members;
CREATE POLICY "members delete" ON workspace_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  );

-- 6c) workspace_invitations
DROP POLICY IF EXISTS "invitations select" ON workspace_invitations;
CREATE POLICY "invitations select" ON workspace_invitations FOR SELECT
  USING (
    workspace_id IN (SELECT public.user_workspace_ids())
    OR lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "invitations insert" ON workspace_invitations;
CREATE POLICY "invitations insert" ON workspace_invitations FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT public.user_workspace_ids())
    AND invited_by = auth.uid()
  );

DROP POLICY IF EXISTS "invitations update" ON workspace_invitations;
CREATE POLICY "invitations update" ON workspace_invitations FOR UPDATE
  USING (
    workspace_id IN (SELECT public.user_workspace_ids())
    OR lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "invitations delete" ON workspace_invitations;
CREATE POLICY "invitations delete" ON workspace_invitations FOR DELETE
  USING (workspace_id IN (SELECT public.user_workspace_ids()));

-- 6d) user_profiles
DROP POLICY IF EXISTS "user_profiles self select" ON user_profiles;
CREATE POLICY "user_profiles self select" ON user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_profiles self insert" ON user_profiles;
CREATE POLICY "user_profiles self insert" ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "user_profiles self update" ON user_profiles;
CREATE POLICY "user_profiles self update" ON user_profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 6e) sedes — compartidas por workspace
DROP POLICY IF EXISTS "sedes select" ON sedes;
CREATE POLICY "sedes select" ON sedes FOR SELECT
  USING (workspace_id IN (SELECT public.user_workspace_ids()) OR user_id = auth.uid());

DROP POLICY IF EXISTS "sedes insert" ON sedes;
CREATE POLICY "sedes insert" ON sedes FOR INSERT
  WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids()));

DROP POLICY IF EXISTS "sedes update" ON sedes;
CREATE POLICY "sedes update" ON sedes FOR UPDATE
  USING (workspace_id IN (SELECT public.user_workspace_ids()));

DROP POLICY IF EXISTS "sedes delete" ON sedes;
CREATE POLICY "sedes delete" ON sedes FOR DELETE
  USING (workspace_id IN (SELECT public.user_workspace_ids()));

-- 6f) projects/tasks/documents/transactions — usan company_id como workspace_id
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['projects', 'tasks', 'documents', 'transactions']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%I select" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%I select" ON %I FOR SELECT USING (company_id IN (SELECT public.user_workspace_ids()))', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I insert" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%I insert" ON %I FOR INSERT WITH CHECK (company_id IN (SELECT public.user_workspace_ids()))', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I update" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%I update" ON %I FOR UPDATE USING (company_id IN (SELECT public.user_workspace_ids()))', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I delete" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%I delete" ON %I FOR DELETE USING (company_id IN (SELECT public.user_workspace_ids()))', tbl, tbl);
  END LOOP;
END $$;
