-- Migración 2: tablas de lecturas y roleplay, e interruptor de ayuda en español

-- Interruptor de ayuda en español (por defecto encendido)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ayuda_es BOOLEAN DEFAULT true;

-- Lecturas generadas una vez por nivel y tema, reutilizadas entre usuarios
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

-- Qué lecturas terminó cada usuario y con cuántos aciertos
CREATE TABLE IF NOT EXISTS lecturas_completadas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    lectura_id INTEGER REFERENCES lecturas(id) ON DELETE CASCADE,
    aciertos INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    fecha TIMESTAMP DEFAULT NOW(),
    UNIQUE (usuario_id, lectura_id)
);

-- Historial de conversaciones de roleplay, separado del chat de voz
CREATE TABLE IF NOT EXISTS roleplays (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    escenario VARCHAR(40) NOT NULL,
    turnos INTEGER DEFAULT 0,
    fecha TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roleplays_usuario
    ON roleplays (usuario_id, fecha DESC);
