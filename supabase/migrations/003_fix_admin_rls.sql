-- ============================================
-- FIX: Admin RLS via SECURITY DEFINER function
-- ============================================

-- Fonction qui vérifie si l'utilisateur est admin (bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- sos_alerts
DROP POLICY IF EXISTS "sos_admin" ON public.sos_alerts;
DROP POLICY IF EXISTS "sos_own" ON public.sos_alerts;
CREATE POLICY "sos_own" ON public.sos_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sos_select_own" ON public.sos_alerts FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "sos_update_admin" ON public.sos_alerts FOR UPDATE USING (public.is_admin());

-- driver_kyc
DROP POLICY IF EXISTS "kyc_own" ON public.driver_kyc;
DROP POLICY IF EXISTS "kyc_admin" ON public.driver_kyc;
CREATE POLICY "kyc_own_all" ON public.driver_kyc FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kyc_admin_all" ON public.driver_kyc FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- user_profiles update by admin
DROP POLICY IF EXISTS "profiles_admin" ON public.user_profiles;
CREATE POLICY "profiles_admin_update" ON public.user_profiles FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- withdrawal_requests
DROP POLICY IF EXISTS "withdrawals_admin" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_admin_all" ON public.withdrawal_requests FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- wallets
DROP POLICY IF EXISTS "wallets_admin" ON public.wallets;
CREATE POLICY "wallets_admin_all" ON public.wallets FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- notifications
DROP POLICY IF EXISTS "notifs_own" ON public.notifications;
DROP POLICY IF EXISTS "notifs_admin" ON public.notifications;
CREATE POLICY "notifs_all" ON public.notifications FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- bookings admin
DROP POLICY IF EXISTS "bookings_admin" ON public.bookings;
CREATE POLICY "bookings_admin_select" ON public.bookings FOR SELECT
  USING (auth.uid() = passenger_id OR
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND driver_id = auth.uid())
    OR public.is_admin());
CREATE POLICY "bookings_admin_update" ON public.bookings FOR UPDATE
  USING (auth.uid() = passenger_id OR public.is_admin());

-- ratings admin
DROP POLICY IF EXISTS "ratings_admin" ON public.ratings;
CREATE POLICY "ratings_admin_all" ON public.ratings FOR ALL
  USING (is_visible = true OR public.is_admin())
  WITH CHECK (auth.uid() = rater_id OR public.is_admin());

-- transactions admin
DROP POLICY IF EXISTS "transactions_admin" ON public.transactions;
CREATE POLICY "transactions_all" ON public.transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.wallets WHERE id = wallet_id AND user_id = auth.uid()) OR public.is_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM public.wallets WHERE id = wallet_id AND user_id = auth.uid()) OR public.is_admin());

-- trips admin
DROP POLICY IF EXISTS "trips_admin" ON public.trips;
CREATE POLICY "trips_admin_all" ON public.trips FOR ALL
  USING (auth.uid() = driver_id OR (SELECT status FROM public.trips WHERE id = id) = 'active' OR public.is_admin())
  WITH CHECK (auth.uid() = driver_id OR public.is_admin());

-- Table ride_requests (passagers cherchant un trajet)
CREATE TABLE IF NOT EXISTS public.ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_city TEXT NOT NULL,
  to_city TEXT NOT NULL,
  from_lat NUMERIC, from_lng NUMERIC,
  to_lat NUMERIC, to_lng NUMERIC,
  departure_date DATE NOT NULL,
  seats_needed INT DEFAULT 1,
  max_price NUMERIC(10,2),
  women_only BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','matched','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requests_read" ON public.ride_requests FOR SELECT USING (true);
CREATE POLICY "requests_own" ON public.ride_requests FOR ALL USING (auth.uid() = passenger_id)
  WITH CHECK (auth.uid() = passenger_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;
