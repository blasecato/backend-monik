-- Ejecutar manualmente en la misma base y rama de Neon que usa el backend.
-- Requiere las tablas pre_order y orders existentes.
-- Equivalente a AddPreOrderConversion1792800000000.
-- Conserva los registros existentes; admite volver a ejecutarlo.
BEGIN;

ALTER TABLE "pre_order"
  ADD COLUMN IF NOT EXISTS "converted_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "order_id" bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'FK_pre_order_order'
      AND conrelid = 'pre_order'::regclass
  ) THEN
    ALTER TABLE "pre_order"
      ADD CONSTRAINT "FK_pre_order_order"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_pre_order_order"
  ON "pre_order" ("order_id") WHERE "order_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "IDX_pre_order_pending"
  ON "pre_order" ("created_at" DESC, "id" DESC) WHERE "converted_at" IS NULL;

COMMIT;
