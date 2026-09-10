-- Migración 3: caché de fotos y videos para los ejercicios visuales

-- Guarda lo que devuelve Pexels para no gastar el límite de peticiones por hora
CREATE TABLE IF NOT EXISTS medios (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(10) NOT NULL,              -- foto o video
    consulta VARCHAR(120) NOT NULL,
    proveedor_id VARCHAR(40) NOT NULL,
    url TEXT NOT NULL,
    url_miniatura TEXT,
    autor VARCHAR(150),
    autor_url TEXT,
    fecha TIMESTAMP DEFAULT NOW(),
    UNIQUE (tipo, consulta, proveedor_id)
);

CREATE INDEX IF NOT EXISTS idx_medios_consulta ON medios (tipo, consulta);
