# 🚀 GO/NO-GO: Lista de Verificación para Producción Oficial

**Proyecto:** LOTOLINK  
**Versión:** 1.0.0  
**Fecha de Creación:** 4 de Enero, 2026  
**Última Actualización:** 4 de Enero, 2026

---

## 📋 Resumen Ejecutivo

Este documento define los criterios y procedimientos específicos que **DEBEN** completarse antes de considerar LOTOLINK "listo para producción oficial". Cada sección tiene criterios de aceptación claros, responsables asignados y comandos específicos para verificación.

**Estado Global:** 🟡 **EN PREPARACIÓN** - Requiere completar todos los puntos antes del lanzamiento

---

## 1. 🔧 Configuración y Validación en el Entorno Productivo

### 1.1 CORS - Definir ALLOWED_ORIGINS Finales

**Responsable:** DevOps Lead / Tech Lead  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🔴 CRÍTICA

#### Criterios de Aceptación

- [ ] **Dominios oficiales documentados** - Lista aprobada de dominios permitidos
- [ ] **Configuración en producción** - Variable ALLOWED_ORIGINS en secrets manager
- [ ] **Sin wildcards** - NUNCA usar `*` en producción
- [ ] **Validación en staging** - Probado con dominios reales
- [ ] **Documentación actualizada** - Dominios documentados en runbook

#### Dominios Recomendados

```bash
# Formato en .env o secrets manager
ALLOWED_ORIGINS=https://lotolink.com,https://www.lotolink.com,https://admin.lotolink.com,https://app.lotolink.com

# Si tienes subdominio móvil
# ,https://m.lotolink.com

# NO incluir:
# - http:// (solo HTTPS en producción)
# - localhost
# - IPs directas
# - Dominios de desarrollo/staging
```

#### Comandos de Verificación

```bash
# 1. Verificar configuración actual
kubectl get secret lotolink-backend-secrets -o jsonpath='{.data.ALLOWED_ORIGINS}' | base64 -d
# O en servidor:
grep ALLOWED_ORIGINS /ruta/a/.env

# 2. Probar CORS desde origen permitido (debe devolver headers CORS)
curl -I -H "Origin: https://lotolink.com" \
  -H "Access-Control-Request-Method: POST" \
  https://api.lotolink.com/api/v1/auth/login

# Esperar:
# Access-Control-Allow-Origin: https://lotolink.com
# Access-Control-Allow-Credentials: true

# 3. Probar desde origen NO permitido (NO debe devolver ACAO)
curl -I -H "Origin: https://sitio-malicioso.com" \
  -H "Access-Control-Request-Method: POST" \
  https://api.lotolink.com/api/v1/auth/login

# Esperar: Sin header Access-Control-Allow-Origin
```

#### Script de Validación

```bash
#!/bin/bash
# Archivo: scripts/validate-cors-production.sh

ALLOWED_DOMAINS=("https://lotolink.com" "https://www.lotolink.com" "https://admin.lotolink.com")
BLOCKED_DOMAINS=("http://lotolink.com" "https://evil.com" "http://localhost:3000")
API_URL="https://api.lotolink.com/api/v1/auth/login"

echo "=== Validación CORS Producción ==="

# Test allowed origins
for domain in "${ALLOWED_DOMAINS[@]}"; do
  echo "Testing allowed: $domain"
  RESPONSE=$(curl -s -I -H "Origin: $domain" "$API_URL" | grep -i "access-control-allow-origin")
  if [[ $RESPONSE == *"$domain"* ]]; then
    echo "✅ $domain - PERMITIDO correctamente"
  else
    echo "❌ $domain - ERROR: Debería estar permitido"
    exit 1
  fi
done

# Test blocked origins
for domain in "${BLOCKED_DOMAINS[@]}"; do
  echo "Testing blocked: $domain"
  RESPONSE=$(curl -s -I -H "Origin: $domain" "$API_URL" | grep -i "access-control-allow-origin")
  if [[ -z "$RESPONSE" ]]; then
    echo "✅ $domain - BLOQUEADO correctamente"
  else
    echo "❌ $domain - ERROR: Debería estar bloqueado"
    exit 1
  fi
done

echo "✅ Validación CORS completada exitosamente"
```

### 1.2 Rate Limiting - Ajustar a Carga Esperada

**Responsable:** Backend Lead / SRE  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🟡 ALTA

#### Criterios de Aceptación

- [ ] **Carga estimada calculada** - Requests por minuto esperados
- [ ] **Valores ajustados en staging** - TTL/MAX configurados
- [ ] **Prueba de carga realizada** - Con tráfico representativo
- [ ] **Alertas configuradas** - Para detectar rate limit excesivo
- [ ] **Documentación de valores** - Razón de los límites elegidos

#### Configuración Recomendada por Carga

```bash
# ============================================
# RATE LIMITING CONFIGURATION
# ============================================

# OPCIÓN 1: Tráfico Bajo (< 1000 usuarios activos)
RATE_LIMIT_TTL=900000      # 15 minutos
RATE_LIMIT_MAX=100         # 100 requests por IP

# OPCIÓN 2: Tráfico Medio (1000-10000 usuarios)
RATE_LIMIT_TTL=600000      # 10 minutos
RATE_LIMIT_MAX=200         # 200 requests por IP

# OPCIÓN 3: Tráfico Alto (> 10000 usuarios)
RATE_LIMIT_TTL=300000      # 5 minutos
RATE_LIMIT_MAX=300         # 300 requests por IP

# RECOMENDACIÓN INICIAL: Empezar conservador y ajustar
RATE_LIMIT_TTL=900000
RATE_LIMIT_MAX=150
```

#### Prueba de Carga en Staging

```bash
# Usando Apache Bench (ab)
ab -n 200 -c 10 -H "Content-Type: application/json" \
  -p request.json \
  https://staging-api.lotolink.com/api/v1/auth/login

# Usando k6 (recomendado)
cat > load-test.js <<'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },  // Ramp up
    { duration: '5m', target: 50 },  // Steady
    { duration: '2m', target: 100 }, // Spike
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function () {
  const res = http.post('https://staging-api.lotolink.com/api/v1/auth/login', 
    JSON.stringify({ phone: '+18091234567', password: 'test' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });
  
  sleep(1);
}
EOF

k6 run load-test.js
```

#### Monitoreo de Rate Limiting

```bash
# Query Prometheus para ver rate limit hits
rate(http_requests_total{status="429"}[5m])

# Alert si más del 5% de requests son rate limited
- alert: HighRateLimitHits
  expr: (rate(http_requests_total{status="429"}[5m]) / rate(http_requests_total[5m])) > 0.05
  annotations:
    summary: "Más del 5% de requests están siendo rate limited"
```

---

## 2. 🗄️ Migraciones y Datos

### 2.1 Ejecutar Migraciones en Staging y Producción

**Responsable:** Database Administrator / Backend Lead  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🔴 CRÍTICA

#### Criterios de Aceptación

- [ ] **Backup pre-migración en staging** - Completado y verificado
- [ ] **Migraciones exitosas en staging** - Sin errores
- [ ] **Validación de datos en staging** - Integridad confirmada
- [ ] **Backup pre-migración en producción** - Completado y verificado
- [ ] **Migraciones exitosas en producción** - Sin errores
- [ ] **Rollback plan documentado** - Procedimiento de reversión

#### Procedimiento Completo

```bash
# ============================================
# STAGING
# ============================================

# 1. Backup ANTES de migrar
export DATABASE_HOST=staging-db.lotolink.com
export DATABASE_PASSWORD=<staging-password>
./scripts/backup-database.sh

# Verificar backup
ls -lh /var/backups/lotolink/postgres/latest.sql.gz
gunzip -t /var/backups/lotolink/postgres/latest.sql.gz

# 2. Ejecutar migraciones en staging
cd backend
npm run migration:run

# 3. Verificar migraciones
npm run typeorm migration:show -d src/infrastructure/database/data-source.ts

# Output esperado:
# [X] CreateInitialSchema (1703000000000)
# [X] AddWalletTransactionsTable (1704000000000)
# [X] AddSucursalesTable (1704100000000)

# 4. Validar datos (queries de prueba)
psql -h $DATABASE_HOST -U lotolink -d lotolink_db <<EOF
-- Verificar tablas
\dt

-- Contar registros
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'plays', COUNT(*) FROM plays
UNION ALL
SELECT 'bancas', COUNT(*) FROM bancas
UNION ALL
SELECT 'wallet_transactions', COUNT(*) FROM wallet_transactions
UNION ALL
SELECT 'sucursales', COUNT(*) FROM sucursales;

-- Verificar índices
\di

-- Verificar foreign keys
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
EOF

# ============================================
# PRODUCCIÓN (solo después de staging exitoso)
# ============================================

# 1. BACKUP CRÍTICO en producción
export DATABASE_HOST=prod-db.lotolink.com
export DATABASE_PASSWORD=<prod-password>
./scripts/backup-database.sh

# 2. Notificar equipo y usuarios
echo "INICIO VENTANA DE MANTENIMIENTO" | mail -s "LOTOLINK Maintenance" ops@lotolink.com

# 3. Poner sistema en modo mantenimiento (opcional)
# kubectl scale deployment lotolink-backend --replicas=0

# 4. Ejecutar migraciones
cd backend
npm run migration:run 2>&1 | tee /var/log/lotolink/migration-prod-$(date +%Y%m%d-%H%M%S).log

# 5. Verificar
npm run typeorm migration:show -d src/infrastructure/database/data-source.ts

# 6. Validar datos (mismo script que staging)
psql -h $DATABASE_HOST -U lotolink -d lotolink_db -f validation-queries.sql

# 7. Restaurar servicio
# kubectl scale deployment lotolink-backend --replicas=3

# 8. Verificar health
curl https://api.lotolink.com/health/ready

# 9. Notificar éxito
echo "MIGRACIONES COMPLETADAS EXITOSAMENTE" | mail -s "LOTOLINK Migration Success" ops@lotolink.com
```

#### Rollback Plan

```bash
# Si algo falla INMEDIATAMENTE después de migración

# 1. Revertir última migración
cd backend
npm run migration:revert

# 2. Si múltiples migraciones, revertir todas
for i in {1..3}; do
  npm run migration:revert
done

# 3. O restaurar backup completo (más seguro)
./scripts/restore-database.sh /var/backups/lotolink/postgres/backup_TIMESTAMP.sql.gz

# 4. Verificar restauración
psql -h $DATABASE_HOST -U lotolink -d lotolink_db -c "\dt"
```

### 2.2 Confirmar Estado de Migraciones

**Responsable:** Database Administrator  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🔴 CRÍTICA

#### Criterios de Aceptación

- [ ] **No hay migraciones pendientes** - `migration:show` muestra todas [X]
- [ ] **Esquema coincide con código** - TypeORM entities vs DB schema
- [ ] **Datos intactos** - Conteos antes/después coinciden
- [ ] **Performance acceptable** - Queries críticas < 100ms

#### Script de Validación Completa

```bash
#!/bin/bash
# Archivo: scripts/validate-migrations.sh

echo "=== Validación de Migraciones ==="

cd backend

# 1. Estado de migraciones
echo "1. Verificando estado de migraciones..."
PENDING=$(npm run typeorm migration:show -d src/infrastructure/database/data-source.ts | grep "\[ \]" | wc -l)

if [ "$PENDING" -gt 0 ]; then
  echo "❌ ERROR: Hay $PENDING migraciones pendientes"
  exit 1
else
  echo "✅ Todas las migraciones ejecutadas"
fi

# 2. Verificar tablas requeridas
echo "2. Verificando tablas..."
TABLES=("users" "plays" "bancas" "outgoing_requests" "webhook_events" "wallet_transactions" "sucursales")

for table in "${TABLES[@]}"; do
  EXISTS=$(psql $DATABASE_URL -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" | xargs)
  if [ "$EXISTS" = "t" ]; then
    echo "✅ Tabla $table existe"
  else
    echo "❌ ERROR: Tabla $table no existe"
    exit 1
  fi
done

# 3. Verificar índices críticos
echo "3. Verificando índices..."
INDEXES=("idx_plays_user_id" "idx_plays_status" "idx_wallet_transactions_user_id")

for index in "${INDEXES[@]}"; do
  EXISTS=$(psql $DATABASE_URL -t -c "SELECT EXISTS (SELECT FROM pg_indexes WHERE indexname = '$index');" | xargs)
  if [ "$EXISTS" = "t" ]; then
    echo "✅ Índice $index existe"
  else
    echo "⚠️  WARNING: Índice $index no existe"
  fi
done

# 4. Test de performance básico
echo "4. Test de performance..."
QUERY_TIME=$(psql $DATABASE_URL -t -c "\timing on" -c "SELECT COUNT(*) FROM users;" 2>&1 | grep "Time:" | awk '{print $2}')
echo "Query time: $QUERY_TIME ms"

echo "✅ Validación completada"
```

---

## 3. 💾 Backups y Restore

### 3.1 Programar Backup Automático

**Responsable:** DevOps / SRE  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🔴 CRÍTICA

#### Criterios de Aceptación

- [ ] **Backup programado** - Cron o CronJob configurado
- [ ] **Credenciales seguras** - En secrets manager, no hardcoded
- [ ] **Retención configurada** - 30 días mínimo
- [ ] **Notificaciones activas** - Email/Slack en éxito y error
- [ ] **Backup remoto** - S3 o equivalente configurado
- [ ] **Verificación automática** - Script valida integridad

#### Implementación con Kubernetes CronJob

```yaml
# Archivo: k8s/backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: lotolink-db-backup
  namespace: lotolink-prod
spec:
  schedule: "0 2 * * *"  # Diario a las 2 AM UTC
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: lotolink-backup
        spec:
          restartPolicy: OnFailure
          serviceAccountName: lotolink-backup-sa
          containers:
          - name: backup
            image: postgres:15-alpine
            command:
            - /bin/sh
            - -c
            - |
              set -e
              
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              BACKUP_FILE="backup_${TIMESTAMP}.sql.gz"
              
              echo "Starting backup at $(date)"
              
              # Crear backup
              PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
                -h "$DATABASE_HOST" \
                -p "$DATABASE_PORT" \
                -U "$DATABASE_USER" \
                -d "$DATABASE_NAME" \
                --format=plain \
                --no-owner \
                --no-acl \
                | gzip > "/backups/${BACKUP_FILE}"
              
              # Verificar tamaño
              SIZE=$(du -h "/backups/${BACKUP_FILE}" | cut -f1)
              echo "Backup created: ${BACKUP_FILE} (${SIZE})"
              
              # Subir a S3
              if [ -n "$S3_BUCKET" ]; then
                aws s3 cp "/backups/${BACKUP_FILE}" \
                  "s3://${S3_BUCKET}/backups/postgres/${BACKUP_FILE}" \
                  --storage-class GLACIER
                echo "Uploaded to S3"
              fi
              
              # Limpiar backups antiguos locales (> 7 días)
              find /backups -name "backup_*.sql.gz" -mtime +7 -delete
              
              # Notificar éxito
              curl -X POST "$SLACK_WEBHOOK" \
                -H 'Content-Type: application/json' \
                -d "{\"text\":\"✅ Backup exitoso: ${BACKUP_FILE} (${SIZE})\"}"
              
              echo "Backup completed successfully"
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
            - name: S3_BUCKET
              valueFrom:
                configMapKeyRef:
                  name: backup-config
                  key: s3_bucket
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: access_key_id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: secret_access_key
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: notification-secrets
                  key: slack_webhook_url
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: lotolink-backup-pvc
---
# PVC para almacenamiento local de backups
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: lotolink-backup-pvc
  namespace: lotolink-prod
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: fast-ssd
```

#### Implementación con Cron (Servidor Linux)

```bash
# 1. Crear configuración de backup
sudo mkdir -p /etc/lotolink
sudo cat > /etc/lotolink/backup.conf <<EOF
DATABASE_HOST=prod-db.lotolink.com
DATABASE_PORT=5432
DATABASE_USER=lotolink
DATABASE_NAME=lotolink_db
BACKUP_DIR=/var/backups/lotolink/postgres
RETENTION_DAYS=30
S3_BUCKET=lotolink-backups-prod
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
EOF

# 2. Crear script wrapper que carga config
sudo cat > /usr/local/bin/lotolink-backup.sh <<'EOF'
#!/bin/bash
set -e

# Cargar configuración
source /etc/lotolink/backup.conf

# Cargar password desde secrets manager (AWS Secrets Manager ejemplo)
export DATABASE_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id lotolink/prod/database \
  --query SecretString \
  --output text | jq -r .password)

# Ejecutar backup
/opt/lotolink/scripts/backup-database.sh

# Notificar
curl -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d '{"text":"✅ Backup diario completado"}'
EOF

sudo chmod +x /usr/local/bin/lotolink-backup.sh

# 3. Agregar a crontab
sudo crontab -e
# Agregar:
0 2 * * * /usr/local/bin/lotolink-backup.sh >> /var/log/lotolink/backup-cron.log 2>&1
```

### 3.2 Drill de Restore

**Responsable:** Database Administrator / SRE  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🟡 ALTA

#### Criterios de Aceptación

- [ ] **Restore exitoso** - En entorno aislado no-prod
- [ ] **RTO documentado** - Tiempo real de restore medido
- [ ] **RPO documentado** - Punto de recuperación confirmado
- [ ] **Procedimiento validado** - Todos los pasos funcionan
- [ ] **Equipo entrenado** - Al menos 2 personas pueden ejecutar

#### Procedimiento de Drill

```bash
#!/bin/bash
# Archivo: scripts/backup-restore-drill.sh

set -e

DRILL_DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/lotolink/restore-drill-${DRILL_DATE}.log"

echo "========================================" | tee -a "$LOG_FILE"
echo "Restore Drill - $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# 1. Seleccionar backup
BACKUP_FILE="/var/backups/lotolink/postgres/latest.sql.gz"
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "Backup file: $BACKUP_FILE" | tee -a "$LOG_FILE"
echo "Backup size: $BACKUP_SIZE" | tee -a "$LOG_FILE"

# 2. Crear DB temporal para restore
DB_TEMP="lotolink_restore_drill_${DRILL_DATE}"
export DATABASE_NAME="$DB_TEMP"

echo "Creating temporary database: $DB_TEMP" | tee -a "$LOG_FILE"

psql -h $DATABASE_HOST -U $DATABASE_USER -d postgres -c "CREATE DATABASE $DB_TEMP;"

# 3. Medir tiempo de restore
START_TIME=$(date +%s)

echo "Starting restore at $(date)..." | tee -a "$LOG_FILE"

gunzip -c "$BACKUP_FILE" | psql -h $DATABASE_HOST -U $DATABASE_USER -d $DB_TEMP -q

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo "✅ Restore completed in ${MINUTES}m ${SECONDS}s" | tee -a "$LOG_FILE"

# 4. Verificar integridad
echo "Verifying restored data..." | tee -a "$LOG_FILE"

TABLE_COUNT=$(psql -h $DATABASE_HOST -U $DATABASE_USER -d $DB_TEMP -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

USER_COUNT=$(psql -h $DATABASE_HOST -U $DATABASE_USER -d $DB_TEMP -t -c \
  "SELECT COUNT(*) FROM users;" | xargs)

echo "Tables restored: $TABLE_COUNT" | tee -a "$LOG_FILE"
echo "Users count: $USER_COUNT" | tee -a "$LOG_FILE"

# 5. Cleanup
echo "Cleaning up temporary database..." | tee -a "$LOG_FILE"
psql -h $DATABASE_HOST -U $DATABASE_USER -d postgres -c "DROP DATABASE $DB_TEMP;"

# 6. Resumen
echo "========================================" | tee -a "$LOG_FILE"
echo "RESTORE DRILL SUMMARY" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "RTO (Recovery Time Objective): ${MINUTES}m ${SECONDS}s" | tee -a "$LOG_FILE"
echo "Backup size: $BACKUP_SIZE" | tee -a "$LOG_FILE"
echo "Tables restored: $TABLE_COUNT" | tee -a "$LOG_FILE"
echo "Status: ✅ SUCCESS" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# 7. Notificar
curl -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"✅ Restore drill completado - RTO: ${MINUTES}m ${SECONDS}s\"}"

echo "Drill log saved to: $LOG_FILE"
```

#### Programar Drills Regulares

```bash
# Drill mensual - primer domingo de cada mes a las 10 AM
0 10 * * 0 [ $(date +\%d) -le 7 ] && /opt/lotolink/scripts/backup-restore-drill.sh
```

---

## 4. 💳 Stripe y Webhooks

### 4.1 Configurar Claves en Secrets Manager

**Responsable:** Backend Lead / DevOps  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🔴 CRÍTICA

#### Criterios de Aceptación

- [ ] **Claves en secrets manager** - No en archivos .env
- [ ] **Modo test validado** - Pagos funcionan en staging
- [ ] **Modo live configurado** - Claves reales en producción
- [ ] **Webhook signature verificada** - HMAC válido
- [ ] **Logs de webhooks activos** - Para debugging
- [ ] **Alertas configuradas** - Webhook failures

#### Configuración en AWS Secrets Manager

```bash
# 1. Crear secret para Stripe TEST (staging)
aws secretsmanager create-secret \
  --name lotolink/staging/stripe \
  --description "Stripe keys for staging environment" \
  --secret-string '{
    "secret_key": "sk_test_YOUR_TEST_KEY",
    "webhook_secret": "whsec_YOUR_TEST_WEBHOOK_SECRET"
  }' \
  --region us-east-1

# 2. Crear secret para Stripe LIVE (producción)
aws secretsmanager create-secret \
  --name lotolink/prod/stripe \
  --description "Stripe keys for production environment" \
  --secret-string '{
    "secret_key": "sk_live_YOUR_LIVE_KEY",
    "webhook_secret": "whsec_YOUR_LIVE_WEBHOOK_SECRET"
  }' \
  --region us-east-1

# 3. Verificar secrets
aws secretsmanager list-secrets --query 'SecretList[?Name==`lotolink/prod/stripe`]'

# 4. Dar permisos al pod/EC2 para leer secrets
# Ver IAM policy ejemplo abajo
```

#### IAM Policy para Secrets

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:lotolink/prod/*"
      ]
    }
  ]
}
```

#### Actualizar Backend para Usar Secrets Manager

```typescript
// backend/src/infrastructure/config/secrets.service.ts
// (Este código debe existir según PRODUCTION_DEPLOYMENT_CHECKLIST.md)

// Verificar que el backend cargue secrets correctamente
// Test de integración:

import { SecretsService } from './secrets.service';
import { ConfigService } from '@nestjs/config';

describe('SecretsService', () => {
  it('should load Stripe secrets from AWS Secrets Manager', async () => {
    const configService = new ConfigService({
      SECRETS_PROVIDER: 'aws',
      AWS_REGION: 'us-east-1',
      NODE_ENV: 'production'
    });
    
    const secretsService = new SecretsService(configService);
    await secretsService.onModuleInit();
    
    const stripeKey = secretsService.get('STRIPE_SECRET_KEY');
    expect(stripeKey).toMatch(/^sk_live_/);
  });
});
```

### 4.2 Validar Flujo de Pago

**Responsable:** Backend Lead / QA Lead  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🔴 CRÍTICA

#### Criterios de Aceptación

- [ ] **Pago test exitoso** - En staging con tarjetas de prueba
- [ ] **Webhook test recibido** - Firma validada correctamente
- [ ] **Pago live probado** - Monto mínimo en producción
- [ ] **Webhook live recibido** - Firma validada en prod
- [ ] **Manejo de errores** - Pagos rechazados manejados
- [ ] **Logs completos** - Trazabilidad de cada pago

#### Script de Validación de Pagos

```bash
#!/bin/bash
# Archivo: scripts/validate-stripe-payments.sh

API_URL="${1:-https://staging-api.lotolink.com}"
echo "=== Validación Stripe Payments en $API_URL ==="

# 1. Registrar usuario de prueba
echo "1. Registrando usuario..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+18091111111",
    "password": "Test123!",
    "name": "Test Stripe User",
    "email": "stripe-test@example.com"
  }')

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.accessToken')
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id')

if [ "$TOKEN" = "null" ]; then
  echo "❌ Error en registro"
  exit 1
fi

echo "✅ Usuario registrado: $USER_ID"

# 2. Cargar wallet con tarjeta de prueba Stripe
echo "2. Cargando wallet con Stripe..."

# Primero crear payment method en Stripe
# (En producción real, esto lo hace el frontend)
PAYMENT_INTENT=$(curl -s -X POST "$API_URL/api/v1/users/$USER_ID/wallet/charge" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "paymentMethod": "STRIPE",
    "stripePaymentMethodId": "pm_card_visa"
  }')

echo "$PAYMENT_INTENT" | jq .

CHARGE_STATUS=$(echo "$PAYMENT_INTENT" | jq -r '.status')

if [ "$CHARGE_STATUS" = "succeeded" ]; then
  echo "✅ Pago procesado exitosamente"
else
  echo "❌ Error en pago: $CHARGE_STATUS"
  exit 1
fi

# 3. Verificar balance actualizado
echo "3. Verificando balance..."
sleep 2  # Esperar webhook

BALANCE=$(curl -s -X GET "$API_URL/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.walletBalance')

echo "Balance actual: $$BALANCE"

if [ "$BALANCE" -ge 1000 ]; then
  echo "✅ Balance actualizado correctamente"
else
  echo "⚠️  Balance no actualizado. Verificar webhooks."
fi

# 4. Probar pago rechazado
echo "4. Probando tarjeta rechazada..."
DECLINED=$(curl -s -X POST "$API_URL/api/v1/users/$USER_ID/wallet/charge" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "paymentMethod": "STRIPE",
    "stripePaymentMethodId": "pm_card_chargeDeclined"
  }')

ERROR=$(echo "$DECLINED" | jq -r '.error')

if [[ "$ERROR" == *"declined"* ]]; then
  echo "✅ Rechazo manejado correctamente"
else
  echo "⚠️  Manejo de rechazo incorrecto"
fi

echo "✅ Validación de pagos completada"
```

#### Monitoreo de Webhooks

```bash
# Query para verificar webhooks recibidos
SELECT 
  id,
  event_type,
  status,
  created_at,
  processed_at,
  EXTRACT(EPOCH FROM (processed_at - created_at)) as processing_time_seconds
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

# Alert si webhooks no se procesan
- alert: WebhookProcessingFailed
  expr: rate(webhook_events_failed_total[5m]) > 0
  annotations:
    summary: "Webhooks de Stripe fallando"
```

---

## 5. 🧪 Pruebas Finales

### 5.1 E2E en Staging

**Responsable:** QA Lead / Desarrollo  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🔴 CRÍTICA

#### Criterios de Aceptación

- [ ] **Flujo de compra completo** - Desde registro hasta ticket
- [ ] **Panel admin funcional** - Login, alta, aprobación
- [ ] **Rate limit validado** - No bloquea usuarios legítimos
- [ ] **CORS validado** - Funciona desde dominios oficiales
- [ ] **Todos los tests automatizados pasan** - 100% success rate

#### Ejecutar Tests E2E

```bash
# 1. Configurar staging
export API_URL="https://staging-api.lotolink.com"
export ADMIN_PHONE="+18099999999"
export ADMIN_PASSWORD="<staging-admin-password>"

# 2. Ejecutar todos los scripts E2E
cd /ruta/a/LOTOLINK

echo "=== Ejecutando E2E Tests en Staging ==="

# Test de compra
echo "Test 1: Flujo de compra..."
./e2e-test-purchase.sh | tee logs/e2e-purchase-$(date +%Y%m%d-%H%M%S).log

# Test de admin
echo "Test 2: Panel admin..."
./e2e-test-admin.sh | tee logs/e2e-admin-$(date +%Y%m%d-%H%M%S).log

# Test de rate limiting
echo "Test 3: Rate limiting..."
./test-rate-limit.sh | tee logs/e2e-ratelimit-$(date +%Y%m%d-%H%M%S).log

# Validar CORS
echo "Test 4: CORS..."
./scripts/validate-cors-production.sh | tee logs/e2e-cors-$(date +%Y%m%d-%H%M%S).log

# 3. Tests del backend
cd backend
npm run test
npm run test:e2e

# 4. Smoke tests
cd ..
./scripts/smoke-tests.sh

echo "✅ Todos los E2E completados"
```

### 5.2 Pentest o Escaneo de Seguridad

**Responsable:** Security Lead / DevOps  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🟡 ALTA

#### Criterios de Aceptación

- [ ] **OWASP Top 10 validated** - Sin vulnerabilidades críticas
- [ ] **Headers de seguridad** - CSP, HSTS, X-Frame-Options
- [ ] **Dependencias actualizadas** - npm audit 0 vulnerabilities
- [ ] **Secrets no expuestos** - Scan de git history
- [ ] **Pentest externo (opcional)** - Reporte profesional

#### Escaneo Automatizado

```bash
# 1. OWASP ZAP Scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://staging-api.lotolink.com \
  -r owasp-zap-report.html

# 2. Security Headers
curl -I https://staging-api.lotolink.com | grep -i "security\|csp\|hsts\|frame"

# Esperado:
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: ...

# 3. npm audit
cd backend
npm audit --production

# Debe ser 0 vulnerabilities
# Si hay vulnerabilities, actualizar:
# npm audit fix

# 4. Scan de secrets en git history
cd ..
docker run -v $(pwd):/path zricethezav/gitleaks:latest detect \
  --source="/path" \
  --report-path=gitleaks-report.json

# 5. SSL/TLS Test
docker run --rm nmap --script ssl-enum-ciphers -p 443 staging-api.lotolink.com

echo "✅ Escaneo de seguridad completado"
```

---

## 6. 📊 Observabilidad y Operación

### 6.1 Definir y Activar Alertas Básicas

**Responsable:** SRE / DevOps  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🟡 ALTA

#### Criterios de Aceptación

- [ ] **Alertas de 5xx configuradas** - Slack/Email/PagerDuty
- [ ] **Alertas de latencia** - P95 y P99
- [ ] **Alertas de webhook failures** - Stripe webhooks
- [ ] **Alertas de DB connectivity** - Health checks
- [ ] **On-call rotation definida** - Quién responde

#### Configuración de Alertas (Prometheus/Alertmanager)

```yaml
# Archivo: monitoring/prometheus-alerts.yml
groups:
  - name: lotolink_production
    interval: 30s
    rules:
      # 1. Error rate 5xx
      - alert: HighErrorRate5xx
        expr: (rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "Tasa de errores 5xx alta: {{ $value }}%"
          description: "Más del 1% de requests están fallando con 5xx"
          runbook: "https://wiki.lotolink.com/runbooks/high-5xx-rate"

      # 2. Latencia P95
      - alert: HighLatencyP95
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1.0
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Latencia P95 alta: {{ $value }}s"
          description: "El 95% de requests tardan más de 1 segundo"

      # 3. Latencia P99
      - alert: HighLatencyP99
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2.0
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Latencia P99 alta: {{ $value }}s"
          description: "El 99% de requests tardan más de 2 segundos"

      # 4. Backend down
      - alert: BackendDown
        expr: up{job="lotolink-backend"} == 0
        for: 1m
        labels:
          severity: critical
          team: sre
        annotations:
          summary: "Backend caído"
          description: "El backend no responde a health checks"
          action: "Revisar logs y reiniciar si es necesario"

      # 5. Database disconnected
      - alert: DatabaseDisconnected
        expr: lotolink_database_connected == 0
        for: 2m
        labels:
          severity: critical
          team: dba
        annotations:
          summary: "Base de datos desconectada"
          description: "El backend no puede conectar a PostgreSQL"

      # 6. Webhook failures
      - alert: WebhookProcessingFailed
        expr: rate(webhook_events_failed_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Webhooks fallando"
          description: "Más de 0.1 webhooks por segundo están fallando"

      # 7. Disk space
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.15
        for: 5m
        labels:
          severity: warning
          team: sre
        annotations:
          summary: "Espacio en disco bajo: {{ $value }}%"
          description: "Menos del 15% de espacio disponible"

      # 8. Memory pressure
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.90
        for: 5m
        labels:
          severity: warning
          team: sre
        annotations:
          summary: "Uso de memoria alto: {{ $value }}%"
          description: "Más del 90% de memoria en uso"
```

#### Configuración de Alertmanager

```yaml
# Archivo: monitoring/alertmanager.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

route:
  receiver: 'default'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  
  routes:
    # Critical alerts to PagerDuty + Slack
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true
    
    - match:
        severity: critical
      receiver: 'slack-critical'
    
    # Warnings only to Slack
    - match:
        severity: warning
      receiver: 'slack-warnings'

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#lotolink-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '<your-pagerduty-integration-key>'
        description: '{{ .GroupLabels.alertname }}'

  - name: 'slack-critical'
    slack_configs:
      - channel: '#lotolink-critical'
        title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}\n*Runbook:* {{ .Annotations.runbook }}\n{{ end }}'
        color: 'danger'

  - name: 'slack-warnings'
    slack_configs:
      - channel: '#lotolink-warnings'
        title: '⚠️  WARNING: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}'
        color: 'warning'
```

### 6.2 Logging y Traza

**Responsable:** Backend Lead / SRE  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🟡 ALTA

#### Criterios de Aceptación

- [ ] **Structured logging activo** - JSON format
- [ ] **Request IDs en todos los logs** - Trazabilidad
- [ ] **Logs centralizados** - ELK/CloudWatch/Datadog
- [ ] **Retención configurada** - 30 días mínimo
- [ ] **Logs de flujos críticos** - Pagos, auth, jugadas

#### Validar Logging

```bash
# 1. Verificar formato de logs
kubectl logs -n lotolink-prod deployment/lotolink-backend --tail=10

# Debe ser JSON estructurado:
# {"level":"info","timestamp":"2026-01-04T00:00:00Z","request_id":"uuid","message":"User registered"}

# 2. Buscar request_id en todos los logs de una transacción
REQUEST_ID="550e8400-e29b-41d4-a716-446655440000"
kubectl logs -n lotolink-prod deployment/lotolink-backend | grep "$REQUEST_ID"

# Debe mostrar toda la traza:
# - Request inicial
# - Procesamiento
# - Llamadas a DB
# - Respuesta

# 3. Logs de flujos críticos
# Auth
kubectl logs -n lotolink-prod deployment/lotolink-backend | grep '"context":"AuthService"' | tail -20

# Payments
kubectl logs -n lotolink-prod deployment/lotolink-backend | grep '"context":"PaymentService"' | tail -20

# Plays
kubectl logs -n lotolink-prod deployment/lotolink-backend | grep '"context":"PlayService"' | tail -20
```

---

## 7. 👥 Gobernanza/Roles

### 7.1 Creación de Admins Restringida

**Responsable:** Security Lead / Backend Lead  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🔴 CRÍTICA

#### Criterios de Aceptación

- [ ] **Auto-admin eliminado** - No se puede self-promote
- [ ] **Endpoint protegido** - Solo admins pueden crear admins
- [ ] **Audit log activo** - Registra quién crea admins
- [ ] **MFA recomendado (opcional)** - Para cuentas admin
- [ ] **Lista de admins documentada** - Quiénes tienen acceso

#### Verificación

```bash
# 1. Intentar crear admin sin ser admin (debe fallar)
curl -X POST https://api.lotolink.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+18091234567",
    "email": "admin@lotolink.com",
    "password": "Test123!",
    "name": "Fake Admin"
  }'

# Respuesta esperada: Usuario normal creado, NO admin

# 2. Verificar endpoint de creación de admin requiere auth
curl -X POST https://api.lotolink.com/admin/users/create-admin \
  -H "Content-Type: application/json" \
  -d '{"phone":"+18091111111","password":"test"}'

# Respuesta esperada: 401 Unauthorized

# 3. Verificar audit log
psql -h $DATABASE_HOST -U lotolink -d lotolink_db <<EOF
-- Debe haber tabla de audit logs
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'audit_logs'
);

-- Ver últimas creaciones de admin
SELECT 
  performed_by_user_id,
  action,
  target_user_id,
  created_at
FROM audit_logs
WHERE action = 'CREATE_ADMIN'
ORDER BY created_at DESC
LIMIT 10;
EOF
```

### 7.2 Rotación de Secretos

**Responsable:** Security Lead / DevOps  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🟡 ALTA

#### Criterios de Aceptación

- [ ] **Proceso definido** - Cómo rotar cada tipo de secret
- [ ] **Frecuencia establecida** - Cada 90 días mínimo
- [ ] **Calendario configurado** - Recordatorios automáticos
- [ ] **Runbook documentado** - Pasos exactos para rotar
- [ ] **Zero downtime** - Rotación sin afectar servicio

#### Tipos de Secrets a Rotar

1. **JWT_SECRET** - Cada 90 días
2. **HMAC_SECRET** - Cada 90 días
3. **DATABASE_PASSWORD** - Cada 90 días
4. **STRIPE_SECRET_KEY** - Cuando Stripe lo requiera
5. **REDIS_PASSWORD** - Cada 90 días
6. **RABBITMQ_PASSWORD** - Cada 90 días

#### Procedimiento de Rotación JWT (Zero Downtime)

```bash
# Rotación de JWT_SECRET sin downtime
# Usa concepto de "key rotation" con múltiples claves válidas

# 1. Generar nuevo secret
NEW_JWT_SECRET=$(openssl rand -base64 64)

# 2. Actualizar config para aceptar AMBAS claves temporalmente
# En secrets manager:
aws secretsmanager update-secret \
  --secret-id lotolink/prod/jwt \
  --secret-string "{
    \"current_secret\": \"$NEW_JWT_SECRET\",
    \"previous_secret\": \"$OLD_JWT_SECRET\"
  }"

# 3. Deploy backend con cambio que acepta ambas claves
# (Backend debe verificar con current, si falla intentar previous)

# 4. Esperar 7 días (tiempo de expiración de refresh tokens)

# 5. Remover clave antigua
aws secretsmanager update-secret \
  --secret-id lotolink/prod/jwt \
  --secret-string "{
    \"current_secret\": \"$NEW_JWT_SECRET\"
  }"

# 6. Deploy final solo con nueva clave

# 7. Documentar en audit log
echo "$(date): JWT_SECRET rotated" >> /var/log/lotolink/secret-rotation.log
```

---

## 8. 📚 Documentación Operativa

### 8.1 Comandos Reales Usados

**Responsable:** DevOps Lead  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🟡 ALTA

#### Criterios de Aceptación

- [ ] **Runbook de despliegue** - Con comandos exactos ejecutados
- [ ] **Runbook de rollback** - Cómo revertir despliegue
- [ ] **Runbook de incidentes** - Respuesta a problemas comunes
- [ ] **Comandos de emergencia** - Acciones críticas rápidas
- [ ] **Ejemplos reales** - De staging y producción

#### Crear Runbooks

Ver archivo separado: `RUNBOOKS.md` (creado abajo)

### 8.2 Checklist de Despliegue

**Responsable:** Tech Lead  
**Estado:** ⬜ Pendiente  
**Prioridad:** 🟡 ALTA

#### Criterios de Aceptación

- [ ] **Pre-deploy checklist** - Qué verificar antes
- [ ] **Durante deploy** - Pasos exactos
- [ ] **Post-deploy checklist** - Validación completa
- [ ] **Comunicación definida** - Quién notificar y cuándo

#### Ver POST_MERGE_VERIFICATION.md para checklist completo

---

## 9. ✅ Resumen GO/NO-GO

### Criterios Obligatorios (NO-GO si falla alguno)

| # | Criterio | Estado | Responsable |
|---|----------|--------|-------------|
| 1 | CORS configurado con dominios oficiales | ⬜ | DevOps |
| 2 | Migraciones ejecutadas en producción | ⬜ | DBA |
| 3 | Backup automático programado | ⬜ | SRE |
| 4 | Stripe claves en secrets manager | ⬜ | Backend |
| 5 | Pagos validados (test y live) | ⬜ | QA |
| 6 | E2E tests pasan en staging | ⬜ | QA |
| 7 | No hay vulnerabilidades críticas | ⬜ | Security |
| 8 | Alertas básicas configuradas | ⬜ | SRE |
| 9 | Creación de admins restringida | ⬜ | Security |
| 10 | Runbooks documentados | ⬜ | DevOps |

### Criterios Recomendados (GO con plan de mitigación)

| # | Criterio | Estado | Plan si NO |
|---|----------|--------|------------|
| 1 | Drill de restore completado | ⬜ | Programar en primera semana |
| 2 | Pentest externo realizado | ⬜ | Contratar en mes 1 |
| 3 | Rotación de secretos configurada | ⬜ | Implementar en mes 1 |
| 4 | MFA para admins | ⬜ | Roadmap Q1 2026 |

---

## 10. 📞 Responsables y Escalación

### Roles y Responsabilidades

| Rol | Persona | Email | Teléfono |
|-----|---------|-------|----------|
| Tech Lead | TBD | tech-lead@lotolink.com | +1-XXX-XXX-XXXX |
| DevOps Lead | TBD | devops@lotolink.com | +1-XXX-XXX-XXXX |
| Backend Lead | TBD | backend@lotolink.com | +1-XXX-XXX-XXXX |
| QA Lead | TBD | qa@lotolink.com | +1-XXX-XXX-XXXX |
| Security Lead | TBD | security@lotolink.com | +1-XXX-XXX-XXXX |
| DBA | TBD | dba@lotolink.com | +1-XXX-XXX-XXXX |
| SRE | TBD | sre@lotolink.com | +1-XXX-XXX-XXXX |

### Escalación de Incidentes

**Nivel 1:** On-call engineer (responde en 15 min)  
**Nivel 2:** Team lead (responde en 30 min)  
**Nivel 3:** CTO (responde en 1 hora)

---

## 11. 📅 Timeline Sugerido

### Fase 1: Preparación (Semana 1-2)

- [ ] Configurar CORS finales
- [ ] Ajustar rate limiting
- [ ] Configurar secrets manager
- [ ] Programar backups automáticos

### Fase 2: Validación (Semana 2-3)

- [ ] Ejecutar migraciones en staging
- [ ] Drill de restore
- [ ] Validar Stripe test mode
- [ ] E2E tests completos en staging

### Fase 3: Seguridad (Semana 3-4)

- [ ] Escaneo de seguridad
- [ ] Pentest (opcional)
- [ ] Configurar alertas
- [ ] Validar gobernanza de admins

### Fase 4: Producción (Semana 4)

- [ ] Ejecutar migraciones en producción
- [ ] Validar Stripe live mode
- [ ] E2E smoke tests en producción
- [ ] Monitorear por 48 horas

---

## 12. 📋 Aprobación Final

### Sign-off Requerido

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Tech Lead | __________ | __________ | __________ |
| DevOps Lead | __________ | __________ | __________ |
| Security Lead | __________ | __________ | __________ |
| Product Owner | __________ | __________ | __________ |
| CTO | __________ | __________ | __________ |

### Decisión GO/NO-GO

**Fecha de Reunión:** __________  
**Decisión:** ☐ GO ☐ NO-GO  
**Fecha de Lanzamiento:** __________  
**Ventana de Mantenimiento:** __________

**Notas:**
_________________________________
_________________________________
_________________________________

---

**Documento preparado:** 4 de Enero, 2026  
**Versión:** 1.0  
**Próxima revisión:** Después de cada deploy a producción
