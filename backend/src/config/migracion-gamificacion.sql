-- ============================================================
-- TutorIA's — Migración 1: gamificación completa
-- Ejecutar UNA sola vez sobre la base de datos de Railway (pgAdmin).
-- Es segura de repetir: todo usa IF NOT EXISTS.
-- ============================================================

-- Columna que faltaba y rompía la racha y la meta diaria
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS actividades_hoy INTEGER DEFAULT 0;

-- Economía interna
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS monedas INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS escudos INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pistas INTEGER DEFAULT 3;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS vidas INTEGER DEFAULT 5;

-- Récord de racha y liga actual
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS racha_maxima INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS liga VARCHAR(20) DEFAULT 'bronce';

-- Una fila por usuario y por semana: es lo que permite calcular
-- la clasificación y los ascensos sin perder el historial.
CREATE TABLE IF NOT EXISTS liga_semanal (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    semana DATE NOT NULL,                      -- lunes de esa semana
    liga VARCHAR(20) NOT NULL DEFAULT 'bronce',
    grupo INTEGER NOT NULL DEFAULT 1,          -- grupos de 30 personas
    xp INTEGER NOT NULL DEFAULT 0,
    UNIQUE (usuario_id, semana)
);

CREATE INDEX IF NOT EXISTS idx_liga_semanal_tabla
    ON liga_semanal (semana, liga, grupo, xp DESC);

-- Registro de compras, para poder auditar la economía después
CREATE TABLE IF NOT EXISTS compras_tienda (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    articulo_id VARCHAR(40) NOT NULL,
    precio INTEGER NOT NULL,
    fecha TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compras_usuario
    ON compras_tienda (usuario_id, fecha DESC);
