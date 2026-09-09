-- ============================================================
-- TutorIA's — esquema completo de la base de datos
-- Este archivo es la ÚNICA fuente de verdad del esquema.
-- Para una base nueva: ejecutar este archivo entero.
-- Para una base que ya existe: ejecutar migracion-gamificacion.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    nivel_mcer VARCHAR(2) DEFAULT 'A1', -- A1, A2, B1, B2, C1, C2
    fecha_registro TIMESTAMP DEFAULT NOW(),
    ultimo_acceso TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vocabulario_usuario (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    palabra VARCHAR(100) NOT NULL,
    traduccion VARCHAR(150),
    contexto TEXT,
    nivel_dominio INTEGER DEFAULT 0, -- 0 a 5 (repetición espaciada)
    proximo_repaso TIMESTAMP DEFAULT NOW(),
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ejercicios (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50), -- gramatica, vocabulario, listening, etc.
    nivel_dificultad INTEGER DEFAULT 1,
    contenido JSONB,
    correcto BOOLEAN,
    fecha TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    mensaje_usuario TEXT,
    respuesta_ia TEXT,
    correcciones JSONB,
    fecha TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagnosticos_nivel (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nivel_mcer VARCHAR(2),
    vocabulario INTEGER,   -- 0 a 100
    gramatica INTEGER,     -- 0 a 100
    comprension INTEGER,   -- 0 a 100
    fluidez INTEGER,       -- 0 a 100 (respuestas abiertas evaluadas por IA)
    resumen TEXT,          -- párrafo humano generado por IA
    fecha TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Gamificación
-- ------------------------------------------------------------

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS puntos INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS racha_dias INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultima_actividad DATE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS actividades_hoy INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS monedas INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS escudos INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pistas INTEGER DEFAULT 3;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS vidas INTEGER DEFAULT 5;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS racha_maxima INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS liga VARCHAR(20) DEFAULT 'bronce';

-- Una fila por usuario y semana: sostiene la clasificación y los ascensos
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

CREATE TABLE IF NOT EXISTS compras_tienda (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    articulo_id VARCHAR(40) NOT NULL,
    precio INTEGER NOT NULL,
    fecha TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compras_usuario
    ON compras_tienda (usuario_id, fecha DESC);
