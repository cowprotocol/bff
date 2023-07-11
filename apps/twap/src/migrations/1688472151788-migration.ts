import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1688472151788 implements MigrationInterface {
  name = 'Migration1688472151788';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "safe_tx" (
                "safeTxHash" character varying NOT NULL,
                CONSTRAINT "PK_cfe8c20950562a40e71887f5a42" PRIMARY KEY ("safeTxHash")
            )
        `);
    await queryRunner.query(`TRUNCATE TABLE "order"`);
    await queryRunner.query(`
            ALTER TABLE "order"
            ADD "partSellAmount" character varying NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "order"
            ADD "minPartLimit" character varying NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "order"
            ADD "t0" integer NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "order"
            ADD "n" integer NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "order"
            ADD "t" integer NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "order"
            ADD "span" integer NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "span"
        `);
    await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "t"
        `);
    await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "n"
        `);
    await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "t0"
        `);
    await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "minPartLimit"
        `);
    await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "partSellAmount"
        `);
    await queryRunner.query(`
            DROP TABLE "safe_tx"
        `);
  }
}
