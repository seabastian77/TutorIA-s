-- Esquema inicial de TutorIA's
-- Ejecutar contra la base de datos PostgreSQL (misma instancia de ConectaProfe o una nueva)

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
