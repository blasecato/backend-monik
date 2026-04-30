import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveProductOriginAndChefTip1777490000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "product_origin"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "chef_tip"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product" ADD COLUMN "product_origin" text`);
    await queryRunner.query(`ALTER TABLE "product" ADD COLUMN "chef_tip" text`);
  }
}
