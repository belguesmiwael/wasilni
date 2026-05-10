-- ============================================
-- WASELNI — DATABASE SCHEMA v1.0
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  role TEXT NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger', 'driver', 'admin')),
  avatar_url TEXT,
  is_driver_verified BOOLEAN DEFAULT false,
  rating NUMERIC(3,2) DEFAULT 5.0,
  total_ratings INT DEFAULT 0,
  total_trips INT DEFAULT 0,
  badge_level TEXT DEFAULT 'nouveau' CHECK (badge_level IN ('nouveau', 'fiable', 'expert', 'elite')),
  emergency_contacts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.driver_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cin_front_url TEXT, cin_back_url TEXT, selfie_url TEXT,
  license_url TEXT, carte_grise_url TEXT,
  vehicle_photos JSONB DEFAULT '[]',
  vehicle_brand TEXT, vehicle_model TEXT, vehicle_color TEXT,
  vehicle_plate TEXT, vehicle_seats INT CHECK (vehicle_seats BETWEEN 2 AND 8),
  vehicle_year INT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','needs_revision')),
  rejection_reason TEXT, admin_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(), reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id),
  from_city TEXT NOT NULL, to_city TEXT NOT NULL,
  from_hub TEXT, to_hub TEXT,
  from_lat NUMERIC, from_lng NUMERIC, to_lat NUMERIC, to_lng NUMERIC,
  departure_time TIMESTAMPTZ NOT NULL,
  price_per_seat NUMERIC(10,2) NOT NULL CHECK (price_per_seat > 0),
  total_seats INT NOT NULL CHECK (total_seats BETWEEN 1 AND 7),
  available_seats INT NOT NULL,
  women_only BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_days TEXT[] DEFAULT '{}',
  parent_trip_id UUID REFERENCES public.trips(id),
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','full','departed','completed','cancelled')),
  current_lat NUMERIC, current_lng NUMERIC,
  last_location_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id),
  passenger_id UUID NOT NULL REFERENCES auth.users(id),
  seats_booked INT DEFAULT 1,
  total_amount NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  driver_amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment','confirmed','checked_in','completed','cancelled','expired','refunded')),
  payment_method TEXT CHECK (payment_method IN ('konnect','flouci','d17','wallet')),
  payment_reference TEXT,
  qr_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  locked_until TIMESTAMPTZ,
  checkin_driver BOOLEAN DEFAULT false, checkin_passenger BOOLEAN DEFAULT false,
  rating_given BOOLEAN DEFAULT false,
  split_group_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  balance NUMERIC(10,2) DEFAULT 0 CHECK (balance >= 0),
  total_earned NUMERIC(10,2) DEFAULT 0,
  total_withdrawn NUMERIC(10,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  booking_id UUID REFERENCES public.bookings(id),
  type TEXT NOT NULL CHECK (type IN ('credit','debit','withdrawal','refund','commission')),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 100),
  method TEXT NOT NULL CHECK (method IN ('flouci','d17','bank')),
  account_details JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid')),
  admin_notes TEXT, processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  rater_id UUID NOT NULL REFERENCES auth.users(id),
  rated_id UUID NOT NULL REFERENCES auth.users(id),
  role_rated TEXT NOT NULL CHECK (role_rated IN ('driver','passenger')),
  score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment TEXT, is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id, rater_id)
);

CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  booking_id UUID REFERENCES public.bookings(id),
  trip_id UUID REFERENCES public.trips(id),
  lat NUMERIC, lng NUMERIC, location_description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','responded','resolved','false_alarm')),
  admin_id UUID REFERENCES auth.users(id),
  admin_notes TEXT, response_time_seconds INT, resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL, body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('booking','payment','rating','sos','kyc','system','trip')),
  is_read BOOLEAN DEFAULT false, action_url TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL, name TEXT NOT NULL, address TEXT,
  lat NUMERIC NOT NULL, lng NUMERIC NOT NULL, is_active BOOLEAN DEFAULT true
);

-- RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_kyc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "profiles_write" ON public.user_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "kyc_own" ON public.driver_kyc FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "trips_read" ON public.trips FOR SELECT USING (true);
CREATE POLICY "trips_write" ON public.trips FOR ALL USING (auth.uid() = driver_id);
CREATE POLICY "bookings_passenger" ON public.bookings FOR ALL USING (auth.uid() = passenger_id);
CREATE POLICY "bookings_driver" ON public.bookings FOR SELECT USING (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND driver_id = auth.uid()));
CREATE POLICY "wallets_own" ON public.wallets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "transactions_own" ON public.transactions FOR SELECT USING (EXISTS (SELECT 1 FROM public.wallets WHERE id = wallet_id AND user_id = auth.uid()));
CREATE POLICY "withdrawals_own" ON public.withdrawal_requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "ratings_read" ON public.ratings FOR SELECT USING (is_visible = true);
CREATE POLICY "ratings_write" ON public.ratings FOR INSERT USING (auth.uid() = rater_id);
CREATE POLICY "sos_own" ON public.sos_alerts FOR INSERT USING (auth.uid() = user_id);
CREATE POLICY "notifs_own" ON public.notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "hubs_read" ON public.hubs FOR SELECT USING (true);

-- Trigger: new user → profile + wallet
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, phone, gender, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name','Utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'phone',''),
    COALESCE(NEW.raw_user_meta_data->>'gender','male'),
    COALESCE(NEW.raw_user_meta_data->>'role','passenger'))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: update rating
CREATE OR REPLACE FUNCTION public.update_user_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.user_profiles SET
    rating = (SELECT AVG(score) FROM public.ratings WHERE rated_id = NEW.rated_id AND is_visible = true),
    total_ratings = (SELECT COUNT(*) FROM public.ratings WHERE rated_id = NEW.rated_id AND is_visible = true)
  WHERE id = NEW.rated_id;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS on_rating_created ON public.ratings;
CREATE TRIGGER on_rating_created AFTER INSERT ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.update_user_rating();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Seed hubs
INSERT INTO public.hubs (city, name, address, lat, lng) VALUES
('Tunis','Bardo — Carrefour','23 Avenue du Bardo, Bardo',36.8093,10.1397),
('Tunis','Lac — Shopping','Les Berges du Lac I',36.8290,10.2311),
('Tunis','Montplaisir — Métro','Av. de la Liberté',36.8050,10.1823),
('Sfax','Centre — Hab. Bourguiba','Av. Habib Bourguiba, Sfax',34.7398,10.7600),
('Sfax','Aéroport Sfax-Thyna','Route Aéroport, Sfax',34.7179,10.6909),
('Sfax','Sakiet — Total','Route Tunis km5',34.7735,10.7241),
('Sousse','Kantaoui — Centre','Port El Kantaoui',35.8853,10.5950),
('Sousse','Centre — Place Farhat','Place Farhat Hached',35.8256,10.6369),
('Monastir','Aéroport Monastir','Aéroport H. Bourguiba',35.7588,10.7547),
('Bizerte','Centre-ville','Av. de France',37.2760,9.8754),
('Nabeul','Centre — Marché','Av. H. Bourguiba',36.4551,10.7358),
('Kairouan','Médina — Place','Place du 7 Novembre',35.6781,10.0963),
('Gabès','Centre — Passat','Av. H. Bourguiba',33.8817,10.0982)
ON CONFLICT DO NOTHING;
