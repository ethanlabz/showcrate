-- ============================================================
-- 005_oauth_username_support.sql
-- Showcrate — Make public.users.username nullable for OAuth onboarding
-- and enforce username completion before proceeding with actions.
-- ============================================================

-- 1. Drop NOT NULL constraint on username so OAuth users can be created before picking username
ALTER TABLE public.users ALTER COLUMN username DROP NOT NULL;

-- 2. Update username length check to allow NULL
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS username_length;
ALTER TABLE public.users ADD CONSTRAINT username_length CHECK (username IS NULL OR (char_length(username) BETWEEN 3 AND 39));

-- 3. Update username format check to allow NULL
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS username_format;
ALTER TABLE public.users ADD CONSTRAINT username_format CHECK (username IS NULL OR (username ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'));

-- 4. Update username no double hyphen check to allow NULL
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS username_no_double_hyphen;
ALTER TABLE public.users ADD CONSTRAINT username_no_double_hyphen CHECK (username IS NULL OR (username NOT LIKE '%---%'));

-- 5. Update handle_new_user() trigger function to safely handle missing metadata and avoid transaction crashes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Username is only populated if provided explicitly in metadata (e.g. email/password signup)
  v_username := NEW.raw_user_meta_data->>'username';

  -- Extract display name from metadata or provider defaults
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name'
  );

  -- Extract avatar URL from metadata or provider defaults
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->>'avatar'
  );

  INSERT INTO public.users (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    v_username,
    v_display_name,
    v_avatar_url
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Catch-all so auth.users insertion is never blocked by profile trigger failure
  RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Database-level guard: strictly disallow creating projects without a chosen username
CREATE OR REPLACE FUNCTION public.check_user_has_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = NEW.owner_id AND username IS NOT NULL AND char_length(username) >= 3
  ) THEN
    RAISE EXCEPTION 'A valid username must be configured before creating projects.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_owner_has_username ON public.projects;
CREATE TRIGGER ensure_owner_has_username
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.check_user_has_username();
