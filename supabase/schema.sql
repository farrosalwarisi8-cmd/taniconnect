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

-- ==============================================================================
-- 7. CART ITEMS TABLE (Fitur Keranjang Belanja)
-- ==============================================================================
-- Simpan produk yang ditambahkan pembeli ke keranjang.
-- UNIQUE(buyer_id, product_id) memastikan satu produk cuma 1 baris per user —
-- upsert dengan onConflict='buyer_id,product_id' akan menambah quantity, bukan
-- bikin baris baru.
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (buyer_id, product_id)
);

-- Index untuk query cepat "cart milik user X"
CREATE INDEX IF NOT EXISTS idx_cart_items_buyer ON public.cart_items(buyer_id);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- RLS: pembeli hanya bisa akses cart miliknya sendiri
DROP POLICY IF EXISTS "Users manage own cart" ON public.cart_items;
CREATE POLICY "Users manage own cart" ON public.cart_items
FOR ALL USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);

-- Trigger untuk update `updated_at` otomatis saat quantity berubah
CREATE OR REPLACE FUNCTION public.set_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_cart_items_updated_at();

NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- 8. CHAT TABLES (conversations & messages)
-- ==============================================================================
-- Fix bug arsitektur: sebelumnya chat pakai seller_id sebagai conversationId,
-- yang menyebabkan semua pembeli yang chat ke penjual yang sama masuk ke
-- thread yang sama (bocor pesan). Sekarang setiap pembeli-penjual (+product)
-- punya conversation.id yang unik.

CREATE TABLE IF NOT EXISTS public.conversations (
    id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- product_id nullable karena chat bisa juga tentang toko secara umum,
    -- bukan cuma per produk. Kalau ada product context, disimpan.
    product_id   UUID        REFERENCES public.products(id) ON DELETE SET NULL,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Constraint: satu triplet (buyer, seller, product) = satu conversation
    -- Kalau product_id NULL, tetap unique (buyer, seller, NULL)
    UNIQUE (buyer_id, seller_id, product_id),
    -- Pastikan buyer & seller beda user
    CHECK (buyer_id <> seller_id)
);

-- Index untuk query cepat "conversation milik user X" (baik sebagai buyer atau seller)
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON public.conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON public.conversations(last_message_at DESC NULLS LAST);


CREATE TABLE IF NOT EXISTS public.messages (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    text            TEXT        NOT NULL CHECK (length(text) > 0 AND length(text) <= 2000),
    image_url       TEXT,
    is_read         BOOLEAN     NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, is_read) WHERE is_read = false;


-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Buyers can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;

-- SELECT: hanya buyer atau seller yang terlibat yang bisa lihat conversation
CREATE POLICY "Participants can view their conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- INSERT: hanya buyer yang bisa membuat conversation baru
-- (pembeli yang mulai chat, seller cuma bisa reply)
CREATE POLICY "Buyers can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- UPDATE: participants bisa update (untuk update last_message, last_message_at)
CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);


DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can update own messages" ON public.messages;

-- SELECT messages: hanya participants yang bisa lihat
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

-- INSERT messages: sender harus participant, dan sender_id harus = auth.uid()
CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

-- UPDATE messages: hanya untuk mark as read — participant lain (bukan sender)
-- yang bisa mark pesan sebagai read
CREATE POLICY "Participants can update own messages"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );


-- ── Trigger: update conversation.last_message & last_message_at otomatis ────
-- Setiap kali message baru masuk, update ringkasan di parent conversation
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message    = LEFT(NEW.text, 200),
    last_message_at = NEW.created_at,
    updated_at      = timezone('utc'::text, now())
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_conversation_on_message ON public.messages;
CREATE TRIGGER trg_update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();


-- ── Enable realtime untuk messages ─────────────────────────────────────────
-- Diperlukan supaya .on('postgres_changes', ...) bekerja di client
-- Command ini idempotent-safe: kalau publication belum ada, dibuat.
-- Kalau tabel sudah dalam publication, ALTER PUBLICATION akan error tapi
-- tidak fatal — bisa skip manual kalau perlu.
DO $$
BEGIN
  -- Buat publication kalau belum ada
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- Tambah tabel ke publication (kalau belum ada)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';