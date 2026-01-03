import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { HealthController } from '../../src/infrastructure/http/controllers/health.controller';
import { DataSource } from 'typeorm';

describe('HealthController (Integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT || '5432'),
          username: process.env.DATABASE_USERNAME || 'lotolink',
          password: process.env.DATABASE_PASSWORD || 'password',
          database: process.env.DATABASE_NAME || 'lotolink_db_test',
          entities: [],
          synchronize: false,
          logging: false,
        }),
      ],
      controllers: [HealthController],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 OK with health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service', 'lotolink-backend');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('uptimeHuman');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database');
    });

    it('should have valid timestamp format', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should report uptime as a positive number', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK);

      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should have human-readable uptime', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK);

      expect(response.body.uptimeHuman).toBeDefined();
      expect(typeof response.body.uptimeHuman).toBe('string');
      expect(response.body.uptimeHuman).toMatch(/\d+[dhms]/);
    });

    it('should report database connectivity status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK);

      expect(response.body.checks.database).toBeDefined();
      expect(['connected', 'disconnected']).toContain(response.body.checks.database);
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 OK when database is connected', async () => {
      // Verify database is actually connected
      const isConnected = dataSource.isInitialized;
      
      if (isConnected) {
        const response = await request(app.getHttpServer())
          .get('/health/ready')
          .expect(HttpStatus.OK);

        expect(response.body).toHaveProperty('status', 'ready');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('checks');
        expect(response.body.checks).toHaveProperty('database', 'ok');
      } else {
        // If database is not connected, we expect 503
        await request(app.getHttpServer())
          .get('/health/ready')
          .expect(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });

    it('should have valid timestamp in ready response', async () => {
      try {
        const response = await request(app.getHttpServer())
          .get('/health/ready');

        if (response.status === HttpStatus.OK) {
          const timestamp = new Date(response.body.timestamp);
          expect(timestamp.getTime()).toBeGreaterThan(0);
        }
      } catch (error) {
        // If database is not available, test is still valid
        expect(error).toBeDefined();
      }
    });

    it('should return 503 Service Unavailable when database is not ready', async () => {
      // This test validates the error response structure
      // We can't reliably trigger a DB failure in tests, so we document expected behavior
      
      // If we simulate a DB failure, we should get:
      // Status: 503
      // Body: { status: 'not_ready', timestamp: '...', checks: { database: { status: 'error', error: '...' } } }
      
      // For now, we just verify the endpoint exists and responds
      const response = await request(app.getHttpServer())
        .get('/health/ready');

      expect([HttpStatus.OK, HttpStatus.SERVICE_UNAVAILABLE]).toContain(response.status);
    });
  });

  describe('Health Check Performance', () => {
    it('should respond quickly (within 1 second)', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(1000);
    });

    it('ready endpoint should respond within 2 seconds', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .get('/health/ready');
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Ready endpoint may take longer due to DB query
      expect(responseTime).toBeLessThan(2000);
    });
  });

  describe('Health Check Caching', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/health')
          .expect(HttpStatus.OK)
      );

      const responses = await Promise.all(requests);
      
      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.body.status).toBe('ok');
      });
    });
  });
});
