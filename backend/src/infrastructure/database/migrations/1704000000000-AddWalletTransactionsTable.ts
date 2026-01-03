import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddWalletTransactionsTable1704000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create wallet_transactions table
    await queryRunner.createTable(
      new Table({
        name: 'wallet_transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'transaction_type',
            type: 'varchar',
            length: '50',
            comment: 'Type of transaction: deposit, withdrawal, play_debit, win_credit, refund',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'DOP'",
          },
          {
            name: 'balance_before',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'balance_after',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'reference_id',
            type: 'uuid',
            isNullable: true,
            comment: 'Reference to related entity (e.g., play_id, payment_id)',
          },
          {
            name: 'reference_type',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'Type of reference: play, payment, withdrawal, etc.',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Additional transaction metadata',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'completed'",
            comment: 'Transaction status: pending, completed, failed, reversed',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'wallet_transactions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'wallet_transactions',
      new TableIndex({
        name: 'IDX_WALLET_TRANSACTIONS_USER_ID',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'wallet_transactions',
      new TableIndex({
        name: 'IDX_WALLET_TRANSACTIONS_TYPE',
        columnNames: ['transaction_type'],
      }),
    );

    await queryRunner.createIndex(
      'wallet_transactions',
      new TableIndex({
        name: 'IDX_WALLET_TRANSACTIONS_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'wallet_transactions',
      new TableIndex({
        name: 'IDX_WALLET_TRANSACTIONS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'wallet_transactions',
      new TableIndex({
        name: 'IDX_WALLET_TRANSACTIONS_REFERENCE',
        columnNames: ['reference_id', 'reference_type'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the wallet_transactions table
    await queryRunner.dropTable('wallet_transactions');
  }
}
