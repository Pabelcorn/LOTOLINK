# Database Operations Guide

This guide covers database migrations, backups, and restore procedures for LotoLink.

## Table of Contents

1. [Database Migrations](#database-migrations)
2. [Backup Procedures](#backup-procedures)
3. [Restore Procedures](#restore-procedures)
4. [Scheduling Automated Backups](#scheduling-automated-backups)
5. [Troubleshooting](#troubleshooting)

---

## Database Migrations

### Overview

LotoLink uses TypeORM migrations to manage database schema changes. Migrations ensure that database schema updates are version-controlled, repeatable, and can be applied consistently across environments.

### Available Migrations

1. **1703000000000-CreateInitialSchema.ts** - Creates core tables:
   - `users` - User accounts and authentication
   - `bancas` - Lottery operator (banca) configurations
   - `plays` - Lottery play records
   - `outgoing_requests` - Tracking of API requests to bancas
   - `webhook_events` - Incoming webhook event logs
   - `settings` - Application configuration settings

2. **1704000000000-AddWalletTransactionsTable.ts** - Adds wallet transaction tracking:
   - `wallet_transactions` - Detailed transaction history for user wallets

3. **1704100000000-AddSucursalesTable.ts** - Adds branch/location tracking:
   - `sucursales` - Banca branch/office locations

### Running Migrations

#### Development Environment

```bash
cd backend

# Run all pending migrations
npm run migration:run

# Revert the last migration (if needed)
npm run migration:revert
```

#### Production Environment

**Important:** Always create a database backup before running migrations in production!

```bash
# 1. Create a backup first
./scripts/backup-database.sh

# 2. Navigate to backend directory
cd /opt/lotolink/backend

# 3. Run migrations
npm run migration:run

# 4. Verify the application starts correctly
npm run build
npm start

# Or if using Docker:
docker-compose exec backend npm run migration:run
```

#### Docker Environment

```bash
# Run migrations in Docker container
docker-compose exec backend npm run migration:run

# Check migration status
docker-compose exec backend npm run typeorm migration:show
```

### Creating New Migrations

```bash
cd backend

# Generate a migration from entity changes
npm run migration:generate -- -n YourMigrationName

# Or create an empty migration file
npm run migration:create -- -n YourMigrationName
```

### Migration Best Practices

1. **Always backup before migrations** - Especially in production
2. **Test migrations in development first** - Verify changes work as expected
3. **Use transactions** - TypeORM wraps migrations in transactions by default
4. **Write reversible migrations** - Implement the `down()` method properly
5. **Keep migrations small** - One logical change per migration
6. **Never modify existing migrations** - Create new ones for changes
7. **Document complex changes** - Add comments explaining non-obvious operations

### Checking Migration Status

```bash
# View migration history
npm run typeorm migration:show

# This will display:
# [X] CreateInitialSchema1703000000000
# [X] AddWalletTransactionsTable1704000000000
# [ ] PendingMigration1704200000000
```

---

## Backup Procedures

### Automated Backup Script

The `scripts/backup-database.sh` script provides automated PostgreSQL backups with the following features:

- Compressed backups (gzip)
- Automatic rotation (configurable retention period)
- Logging to file
- Optional S3 upload support
- Symlink to latest backup

### Configuration

Set environment variables to customize backup behavior:

```bash
# Backup directory (default: /var/backups/lotolink/postgres)
export BACKUP_DIR="/custom/backup/path"

# Retention period in days (default: 30)
export RETENTION_DAYS="7"

# Database connection details
export DATABASE_HOST="localhost"
export DATABASE_PORT="5432"
export DATABASE_USER="lotolink"
export DATABASE_NAME="lotolink_db"
export DATABASE_PASSWORD="your_password"

# Optional: S3 bucket for cloud backups
export S3_BUCKET="my-lotolink-backups"
```

### Running Manual Backup

```bash
# Basic backup with defaults
./scripts/backup-database.sh

# With custom settings
RETENTION_DAYS=14 ./scripts/backup-database.sh

# Docker environment
docker-compose exec postgres bash -c '
  PGPASSWORD=$POSTGRES_PASSWORD pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > /backups/manual_backup_$(date +%Y%m%d_%H%M%S).sql.gz
'
```

### Backup File Format

Backups are stored as:
```
/var/backups/lotolink/postgres/
  ├── backup_20260103_020000.sql.gz
  ├── backup_20260104_020000.sql.gz
  ├── backup_20260105_020000.sql.gz
  └── latest.sql.gz -> backup_20260105_020000.sql.gz
```

### What Gets Backed Up

- All database schema (tables, indexes, constraints)
- All data in all tables
- No ownership or ACL information (for portability)

---

## Restore Procedures

### Using the Restore Script

The `scripts/restore-database.sh` script provides an interactive restore process:

```bash
# Restore from latest backup
./scripts/restore-database.sh

# Restore from specific backup file
./scripts/restore-database.sh /path/to/backup_20260103_020000.sql.gz

# The script will:
# 1. Confirm the operation (it will DROP the database!)
# 2. Terminate existing connections
# 3. Drop and recreate the database
# 4. Restore the backup
# 5. Verify the restoration
```

### Manual Restore Process

If you need to restore manually:

```bash
# 1. Stop the application
docker-compose stop backend

# 2. Decompress and restore
gunzip -c /var/backups/lotolink/postgres/backup_20260103_020000.sql.gz | \
  PGPASSWORD=your_password psql -h localhost -U lotolink -d lotolink_db

# 3. Restart the application
docker-compose start backend
```

### Restore in Docker Environment

```bash
# 1. Copy backup into container
docker cp /path/to/backup.sql.gz lotolink-postgres:/tmp/

# 2. Restore inside container
docker-compose exec postgres bash -c '
  dropdb -U lotolink lotolink_db
  createdb -U lotolink lotolink_db
  gunzip -c /tmp/backup.sql.gz | psql -U lotolink -d lotolink_db
'

# 3. Restart backend to reconnect
docker-compose restart backend
```

### Partial Restore (Single Table)

```bash
# Restore only a specific table
pg_restore -U lotolink -d lotolink_db -t users backup.dump

# Or with SQL backup
gunzip -c backup.sql.gz | grep -A 10000 "CREATE TABLE users" | \
  psql -U lotolink -d lotolink_db
```

### Testing Restore

Always test your restore process:

```bash
# 1. Create a test database
createdb -U lotolink lotolink_db_test

# 2. Restore backup to test database
gunzip -c backup.sql.gz | psql -U lotolink -d lotolink_db_test

# 3. Verify data
psql -U lotolink -d lotolink_db_test -c "SELECT COUNT(*) FROM users;"

# 4. Clean up
dropdb -U lotolink lotolink_db_test
```

---

## Scheduling Automated Backups

### Using Cron (Linux/Unix)

#### Setup

```bash
# 1. Make script executable
chmod +x /opt/lotolink/scripts/backup-database.sh

# 2. Create log directory
sudo mkdir -p /var/log/lotolink
sudo chown $(whoami):$(whoami) /var/log/lotolink

# 3. Edit crontab
crontab -e

# 4. Add one of these schedules:
```

#### Recommended Cron Schedules

```bash
# Daily backup at 2:00 AM
0 2 * * * /opt/lotolink/scripts/backup-database.sh >> /var/log/lotolink/backup.log 2>&1

# Every 6 hours
0 */6 * * * /opt/lotolink/scripts/backup-database.sh >> /var/log/lotolink/backup.log 2>&1

# Daily at 2 AM with email notification on failure
0 2 * * * /opt/lotolink/scripts/backup-database.sh || echo "Backup failed!" | mail -s "LotoLink Backup Failed" admin@example.com

# With environment variables
0 2 * * * RETENTION_DAYS=14 S3_BUCKET=my-backups /opt/lotolink/scripts/backup-database.sh >> /var/log/lotolink/backup.log 2>&1
```

#### Verify Cron Setup

```bash
# List current cron jobs
crontab -l

# Check cron service is running
sudo systemctl status cron

# View backup logs
tail -f /var/log/lotolink/backup.log
```

### Using Kubernetes CronJob

Create a Kubernetes CronJob manifest:

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: lotolink-db-backup
  namespace: lotolink
spec:
  # Run daily at 2 AM
  schedule: "0 2 * * *"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            env:
            - name: DATABASE_HOST
              value: "postgres-service"
            - name: DATABASE_PORT
              value: "5432"
            - name: DATABASE_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: username
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            - name: DATABASE_NAME
              value: "lotolink_db"
            - name: BACKUP_DIR
              value: "/backups"
            - name: RETENTION_DAYS
              value: "30"
            command:
            - /bin/bash
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              BACKUP_FILE="backup_${TIMESTAMP}.sql.gz"
              
              pg_dump -h $DATABASE_HOST -p $DATABASE_PORT \
                      -U $DATABASE_USER -d $DATABASE_NAME \
                      --format=plain --no-owner --no-acl | \
                gzip > ${BACKUP_DIR}/${BACKUP_FILE}
              
              # Delete old backups
              find ${BACKUP_DIR} -name "backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
              
              echo "Backup completed: ${BACKUP_FILE}"
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: lotolink-backup-pvc
```

Apply the CronJob:

```bash
kubectl apply -f backup-cronjob.yaml

# Verify
kubectl get cronjobs -n lotolink
kubectl get jobs -n lotolink
```

### Using Docker Compose with Cron

Add a backup service to `docker-compose.yml`:

```yaml
services:
  backup:
    image: postgres:15
    depends_on:
      - postgres
    environment:
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_USER: lotolink
      DATABASE_PASSWORD: ${POSTGRES_PASSWORD}
      DATABASE_NAME: lotolink_db
      RETENTION_DAYS: 30
    volumes:
      - ./backups:/backups
      - ./scripts/backup-database.sh:/backup.sh
    entrypoint: >
      sh -c "
        echo '0 2 * * * /backup.sh >> /var/log/backup.log 2>&1' | crontab -
        && crond -f
      "
```

### Cloud Storage Integration

#### AWS S3

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure

# Update backup script with S3 bucket
export S3_BUCKET="my-lotolink-backups"
./scripts/backup-database.sh

# Manual upload
aws s3 cp /var/backups/lotolink/postgres/backup_20260103_020000.sql.gz \
  s3://my-lotolink-backups/backups/postgres/
```

#### Google Cloud Storage

```bash
# Install gsutil
curl https://sdk.cloud.google.com | bash

# Upload to GCS
gsutil cp /var/backups/lotolink/postgres/backup_20260103_020000.sql.gz \
  gs://my-lotolink-backups/postgres/
```

### Monitoring Backup Status

```bash
# Check last backup time
ls -lht /var/backups/lotolink/postgres/ | head -5

# Check backup size trend
du -sh /var/backups/lotolink/postgres/backup_*.sql.gz | tail -10

# Verify backup integrity
gunzip -t /var/backups/lotolink/postgres/latest.sql.gz && echo "✓ Backup is valid"

# Count number of backups
ls -1 /var/backups/lotolink/postgres/backup_*.sql.gz | wc -l
```

---

## Troubleshooting

### Common Issues

#### Migration Fails

**Problem:** Migration fails with error

```bash
# Check what migrations have been applied
npm run typeorm migration:show

# Check database connection
psql -U lotolink -d lotolink_db -c "SELECT 1"

# Manually inspect failed migration
cat src/infrastructure/database/migrations/XXXX-FailedMigration.ts

# If safe, revert and try again
npm run migration:revert
npm run migration:run
```

#### Backup Fails - Permission Denied

```bash
# Fix backup directory permissions
sudo chown -R $(whoami):$(whoami) /var/backups/lotolink
sudo chmod -R 755 /var/backups/lotolink

# Fix script permissions
chmod +x /opt/lotolink/scripts/backup-database.sh
```

#### Restore Fails - Database in Use

```bash
# Terminate all connections
psql -U postgres -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE datname = 'lotolink_db' AND pid <> pg_backend_pid();
"

# Then retry restore
./scripts/restore-database.sh
```

#### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean old backups manually
find /var/backups/lotolink/postgres -name "backup_*.sql.gz" -mtime +7 -delete

# Compress existing uncompressed backups
find /var/backups -name "*.sql" -exec gzip {} \;
```

#### Cron Job Not Running

```bash
# Check cron service
sudo systemctl status cron

# Check cron logs
grep CRON /var/log/syslog | tail -20

# Verify script path in crontab
which /opt/lotolink/scripts/backup-database.sh

# Test script manually
/opt/lotolink/scripts/backup-database.sh
```

### Getting Help

- Check logs: `/var/log/lotolink/backup.log`
- Database logs: `docker-compose logs postgres`
- Application logs: `docker-compose logs backend`
- Migration history: `npm run typeorm migration:show`

---

## Security Best Practices

1. **Never commit passwords** - Use environment variables
2. **Encrypt backups** - Especially for offsite storage
3. **Secure backup directory** - Proper permissions (700 or 750)
4. **Rotate credentials** - Regularly update database passwords
5. **Test restore process** - Verify backups are recoverable
6. **Monitor backup failures** - Set up alerts
7. **Offsite backups** - Store backups in multiple locations
8. **Compliance** - Follow data retention policies

---

## Additional Resources

- [TypeORM Migrations Documentation](https://typeorm.io/migrations)
- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - Full deployment guide
- [README.md](../README.md) - Project overview

---

**Last Updated:** 2026-01-03  
**Maintained By:** LotoLink Team
