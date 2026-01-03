import { v4 as uuidv4 } from 'uuid';
import { PlayStatus, BetType, Currency } from '../value-objects';

export interface PlayPayment {
  method: 'wallet' | 'card' | 'bank';
  walletTransactionId?: string;
  cardLast4?: string;
}

export interface PlayProps {
  id?: string;
  requestId: string;
  userId: string;
  lotteryId: string;
  numbers: string[];
  betType: BetType;
  amount: number;
  currency: Currency;
  payment: PlayPayment;
  status?: PlayStatus;
  playIdBanca?: string;
  ticketCode?: string;
  bancaId?: string;
  sucursalId?: string;
  sorteoNumber?: string;
  sorteoTime?: string;
  sorteoName?: string;
  barcode?: string;
  validUntil?: Date;
  operatorUserId?: string;
  modality?: string;
  receiptPrintedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Play {
  readonly id: string;
  readonly requestId: string;
  readonly userId: string;
  readonly lotteryId: string;
  readonly numbers: string[];
  readonly betType: BetType;
  readonly amount: number;
  readonly currency: Currency;
  readonly payment: PlayPayment;
  private _status: PlayStatus;
  private _playIdBanca?: string;
  private _ticketCode?: string;
  private _bancaId?: string;
  private _sucursalId?: string;
  private _sorteoNumber?: string;
  private _sorteoTime?: string;
  private _sorteoName?: string;
  private _barcode?: string;
  private _validUntil?: Date;
  private _operatorUserId?: string;
  private _modality?: string;
  private _receiptPrintedAt?: Date;
  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(props: PlayProps) {
    this.id = props.id || uuidv4();
    this.requestId = props.requestId;
    this.userId = props.userId;
    this.lotteryId = props.lotteryId;
    this.numbers = props.numbers;
    this.betType = props.betType;
    this.amount = props.amount;
    this.currency = props.currency;
    this.payment = props.payment;
    this._status = props.status || PlayStatus.PENDING;
    this._playIdBanca = props.playIdBanca;
    this._ticketCode = props.ticketCode;
    this._bancaId = props.bancaId;
    this._sucursalId = props.sucursalId;
    this._sorteoNumber = props.sorteoNumber;
    this._sorteoTime = props.sorteoTime;
    this._sorteoName = props.sorteoName;
    this._barcode = props.barcode;
    this._validUntil = props.validUntil;
    this._operatorUserId = props.operatorUserId;
    this._modality = props.modality;
    this._receiptPrintedAt = props.receiptPrintedAt;
    this.createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  get status(): PlayStatus {
    return this._status;
  }

  get playIdBanca(): string | undefined {
    return this._playIdBanca;
  }

  get ticketCode(): string | undefined {
    return this._ticketCode;
  }

  get bancaId(): string | undefined {
    return this._bancaId;
  }

  get sucursalId(): string | undefined {
    return this._sucursalId;
  }

  get sorteoNumber(): string | undefined {
    return this._sorteoNumber;
  }

  get sorteoTime(): string | undefined {
    return this._sorteoTime;
  }

  get sorteoName(): string | undefined {
    return this._sorteoName;
  }

  get barcode(): string | undefined {
    return this._barcode;
  }

  get validUntil(): Date | undefined {
    return this._validUntil;
  }

  get operatorUserId(): string | undefined {
    return this._operatorUserId;
  }

  get modality(): string | undefined {
    return this._modality;
  }

  get receiptPrintedAt(): Date | undefined {
    return this._receiptPrintedAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  confirm(playIdBanca: string, ticketCode: string): void {
    if (this._status !== PlayStatus.PENDING && this._status !== PlayStatus.PROCESSING) {
      throw new Error(`Cannot confirm play with status ${this._status}`);
    }
    this._status = PlayStatus.CONFIRMED;
    this._playIdBanca = playIdBanca;
    this._ticketCode = ticketCode;
    this._updatedAt = new Date();
  }

  reject(_reason?: string): void {
    if (this._status !== PlayStatus.PENDING && this._status !== PlayStatus.PROCESSING) {
      throw new Error(`Cannot reject play with status ${this._status}`);
    }
    this._status = PlayStatus.REJECTED;
    this._updatedAt = new Date();
  }

  fail(_reason?: string): void {
    if (this._status !== PlayStatus.PENDING && this._status !== PlayStatus.PROCESSING) {
      throw new Error(`Cannot fail play with status ${this._status}`);
    }
    this._status = PlayStatus.FAILED;
    this._updatedAt = new Date();
  }

  markAsProcessing(): void {
    if (this._status !== PlayStatus.PENDING) {
      throw new Error(`Cannot mark as processing play with status ${this._status}`);
    }
    this._status = PlayStatus.PROCESSING;
    this._updatedAt = new Date();
  }

  assignToBanca(bancaId: string): void {
    this._bancaId = bancaId;
    this._updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      requestId: this.requestId,
      userId: this.userId,
      lotteryId: this.lotteryId,
      numbers: this.numbers,
      betType: this.betType,
      amount: this.amount,
      currency: this.currency,
      payment: this.payment,
      status: this._status,
      playIdBanca: this._playIdBanca,
      ticketCode: this._ticketCode,
      bancaId: this._bancaId,
      sucursalId: this._sucursalId,
      sorteoNumber: this._sorteoNumber,
      sorteoTime: this._sorteoTime,
      sorteoName: this._sorteoName,
      barcode: this._barcode,
      validUntil: this._validUntil,
      operatorUserId: this._operatorUserId,
      modality: this._modality,
      receiptPrintedAt: this._receiptPrintedAt,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
