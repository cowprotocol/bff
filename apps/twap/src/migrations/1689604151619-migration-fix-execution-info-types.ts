import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1689604151619 implements MigrationInterface {
    name = 'Migration1689604151619'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "executedBuyAmount"
        `);
        await queryRunner.query(`
            ALTER TABLE "order"
            ADD "executedBuyAmount" numeric
        `);
        await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "executedSellAmount"
        `);
        await queryRunner.query(`
            ALTER TABLE "order"
            ADD "executedSellAmount" numeric
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "executedSellAmount"
        `);
        await queryRunner.query(`
            ALTER TABLE "order"
            ADD "executedSellAmount" bigint
        `);
        await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "executedBuyAmount"
        `);
        await queryRunner.query(`
            ALTER TABLE "order"
            ADD "executedBuyAmount" bigint
        `);
    }

}
