-- Prueba de la autorización de datos: la ley obliga a poder demostrar que
-- cada usuario aceptó la política, cuándo y qué versión

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS politica_aceptada_en TIMESTAMPTZ;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS politica_version TEXT;
