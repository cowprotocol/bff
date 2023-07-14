import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddOrderStatusAndType1689295286032
  implements MigrationInterface
{
  name = 'MigrationAddOrderStatusAndType1689295286032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "order_part" (
                "id" character varying NOT NULL,
                "orderId" character varying,
                CONSTRAINT "PK_5e4fb144df7a1c24c48d355b458" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."order_status_status_enum" AS ENUM(
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
            CREATE TABLE "order_status" (
                "id" character varying NOT NULL,
                "status" "public"."order_status_status_enum" NOT NULL,
                CONSTRAINT "PK_8ea75b2a26f83f3bc98b9c6aaf6" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "order_part"
            ADD CONSTRAINT "FK_1aa5632d84f0db4effbda0c5fdb" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "order_part" DROP CONSTRAINT "FK_1aa5632d84f0db4effbda0c5fdb"
        `);
    await queryRunner.query(`
            DROP TABLE "order_status"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."order_status_status_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "order_part"
        `);
  }
}
