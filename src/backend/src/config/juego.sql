ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ayuda_es BOOLEAN DEFAULT true;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS actividades_hoy INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS monedas INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS escudos INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pistas INTEGER DEFAULT 3;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS vidas INTEGER DEFAULT 5;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS racha_maxima INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS liga VARCHAR(20) DEFAULT 'bronce';

CREATE TABLE IF NOT EXISTS liga_semanal (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    semana DATE NOT NULL,
    liga VARCHAR(20) NOT NULL DEFAULT 'bronce',
    grupo INTEGER NOT NULL DEFAULT 1,
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

CREATE TABLE IF NOT EXISTS lecturas (
    id SERIAL PRIMARY KEY,
    nivel VARCHAR(2) NOT NULL,
    slug VARCHAR(60) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    texto TEXT NOT NULL,
    preguntas JSONB NOT NULL,
    fecha TIMESTAMP DEFAULT NOW(),
    UNIQUE (nivel, slug)
);
CREATE INDEX IF NOT EXISTS idx_lecturas_nivel ON lecturas (nivel);

CREATE TABLE IF NOT EXISTS lecturas_completadas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    lectura_id INTEGER REFERENCES lecturas(id) ON DELETE CASCADE,
    aciertos INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    fecha TIMESTAMP DEFAULT NOW(),
    UNIQUE (usuario_id, lectura_id)
);

CREATE TABLE IF NOT EXISTS roleplays (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    escenario VARCHAR(40) NOT NULL,
    turnos INTEGER DEFAULT 0,
    fecha TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roleplays_usuario
    ON roleplays (usuario_id, fecha DESC);