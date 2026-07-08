-- Trigger function: check_block_kind_constraint
-- Impide INSERT/UPDATE de bloques ZONAS_COMUNES o PLAZOS_GARANTIAS
-- en promociones kind='external'.
--
-- Regla de negocio: product.md §6.5, architecture.md §7.6
-- Un bloque editorial de tipo ZONAS_COMUNES o PLAZOS_GARANTIAS solo
-- tiene sentido en promociones de tipo 'portfolio' (promociones propias).
-- Las captaciones externas (kind='external') no disponen de estos datos.

CREATE OR REPLACE FUNCTION check_block_kind_constraint()
RETURNS TRIGGER AS $$
DECLARE
  v_kind promocion_kind;
BEGIN
  SELECT kind INTO v_kind
  FROM promociones
  WHERE id = NEW.promocion_id;

  IF v_kind = 'external'
     AND NEW.block_type IN ('ZONAS_COMUNES', 'PLAZOS_GARANTIAS') THEN
    RAISE EXCEPTION 'Blocks of type % are not allowed for external promotions', NEW.block_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER trg_check_block_kind
  BEFORE INSERT OR UPDATE ON promocion_content_blocks
  FOR EACH ROW
  EXECUTE FUNCTION check_block_kind_constraint();
