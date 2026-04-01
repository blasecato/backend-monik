import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1774684142191 implements MigrationInterface {
    name = 'Migration1774684142191'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "inventory_movements_product_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "inventory_movements_type_check"`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "inventory_movements_quantity_check"`);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" SERIAL NOT NULL, "token" character varying NOT NULL, "personId" bigint NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4542dd2f38a61354a040ba9fd57" UNIQUE ("token"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ALTER COLUMN "created_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ALTER COLUMN "product_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ADD CONSTRAINT "FK_5c3bec1682252c36fa161587738" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_384e82f8a25d3247907a3739a09" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_384e82f8a25d3247907a3739a09"`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_5c3bec1682252c36fa161587738"`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ALTER COLUMN "product_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ALTER COLUMN "created_at" DROP NOT NULL`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_quantity_check" CHECK ((quantity > 0))`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_type_check" CHECK ((type = ANY (ARRAY['entrada'::text, 'salida'::text])))`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
