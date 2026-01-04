import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { unique: true })
  @Index()
  phone!: string;

  @Column('varchar', { nullable: true })
  @Index()
  email?: string;

  @Column('varchar', { nullable: true })
  name?: string;

  @Column('varchar', { nullable: true, select: false })
  password?: string;

  @Column('varchar', { default: 'user' })
  @Index()
  role!: string;

  @Column('decimal', { name: 'wallet_balance', precision: 12, scale: 2, default: 0 })
  walletBalance!: number;

  @Column('date', { name: 'date_of_birth', nullable: true })
  dateOfBirth?: Date;

  @Column('varchar', { name: 'google_id', nullable: true, unique: true })
  @Index()
  googleId?: string;

  @Column('varchar', { name: 'apple_id', nullable: true, unique: true })
  @Index()
  appleId?: string;

  @Column('varchar', { name: 'facebook_id', nullable: true, unique: true })
  @Index()
  facebookId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
