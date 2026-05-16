    -- Migration 035: Rename lembretes → agendamentos, merge data+hora → agendado_para

    -- 1. Rename table
    ALTER TABLE lembretes RENAME TO agendamentos;

    -- 2. Add new column
    ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS agendado_para TIMESTAMPTZ;

    -- 3. Backfill from existing data + hora
    UPDATE agendamentos SET
    agendado_para = CASE
        WHEN hora IS NOT NULL THEN (data::text || ' ' || hora::text)::timestamptz
        ELSE (data::text || ' 00:00:00')::timestamptz
    END
    WHERE data IS NOT NULL;

    -- 4. Drop old columns
    ALTER TABLE agendamentos DROP COLUMN IF EXISTS data;
    ALTER TABLE agendamentos DROP COLUMN IF EXISTS hora;
