import { Play, PlayPayment, PlayProps } from '../../src/domain/entities/play.entity';
import { PlayStatus, BetType, Currency } from '../../src/domain/value-objects';

describe('Play Entity', () => {
  const createValidPlayProps = (): PlayProps => ({
    requestId: '550e8400-e29b-41d4-a716-446655440000',
    userId: 'user_123',
    lotteryId: 'lottoRD_01',
    numbers: ['03', '07', '12'],
    betType: BetType.QUINIELA,
    amount: 50,
    currency: Currency.DOP,
    payment: {
      method: 'wallet',
      walletTransactionId: 'wl_123',
    },
  });

  describe('constructor', () => {
    it('should create a play with default status as pending', () => {
      const props = createValidPlayProps();
      const play = new Play(props);

      expect(play.id).toBeDefined();
      expect(play.requestId).toBe(props.requestId);
      expect(play.userId).toBe(props.userId);
      expect(play.lotteryId).toBe(props.lotteryId);
      expect(play.numbers).toEqual(props.numbers);
      expect(play.betType).toBe(props.betType);
      expect(play.amount).toBe(props.amount);
      expect(play.currency).toBe(props.currency);
      expect(play.status).toBe(PlayStatus.PENDING);
      expect(play.createdAt).toBeInstanceOf(Date);
    });

    it('should use provided id if given', () => {
      const props = createValidPlayProps();
      const id = 'custom-id-123';
      const play = new Play({ ...props, id });

      expect(play.id).toBe(id);
    });
  });

  describe('confirm', () => {
    it('should confirm a pending play', () => {
      const play = new Play(createValidPlayProps());
      const playIdBanca = 'BANCA-12345';
      const ticketCode = 'TKT-ABC123';

      play.confirm(playIdBanca, ticketCode);

      expect(play.status).toBe(PlayStatus.CONFIRMED);
      expect(play.playIdBanca).toBe(playIdBanca);
      expect(play.ticketCode).toBe(ticketCode);
    });

    it('should confirm a processing play', () => {
      const play = new Play(createValidPlayProps());
      play.markAsProcessing();
      
      const playIdBanca = 'BANCA-12345';
      const ticketCode = 'TKT-ABC123';
      play.confirm(playIdBanca, ticketCode);

      expect(play.status).toBe(PlayStatus.CONFIRMED);
    });

    it('should throw error when confirming already confirmed play', () => {
      const play = new Play(createValidPlayProps());
      play.confirm('BANCA-12345', 'TKT-ABC123');

      expect(() => {
        play.confirm('BANCA-67890', 'TKT-DEF456');
      }).toThrow('Cannot confirm play with status confirmed');
    });
  });

  describe('reject', () => {
    it('should reject a pending play', () => {
      const play = new Play(createValidPlayProps());
      
      play.reject('Insufficient funds');

      expect(play.status).toBe(PlayStatus.REJECTED);
    });

    it('should throw error when rejecting already confirmed play', () => {
      const play = new Play(createValidPlayProps());
      play.confirm('BANCA-12345', 'TKT-ABC123');

      expect(() => {
        play.reject('Some reason');
      }).toThrow('Cannot reject play with status confirmed');
    });
  });

  describe('markAsProcessing', () => {
    it('should mark a pending play as processing', () => {
      const play = new Play(createValidPlayProps());
      
      play.markAsProcessing();

      expect(play.status).toBe(PlayStatus.PROCESSING);
    });

    it('should throw error when marking non-pending play as processing', () => {
      const play = new Play(createValidPlayProps());
      play.markAsProcessing();

      expect(() => {
        play.markAsProcessing();
      }).toThrow('Cannot mark as processing play with status processing');
    });
  });

  describe('assignToBanca', () => {
    it('should assign play to a banca', () => {
      const play = new Play(createValidPlayProps());
      const bancaId = 'banca_001';

      play.assignToBanca(bancaId);

      expect(play.bancaId).toBe(bancaId);
    });
  });

  describe('toJSON', () => {
    it('should return serializable object', () => {
      const play = new Play(createValidPlayProps());
      const json = play.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('requestId');
      expect(json).toHaveProperty('userId');
      expect(json).toHaveProperty('lotteryId');
      expect(json).toHaveProperty('numbers');
      expect(json).toHaveProperty('status');
      expect(json).toHaveProperty('createdAt');
    });
  });

  describe('new ticket fields', () => {
    it('should handle sucursal and ticket details', () => {
      const props = {
        ...createValidPlayProps(),
        sucursalId: 'suc_001',
        sorteoNumber: '#18331',
        sorteoTime: '13:00:00',
        sorteoName: 'Loto Real',
        barcode: 'BAR123456789',
        validUntil: new Date('2024-03-01'),
        operatorUserId: '020611062',
        modality: 'Quiniela',
      };

      const play = new Play(props);

      expect(play.sucursalId).toBe('suc_001');
      expect(play.sorteoNumber).toBe('#18331');
      expect(play.sorteoTime).toBe('13:00:00');
      expect(play.sorteoName).toBe('Loto Real');
      expect(play.barcode).toBe('BAR123456789');
      expect(play.validUntil).toEqual(new Date('2024-03-01'));
      expect(play.operatorUserId).toBe('020611062');
      expect(play.modality).toBe('Quiniela');

      const json = play.toJSON();
      expect(json).toHaveProperty('sucursalId', 'suc_001');
      expect(json).toHaveProperty('sorteoNumber', '#18331');
      expect(json).toHaveProperty('barcode', 'BAR123456789');
    });
  });
});
