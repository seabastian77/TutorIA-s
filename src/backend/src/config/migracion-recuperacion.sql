-- Recuperación de contraseña: enlaces de un solo uso que vencen en una hora

CREATE TABLE IF NOT EXISTS recuperaciones_contrasena (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  -- Solo el hash: quien lea esta tabla no puede entrar con lo que ve
  token_hash TEXT NOT NULL UNIQUE,
  expira TIMESTAMPTZ NOT NULL,
  usado_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recuperaciones_usuario
  ON recuperaciones_contrasena (usuario_id);

CREATE INDEX IF NOT EXISTS idx_recuperaciones_expira
  ON recuperaciones_contrasena (expira);

-- Marca cuándo cambió la contraseña, para que las sesiones abiertas de antes
-- dejen de servir: si a alguien le robaron la cuenta, cambiarla lo saca
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS contrasena_cambiada_en TIMESTAMPTZ;
