import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1688066336403 implements MigrationInterface {
  name = 'Migration1688066336403';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "wallet" DROP CONSTRAINT "FK_43396129d4329e711c4b92e8a99"
        `);
    await queryRunner.query(`
            ALTER TABLE "wallet" DROP COLUMN "ordersId"
        `);
    await queryRunner.query(`
            ALTER TABLE "order"
            ADD "walletAddress" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "order"
            ADD CONSTRAINT "FK_b9f446b7cd2f92b160780f75296" FOREIGN KEY ("walletAddress") REFERENCES "wallet"("address") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "order" DROP CONSTRAINT "FK_b9f446b7cd2f92b160780f75296"
        `);
    await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "walletAddress"
        `);
    await queryRunner.query(`
            ALTER TABLE "wallet"
            ADD "ordersId" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "wallet"
            ADD CONSTRAINT "FK_43396129d4329e711c4b92e8a99" FOREIGN KEY ("ordersId") REFERENCES "order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }
}
