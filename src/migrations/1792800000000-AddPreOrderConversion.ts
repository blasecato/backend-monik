import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marca el paso de prepedido a orden. No se borra el prepedido: queda el
 * rastro de qué visita originó qué pedido, y `order_id` único impide
 * convertirlo dos veces aunque se repita la petición.
 */
export class AddPreOrderConversion1792800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pre_order"
        ADD COLUMN IF NOT EXISTS "converted_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "order_id" bigint
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_pre_order_order'
        ) THEN
          ALTER TABLE "pre_order"
            ADD CONSTRAINT "FK_pre_order_order"
            FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_pre_order_order"
        ON "pre_order" ("order_id") WHERE "order_id" IS NOT NULL
    `);

    // El listado consulta los pendientes; el índice evita recorrer la tabla.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pre_order_pending"
        ON "pre_order" ("created_at" DESC, "id" DESC) WHERE "converted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pre_order_pending"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_pre_order_order"`);
    await queryRunner.query(
      `ALTER TABLE "pre_order" DROP CONSTRAINT IF EXISTS "FK_pre_order_order"`,
    );
    await queryRunner.query(`
      ALTER TABLE "pre_order"
        DROP COLUMN IF EXISTS "order_id",
        DROP COLUMN IF EXISTS "converted_at"
    `);
  }
}
