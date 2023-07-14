import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationRemoveOrderStatusTable1689325892801
  implements MigrationInterface
{
  name = 'MigrationRemoveOrderStatusTable1689325892801';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        TRUNCATE TABLE "order" CASCADE
    `);
    await queryRunner.query(`
        DROP TABLE "order_status"
    `);
    await queryRunner.query(`
        ALTER TABLE "order" DROP CONSTRAINT "FK_9496f9d1ea4f40147049da67e54"
    `);
    await queryRunner.query(`
        ALTER TABLE "order"
            RENAME COLUMN "statusOrderId" TO "status"
    `);
    await queryRunner.query(`
        ALTER TABLE "order"
            RENAME CONSTRAINT "UQ_9496f9d1ea4f40147049da67e54" TO "UQ_7a9573d6a1fb982772a91233205"
    `);
    await queryRunner.query(`
        ALTER TABLE "order" DROP CONSTRAINT "UQ_7a9573d6a1fb982772a91233205"
    `);
    await queryRunner.query(`
        ALTER TABLE "order" DROP COLUMN "status"
    `);
    await queryRunner.query(`
        CREATE TYPE "public"."order_status_enum" AS ENUM(
            'WaitSigning',
            'Pending',
            'Scheduled',
            'Cancelled',
            'Cancelling',
            'Expired',
            'Fulfilled'
        )
    `);
    await queryRunner.query(`
        ALTER TABLE "order"
        ADD "status" "public"."order_status_enum" NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "order" DROP COLUMN "status"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."order_status_enum"
        `);
    await queryRunner.query(`
            ALTER TABLE "order"
            ADD "status" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "order"
            ADD CONSTRAINT "UQ_7a9573d6a1fb982772a91233205" UNIQUE ("status")
        `);
    await queryRunner.query(`
            ALTER TABLE "order"
                RENAME CONSTRAINT "UQ_7a9573d6a1fb982772a91233205" TO "UQ_9496f9d1ea4f40147049da67e54"
        `);
    await queryRunner.query(`
            ALTER TABLE "order"
                RENAME COLUMN "status" TO "statusOrderId"
        `);
    await queryRunner.query(`
            ALTER TABLE "order"
            ADD CONSTRAINT "FK_9496f9d1ea4f40147049da67e54" FOREIGN KEY ("statusOrderId") REFERENCES "order_status"("orderId") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }
}
