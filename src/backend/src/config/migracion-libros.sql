-- Migración: clásicos contados por nivel y los capítulos que terminó cada estudiante

-- Cada capítulo se cuenta una vez por nivel y se reutiliza entre estudiantes
CREATE TABLE IF NOT EXISTS libros_capitulos (
    id SERIAL PRIMARY KEY,
    libro VARCHAR(60) NOT NULL,
    capitulo INTEGER NOT NULL,
    nivel VARCHAR(2) NOT NULL,
    lineas JSONB NOT NULL,
    traducciones JSONB,
    fecha TIMESTAMP DEFAULT NOW(),
    UNIQUE (libro, capitulo, nivel)
);

-- Capítulos terminados: el XP se gana solo la primera vez
CREATE TABLE IF NOT EXISTS libros_leidos (
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    libro VARCHAR(60) NOT NULL,
    capitulo INTEGER NOT NULL,
    fecha TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (usuario_id, libro, capitulo)
);

-- Libros del catálogo libre (Project Gutenberg): ficha y partes del texto comprimidas, para bajarlo una sola vez
CREATE TABLE IF NOT EXISTS libros_externos (
    id VARCHAR(20) PRIMARY KEY,
    gutenberg_id INTEGER NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    autor VARCHAR(200),
    portada TEXT,
    total INTEGER NOT NULL,
    partes BYTEA NOT NULL,
    fecha TIMESTAMP DEFAULT NOW()
);

-- Las partes de esos libros traen su propio título y ambiente; cada capítulo recuerda quién lo pidió primero
ALTER TABLE libros_capitulos ADD COLUMN IF NOT EXISTS titulo VARCHAR(120);
ALTER TABLE libros_capitulos ADD COLUMN IF NOT EXISTS titulo_es VARCHAR(120);
ALTER TABLE libros_capitulos ADD COLUMN IF NOT EXISTS ambiente VARCHAR(80);
ALTER TABLE libros_capitulos ADD COLUMN IF NOT EXISTS creado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS libros_capitulos_creador_idx ON libros_capitulos (creado_por, fecha);
