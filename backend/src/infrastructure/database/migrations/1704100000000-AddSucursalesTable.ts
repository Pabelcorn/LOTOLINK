import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddSucursalesTable1704100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create sucursales table
    await queryRunner.createTable(
      new Table({
        name: 'sucursales',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'banca_id',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'address',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'operator_prefix',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'ticket_config',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key to bancas table
    await queryRunner.createForeignKey(
      'sucursales',
      new TableForeignKey({
        columnNames: ['banca_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'bancas',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'sucursales',
      new TableIndex({
        name: 'IDX_SUCURSALES_BANCA_ID',
        columnNames: ['banca_id'],
      }),
    );

    await queryRunner.createIndex(
      'sucursales',
      new TableIndex({
        name: 'IDX_SUCURSALES_CODE',
        columnNames: ['code'],
      }),
    );

    await queryRunner.createIndex(
      'sucursales',
      new TableIndex({
        name: 'IDX_SUCURSALES_IS_ACTIVE',
        columnNames: ['is_active'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sucursales');
  }
}
