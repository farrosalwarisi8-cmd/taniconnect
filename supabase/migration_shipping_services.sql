-- ==============================================================================
-- TANICONNECT - SHIPPING SERVICES TABLE MIGRATION
-- Layanan pengiriman milik penjual (Petani / Penyedia Alat & Bahan)
-- Jalankan di Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. SHIPPING SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.shipping_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    owner_role TEXT NOT NULL CHECK (owner_role IN ('petani', 'penyedia_alat')),
    service_name TEXT NOT NULL,
    description TEXT,
    price_per_km NUMERIC(12,2) NOT NULL CHECK (price_per_km >= 0),
    minimum_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (minimum_cost >= 0),
    estimated_delivery TEXT NOT NULL DEFAULT '1-3 hari',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_shipping_services_owner
    ON public.shipping_services (owner_id);

CREATE INDEX IF NOT EXISTS idx_shipping_services_active
    ON public.shipping_services (is_active)
    WHERE is_active = true;

-- 3. ENABLE RLS
ALTER TABLE public.shipping_services ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES
DROP POLICY IF EXISTS "Anyone can view active shipping services" ON public.shipping_services;
DROP POLICY IF EXISTS "Owners can view all own shipping services" ON public.shipping_services;
DROP POLICY IF EXISTS "Owners can insert own shipping services" ON public.shipping_services;
DROP POLICY IF EXISTS "Owners can update own shipping services" ON public.shipping_services;
DROP POLICY IF EXISTS "Owners can delete own shipping services" ON public.shipping_services;

-- Siapapun dapat melihat layanan aktif (untuk marketplace)
CREATE POLICY "Anyone can view active shipping services"
ON public.shipping_services FOR SELECT
USING (is_active = true);

-- Pemilik dapat melihat semua layanan miliknya (termasuk nonaktif, untuk dashboard)
CREATE POLICY "Owners can view all own shipping services"
ON public.shipping_services FOR SELECT
USING (auth.uid() = owner_id);

-- Pemilik dapat menambah layanan baru
CREATE POLICY "Owners can insert own shipping services"
ON public.shipping_services FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Pemilik dapat mengubah layanan miliknya
CREATE POLICY "Owners can update own shipping services"
ON public.shipping_services FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Pemilik dapat menghapus layanan miliknya
CREATE POLICY "Owners can delete own shipping services"
ON public.shipping_services FOR DELETE
USING (auth.uid() = owner_id);

-- 5. AUTO-UPDATE updated_at TRIGGER
CREATE OR REPLACE FUNCTION public.update_shipping_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_shipping_services_updated_at ON public.shipping_services;
CREATE TRIGGER set_shipping_services_updated_at
    BEFORE UPDATE ON public.shipping_services
    FOR EACH ROW EXECUTE FUNCTION public.update_shipping_services_updated_at();
