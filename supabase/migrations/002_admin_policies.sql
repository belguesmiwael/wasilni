-- ============================================
-- WASELNI — ADMIN RLS POLICIES FIX
-- ============================================

-- Admin peut tout voir sur sos_alerts
DROP POLICY IF EXISTS "sos_admin" ON public.sos_alerts;
CREATE POLICY "sos_admin" ON public.sos_alerts FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admin peut tout voir sur user_profiles
DROP POLICY IF EXISTS "profiles_admin" ON public.user_profiles;
CREATE POLICY "profiles_admin" ON public.user_profiles FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admin peut tout voir sur driver_kyc
DROP POLICY IF EXISTS "kyc_admin" ON public.driver_kyc;
CREATE POLICY "kyc_admin" ON public.driver_kyc FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admin peut tout voir sur bookings
DROP POLICY IF EXISTS "bookings_admin" ON public.bookings;
CREATE POLICY "bookings_admin" ON public.bookings FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admin peut tout voir sur withdrawal_requests
DROP POLICY IF EXISTS "withdrawals_admin" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_admin" ON public.withdrawal_requests FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admin peut tout voir sur wallets
DROP POLICY IF EXISTS "wallets_admin" ON public.wallets;
CREATE POLICY "wallets_admin" ON public.wallets FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admin peut tout voir sur notifications
DROP POLICY IF EXISTS "notifs_admin" ON public.notifications;
CREATE POLICY "notifs_admin" ON public.notifications FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admin peut tout voir sur trips
DROP POLICY IF EXISTS "trips_admin" ON public.trips;
CREATE POLICY "trips_admin" ON public.trips FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admin peut tout voir sur transactions
DROP POLICY IF EXISTS "transactions_admin" ON public.transactions;
CREATE POLICY "transactions_admin" ON public.transactions FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admin peut tout voir sur ratings
DROP POLICY IF EXISTS "ratings_admin" ON public.ratings;
CREATE POLICY "ratings_admin" ON public.ratings FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);
