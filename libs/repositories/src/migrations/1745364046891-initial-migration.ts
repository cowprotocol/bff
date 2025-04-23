import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1745364046891 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // This table stores the state of various indexers, allowing them to track their progress
    // and resume from where they left off after restarts.
    await queryRunner.query(`
      CREATE TABLE indexer_state (
        key TEXT NOT NULL,
        chain_id INTEGER,
        state JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (key, chain_id)
      )
  `);

    //Update the updated_at column with the current timestamp
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
`);

    // Create a trigger to automatically update the updated_at column
    await queryRunner.query(`
      CREATE TRIGGER trigger_set_updated_at
      BEFORE UPDATE ON indexer_state
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the table
    await queryRunner.query(`
      DROP TABLE IF EXISTS indexer_state
    `);
  }
}
