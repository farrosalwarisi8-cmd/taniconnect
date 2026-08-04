-- ==============================================================================
-- TANICONNECT - SUPABASE DATABASE SCHEMA MIGRATION & RLS POLICIES
-- Pastikan script ini dijalankan di Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. ENUM DEFINITIONS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('petani', 'pembeli', 'penyedia_alat', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT,
    role user_role NOT NULL DEFAULT 'pembeli'::user_role,
    roles text[] NOT NULL DEFAULT ARRAY['pembeli']::text[],
    province TEXT,
    city TEXT,
    district TEXT,
    address TEXT,
    ktp_storage_path TEXT,
    land_photo_storage_path TEXT,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    kyc_submitted_at TIMESTAMPTZ,
    kyc_reviewed_at TIMESTAMPTZ,
    kyc_reviewer_id UUID,
    is_active BOOLEAN DEFAULT true NOT NULL,
    avatar_storage_path TEXT,
    bio TEXT,
    rating_avg NUMERIC(3,2),
    rating_count INTEGER DEFAULT 0
);

-- Pastikan kolom role dan roles ada jika tabel sudah ada sebelumnya (Migration Safe)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'pembeli'::user_role;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT ARRAY['pembeli']::text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR PROFILES
-- Drop existing policies jika ada untuk menghindari rls duplicate error
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;

-- Policy Select: Siapapun dapat melihat data profil publik
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

-- Policy Insert: Authenticated user dapat membuat profil miliknya sendiri
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy Update: Authenticated user dapat memperbarui profil & role miliknya sendiri
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. TRIGGER UNTUK AUTO-CREATE PROFIL SAAT USER RECTISTER (AUTH.USERS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, roles)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Pengguna Baru'),
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'pembeli'::user_role),
    ARRAY[COALESCE(new.raw_user_meta_data->>'role', 'pembeli')]::text[]
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger binding
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. RELATIONAL TABLE FOR ROLES (OPSIONAL & UNTUK INTEGRITAS NORMALSASI)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
