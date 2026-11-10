-- Ejercicios que un estudiante marca como mal hechos, para que el equipo los revise y corrija la IA
CREATE TABLE IF NOT EXISTS reportes_ejercicio (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo VARCHAR(30) NOT NULL,
  motivo VARCHAR(30) NOT NULL,
  comentario VARCHAR(500),
  contenido JSONB NOT NULL DEFAULT '{}'::jsonb,
  estado VARCHAR(12) NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'revisado')),
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revisado_en TIMESTAMPTZ
);

-- El equipo los lee por estado y del más nuevo al más viejo
CREATE INDEX IF NOT EXISTS idx_reportes_estado_fecha ON reportes_ejercicio (estado, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_reportes_usuario ON reportes_ejercicio (usuario_id, fecha DESC);
