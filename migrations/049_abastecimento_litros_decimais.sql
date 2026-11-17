-- Migration 049: litros do abastecimento com casas decimais livres
--
-- A coluna era NUMERIC(10,2): qualquer valor digitado com 3 ou 4 casas
-- (ex.: 38,4567 L, como mostram as bombas) era arredondado para 2 casas.
-- Agora é NUMERIC sem escala fixa (guarda exatamente o que foi digitado),
-- limitado a menos de 1000 L por abastecimento.
--
-- Os valores já gravados não mudam (já estavam com 2 casas).

ALTER TABLE veiculos_abastecimentos
  ALTER COLUMN litros TYPE NUMERIC;

ALTER TABLE veiculos_abastecimentos
  DROP CONSTRAINT IF EXISTS chk_abastecimento_litros;
ALTER TABLE veiculos_abastecimentos
  ADD CONSTRAINT chk_abastecimento_litros CHECK (litros >= 0 AND litros < 1000);
