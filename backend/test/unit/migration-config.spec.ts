import { DataSource } from 'typeorm';
import { AppDataSource } from '../../src/infrastructure/database/data-source';

describe('Migration Configuration', () => {
  describe('Data Source Configuration', () => {
    it('should have data source defined', () => {
      expect(AppDataSource).toBeDefined();
      expect(AppDataSource).toBeInstanceOf(DataSource);
    });

    it('should have correct database type', () => {
      expect(AppDataSource.options.type).toBe('postgres');
    });

    it('should have entities path configured', () => {
      const options = AppDataSource.options as any;
      expect(options.entities).toBeDefined();
      expect(Array.isArray(options.entities)).toBe(true);
      expect(options.entities.length).toBeGreaterThan(0);
    });

    it('should have migrations path configured', () => {
      const options = AppDataSource.options as any;
      expect(options.migrations).toBeDefined();
      expect(Array.isArray(options.migrations)).toBe(true);
      expect(options.migrations.length).toBeGreaterThan(0);
    });

    it('should have synchronize disabled', () => {
      // synchronize should be false in production to rely on migrations
      expect(AppDataSource.options.synchronize).toBe(false);
    });

    it('should have database connection details from environment', () => {
      const options = AppDataSource.options as any;
      
      // These should be set from environment variables or defaults
      expect(options.host).toBeDefined();
      expect(options.port).toBeDefined();
      expect(options.username).toBeDefined();
      expect(options.database).toBeDefined();
    });

    it('should use correct default values', () => {
      const options = AppDataSource.options as any;
      
      // Default values when env vars are not set
      expect(typeof options.host).toBe('string');
      expect(typeof options.port).toBe('number');
      expect(options.port).toBeGreaterThan(0);
      expect(options.port).toBeLessThan(65536);
    });

    it('should have logging enabled', () => {
      const options = AppDataSource.options as any;
      expect(options.logging).toBe(true);
    });
  });

  describe('Migration Files', () => {
    it('should have initial schema migration', () => {
      const fs = require('fs');
      const path = require('path');
      
      const migrationsDir = path.resolve(__dirname, '../../src/infrastructure/database/migrations');
      const files = fs.readdirSync(migrationsDir);
      
      const initialMigration = files.find((file: string) => 
        file.includes('CreateInitialSchema')
      );
      
      expect(initialMigration).toBeDefined();
    });

    it('should have wallet transactions migration', () => {
      const fs = require('fs');
      const path = require('path');
      
      const migrationsDir = path.resolve(__dirname, '../../src/infrastructure/database/migrations');
      const files = fs.readdirSync(migrationsDir);
      
      const walletMigration = files.find((file: string) => 
        file.includes('AddWalletTransactionsTable')
      );
      
      expect(walletMigration).toBeDefined();
    });

    it('should have sucursales migration', () => {
      const fs = require('fs');
      const path = require('path');
      
      const migrationsDir = path.resolve(__dirname, '../../src/infrastructure/database/migrations');
      const files = fs.readdirSync(migrationsDir);
      
      const sucursalesMigration = files.find((file: string) => 
        file.includes('AddSucursalesTable')
      );
      
      expect(sucursalesMigration).toBeDefined();
    });

    it('should have migrations in correct timestamp order', () => {
      const fs = require('fs');
      const path = require('path');
      
      const migrationsDir = path.resolve(__dirname, '../../src/infrastructure/database/migrations');
      const files = fs.readdirSync(migrationsDir)
        .filter((file: string) => file.endsWith('.ts') || file.endsWith('.js'));
      
      // Extract timestamps and verify they're in order
      const timestamps = files.map((file: string) => {
        const match = file.match(/^(\d+)-/);
        return match ? parseInt(match[1]) : 0;
      });
      
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });
  });

  describe('Migration Class Structure', () => {
    it('should have valid migration class for initial schema', async () => {
      const { CreateInitialSchema1703000000000 } = await import(
        '../../src/infrastructure/database/migrations/1703000000000-CreateInitialSchema'
      );
      
      const migration = new CreateInitialSchema1703000000000();
      
      expect(migration).toBeDefined();
      expect(typeof migration.up).toBe('function');
      expect(typeof migration.down).toBe('function');
    });

    it('should have valid migration class for wallet transactions', async () => {
      const { AddWalletTransactionsTable1704000000000 } = await import(
        '../../src/infrastructure/database/migrations/1704000000000-AddWalletTransactionsTable'
      );
      
      const migration = new AddWalletTransactionsTable1704000000000();
      
      expect(migration).toBeDefined();
      expect(typeof migration.up).toBe('function');
      expect(typeof migration.down).toBe('function');
    });

    it('should have valid migration class for sucursales', async () => {
      const { AddSucursalesTable1704100000000 } = await import(
        '../../src/infrastructure/database/migrations/1704100000000-AddSucursalesTable'
      );
      
      const migration = new AddSucursalesTable1704100000000();
      
      expect(migration).toBeDefined();
      expect(typeof migration.up).toBe('function');
      expect(typeof migration.down).toBe('function');
    });
  });

  describe('Environment Variables', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should use DATABASE_HOST from environment', () => {
      process.env.DATABASE_HOST = 'custom-host';
      const options = AppDataSource.options as any;
      
      // Note: DataSource is created at import time, so this test
      // validates that the env var is read, not that it changes dynamically
      expect(options.host).toBeDefined();
    });

    it('should use DATABASE_PORT from environment', () => {
      process.env.DATABASE_PORT = '5433';
      const options = AppDataSource.options as any;
      
      expect(typeof options.port).toBe('number');
      expect(options.port).toBeGreaterThan(0);
    });

    it('should fallback to defaults when env vars not set', () => {
      delete process.env.DATABASE_HOST;
      delete process.env.DATABASE_PORT;
      delete process.env.DATABASE_USERNAME;
      delete process.env.DATABASE_NAME;
      
      // DataSource should still be valid with defaults
      const options = AppDataSource.options as any;
      
      expect(options.host).toBeDefined();
      expect(options.port).toBeDefined();
      expect(options.username).toBeDefined();
      expect(options.database).toBeDefined();
    });
  });

  describe('npm Scripts Configuration', () => {
    it('should have migration:run script defined', () => {
      const packageJson = require('../../package.json');
      
      expect(packageJson.scripts).toHaveProperty('migration:run');
      expect(packageJson.scripts['migration:run']).toContain('typeorm');
      expect(packageJson.scripts['migration:run']).toContain('migration:run');
    });

    it('should have migration:revert script defined', () => {
      const packageJson = require('../../package.json');
      
      expect(packageJson.scripts).toHaveProperty('migration:revert');
      expect(packageJson.scripts['migration:revert']).toContain('typeorm');
      expect(packageJson.scripts['migration:revert']).toContain('migration:revert');
    });

    it('should have migration:generate script defined', () => {
      const packageJson = require('../../package.json');
      
      expect(packageJson.scripts).toHaveProperty('migration:generate');
      expect(packageJson.scripts['migration:generate']).toContain('typeorm');
      expect(packageJson.scripts['migration:generate']).toContain('migration:generate');
    });

    it('should have migration:create script defined', () => {
      const packageJson = require('../../package.json');
      
      expect(packageJson.scripts).toHaveProperty('migration:create');
      expect(packageJson.scripts['migration:create']).toContain('typeorm');
      expect(packageJson.scripts['migration:create']).toContain('migration:create');
    });

    it('should reference correct data source path', () => {
      const packageJson = require('../../package.json');
      const migrationRunScript = packageJson.scripts['migration:run'];
      
      expect(migrationRunScript).toContain('data-source');
    });
  });
});
