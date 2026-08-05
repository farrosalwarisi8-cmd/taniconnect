-- ==============================================================================
-- TANICONNECT - OPTIMIZATIONS & REAL-TIME SHIPPING TRACKING MIGRATION
-- 1. Tambah jangkauan maksimum pengiriman (max_coverage_km) ke shipping_services
-- 2. Tabel shipment_tracking untuk tracking real-time status pengiriman
-- ==============================================================================

-- 1. ENHANCE SHIPPING_SERVICES
ALTER TABLE public.shipping_services
    ADD COLUMN IF NOT EXISTS max_coverage_km NUMERIC(12,2) DEFAULT 50 CHECK (max_coverage_km > 0);

-- 2. SHIPMENT TRACKING TABLE
CREATE TABLE IF NOT EXISTS public.shipment_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('diproses', 'diambil', 'dalam_perjalanan', 'terkirim')),
    location_notes TEXT NOT NULL DEFAULT '',
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. INDEXES FOR SHIPMENT TRACKING
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_tx
    ON public.shipment_tracking (transaction_id);

CREATE INDEX IF NOT EXISTS idx_shipment_tracking_created
    ON public.shipment_tracking (created_at DESC);

-- 4. ENABLE RLS FOR SHIPMENT TRACKING
ALTER TABLE public.shipment_tracking ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR SHIPMENT TRACKING
DROP POLICY IF EXISTS "Public can view tracking for their transactions" ON public.shipment_tracking;
DROP POLICY IF EXISTS "Sellers and buyers can view transaction tracking" ON public.shipment_tracking;
DROP POLICY IF EXISTS "Sellers can insert tracking updates" ON public.shipment_tracking;

-- Pembeli & Penjual yang terlibat dalam transaksi dapat melihat tracking
CREATE POLICY "Sellers and buyers can view transaction tracking"
ON public.shipment_tracking FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.id = shipment_tracking.transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
);

-- Penjual dapat membuat update status pengiriman
CREATE POLICY "Sellers can insert tracking updates"
ON public.shipment_tracking FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.id = shipment_tracking.transaction_id
        AND t.seller_id = auth.uid()
    )
);
