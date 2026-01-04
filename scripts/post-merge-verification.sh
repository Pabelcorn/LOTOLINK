#!/bin/bash
set -e

echo "=== Verificación Post-Merge ==="

# 1. Health check
echo "1. Health check..."
curl -f https://<tu-host>/health
curl -f https://<tu-host>/health/ready

# 2. Verificar migraciones
echo "2. Verificando migraciones..."
cd backend
npm run typeorm migration:show -d src/infrastructure/database/data-source.ts | grep "\[X\]"

# 3. Verificar backups
echo "3. Verificando backups..."
ls -lh /var/backups/lotolink/postgres/latest.sql.gz

# 4. Test CORS
echo "4. Testing CORS..."
curl -I -H "Origin: https://tu-dominio.com" https://<tu-host>/api/v1/auth/login

echo "✅ Verificación completada"
