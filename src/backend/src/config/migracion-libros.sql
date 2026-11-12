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
