-- Revisión de la base: índices para las consultas de cada estudiante y reglas de integridad.
-- No borra ni modifica datos: cada regla se agrega solo si los datos actuales ya la cumplen.

-- El inicio de sesión busca por LOWER(correo): sin este índice recorre toda la tabla
CREATE INDEX IF NOT EXISTS idx_usuarios_correo_lower ON usuarios (LOWER(correo));

-- Historial, progreso y métricas filtran siempre por estudiante y ordenan por fecha
CREATE INDEX IF NOT EXISTS idx_ejercicios_usuario ON ejercicios (usuario_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_conversaciones_usuario ON conversaciones (usuario_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_diagnosticos_usuario ON diagnosticos_nivel (usuario_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_lecturas_completadas_lectura ON lecturas_completadas (lectura_id);

DO $$
BEGIN
  -- Una palabra no se repite en el vocabulario de un estudiante, sin importar mayúsculas
  IF NOT EXISTS (
    SELECT 1 FROM vocabulario_usuario
    GROUP BY usuario_id, LOWER(palabra) HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vocabulario_palabra_unica
      ON vocabulario_usuario (usuario_id, LOWER(palabra));
  END IF;

  -- Saldos y contadores nunca negativos; NOT VALID protege lo nuevo sin revisar lo viejo
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_saldos_positivos') THEN
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_saldos_positivos
      CHECK (monedas >= 0 AND escudos >= 0 AND pistas >= 0 AND puntos >= 0 AND racha_dias >= 0) NOT VALID;
  END IF;

  -- El nivel solo puede ser uno de los seis del Marco Común Europeo
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_nivel_mcer_valido') THEN
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_nivel_mcer_valido
      CHECK (nivel_mcer IS NULL OR nivel_mcer IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')) NOT VALID;
  END IF;

  -- Todo registro de seguimiento pertenece a un estudiante: se exige solo si no hay huérfanos
  IF NOT EXISTS (SELECT 1 FROM ejercicios WHERE usuario_id IS NULL) THEN
    ALTER TABLE ejercicios ALTER COLUMN usuario_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM conversaciones WHERE usuario_id IS NULL) THEN
    ALTER TABLE conversaciones ALTER COLUMN usuario_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM diagnosticos_nivel WHERE usuario_id IS NULL) THEN
    ALTER TABLE diagnosticos_nivel ALTER COLUMN usuario_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vocabulario_usuario WHERE usuario_id IS NULL) THEN
    ALTER TABLE vocabulario_usuario ALTER COLUMN usuario_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM actividades WHERE usuario_id IS NULL) THEN
    ALTER TABLE actividades ALTER COLUMN usuario_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM liga_semanal WHERE usuario_id IS NULL) THEN
    ALTER TABLE liga_semanal ALTER COLUMN usuario_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM compras_tienda WHERE usuario_id IS NULL) THEN
    ALTER TABLE compras_tienda ALTER COLUMN usuario_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM roleplays WHERE usuario_id IS NULL) THEN
    ALTER TABLE roleplays ALTER COLUMN usuario_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM lecturas_completadas WHERE usuario_id IS NULL OR lectura_id IS NULL) THEN
    ALTER TABLE lecturas_completadas ALTER COLUMN usuario_id SET NOT NULL;
    ALTER TABLE lecturas_completadas ALTER COLUMN lectura_id SET NOT NULL;
  END IF;
END $$;
