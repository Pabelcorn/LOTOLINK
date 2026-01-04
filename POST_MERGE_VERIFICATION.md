# ✅ Checklist Post-Merge: Seguridad + Readiness

**PR Mergeado:** #76 - Align .env.production.example with actual CORS and rate limiting implementation  
**Fecha:** 3 de Enero, 2026  
**Estado:** Validación en Staging/Preproducción

---

## 📋 Pasos Recomendados Inmediatos

Este documento contiene los comandos y procedimientos exactos para validar el sistema después del merge del PR de seguridad y readiness.

**⚠️ IMPORTANTE - Antes de empezar:**
- Reemplaza `<tu-host>` con tu dominio real en todos los comandos (ejemplo: `lotolink.com`, `api.lotolink.com`, o `localhost:3000` para pruebas locales)
- Reemplaza `<tu-dominio.com>` con tu dominio permitido en CORS
- Reemplaza `/ruta/a/LOTOLINK` con la ruta real donde está clonado el repositorio
- Los comandos asumen que tienes permisos de ejecución adecuados (usa `sudo` donde sea necesario)

---

## 1. 🚀 Staging / Preproducción

### 1.1 Desplegar la imagen/artefactos con este merge

```bash
# Opción A: Con Docker Compose
cd /ruta/a/LOTOLINK
git pull origin main  # O la rama que corresponda
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Opción B: Build manual
cd backend
npm install
npm run build
pm2 restart lotolink-backend
# O iniciar si es primera vez:
# pm2 start dist/main.js --name lotolink-backend
```

### 1.2 Ejecutar migraciones TypeORM

```bash
# Entrar al contenedor (si usas Docker)
docker exec -it lotolink-backend bash

# O si instalación directa
cd /ruta/a/LOTOLINK/backend

# Ejecutar migraciones
npm run migration:run

# Verificar que las migraciones se ejecutaron correctamente
npm run typeorm migration:show -d src/infrastructure/database/data-source.ts

# Deberías ver algo como:
# [X] CreateInitialSchema
# [X] AddWalletTransactionsTable
# [X] AddSucursalesTable
```

**Nota:** Si el comando `npm run migration:run` no funciona en Docker, usa el comando completo:
```bash
npm run typeorm migration:run -d src/infrastructure/database/data-source.ts
```

### 1.3 Probar /health y verificar conexión a DB

```bash
# Health check básico (debe devolver 200)
curl -i https://<tu-host>/health

# Debe devolver algo como:
# HTTP/1.1 200 OK
# {
#   "status": "ok",
#   "timestamp": "2026-01-04T00:00:00.000Z",
#   "service": "lotolink-backend",
#   "version": "1.0.0",
#   "uptime": 3600,
#   "uptimeHuman": "1h 0m 0s",
#   "checks": {
#     "database": "connected"
#   }
# }

# Readiness check (debe devolver 200 si DB está conectada)
curl -i https://<tu-host>/health/ready

# Debe devolver 200 OK con:
# {
#   "status": "ready",
#   "timestamp": "2026-01-04T00:00:00.000Z",
#   "checks": {
#     "database": "ok"
#   }
# }
```

**Interpretación:**
- `/health` → Devuelve 200 aunque DB esté desconectada (liveness probe)
- `/health/ready` → Devuelve 503 si DB está desconectada (readiness probe)

---

## 2. 🔒 Validar CORS con los orígenes permitidos y el rate limiting

### 2.1 Probar CORS desde un origen permitido

```bash
# Verificar que tu dominio está en ALLOWED_ORIGINS
grep ALLOWED_ORIGINS backend/.env

# Probar request CORS desde origen permitido
curl -i -X OPTIONS https://<tu-host>/api/v1/auth/login \
  -H "Origin: https://tu-dominio.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"

# Debe devolver headers CORS:
# Access-Control-Allow-Origin: https://tu-dominio.com
# Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
# Access-Control-Allow-Credentials: true

# Probar POST real desde navegador o:
curl -X POST https://<tu-host>/api/v1/auth/login \
  -H "Origin: https://tu-dominio.com" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+18099999999","password":"test123"}'
```

### 2.2 Probar CORS desde un origen NO permitido

```bash
# Probar desde origen no autorizado
curl -i -X OPTIONS https://<tu-host>/api/v1/auth/login \
  -H "Origin: https://sitio-malicioso.com" \
  -H "Access-Control-Request-Method: POST"

# NO debe devolver Access-Control-Allow-Origin
# O debe rechazar la petición
```

### 2.3 Probar Rate Limiting (100 req/15min por IP)

```bash
# Script para probar rate limit
#!/bin/bash
# Archivo: test-rate-limit.sh

ENDPOINT="https://<tu-host>/api/v1/auth/login"
COUNT=0

echo "Probando rate limiting (100 req por 15 min)..."
echo "Haciendo 110 requests..."

for i in {1..110}; do
  RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"phone":"+18099999999","password":"test"}')
  
  COUNT=$((COUNT + 1))
  
  if [ "$RESPONSE" = "429" ]; then
    echo "✅ Rate limit activado en request #$COUNT (HTTP 429)"
    break
  fi
  
  echo "Request #$COUNT: HTTP $RESPONSE"
  sleep 0.1
done

if [ "$RESPONSE" != "429" ]; then
  echo "⚠️  No se detectó rate limit después de $COUNT requests"
else
  echo "✅ Rate limiting funciona correctamente"
fi
```

**Ejecutar:**
```bash
chmod +x test-rate-limit.sh
./test-rate-limit.sh
```

**Esperado:** Después de 100 requests en 15 minutos, debe devolver HTTP 429 (Too Many Requests)

**Configuración actual (según .env.production.example):**
- `RATE_LIMIT_TTL=900000` (15 minutos en milisegundos)
- `RATE_LIMIT_MAX=100` (100 requests por ventana de tiempo)

---

## 3. 💾 Backups

### 3.1 Programar el backup (cron o k8s job)

#### Opción A: Cron en servidor Linux

```bash
# Editar crontab
crontab -e

# Agregar backup diario a las 3 AM
0 3 * * * /ruta/a/LOTOLINK/scripts/backup-database.sh >> /var/log/lotolink/backup.log 2>&1

# Verificar crontab
crontab -l

# Verificar que las variables de entorno están configuradas
# Puedes crear un archivo de configuración:
cat > /etc/lotolink/backup.env <<EOF
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=lotolink
DATABASE_PASSWORD=tu_password_aqui
DATABASE_NAME=lotolink_db
BACKUP_DIR=/var/backups/lotolink/postgres
RETENTION_DAYS=30
# Opcional: subir a S3
# S3_BUCKET=mi-bucket-backups
EOF

# Actualizar script de backup para cargar variables
# Agregar al inicio de backup-database.sh:
# source /etc/lotolink/backup.env
```

#### Opción B: Kubernetes CronJob

```yaml
# Archivo: k8s/backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: lotolink-db-backup
  namespace: lotolink
spec:
  schedule: "0 3 * * *"  # Diario a las 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME \
                --format=plain --no-owner --no-acl | \
                gzip > /backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz
              
              # Limpiar backups antiguos (más de 30 días)
              find /backups -name "backup_*.sql.gz" -mtime +30 -delete
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: lotolink-db-secret
                  key: password
            - name: DATABASE_HOST
              value: "postgres-service"
            - name: DATABASE_PORT
              value: "5432"
            - name: DATABASE_USER
              value: "lotolink"
            - name: DATABASE_NAME
              value: "lotolink_db"
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: lotolink-backup-pvc
          restartPolicy: OnFailure
```

**Aplicar:**
```bash
kubectl apply -f k8s/backup-cronjob.yaml

# Verificar CronJob
kubectl get cronjobs -n lotolink

# Verificar última ejecución
kubectl get jobs -n lotolink

# Ver logs del último backup
kubectl logs -n lotolink -l job-name=lotolink-db-backup-<timestamp>
```

### 3.2 Ejecutar backup manual ahora

```bash
# Configurar variables de entorno
export DATABASE_HOST=localhost
export DATABASE_PORT=5432
export DATABASE_USER=lotolink
export DATABASE_PASSWORD=tu_password
export DATABASE_NAME=lotolink_db
export BACKUP_DIR=/var/backups/lotolink/postgres
export RETENTION_DAYS=30

# Crear directorios si no existen
sudo mkdir -p /var/backups/lotolink/postgres
sudo mkdir -p /var/log/lotolink
sudo chown -R $USER:$USER /var/backups/lotolink /var/log/lotolink

# Ejecutar backup
cd /ruta/a/LOTOLINK
./scripts/backup-database.sh

# Verificar que se generó el backup
ls -lh /var/backups/lotolink/postgres/

# Debe mostrar algo como:
# backup_20260104_030000.sql.gz
# latest.sql.gz -> backup_20260104_030000.sql.gz

# Verificar integridad del archivo comprimido
gunzip -t /var/backups/lotolink/postgres/latest.sql.gz
echo $?  # Debe devolver 0 (sin errores)
```

### 3.3 Verificar que se sube si usas remoto (S3)

```bash
# Configurar S3 (si aplica)
export S3_BUCKET=mi-bucket-lotolink-backups

# Instalar AWS CLI si no está
# curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
# unzip awscliv2.zip
# sudo ./aws/install

# Configurar credenciales
aws configure

# Verificar acceso al bucket
aws s3 ls s3://$S3_BUCKET/backups/postgres/

# El script backup-database.sh automáticamente subirá a S3 si S3_BUCKET está configurado
# Verificar logs:
tail -f /var/log/lotolink/backup.log
```

---

## 4. 🔄 Restore (drill)

### 4.1 Probar restore en un entorno aislado/staging

**⚠️ IMPORTANTE:** Nunca ejecutar restore en producción sin backup reciente

```bash
# Paso 1: Crear base de datos de prueba
export DATABASE_HOST=localhost
export DATABASE_PORT=5432
export DATABASE_USER=lotolink
export DATABASE_PASSWORD=tu_password
export DATABASE_NAME=lotolink_db_test  # Base de datos de PRUEBA

# Crear DB de prueba
PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d postgres -c "CREATE DATABASE $DATABASE_NAME;"

# Paso 2: Restaurar backup
cd /ruta/a/LOTOLINK

# El script restore-database.sh pedirá confirmación
./scripts/restore-database.sh /var/backups/lotolink/postgres/latest.sql.gz

# Cuando pregunte:
# "Database: lotolink_db_test@localhost:5432"
# "Are you sure you want to continue? (yes/no):"
# Escribir: yes

# Paso 3: Verificar restore
PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME -c "\dt"

# Debe mostrar todas las tablas:
# public | bancas                  | table | lotolink
# public | migrations              | table | lotolink
# public | outgoing_requests       | table | lotolink
# public | plays                   | table | lotolink
# public | sucursales              | table | lotolink
# public | users                   | table | lotolink
# public | wallet_transactions     | table | lotolink
# public | webhook_events          | table | lotolink

# Paso 4: Verificar datos
PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME -c "SELECT COUNT(*) FROM users;"

# Paso 5: Iniciar app contra DB de prueba
cd backend
DATABASE_NAME=lotolink_db_test npm run start

# Probar health check
curl http://localhost:3000/health/ready
```

### 4.2 Documentar tiempo de restore

```bash
# Medir tiempo de restore
time ./scripts/restore-database.sh /var/backups/lotolink/postgres/latest.sql.gz

# Ejemplo de salida:
# real    0m12.345s  <- Este es tu RTO (Recovery Time Objective)
# user    0m1.234s
# sys     0m0.456s

# Documentar en un archivo
cat >> /var/log/lotolink/restore-drills.log <<EOF
====================================
Restore Drill - $(date)
====================================
Backup file: /var/backups/lotolink/postgres/latest.sql.gz
Backup size: $(du -h /var/backups/lotolink/postgres/latest.sql.gz | cut -f1)
Restore time: [COPIAR TIEMPO REAL DE ARRIBA]
Status: SUCCESS
Tables restored: $(PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
Notes: Restore drill successful, all tables present
====================================

EOF
```

---

## 5. 💳 Stripe / webhooks (si aplica a producción)

### 5.1 Configurar STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET

```bash
# En el servidor de producción
cd /ruta/a/LOTOLINK/backend

# Editar .env (NUNCA subir a Git)
nano .env

# Agregar claves de producción de Stripe:
USE_MOCK_PAYMENT=false
STRIPE_SECRET_KEY=sk_live_TU_CLAVE_SECRETA_AQUI
STRIPE_WEBHOOK_SECRET=whsec_TU_WEBHOOK_SECRET_AQUI

# Reiniciar backend
pm2 restart lotolink-backend

# O con Docker:
docker-compose -f docker-compose.prod.yml restart backend
```

### 5.2 Obtener claves de Stripe

1. **Secret Key:**
   - Ir a https://dashboard.stripe.com/apikeys
   - Copiar "Secret key" (empieza con `sk_live_`)

2. **Webhook Secret:**
   - Ir a https://dashboard.stripe.com/webhooks
   - Crear nuevo endpoint: `https://tu-dominio.com/webhooks/stripe`
   - Seleccionar eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copiar "Signing secret" (empieza con `whsec_`)

### 5.3 Probar flujo de pago en modo test primero

```bash
# Primero probar con claves de TEST
USE_MOCK_PAYMENT=false
STRIPE_SECRET_KEY=sk_test_TU_CLAVE_TEST
STRIPE_WEBHOOK_SECRET=whsec_TEST_SECRET

# Reiniciar
pm2 restart lotolink-backend

# Probar pago con tarjeta de prueba
curl -X POST https://<tu-host>/api/v1/plays \
  -H "Authorization: Bearer <tu-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "lotteryType": "LEIDSA",
    "numbers": [12, 34, 56],
    "betAmount": 100,
    "playType": "QUINIELA",
    "paymentMethod": "STRIPE",
    "stripePaymentMethodId": "pm_card_visa"
  }'

# Tarjetas de prueba Stripe:
# Visa exitosa: 4242 4242 4242 4242
# Visa rechazada: 4000 0000 0000 0002
# Requiere autenticación: 4000 0025 0000 3155
```

### 5.4 Verificar la firma del webhook

```bash
# Stripe envía webhooks con firma HMAC
# El backend automáticamente valida la firma

# Para probar webhooks localmente, usar Stripe CLI:
# brew install stripe/stripe-cli/stripe  # macOS
# O descargar de: https://github.com/stripe/stripe-cli/releases

# Login
stripe login

# Forward webhooks a localhost
stripe listen --forward-to localhost:3000/webhooks/stripe

# En otra terminal, trigger test event
stripe trigger payment_intent.succeeded

# Verificar logs del backend
pm2 logs lotolink-backend

# Debe mostrar:
# [StripeWebhookService] Webhook received: payment_intent.succeeded
# [StripeWebhookService] Signature verified successfully
```

---

## 6. 🧪 E2E mínimos

### 6.1 Flujo compra completo (frontend → backend → webhook)

```bash
#!/bin/bash
# Archivo: e2e-test-purchase.sh

API_URL="https://<tu-host>/api/v1"
ADMIN_EMAIL="admin@lotolink.com"
ADMIN_PASSWORD="tu_password_admin"

echo "=== E2E Test: Flujo de Compra Completo ==="

# 1. Registrar usuario
echo "1. Registrando usuario..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+18091234567",
    "password": "Test123!",
    "name": "Usuario Test",
    "email": "test@example.com"
  }')

echo "$REGISTER_RESPONSE" | jq .

# Extraer token
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.accessToken')

if [ "$ACCESS_TOKEN" = "null" ]; then
  echo "❌ Error en registro"
  exit 1
fi

echo "✅ Usuario registrado con token: ${ACCESS_TOKEN:0:20}..."

# 2. Cargar wallet
echo ""
echo "2. Cargando wallet..."
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id')

WALLET_RESPONSE=$(curl -s -X POST "$API_URL/users/$USER_ID/wallet/charge" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "paymentMethod": "STRIPE",
    "stripePaymentMethodId": "pm_card_visa"
  }')

echo "$WALLET_RESPONSE" | jq .

echo "✅ Wallet cargada"

# 3. Crear jugada
echo ""
echo "3. Creando jugada..."
PLAY_RESPONSE=$(curl -s -X POST "$API_URL/plays" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lotteryType": "LEIDSA",
    "numbers": [12, 34, 56],
    "betAmount": 100,
    "playType": "QUINIELA",
    "paymentMethod": "WALLET"
  }')

echo "$PLAY_RESPONSE" | jq .

PLAY_ID=$(echo "$PLAY_RESPONSE" | jq -r '.id')

if [ "$PLAY_ID" = "null" ]; then
  echo "❌ Error al crear jugada"
  exit 1
fi

echo "✅ Jugada creada con ID: $PLAY_ID"

# 4. Verificar estado de jugada
echo ""
echo "4. Verificando estado de jugada..."
sleep 2  # Esperar procesamiento

PLAY_STATUS=$(curl -s -X GET "$API_URL/plays/$PLAY_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$PLAY_STATUS" | jq .

STATUS=$(echo "$PLAY_STATUS" | jq -r '.status')
echo "Estado actual: $STATUS"

# 5. Simular webhook de banca (confirmación)
echo ""
echo "5. Simulando confirmación de banca..."
# Esto normalmente lo hace la banca externa
# Para testing, puedes tener un endpoint admin

echo "✅ Flujo E2E completado"
echo "================================="
echo "Resumen:"
echo "- Usuario registrado: ✅"
echo "- Wallet cargada: ✅"
echo "- Jugada creada: ✅ (ID: $PLAY_ID)"
echo "- Estado final: $STATUS"
```

**Ejecutar:**
```bash
chmod +x e2e-test-purchase.sh
./e2e-test-purchase.sh
```

### 6.2 Panel admin: login, alta de banca, aprobación/rechazo

```bash
#!/bin/bash
# Archivo: e2e-test-admin.sh

API_URL="https://<tu-host>"
ADMIN_PHONE="+18099999999"
ADMIN_PASSWORD="tu_password_admin"

echo "=== E2E Test: Panel Admin ==="

# 1. Login admin
echo "1. Login como admin..."
ADMIN_LOGIN=$(curl -s -X POST "$API_URL/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$ADMIN_PHONE\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

echo "$ADMIN_LOGIN" | jq .

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.accessToken')

if [ "$ADMIN_TOKEN" = "null" ]; then
  echo "❌ Error en login admin"
  exit 1
fi

echo "✅ Admin autenticado"

# 2. Crear banca (alta)
echo ""
echo "2. Registrando nueva banca..."
BANCA_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/admin/bancas" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Banca Test E2E",
    "ownerName": "Juan Pérez",
    "phone": "+18097777777",
    "email": "banca-test@example.com",
    "address": "Calle Test 123",
    "city": "Santo Domingo",
    "province": "Distrito Nacional"
  }')

echo "$BANCA_RESPONSE" | jq .

BANCA_ID=$(echo "$BANCA_RESPONSE" | jq -r '.id')
echo "✅ Banca creada con ID: $BANCA_ID"

# 3. Aprobar banca
echo ""
echo "3. Aprobando banca..."
APPROVE_RESPONSE=$(curl -s -X PUT "$API_URL/api/v1/admin/bancas/$BANCA_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$APPROVE_RESPONSE" | jq .

echo "✅ Banca aprobada"

# 4. Cambiar estado a activa
echo ""
echo "4. Activando banca..."
ACTIVATE_RESPONSE=$(curl -s -X PUT "$API_URL/api/v1/admin/bancas/$BANCA_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ACTIVE"
  }')

echo "$ACTIVATE_RESPONSE" | jq .

echo "✅ Banca activada"

# 5. Listar bancas
echo ""
echo "5. Listando bancas..."
LIST_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/admin/bancas" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$LIST_RESPONSE" | jq .

echo "✅ Flujo admin E2E completado"
```

**Ejecutar:**
```bash
chmod +x e2e-test-admin.sh
./e2e-test-admin.sh
```

### 6.3 Verificar que el rate limit no bloquea los flujos normales

```bash
# Probar que usuarios normales no son bloqueados
#!/bin/bash

echo "Probando flujo normal sin alcanzar rate limit..."

for i in {1..10}; do
  RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X POST https://<tu-host>/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"phone":"+18091234567","password":"Test123!"}')
  
  if [ "$RESPONSE" = "429" ]; then
    echo "❌ Rate limit bloqueó en request #$i (muy restrictivo)"
    exit 1
  fi
  
  echo "Request #$i: HTTP $RESPONSE ✅"
  sleep 1  # Esperar 1 segundo entre requests
done

echo "✅ Rate limiting no bloquea flujos normales"
```

---

## 7. 📊 Observabilidad básica

### 7.1 Revisar logs: que no haya errores en arranque ni en health

```bash
# Ver logs del backend
pm2 logs lotolink-backend --lines 100

# O con Docker:
docker logs -f lotolink-backend --tail 100

# Buscar errores en arranque
docker logs lotolink-backend 2>&1 | grep -i "error\|exception\|failed"

# No debe haber errores críticos, solo warnings esperados

# Verificar logs de health checks
docker logs lotolink-backend 2>&1 | grep "health"

# Verificar logs de migraciones
docker logs lotolink-backend 2>&1 | grep "migration"

# Verificar logs de conexión a DB
docker logs lotolink-backend 2>&1 | grep "database\|postgres"
```

### 7.2 Configurar alertas mínimas: p95/p99 latencia y ratio de 5xx

#### Opción A: Con Prometheus + Grafana

```bash
# Instalar Prometheus Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xvf node_exporter-1.7.0.linux-amd64.tar.gz
cd node_exporter-1.7.0.linux-amd64
./node_exporter &

# Configurar Prometheus (prometheus.yml)
cat > prometheus.yml <<EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'lotolink-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - 'alerts.yml'
EOF

# Configurar alertas (alerts.yml)
cat > alerts.yml <<EOF
groups:
  - name: lotolink_alerts
    interval: 30s
    rules:
      # Latencia p95 > 1 segundo
      - alert: HighLatencyP95
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Latencia p95 alta: {{ \$value }}s"
          description: "La latencia p95 ha superado 1 segundo durante 5 minutos"

      # Latencia p99 > 2 segundos
      - alert: HighLatencyP99
        expr: histogram_quantile(0.99, http_request_duration_seconds_bucket) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Latencia p99 alta: {{ \$value }}s"
          description: "La latencia p99 ha superado 2 segundos durante 5 minutos"

      # Ratio de errores 5xx > 1%
      - alert: High5xxRate
        expr: (rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Ratio de errores 5xx alto: {{ \$value }}%"
          description: "Más del 1% de requests están fallando con 5xx"

      # Backend caído
      - alert: BackendDown
        expr: up{job="lotolink-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Backend caído"
          description: "El backend no responde a health checks"

      # Base de datos desconectada
      - alert: DatabaseDisconnected
        expr: lotolink_database_connected == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Base de datos desconectada"
          description: "El backend no puede conectar a PostgreSQL"
EOF

# Iniciar Prometheus
./prometheus --config.file=prometheus.yml
```

#### Opción B: Monitoreo simple con script

```bash
#!/bin/bash
# Archivo: simple-monitoring.sh

LOG_FILE="/var/log/lotolink/monitoring.log"
ALERT_EMAIL="admin@lotolink.com"
BACKEND_URL="https://<tu-host>"

# Check dependencies
command -v curl >/dev/null 2>&1 || { echo "Error: curl is required but not installed."; exit 1; }

# Function to send alert (fallback if mail is not configured)
send_alert() {
  local subject="$1"
  local message="$2"
  
  # Try mail command first
  if command -v mail >/dev/null 2>&1; then
    echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
  else
    # Fallback: just log
    echo "[ALERT] $subject: $message" >> "$LOG_FILE"
    # Optional: Add webhook notification here
    # curl -X POST "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
    #   -H "Content-Type: application/json" \
    #   -d "{\"text\":\"$subject: $message\"}"
  fi
}

while true; do
  # Check health
  HEALTH_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$BACKEND_URL/health")
  
  if [ "$HEALTH_STATUS" != "200" ]; then
    echo "[CRITICAL] Backend health check failed: HTTP $HEALTH_STATUS" | tee -a "$LOG_FILE"
    send_alert "ALERT: Backend Down" "Backend health check failed with status $HEALTH_STATUS"
  fi
  
  # Check readiness
  READY_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$BACKEND_URL/health/ready")
  
  if [ "$READY_STATUS" != "200" ]; then
    echo "[WARNING] Backend not ready: HTTP $READY_STATUS" | tee -a "$LOG_FILE"
  fi
  
  # Check response time (using awk for better portability instead of bc)
  RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$BACKEND_URL/health")
  
  # Compare using awk (more portable than bc)
  IS_SLOW=$(awk -v rt="$RESPONSE_TIME" 'BEGIN { print (rt > 2.0) ? 1 : 0 }')
  
  if [ "$IS_SLOW" = "1" ]; then
    echo "[WARNING] High response time: ${RESPONSE_TIME}s" | tee -a "$LOG_FILE"
  fi
  
  # Log normal status
  echo "[$(date)] Health: $HEALTH_STATUS, Ready: $READY_STATUS, Response time: ${RESPONSE_TIME}s" >> "$LOG_FILE"
  
  # Esperar 1 minuto
  sleep 60
done
```

**Ejecutar en background:**
```bash
chmod +x simple-monitoring.sh
nohup ./simple-monitoring.sh > /dev/null 2>&1 &
```

### 7.3 Verificar métricas básicas

```bash
# Si configuraste métricas (opcional)
curl https://<tu-host>/metrics

# Buscar métricas clave:
# - http_requests_total
# - http_request_duration_seconds
# - lotolink_database_connected
# - process_cpu_seconds_total
# - process_resident_memory_bytes
```

---

## 8. 📝 Resumen Final

### Checklist de Validación

- [ ] **Despliegue:** Backend desplegado con último commit
- [ ] **Migraciones:** Ejecutadas exitosamente (3 migraciones aplicadas)
- [ ] **Health checks:** `/health` y `/health/ready` devuelven 200
- [ ] **CORS:** Orígenes permitidos funcionan, no permitidos bloqueados
- [ ] **Rate limiting:** Se activa después de 100 requests en 15 min
- [ ] **Backup:** Configurado y ejecutado exitosamente
- [ ] **Restore drill:** Probado y documentado (tiempo de restore)
- [ ] **Stripe:** Claves configuradas y pago de prueba funciona
- [ ] **Webhooks:** Firma verificada correctamente
- [ ] **E2E:** Flujo de compra completo funciona
- [ ] **E2E Admin:** Alta, aprobación y activación de banca funciona
- [ ] **Logs:** Sin errores críticos en arranque
- [ ] **Monitoring:** Alertas básicas configuradas

### Comandos Rápidos de Verificación

```bash
# Verificación completa en un solo comando
./scripts/post-merge-verification.sh

# O crear el script:
cat > scripts/post-merge-verification.sh <<'EOF'
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
EOF

chmod +x scripts/post-merge-verification.sh
```

---

## 9. 📞 Contacto y Soporte

Si encuentras problemas durante la verificación:

1. **Revisar logs:** `pm2 logs` o `docker logs`
2. **Consultar documentación:**
   - [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
   - [PRODUCTION_OPS_IMPLEMENTATION.md](PRODUCTION_OPS_IMPLEMENTATION.md)
   - [docs/DATABASE_OPERATIONS.md](docs/DATABASE_OPERATIONS.md)
3. **Health check:** `curl https://<tu-host>/health`
4. **Verificar configuración:** Revisar variables de entorno en `.env`

---

**Documento preparado:** 4 de Enero, 2026  
**Versión:** 1.0  
**Próxima revisión:** Después de despliegue a producción
