import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddBlock1689337223855 implements MigrationInterface {
  name = 'MigrationAddBlock1689337223855';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "block" (
                "id" integer NOT NULL,
                "chainId" integer NOT NULL,
                CONSTRAINT "PK_1b9475c493f63782c325ae15df1" PRIMARY KEY ("id", "chainId")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "block"
        `);
  }
}
