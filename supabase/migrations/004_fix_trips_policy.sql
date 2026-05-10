-- Fix infinite recursion on trips policy
-- La policy trips_admin_all avait une sous-requête sur trips elle-même

DROP POLICY IF EXISTS "trips_admin_all" ON public.trips;
DROP POLICY IF EXISTS "trips_write" ON public.trips;
DROP POLICY IF EXISTS "trips_read" ON public.trips;

-- Lecture publique (tous les trajets actifs)
CREATE POLICY "trips_select_all" ON public.trips
  FOR SELECT USING (true);

-- Conducteur peut insérer/modifier/supprimer ses propres trajets
CREATE POLICY "trips_insert_driver" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "trips_update_driver" ON public.trips
  FOR UPDATE USING (auth.uid() = driver_id OR public.is_admin());

CREATE POLICY "trips_delete_driver" ON public.trips
  FOR DELETE USING (auth.uid() = driver_id OR public.is_admin());
