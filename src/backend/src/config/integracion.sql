CREATE TABLE IF NOT EXISTS diagnosticos_nivel (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nivel_mcer VARCHAR(2),
    vocabulario INTEGER,
    gramatica INTEGER,
    comprension INTEGER,
    fluidez INTEGER,
    resumen TEXT,
    fecha TIMESTAMP DEFAULT NOW()
);