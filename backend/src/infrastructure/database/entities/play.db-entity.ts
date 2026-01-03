import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('plays')
export class PlayEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'request_id', unique: true })
  @Index()
  requestId!: string;

  @Column('varchar', { name: 'user_id' })
  @Index()
  userId!: string;

  @Column('varchar', { name: 'lottery_id' })
  lotteryId!: string;

  @Column('simple-array')
  numbers!: string[];

  @Column('varchar', { name: 'bet_type' })
  betType!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  @Column('varchar', { length: 3 })
  currency!: string;

  @Column('jsonb', { name: 'payment_data' })
  paymentData!: {
    method: string;
    walletTransactionId?: string;
    cardLast4?: string;
  };

  @Column('varchar', { default: 'pending' })
  @Index()
  status!: string;

  @Column('varchar', { name: 'play_id_banca', nullable: true })
  playIdBanca?: string;

  @Column('varchar', { name: 'ticket_code', nullable: true })
  ticketCode?: string;

  @Column('varchar', { name: 'banca_id', nullable: true })
  @Index()
  bancaId?: string;

  @Column('uuid', { name: 'sucursal_id', nullable: true })
  @Index()
  sucursalId?: string;

  @Column('varchar', { name: 'sorteo_number', length: 50, nullable: true })
  @Index()
  sorteoNumber?: string;

  @Column('time', { name: 'sorteo_time', nullable: true })
  sorteoTime?: string;

  @Column('varchar', { name: 'sorteo_name', length: 100, nullable: true })
  sorteoName?: string;

  @Column('varchar', { length: 100, nullable: true })
  @Index()
  barcode?: string;

  @Column('date', { name: 'valid_until', nullable: true })
  validUntil?: Date;

  @Column('varchar', { name: 'operator_user_id', length: 50, nullable: true })
  @Index()
  operatorUserId?: string;

  @Column('varchar', { length: 20, nullable: true })
  modality?: string;

  @Column('timestamp with time zone', { name: 'receipt_printed_at', nullable: true })
  receiptPrintedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
