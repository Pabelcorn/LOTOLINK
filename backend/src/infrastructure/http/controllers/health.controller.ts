import { Controller, Get, HttpStatus, HttpException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  private readonly startTime: number;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.startTime = Date.now();
  }

  @Get()
  async check() {
    // Check database connectivity
    let databaseConnected = false;
    try {
      await this.dataSource.query('SELECT 1');
      databaseConnected = true;
    } catch (error) {
      // Database not connected, but don't fail the health check
      databaseConnected = false;
    }

    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'lotolink-backend',
      version: '1.0.0',
      uptime: uptimeSeconds,
      uptimeHuman: this.formatUptime(uptimeSeconds),
      checks: {
        database: databaseConnected ? 'connected' : 'disconnected',
      },
    };
  }

  @Get('ready')
  async ready() {
    // Check database connectivity
    let databaseStatus = 'ok';
    let databaseError: string | undefined;
    
    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      databaseStatus = 'error';
      databaseError = error instanceof Error ? error.message : 'Unknown error';
    }

    const isReady = databaseStatus === 'ok';

    if (!isReady) {
      throw new HttpException(
        {
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          checks: {
            database: {
              status: databaseStatus,
              error: databaseError,
            },
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseStatus,
      },
    };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  }
}
