-- Estado del repaso espaciado FSRS de cada palabra; las palabras viejas se convierten al repasarlas

ALTER TABLE vocabulario_usuario ADD COLUMN IF NOT EXISTS ultimo_repaso TIMESTAMPTZ;
ALTER TABLE vocabulario_usuario ADD COLUMN IF NOT EXISTS fsrs_estabilidad DOUBLE PRECISION;
ALTER TABLE vocabulario_usuario ADD COLUMN IF NOT EXISTS fsrs_dificultad DOUBLE PRECISION;
ALTER TABLE vocabulario_usuario ADD COLUMN IF NOT EXISTS fsrs_estado SMALLINT; -- 0 nueva, 1 aprendiendo, 2 repaso, 3 reaprendiendo
ALTER TABLE vocabulario_usuario ADD COLUMN IF NOT EXISTS fsrs_pasos SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE vocabulario_usuario ADD COLUMN IF NOT EXISTS fsrs_repasos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vocabulario_usuario ADD COLUMN IF NOT EXISTS fsrs_fallos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vocabulario_usuario ADD COLUMN IF NOT EXISTS fsrs_dias_programados INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_vocabulario_repaso ON vocabulario_usuario (usuario_id, proximo_repaso);
