
-- Sport enum
CREATE TYPE public.sport_type AS ENUM ('walk', 'run', 'bike');

-- Workouts table
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sport public.sport_type NOT NULL,
  distance_miles NUMERIC(6,2) NOT NULL CHECK (distance_miles > 0 AND distance_miles <= 200),
  state_code TEXT NOT NULL CHECK (char_length(state_code) = 2),
  county_fips TEXT NOT NULL CHECK (char_length(county_fips) = 5),
  county_name TEXT NOT NULL,
  city TEXT NOT NULL CHECK (char_length(city) BETWEEN 1 AND 80),
  performed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT performed_at_reasonable CHECK (
    performed_at <= now() + interval '1 hour'
    AND performed_at >= now() - interval '2 years'
  )
);

CREATE INDEX workouts_user_idx ON public.workouts(user_id, performed_at DESC);
CREATE INDEX workouts_state_idx ON public.workouts(state_code);
CREATE INDEX workouts_county_idx ON public.workouts(county_fips);
CREATE INDEX workouts_sport_idx ON public.workouts(sport);

GRANT SELECT ON public.workouts TO anon;
GRANT SELECT, INSERT, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Public can read all workouts (aggregate leaderboards). PII: city is user-provided free text; no email/name exposed.
CREATE POLICY "Anyone can read workouts"
  ON public.workouts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users insert own workouts"
  ON public.workouts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own workouts"
  ON public.workouts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
