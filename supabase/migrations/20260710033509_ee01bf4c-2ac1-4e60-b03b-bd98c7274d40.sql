
CREATE TABLE public.profile_recovery (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  recovery_code_hash text,
  recovery_code_set_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_recovery TO authenticated;
GRANT ALL ON public.profile_recovery TO service_role;

ALTER TABLE public.profile_recovery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own recovery"
  ON public.profile_recovery FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert own recovery"
  ON public.profile_recovery FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update own recovery"
  ON public.profile_recovery FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can delete own recovery"
  ON public.profile_recovery FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_profile_recovery_updated_at
  BEFORE UPDATE ON public.profile_recovery
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.profile_recovery (user_id, recovery_code_hash, recovery_code_set_at)
SELECT p.user_id, p.recovery_code_hash, p.recovery_code_set_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE p.recovery_code_hash IS NOT NULL OR p.recovery_code_set_at IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS recovery_code_hash;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS recovery_code_set_at;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can read workouts" ON public.workouts;

REVOKE SELECT ON public.workouts FROM anon;
GRANT SELECT ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;

CREATE POLICY "Users can view own workouts"
  ON public.workouts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
