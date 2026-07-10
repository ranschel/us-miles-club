ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recovery_code_hash text,
  ADD COLUMN IF NOT EXISTS recovery_code_set_at timestamptz;