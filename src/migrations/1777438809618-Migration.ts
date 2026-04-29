import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1777438809618 implements MigrationInterface {
    name = 'Migration1777438809618'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_product" DROP CONSTRAINT "order_product_order_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "order_product" DROP CONSTRAINT "order_product_product_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "orders_person_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "order_product" DROP CONSTRAINT "order_product_quantity_check"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "orders_status_check"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "order_date" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_0dce9bc93c2d2c399982d04bef" ON "product" ("category_id") `);
        await queryRunner.query(`ALTER TABLE "order_product" ADD CONSTRAINT "FK_ea143999ecfa6a152f2202895e2" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_product" ADD CONSTRAINT "FK_400f1584bf37c21172da3b15e2d" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_f98ce5e2e25879975585216277f" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_f98ce5e2e25879975585216277f"`);
        await queryRunner.query(`ALTER TABLE "order_product" DROP CONSTRAINT "FK_400f1584bf37c21172da3b15e2d"`);
        await queryRunner.query(`ALTER TABLE "order_product" DROP CONSTRAINT "FK_ea143999ecfa6a152f2202895e2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0dce9bc93c2d2c399982d04bef"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "order_date" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "orders_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'cancelled'::text, 'delivered'::text])))`);
        await queryRunner.query(`ALTER TABLE "order_product" ADD CONSTRAINT "order_product_quantity_check" CHECK ((quantity > 0))`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "orders_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_product" ADD CONSTRAINT "order_product_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_product" ADD CONSTRAINT "order_product_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
