import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1688633087604 implements MigrationInterface {
  name = 'Migration1688633087604';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "chainId"
        `);
    await queryRunner.query(`
        TRUNCATE TABLE "order"
        `);
    await queryRunner.query(`
            ALTER TABLE "order"
            ADD "chainId" integer NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "chainId"
        `);
    await queryRunner.query(`
            ALTER TABLE "order"
            ADD "chainId" character varying NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "safe_tx" DROP COLUMN "nonce"
        `);
  }
}
