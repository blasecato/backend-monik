import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthSessions1789776000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_sessions" (
        "jti" uuid NOT NULL,
        "person_id" bigint NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_sessions" PRIMARY KEY ("jti"),
        CONSTRAINT "FK_auth_sessions_person" FOREIGN KEY ("person_id")
          REFERENCES "person"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_sessions_person" ON "auth_sessions" ("person_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_sessions"`);
  }
}
