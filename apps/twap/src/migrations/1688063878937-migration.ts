import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1688063878937 implements MigrationInterface {
  name = 'Migration1688063878937';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "wallet" (
                "address" character varying NOT NULL,
                "ordersId" character varying,
                CONSTRAINT "PK_1dcc9f5fd49e3dc52c6d2393c53" PRIMARY KEY ("address")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "order" (
                "id" character varying NOT NULL,
                "sellToken" character varying NOT NULL,
                "buyToken" character varying NOT NULL,
                "appData" character varying NOT NULL,
                "receiver" character varying NOT NULL,
                "chainId" character varying NOT NULL,
                "safeTxHash" character varying NOT NULL,
                "nonce" integer NOT NULL,
                "confirmations" integer NOT NULL,
                "confirmationsRequired" integer NOT NULL,
                "submissionDate" date NOT NULL,
                CONSTRAINT "PK_1031171c13130102495201e3e20" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "wallet"
            ADD CONSTRAINT "FK_43396129d4329e711c4b92e8a99" FOREIGN KEY ("ordersId") REFERENCES "order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "wallet" DROP CONSTRAINT "FK_43396129d4329e711c4b92e8a99"
        `);
    await queryRunner.query(`
            DROP TABLE "order"
        `);
    await queryRunner.query(`
            DROP TABLE "wallet"
        `);
  }
}
