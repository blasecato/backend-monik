-- Ejecutar manualmente en el SQL Editor de la base de datos Neon del proyecto.
-- No modifica pedidos, pagos ni inventario existentes.
-- Mismo DDL que CreatePreOrders1792540800000.
BEGIN;

CREATE TABLE IF NOT EXISTS "pre_order" (
    "id" bigserial NOT NULL,
    "establishment_name" varchar(200) NOT NULL,
    "address" varchar(500),
    "notes" varchar(2000),
    "created_by" bigint NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    "version" integer NOT NULL DEFAULT 1,
    CONSTRAINT "PK_pre_order" PRIMARY KEY ("id"),
    CONSTRAINT "CHK_pre_order_establishment" CHECK (length(btrim("establishment_name")) BETWEEN 1 AND 200),
    CONSTRAINT "CHK_pre_order_version" CHECK ("version" >= 1),
    CONSTRAINT "FK_pre_order_author" FOREIGN KEY ("created_by") REFERENCES "person"("id") ON DELETE RESTRICT
  );

CREATE TABLE IF NOT EXISTS "pre_order_product" (
    "pre_order_id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "existing_quantity" integer NOT NULL DEFAULT 0,
    "requested_quantity" integer NOT NULL DEFAULT 0,
    CONSTRAINT "PK_pre_order_product" PRIMARY KEY ("pre_order_id", "product_id"),
    CONSTRAINT "CHK_pre_order_product_existing" CHECK ("existing_quantity" >= 0),
    CONSTRAINT "CHK_pre_order_product_requested" CHECK ("requested_quantity" >= 0),
    CONSTRAINT "FK_pre_order_product_header" FOREIGN KEY ("pre_order_id") REFERENCES "pre_order"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_pre_order_product_product" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT
  );

CREATE INDEX IF NOT EXISTS "IDX_pre_order_author_date" ON "pre_order" ("created_by", "created_at" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "IDX_pre_order_date" ON "pre_order" ("created_at" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "IDX_pre_order_product_product" ON "pre_order_product" ("product_id");

COMMIT;
