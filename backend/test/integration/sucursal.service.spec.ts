import { Test, TestingModule } from '@nestjs/testing';
import { SucursalService } from '../../src/application/services/sucursal.service';
import { SUCURSAL_REPOSITORY } from '../../src/domain/repositories/sucursal.repository';
import { Sucursal } from '../../src/domain/entities/sucursal.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('SucursalService', () => {
  let service: SucursalService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByBancaId: jest.fn(),
      findByCode: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SucursalService,
        {
          provide: SUCURSAL_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SucursalService>(SucursalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSucursal', () => {
    it('should create a new sucursal', async () => {
      const dto = {
        bancaId: 'banca-123',
        name: 'Sucursal ORTIZ',
        code: 'ORTIZ-001',
      };

      mockRepository.findByCode.mockResolvedValue(null);
      mockRepository.save.mockImplementation((sucursal: Sucursal) => Promise.resolve(sucursal));

      const result = await service.createSucursal(dto);

      expect(result.name).toBe('Sucursal ORTIZ');
      expect(result.code).toBe('ORTIZ-001');
      expect(result.bancaId).toBe('banca-123');
      expect(result.isActive).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if code already exists', async () => {
      const dto = {
        bancaId: 'banca-123',
        name: 'Sucursal ORTIZ',
        code: 'ORTIZ-001',
      };

      const existingSucursal = new Sucursal(dto);
      mockRepository.findByCode.mockResolvedValue(existingSucursal);

      await expect(service.createSucursal(dto)).rejects.toThrow(ConflictException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getSucursalById', () => {
    it('should return sucursal by id', async () => {
      const sucursal = new Sucursal({
        bancaId: 'banca-123',
        name: 'Sucursal ORTIZ',
        code: 'ORTIZ-001',
      });

      mockRepository.findById.mockResolvedValue(sucursal);

      const result = await service.getSucursalById('sucursal-123');

      expect(result.name).toBe('Sucursal ORTIZ');
      expect(mockRepository.findById).toHaveBeenCalledWith('sucursal-123');
    });

    it('should throw NotFoundException if sucursal not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getSucursalById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSucursal', () => {
    it('should update sucursal contact info', async () => {
      const sucursal = new Sucursal({
        bancaId: 'banca-123',
        name: 'Sucursal ORTIZ',
        code: 'ORTIZ-001',
      });

      mockRepository.findById.mockResolvedValue(sucursal);
      mockRepository.update.mockImplementation((s: Sucursal) => Promise.resolve(s));

      const updateDto = {
        address: 'Calle Nueva #456',
        city: 'Santiago',
      };

      const result = await service.updateSucursal('sucursal-123', updateDto);

      expect(result.address).toBe('Calle Nueva #456');
      expect(result.city).toBe('Santiago');
      expect(mockRepository.update).toHaveBeenCalled();
    });
  });

  describe('deactivateSucursal', () => {
    it('should deactivate a sucursal', async () => {
      const sucursal = new Sucursal({
        bancaId: 'banca-123',
        name: 'Sucursal ORTIZ',
        code: 'ORTIZ-001',
      });

      mockRepository.findById.mockResolvedValue(sucursal);
      mockRepository.update.mockImplementation((s: Sucursal) => Promise.resolve(s));

      const result = await service.deactivateSucursal('sucursal-123');

      expect(result.isActive).toBe(false);
      expect(mockRepository.update).toHaveBeenCalled();
    });
  });

  describe('activateSucursal', () => {
    it('should activate a sucursal', async () => {
      const sucursal = new Sucursal({
        bancaId: 'banca-123',
        name: 'Sucursal ORTIZ',
        code: 'ORTIZ-001',
        isActive: false,
      });

      mockRepository.findById.mockResolvedValue(sucursal);
      mockRepository.update.mockImplementation((s: Sucursal) => Promise.resolve(s));

      const result = await service.activateSucursal('sucursal-123');

      expect(result.isActive).toBe(true);
      expect(mockRepository.update).toHaveBeenCalled();
    });
  });

  describe('updateTicketConfig', () => {
    it('should update ticket configuration', async () => {
      const sucursal = new Sucursal({
        bancaId: 'banca-123',
        name: 'Sucursal ORTIZ',
        code: 'ORTIZ-001',
      });

      mockRepository.findById.mockResolvedValue(sucursal);
      mockRepository.update.mockImplementation((s: Sucursal) => Promise.resolve(s));

      const config = {
        validityDays: 90,
        showQR: true,
      };

      const result = await service.updateTicketConfig('sucursal-123', config);

      expect((result.ticketConfig as any).validityDays).toBe(90);
      expect((result.ticketConfig as any).showQR).toBe(true);
      expect(mockRepository.update).toHaveBeenCalled();
    });
  });
});
