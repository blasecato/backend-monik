import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetProductSortOrder1747600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE product
      SET sort_order = CASE id
        WHEN 13 THEN 1   -- Canela x14 (CANELA SELECCIONADA 14gr)
        WHEN 14 THEN 2   -- Canela x7 (CANELA SELECCIONADA 7gr)
        WHEN 15 THEN 3   -- Canela Molida (CANELA PURA MOLIDA)
        WHEN 33 THEN 4   -- CLAVOS DE OLOR x7gr
        WHEN 34 THEN 5   -- CLAVOS DE OLOR x14gr
        WHEN 20 THEN 6   -- NUEZ MOSCADA x9gr
        WHEN 21 THEN 7   -- NUEZ MOSCADA MOLIDA
        WHEN 35 THEN 8   -- ANIS x15gr
        WHEN 36 THEN 9   -- ARANDANOS DESHIDRATADOS
        WHEN 23 THEN 10  -- Nuez del Brasil
        WHEN 37 THEN 11  -- ALMENDRA x70gr
        WHEN 38 THEN 12  -- CIRUELA PASA
        WHEN 39 THEN 13  -- UVAS PASAS x60gr
        WHEN 40 THEN 14  -- Uvas Pasas x240gr
        WHEN 41 THEN 15  -- FRUTA CRISTALIZADA
        WHEN 42 THEN 16  -- GRAGEAS x50gr
        WHEN 31 THEN 17  -- COCO DESHIDRATADO x40gr
        WHEN 32 THEN 18  -- COCO DESHIDRATADO x100gr
        WHEN 30 THEN 19  -- Levadura x50gr
        WHEN 29 THEN 20  -- Levadura x28gr
        WHEN 26 THEN 21  -- Bicarbonato x100gr
        WHEN 27 THEN 22  -- Bicarbonato x240gr
        WHEN 28 THEN 23  -- Bicarbonato x480gr
        WHEN 25 THEN 24  -- Polvo para hornear
        WHEN 2  THEN 25  -- Orégano x18
        WHEN 8  THEN 26  -- Tomillo x18gr
        WHEN 3  THEN 27  -- Laurel x18
        WHEN 43 THEN 28  -- FINAS HIERBAS
        WHEN 9  THEN 29  -- Albahaca x16gr
        WHEN 24 THEN 30  -- Linaza x70gr
        WHEN 10 THEN 31  -- Semillas de Chia x40
        -- posición 32 reservada para SEMILLA DE CHIA x240 (no existe aún)
        WHEN 11 THEN 33  -- Ajonjoli x40gr
        WHEN 6  THEN 34  -- Color x70
        WHEN 44 THEN 35  -- SAZONADOR DE CARNES
        WHEN 22 THEN 36  -- Curcuma x28gr
        WHEN 7  THEN 37  -- Pimienta Molida x16g
        WHEN 5  THEN 38  -- Pimienta Pepa x16
        WHEN 12 THEN 39  -- Comino x17gr
        WHEN 1  THEN 40  -- Paprika x25gr
        WHEN 16 THEN 41  -- Jengibre x24gr
        WHEN 17 THEN 42  -- Ajo Molido
        WHEN 45 THEN 43  -- PASABOCAS SURTIDO
        WHEN 19 THEN 44  -- Flor de Jamaica x15gr
        WHEN 18 THEN 45  -- Flor de Jamaica x50gr
        ELSE sort_order
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE product SET sort_order = 0`);
  }
}
