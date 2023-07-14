import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationRenameIdToBlockNumber1689337434731
  implements MigrationInterface
{
  name = 'MigrationRenameIdToBlockNumber1689337434731';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "block"
                RENAME COLUMN "id" TO "blockNumber"
        `);
    await queryRunner.query(`
            ALTER TABLE "block"
                RENAME CONSTRAINT "PK_1b9475c493f63782c325ae15df1" TO "PK_acdc83cd7d96dbb4fb3cd8cabfa"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "block"
                RENAME CONSTRAINT "PK_acdc83cd7d96dbb4fb3cd8cabfa" TO "PK_1b9475c493f63782c325ae15df1"
        `);
    await queryRunner.query(`
            ALTER TABLE "block"
                RENAME COLUMN "blockNumber" TO "id"
        `);
  }
}
