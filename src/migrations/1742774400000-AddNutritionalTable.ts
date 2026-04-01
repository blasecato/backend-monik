import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNutritionalTable1742774400000 implements MigrationInterface {
  name = 'AddNutritionalTable1742774400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla nutritional_table con todas las columnas
    await queryRunner.query(`
      CREATE TABLE "nutritional_table" (
        "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "calories" numeric NOT NULL,
        "protein" numeric NOT NULL,
        "fat" numeric NOT NULL,
        "carbohydrates" numeric NOT NULL,
        "fiber" numeric NOT NULL,
        "sugar" numeric NOT NULL,
        "energy_calories" numeric,
        "total_fat" numeric,
        "saturated_fat" numeric,
        "trans_fat" numeric,
        "total_carbohydrates" numeric,
        "dietary_fiber" numeric,
        "total_sugars" numeric,
        "added_sugars" numeric,
        "sodium" numeric,
        "vitamin_a" numeric,
        "vitamin_d" numeric,
        "iron" numeric,
        "calcium" numeric,
        "zinc" numeric
      )
    `);

    // Agregar columnas a product
    await queryRunner.query(`
      ALTER TABLE "product"
        ADD COLUMN "nutritional_table_id" bigint REFERENCES "nutritional_table" ("id"),
        ADD COLUMN "images" jsonb,
        ADD COLUMN "description" text CHECK (char_length(description) BETWEEN 1 AND 1000),
        ADD COLUMN "product_origin" text CHECK (char_length(product_origin) BETWEEN 1 AND 1000),
        ADD COLUMN "chef_tip" text CHECK (char_length(chef_tip) BETWEEN 1 AND 300)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar columnas de product
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "nutritional_table_id"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "images"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "product_origin"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "chef_tip"`);

    // Eliminar tabla nutritional_table
    await queryRunner.query(`DROP TABLE IF EXISTS "nutritional_table"`);
  }
}
