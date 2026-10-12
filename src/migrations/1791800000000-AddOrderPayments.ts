import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Libro de abonos por orden. `orders.is_paid` se conserva como bandera
 * derivada (suma de abonos >= total) para no romper el panel, el Excel ni los
 * filtros existentes: el servicio la recalcula dentro de la misma transacción
 * que inserta o borra un abono.
 */
export class AddOrderPayments1791800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_payment" (
        "id"         bigserial   NOT NULL,
        "order_id"   bigint      NOT NULL,
        "amount"     numeric     NOT NULL,
        "note"       text,
        "created_by" bigint,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_payment" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_order_payment_amount" CHECK ("amount" > 0),
        CONSTRAINT "FK_order_payment_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_payment_person" FOREIGN KEY ("created_by")
          REFERENCES "person"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_order_payment_order"
        ON "order_payment" ("order_id")
    `);

    // Las órdenes ya marcadas como pagadas no tienen abonos: sin este relleno
    // el sistema diría que deben el total completo.
    await queryRunner.query(`
      INSERT INTO "order_payment" ("order_id", "amount", "note")
      SELECT o."id", o."total_value", 'Pago registrado antes del control de abonos'
      FROM "orders" o
      WHERE o."is_paid" = true
        AND o."total_value" > 0
        AND NOT EXISTS (
          SELECT 1 FROM "order_payment" p WHERE p."order_id" = o."id"
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "order_payment"`);
  }
}
