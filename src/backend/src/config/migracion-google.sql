-- Entrar con Google: la cuenta queda atada al id que da Google, no al correo

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS google_id TEXT;

-- Único, pero dejando pasar los NULL de quienes entran con contraseña
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_google_id
  ON usuarios (google_id) WHERE google_id IS NOT NULL;

-- Quien se registra con Google no tiene contraseña que guardar
ALTER TABLE usuarios
  ALTER COLUMN contrasena_hash DROP NOT NULL;
