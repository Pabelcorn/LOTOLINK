import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAuthFieldsToUsers1704350400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add date_of_birth column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'date_of_birth',
        type: 'date',
        isNullable: true,
      })
    );

    // Add google_id column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'google_id',
        type: 'varchar',
        isNullable: true,
        isUnique: true,
      })
    );

    // Add apple_id column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'apple_id',
        type: 'varchar',
        isNullable: true,
        isUnique: true,
      })
    );

    // Add facebook_id column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'facebook_id',
        type: 'varchar',
        isNullable: true,
        isUnique: true,
      })
    );

    // Create indexes for OAuth IDs for faster lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_google_id" ON "users" ("google_id")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_apple_id" ON "users" ("apple_id")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_facebook_id" ON "users" ("facebook_id")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_google_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_apple_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_facebook_id"`);

    // Drop columns
    await queryRunner.dropColumn('users', 'facebook_id');
    await queryRunner.dropColumn('users', 'apple_id');
    await queryRunner.dropColumn('users', 'google_id');
    await queryRunner.dropColumn('users', 'date_of_birth');
  }
}
