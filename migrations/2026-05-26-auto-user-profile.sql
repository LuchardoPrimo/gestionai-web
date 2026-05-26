-- Auto-creación de user_profiles al registrarse un usuario.
-- Cada usuario nuevo arranca con su propia "empresa" (company_id = su user_id),
-- garantizando que sus sedes/proyectos/tareas/etc. queden aislados de los demás.
--
-- También sirve de fallback en runtime: DataProvider hace upsert al primer load,
-- pero el trigger lo hace incluso si el cliente nunca llegó a correr.
--
-- Aplicar en Supabase SQL editor.

-- 1) RLS necesarias para que cada usuario pueda insertar/leer su propio perfil
--    (necesario para el upsert del cliente en DataProvider.load()).
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles self select" ON user_profiles;
CREATE POLICY "user_profiles self select"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_profiles self insert" ON user_profiles;
CREATE POLICY "user_profiles self insert"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "user_profiles self update" ON user_profiles;
CREATE POLICY "user_profiles self update"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2) Trigger que crea el perfil automáticamente al darse de alta el usuario.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, company_id)
  VALUES (NEW.id, NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Backfill: usuarios existentes en auth.users que todavía no tienen perfil
--    quedan con su propio company_id.
INSERT INTO public.user_profiles (id, company_id)
SELECT u.id, u.id
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
WHERE p.id IS NULL;
