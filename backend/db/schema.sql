CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cas_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  gender TEXT,
  birth_date DATE,
  nacionalidad_value TEXT,
  discipline TEXT,
  main_skill_value TEXT,
  follow_up_value TEXT,
  anios_exp TEXT,
  nivel_ingles TEXT,
  nivel_ingles_id TEXT,
  estatura_valor TEXT,
  estatura_unidad TEXT,
  peso_valor TEXT,
  peso_unidad TEXT,
  pais TEXT,
  pais_value TEXT,
  ciudad TEXT,
  whatsapp TEXT,
  instagram TEXT,
  passport_num TEXT,
  passport_exp DATE,
  stcw_exp DATE,
  peme_exp DATE,
  visa_tipo TEXT,
  visa_exp DATE,
  profile_completion INTEGER DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  rejected BOOLEAN NOT NULL DEFAULT FALSE,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artist_files (
  id SERIAL PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artist_files_artist_id_idx ON artist_files(artist_id);
CREATE INDEX IF NOT EXISTS artist_files_category_idx ON artist_files(artist_id, category);

-- Archivos subidos durante Inscripción ANTES de que exista la cuenta (todavía no hay
-- sesión con la que asociarlos a un artista). Se guardan aquí con un "draft_token" temporal
-- generado por el navegador, y al completar el registro se mueven a artist_files.
CREATE TABLE IF NOT EXISTS pending_files (
  id SERIAL PRIMARY KEY,
  draft_token TEXT NOT NULL,
  category TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_files_draft_token_idx ON pending_files(draft_token);

-- Cuentas del equipo de CAS que pueden entrar al Backoffice (separado de los artistas).
CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contratos asignados a un artista, con su propio flujo de onboarding (5 pasos, cada uno
-- con un video que hay que ver completo) y firma final.
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  rol TEXT,
  pago TEXT,
  inicio DATE,
  fin DATE,
  estado TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente' | 'firmado'
  onboarding_step INTEGER NOT NULL DEFAULT 0, -- pasos del onboarding ya completados (0-5)
  signed_name TEXT,
  signed_at TIMESTAMPTZ,
  signature_data BYTEA,
  signature_mime TEXT,
  created_by UUID REFERENCES staff_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contracts_artist_id_idx ON contracts(artist_id);
