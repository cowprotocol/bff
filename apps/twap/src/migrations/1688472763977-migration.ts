import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1688472763977 implements MigrationInterface {
    name = 'Migration1688472763977'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "safeTxHash"
        `);
        await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "nonce"
        `);
        await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "confirmations"
        `);
        await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "confirmationsRequired"
        `);
        await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "submissionDate"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "order"
            ADD "submissionDate" date NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "order"
            ADD "confirmationsRequired" integer NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "order"
            ADD "confirmations" integer NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "order"
            ADD "nonce" integer NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "order"
            ADD "safeTxHash" character varying NOT NULL
        `);
    }

}
