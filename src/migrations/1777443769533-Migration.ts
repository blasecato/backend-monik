import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1777443769533 implements MigrationInterface {
    name = 'Migration1777443769533'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "address" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "address"`);
    }

}
