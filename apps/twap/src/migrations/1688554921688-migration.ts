import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1688554921688 implements MigrationInterface {
    name = 'Migration1688554921688'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "safe_tx"
            ADD "nonce" integer NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "safe_tx" DROP COLUMN "nonce"
        `);
    }

}
