CREATE TABLE IF NOT EXISTS "CAP" (
  id BIGSERIAL PRIMARY KEY,
  nombres TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT NOT NULL,
  fecha_nacimiento DATE,
  matricula TEXT,
  expiracion DATE,
  control TEXT,
  imagen TEXT,
  "timestamp" TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "CRE" (
  id BIGSERIAL PRIMARY KEY,
  nombres TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT NOT NULL,
  fecha_nacimiento DATE,
  matricula TEXT,
  expiracion DATE,
  control TEXT,
  imagen TEXT,
  "timestamp" TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
