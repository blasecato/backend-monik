import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1774585278522 implements MigrationInterface {
    name = 'Migration1774585278522'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product" DROP CONSTRAINT "product_nutritional_table_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "product" DROP CONSTRAINT "product_description_check"`);
        await queryRunner.query(`ALTER TABLE "product" DROP CONSTRAINT "product_product_origin_check"`);
        await queryRunner.query(`ALTER TABLE "product" DROP CONSTRAINT "product_chef_tip_check"`);
        await queryRunner.query(`ALTER TABLE "category" ADD "image_url" text`);
        await queryRunner.query(`ALTER TABLE "product" ADD CONSTRAINT "UQ_55be9bc461d34c7031085aea158" UNIQUE ("nutritional_table_id")`);
        await queryRunner.query(`ALTER TABLE "product" ADD CONSTRAINT "FK_55be9bc461d34c7031085aea158" FOREIGN KEY ("nutritional_table_id") REFERENCES "nutritional_table"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product" DROP CONSTRAINT "FK_55be9bc461d34c7031085aea158"`);
        await queryRunner.query(`ALTER TABLE "product" DROP CONSTRAINT "UQ_55be9bc461d34c7031085aea158"`);
        await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "image_url"`);
        await queryRunner.query(`ALTER TABLE "product" ADD CONSTRAINT "product_chef_tip_check" CHECK (((char_length(chef_tip) >= 1) AND (char_length(chef_tip) <= 300)))`);
        await queryRunner.query(`ALTER TABLE "product" ADD CONSTRAINT "product_product_origin_check" CHECK (((char_length(product_origin) >= 1) AND (char_length(product_origin) <= 1000)))`);
        await queryRunner.query(`ALTER TABLE "product" ADD CONSTRAINT "product_description_check" CHECK (((char_length(description) >= 1) AND (char_length(description) <= 1000)))`);
        await queryRunner.query(`ALTER TABLE "product" ADD CONSTRAINT "product_nutritional_table_id_fkey" FOREIGN KEY ("nutritional_table_id") REFERENCES "nutritional_table"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
