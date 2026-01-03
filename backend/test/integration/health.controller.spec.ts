import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, HttpException } from '@nestjs/common';
import { HealthController } from '../../src/infrastructure/http/controllers/health.controller';
import { DataSource } from 'typeorm';

describe('HealthController (Unit)', () => {
  let controller: HealthController;
  let mockDataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    // Create mock DataSource
    mockDataSource = {
      query: jest.fn(),
      isInitialized: true,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check (GET /health)', () => {
    it('should return health status with all required fields', async () => {
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      const result = await controller.check();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('service', 'lotolink-backend');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('uptimeHuman');
      expect(result).toHaveProperty('checks');
      expect(result.checks).toHaveProperty('database');
    });

    it('should have valid timestamp format', async () => {
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      const result = await controller.check();

      const timestamp = new Date(result.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should report uptime as a positive number', async () => {
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      const result = await controller.check();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof result.uptime).toBe('number');
    });

    it('should have human-readable uptime format', async () => {
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      const result = await controller.check();

      expect(result.uptimeHuman).toBeDefined();
      expect(typeof result.uptimeHuman).toBe('string');
      expect(result.uptimeHuman).toMatch(/\d+[dhms]/);
    });

    it('should report database as connected when query succeeds', async () => {
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      const result = await controller.check();

      expect(result.checks.database).toBe('connected');
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should report database as disconnected when query fails', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection refused'));

      const result = await controller.check();

      expect(result.checks.database).toBe('disconnected');
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should not throw error when database is disconnected', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.check()).resolves.toBeDefined();
    });

    it('should have consistent version number', async () => {
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      const result = await controller.check();

      expect(result.version).toBeDefined();
      expect(typeof result.version).toBe('string');
      expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('ready (GET /health/ready)', () => {
    it('should return ready status when database is connected', async () => {
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      const result = await controller.ready();

      expect(result).toHaveProperty('status', 'ready');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('checks');
      expect(result.checks).toHaveProperty('database', 'ok');
    });

    it('should have valid timestamp in ready response', async () => {
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      const result = await controller.ready();

      const timestamp = new Date(result.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should execute database query to check connectivity', async () => {
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      await controller.ready();

      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
    });

    it('should throw HttpException with 503 status when database is disconnected', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.ready()).rejects.toThrow(HttpException);
      
      try {
        await controller.ready();
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });

    it('should include error details when database check fails', async () => {
      const errorMessage = 'Connection refused';
      mockDataSource.query.mockRejectedValue(new Error(errorMessage));

      try {
        await controller.ready();
        fail('Should have thrown an exception');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const response = (error as HttpException).getResponse() as any;
        
        expect(response).toHaveProperty('status', 'not_ready');
        expect(response).toHaveProperty('timestamp');
        expect(response).toHaveProperty('checks');
        expect(response.checks.database).toHaveProperty('status', 'error');
        expect(response.checks.database).toHaveProperty('error');
        expect(response.checks.database.error).toContain(errorMessage);
      }
    });

    it('should return not_ready status in exception response', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Database error'));

      try {
        await controller.ready();
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.status).toBe('not_ready');
      }
    });

    it('should handle different types of database errors', async () => {
      const errors = [
        new Error('Connection timeout'),
        new Error('Authentication failed'),
        new Error('Network error'),
      ];

      for (const error of errors) {
        jest.clearAllMocks();
        mockDataSource.query.mockRejectedValue(error);

        await expect(controller.ready()).rejects.toThrow(HttpException);
      }
    });
  });

  describe('Health Check Response Structure', () => {
    it('should have consistent structure across multiple calls', async () => {
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      const result1 = await controller.check();
      const result2 = await controller.check();

      expect(Object.keys(result1).sort()).toEqual(Object.keys(result2).sort());
      expect(result1.service).toBe(result2.service);
      expect(result1.version).toBe(result2.version);
    });

    it('should update timestamp on each call', async () => {
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      const result1 = await controller.check();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result2 = await controller.check();

      expect(result1.timestamp).not.toBe(result2.timestamp);
    });

    it('should increment uptime over time', async () => {
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      const result1 = await controller.check();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result2 = await controller.check();

      expect(result2.uptime).toBeGreaterThan(result1.uptime);
    });
  });

  describe('Uptime Formatting', () => {
    it('should format uptime with seconds only for short durations', async () => {
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      const result = await controller.check();

      // For a newly started controller, uptime should be very short
      expect(result.uptimeHuman).toMatch(/^\d+s$/);
    });

    it('should include appropriate time units in human format', async () => {
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      const result = await controller.check();

      // Should contain at least seconds
      expect(result.uptimeHuman).toContain('s');
    });
  });

  describe('Error Handling', () => {
    it('should handle database query rejections gracefully in check endpoint', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Database error'));

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.checks.database).toBe('disconnected');
    });

    it('should handle unknown error types in database check', async () => {
      mockDataSource.query.mockRejectedValue('string error' as any);

      const result = await controller.check();

      expect(result.checks.database).toBe('disconnected');
    });

    it('should handle null/undefined database query results', async () => {
      mockDataSource.query.mockResolvedValue(null as any);

      const result = await controller.check();

      expect(result.checks.database).toBe('connected');
    });
  });
});
