import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1689603792573 implements MigrationInterface {
    name = 'Migration1689603792573'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "order"
            ADD "executedBuyAmount" bigint
        `);
        await queryRunner.query(`
            ALTER TABLE "order"
            ADD "executedSellAmount" bigint
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "executedSellAmount"
        `);
        await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "executedBuyAmount"
        `);
    }

}
