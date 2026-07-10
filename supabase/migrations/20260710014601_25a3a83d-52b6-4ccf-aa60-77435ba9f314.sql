ALTER TABLE public.workouts DROP CONSTRAINT IF EXISTS workouts_user_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
DELETE FROM public.workouts;
DELETE FROM public.profiles WHERE user_id NOT IN (SELECT id FROM auth.users);