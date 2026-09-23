-- Registro de cada actividad terminada, para medir el uso de la app en el trabajo de grado

CREATE TABLE IF NOT EXISTS actividades (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    modulo VARCHAR(30) NOT NULL DEFAULT 'otro',
    xp INTEGER NOT NULL DEFAULT 0,
    perfecto BOOLEAN NOT NULL DEFAULT false,
    recuperada BOOLEAN NOT NULL DEFAULT false, -- reconstruida del historial anterior al registro
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actividades_fecha ON actividades (fecha);
CREATE INDEX IF NOT EXISTS idx_actividades_usuario ON actividades (usuario_id, fecha);

-- Reconstruye lo que ya había en las tablas de cada módulo; solo corre con la tabla vacía,
-- así que nunca duplica lo que el registro nuevo ya empezó a guardar
INSERT INTO actividades (usuario_id, modulo, recuperada, fecha)
SELECT usuario_id, modulo, true, fecha FROM (
    SELECT usuario_id,
           CASE WHEN tipo IN ('dictado', 'audio_comprension') THEN 'audio'
                WHEN tipo = 'visual' THEN 'visual'
                ELSE 'practica' END AS modulo,
           fecha
      FROM ejercicios
     WHERE correcto IS NOT NULL
    UNION ALL
    SELECT usuario_id, 'roleplay', fecha FROM roleplays
    UNION ALL
    SELECT usuario_id, 'biblioteca', fecha FROM lecturas_completadas
    UNION ALL
    SELECT usuario_id, 'nivel', fecha FROM diagnosticos_nivel
) historial
WHERE usuario_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM actividades);
