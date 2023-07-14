import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1689302132629 implements MigrationInterface {
    name = 'Migration1689302132629'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "order_status"
                RENAME COLUMN "id" TO "orderId"
        `);
        await queryRunner.query(`
            ALTER TABLE "order_status"
                RENAME CONSTRAINT "PK_8ea75b2a26f83f3bc98b9c6aaf6" TO "PK_014fe4a8ab95c64fdb7b8beb253"
        `);
        await queryRunner.query(`
            ALTER TABLE "order"
            ADD "statusOrderId" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "order"
            ADD CONSTRAINT "UQ_9496f9d1ea4f40147049da67e54" UNIQUE ("statusOrderId")
        `);
        await queryRunner.query(`
            ALTER TABLE "order"
            ADD CONSTRAINT "FK_9496f9d1ea4f40147049da67e54" FOREIGN KEY ("statusOrderId") REFERENCES "order_status"("orderId") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "order" DROP CONSTRAINT "FK_9496f9d1ea4f40147049da67e54"
        `);
        await queryRunner.query(`
            ALTER TABLE "order" DROP CONSTRAINT "UQ_9496f9d1ea4f40147049da67e54"
        `);
        await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "statusOrderId"
        `);
        await queryRunner.query(`
            ALTER TABLE "order_status"
                RENAME CONSTRAINT "PK_014fe4a8ab95c64fdb7b8beb253" TO "PK_8ea75b2a26f83f3bc98b9c6aaf6"
        `);
        await queryRunner.query(`
            ALTER TABLE "order_status"
                RENAME COLUMN "orderId" TO "id"
        `);
    }

}
