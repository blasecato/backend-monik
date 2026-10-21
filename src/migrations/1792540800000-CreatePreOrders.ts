import { MigrationInterface, QueryRunner } from 'typeorm';
import { PRE_ORDER_SCHEMA } from '../pre-order/pre-order.schema';

export class CreatePreOrders1792540800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of PRE_ORDER_SCHEMA)
      await queryRunner.query(statement);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "pre_order_product"');
    await queryRunner.query('DROP TABLE IF EXISTS "pre_order"');
  }
}
