import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1773863300855 implements MigrationInterface {
    name = 'Migration1773863300855'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_inventory" DROP CONSTRAINT "product_inventory_product_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "product" DROP CONSTRAINT "product_category_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "person" DROP CONSTRAINT "person_dni_type_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "person" DROP CONSTRAINT "person_role_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "role" DROP CONSTRAINT "role_role_name_check"`);
        await queryRunner.query(`ALTER TABLE "role" ADD "key" text`);
        await queryRunner.query(`ALTER TABLE "product_inventory" ALTER COLUMN "updated_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "product_inventory" ALTER COLUMN "product_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "person" DROP CONSTRAINT "person_username_key"`);
        await queryRunner.query(`ALTER TABLE "role" DROP CONSTRAINT "role_role_name_key"`);
        await queryRunner.query(`ALTER TABLE "product_inventory" ADD CONSTRAINT "FK_6a9132b5a1d58a88bb7c405526c" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product" ADD CONSTRAINT "FK_0dce9bc93c2d2c399982d04bef1" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "person" ADD CONSTRAINT "FK_a79326298e40fbb12b82f496215" FOREIGN KEY ("dni_type_id") REFERENCES "dni_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "person" ADD CONSTRAINT "FK_7dfed12a35115c66c0ab0c22b0d" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "person" DROP CONSTRAINT "FK_7dfed12a35115c66c0ab0c22b0d"`);
        await queryRunner.query(`ALTER TABLE "person" DROP CONSTRAINT "FK_a79326298e40fbb12b82f496215"`);
        await queryRunner.query(`ALTER TABLE "product" DROP CONSTRAINT "FK_0dce9bc93c2d2c399982d04bef1"`);
        await queryRunner.query(`ALTER TABLE "product_inventory" DROP CONSTRAINT "FK_6a9132b5a1d58a88bb7c405526c"`);
        await queryRunner.query(`ALTER TABLE "role" ADD CONSTRAINT "role_role_name_key" UNIQUE ("role_name")`);
        await queryRunner.query(`ALTER TABLE "person" ADD CONSTRAINT "person_username_key" UNIQUE ("username")`);
        await queryRunner.query(`ALTER TABLE "product_inventory" ALTER COLUMN "product_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "product_inventory" ALTER COLUMN "updated_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "key"`);
        await queryRunner.query(`ALTER TABLE "role" ADD CONSTRAINT "role_role_name_check" CHECK ((role_name = ANY (ARRAY['administrador'::text, 'cliente'::text])))`);
        await queryRunner.query(`ALTER TABLE "person" ADD CONSTRAINT "person_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "person" ADD CONSTRAINT "person_dni_type_id_fkey" FOREIGN KEY ("dni_type_id") REFERENCES "dni_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
