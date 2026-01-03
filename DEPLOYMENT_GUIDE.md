# 🚀 Guía Completa de Despliegue - LOTOLINK

Esta guía te ayudará a desplegar LOTOLINK en producción paso a paso, ya sea en un VPS, servidor dedicado o servicios cloud.

---

## 📋 Tabla de Contenidos

1. [Prerrequisitos](#-prerrequisitos)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Preparación del Servidor](#-preparación-del-servidor)
4. [Configuración de Variables de Entorno](#-configuración-de-variables-de-entorno)
5. [Opción 1: Despliegue con Docker Compose](#opción-1-despliegue-con-docker-compose)
6. [Opción 2: Despliegue Manual en VPS](#opción-2-despliegue-manual-en-vps)
7. [Configuración de Base de Datos](#-configuración-de-base-de-datos)
8. [Migraciones de Base de Datos](#-migraciones-de-base-de-datos)
9. [Backups y Restauración](#-backups-y-restauración)
10. [Health Checks y Monitoreo](#-health-checks-y-monitoreo)
11. [Configuración de Dominio y HTTPS](#-configuración-de-dominio-y-https)
12. [Configuración de Servicios Externos](#-configuración-de-servicios-externos)
13. [Despliegue del Frontend](#-despliegue-del-frontend)
14. [Monitoreo y Mantenimiento](#-monitoreo-y-mantenimiento)
15. [Troubleshooting](#-troubleshooting)
16. [Checklist de Producción](#-checklist-de-producción)

---

## 🔧 Prerrequisitos

### Infraestructura Mínima

**Para Desarrollo/Testing:**
- 2 GB RAM
- 2 CPU cores
- 20 GB almacenamiento
- Ubuntu 20.04+ / Debian 11+ / CentOS 8+

**Para Producción:**
- 4 GB RAM (mínimo) / 8 GB (recomendado)
- 4 CPU cores
- 50 GB almacenamiento SSD
- Ubuntu 22.04 LTS (recomendado)

### Software Requerido

- **Docker** v20.10+ y **Docker Compose** v2.0+
- **Node.js** v18+ (si no usas Docker)
- **PostgreSQL** 15+
- **Redis** 7+
- **Git**
- **Nginx** (para reverse proxy)
- **Certbot** (para HTTPS)

### Servicios Externos (Producción)

- Cuenta de **Stripe** (procesamiento de pagos)
- Cuenta de **Gmail/SMTP** (envío de emails)
- Dominio propio
- (Opcional) Cuenta de **Sentry** (monitoreo de errores)

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                      Internet                           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│               Nginx (Reverse Proxy + SSL)               │
│              Puerto 80/443 → Backend/Frontend           │
└─────────────────────────────────────────────────────────┘
                          │
              ┌───────────┴────────────┐
              ▼                        ▼
┌──────────────────────┐    ┌─────────────────────┐
│   Frontend (Static)  │    │  Backend API        │
│   HTML/JS/CSS        │    │  (NestJS)           │
│   Puerto 8080        │    │  Puerto 3000        │
└──────────────────────┘    └─────────────────────┘
                                      │
                     ┌────────────────┼────────────────┐
                     ▼                ▼                ▼
            ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
            │ PostgreSQL  │  │   Redis     │  │  RabbitMQ    │
            │ Puerto 5432 │  │ Puerto 6379 │  │ Puerto 5672  │
            └─────────────┘  └─────────────┘  └──────────────┘
```

---

## 🖥️ Preparación del Servidor

### 1. Conectar al Servidor

```bash
# Conectar por SSH
ssh root@tu-servidor-ip

# O con usuario específico
ssh usuario@tu-servidor-ip
```

### 2. Actualizar el Sistema

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 3. Instalar Docker y Docker Compose

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación
docker --version
docker-compose --version

# Agregar usuario al grupo docker (opcional)
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar para aplicar cambios
```

### 4. Instalar Git

```bash
sudo apt install git -y
```

### 5. Clonar el Repositorio

```bash
# Crear directorio para la aplicación
sudo mkdir -p /opt/lotolink
sudo chown $USER:$USER /opt/lotolink
cd /opt/lotolink

# Clonar repositorio
git clone https://github.com/Pabelcorn/LOTOLINK.git .

# O si tienes acceso privado
git clone https://tu-usuario@github.com/Pabelcorn/LOTOLINK.git .
```

---

## ⚙️ Configuración de Variables de Entorno

### 1. Backend - Configuración Principal

```bash
cd /opt/lotolink/backend
cp .env.example .env
nano .env
```

Edita el archivo `.env` con tus valores de producción:

```bash
# ============================================
# CONFIGURACIÓN DE PRODUCCIÓN - LOTOLINK
# ============================================

# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1
CORS_ORIGIN=https://tu-dominio.com

# Database (PostgreSQL)
DATABASE_HOST=postgres  # 'postgres' si usas Docker, 'localhost' si instalación manual
DATABASE_PORT=5432
DATABASE_USERNAME=lotolink
DATABASE_PASSWORD=TU_PASSWORD_SEGURO_AQUI_123!
DATABASE_NAME=lotolink_db

# Redis
REDIS_HOST=redis  # 'redis' si usas Docker, 'localhost' si instalación manual
REDIS_PORT=6379
REDIS_PASSWORD=TU_REDIS_PASSWORD_SEGURO

# RabbitMQ
RABBITMQ_URL=amqp://lotolink:TU_RABBITMQ_PASSWORD@rabbitmq:5672
RABBITMQ_QUEUE_PLAYS=plays_queue
RABBITMQ_DLQ=plays_dlq

# JWT - IMPORTANTE: Usa valores únicos y seguros
JWT_SECRET=GENERA_UN_SECRET_MUY_LARGO_Y_SEGURO_AQUI_min_32_caracteres
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# HMAC for Banca Integration - IMPORTANTE: Cambia esto
HMAC_SECRET=OTRO_SECRET_MUY_LARGO_Y_DIFERENTE_min_32_caracteres
HMAC_TIMESTAMP_TOLERANCE_SECONDS=120

# Banca Configuration
USE_MOCK_BANCA=false  # false en producción
BANCA_API_URL=https://banca-api.ejemplo.com
BANCA_HMAC_SECRET=secret_compartido_con_banca
BANCA_TIMEOUT_MS=30000

# Payment Gateway (Stripe) - PRODUCCIÓN
USE_MOCK_PAYMENT=false  # false en producción
STRIPE_SECRET_KEY=sk_live_TU_CLAVE_SECRETA_DE_STRIPE
STRIPE_WEBHOOK_SECRET=whsec_TU_WEBHOOK_SECRET_DE_STRIPE

# Commission Configuration
COMMISSION_STRIPE_ACCOUNT_ID=acct_TU_CUENTA_DE_COMISIONES
COMMISSION_PERCENTAGE=5.0
CARD_PROCESSING_ACCOUNT_ID=acct_TU_CUENTA_PROCESSING

# Lottery Results Provider
USE_MOCK_LOTTERY_RESULTS=false  # false cuando tengas proveedor real
LOTTERY_RESULTS_API_URL=https://api-resultados-loteria.com
LOTTERY_RESULTS_API_KEY=tu_api_key_aqui

# Email Configuration - IMPORTANTE para notificaciones
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu_app_password_de_gmail
EMAIL_FROM=noreply@lotolink.com
ADMIN_EMAIL=admin@lotolink.com

# Play Worker
PLAY_WORKER_MAX_RETRIES=3
PLAY_WORKER_RETRY_DELAY_MS=5000
```

### 2. Generar Secrets Seguros

Para generar secrets aleatorios seguros:

```bash
# JWT_SECRET y HMAC_SECRET
openssl rand -base64 48

# O usando Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### 3. Variables para Docker Compose

Crea un archivo `.env` en la raíz del proyecto:

```bash
cd /opt/lotolink
nano .env
```

Contenido:

```bash
# PostgreSQL
POSTGRES_USER=lotolink
POSTGRES_PASSWORD=TU_PASSWORD_POSTGRES_SEGURO_123!
POSTGRES_DB=lotolink_db

# RabbitMQ
RABBITMQ_USER=lotolink
RABBITMQ_PASSWORD=TU_PASSWORD_RABBITMQ_SEGURO_123!

# Redis
REDIS_PASSWORD=TU_PASSWORD_REDIS_SEGURO_123!
```

---

## Opción 1: Despliegue con Docker Compose

### 1. Verificar docker-compose.yml

El archivo `docker-compose.yml` ya está configurado. Para producción, crea un override:

```bash
cd /opt/lotolink
nano docker-compose.prod.yml
```

Contenido:

```yaml
version: '3.8'

services:
  postgres:
    restart: always
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  
  redis:
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
  
  rabbitmq:
    restart: always
    environment:
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
  
  backend:
    restart: always
    environment:
      NODE_ENV: production
      USE_MOCK_BANCA: "false"
      USE_MOCK_PAYMENTS: "false"
      USE_MOCK_LOTTERY_RESULTS: "false"
    volumes:
      - ./backend/logs:/app/logs
  
  # Remover adminer en producción
  adminer:
    profiles:
      - debug
```

### 2. Construir e Iniciar los Servicios

```bash
# Construir las imágenes
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Iniciar todos los servicios
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verificar que todo esté corriendo
docker-compose ps
```

### 3. Ver Logs

```bash
# Logs de todos los servicios
docker-compose logs -f

# Logs solo del backend
docker-compose logs -f backend

# Logs solo de postgres
docker-compose logs -f postgres
```

### 4. Ejecutar Migraciones de Base de Datos

```bash
# Entrar al contenedor del backend
docker-compose exec backend sh

# Ejecutar migraciones (si existen)
npm run migration:run

# Salir del contenedor
exit
```

---

## Opción 2: Despliegue Manual en VPS

Si prefieres instalar todo sin Docker:

### 1. Instalar PostgreSQL

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib -y

# Iniciar servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Crear usuario y base de datos
sudo -u postgres psql

-- En el prompt de PostgreSQL:
CREATE USER lotolink WITH PASSWORD 'tu_password_seguro';
CREATE DATABASE lotolink_db OWNER lotolink;
GRANT ALL PRIVILEGES ON DATABASE lotolink_db TO lotolink;
\q
```

### 2. Instalar Redis

```bash
# Ubuntu/Debian
sudo apt install redis-server -y

# Configurar contraseña
sudo nano /etc/redis/redis.conf

# Descomentar y establecer:
requirepass tu_redis_password

# Reiniciar
sudo systemctl restart redis
sudo systemctl enable redis
```

### 3. Instalar RabbitMQ

```bash
# Ubuntu/Debian
sudo apt install rabbitmq-server -y

# Iniciar
sudo systemctl start rabbitmq-server
sudo systemctl enable rabbitmq-server

# Habilitar management plugin
sudo rabbitmq-plugins enable rabbitmq_management

# Crear usuario
sudo rabbitmqctl add_user lotolink tu_rabbitmq_password
sudo rabbitmqctl set_user_tags lotolink administrator
sudo rabbitmqctl set_permissions -p / lotolink ".*" ".*" ".*"
```

### 4. Instalar Node.js

```bash
# Instalar NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Instalar Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# Verificar
node --version
npm --version
```

### 5. Instalar el Backend

```bash
cd /opt/lotolink/backend

# Instalar dependencias
npm ci --only=production

# Compilar TypeScript
npm run build

# Ejecutar migraciones
npm run migration:run
```

### 6. Configurar como Servicio con PM2

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar la aplicación
cd /opt/lotolink/backend
pm2 start dist/main.js --name lotolink-backend

# Guardar configuración
pm2 save

# Configurar para inicio automático
pm2 startup
# Sigue las instrucciones que muestra el comando anterior

# Ver logs
pm2 logs lotolink-backend

# Ver estado
pm2 status
```

---

## 🗄️ Configuración de Base de Datos

### Conexión a la Base de Datos

La aplicación se conecta a PostgreSQL usando las variables de entorno configuradas en `backend/.env`:

```bash
DATABASE_HOST=postgres  # o localhost
DATABASE_PORT=5432
DATABASE_USERNAME=lotolink
DATABASE_PASSWORD=tu_password_seguro
DATABASE_NAME=lotolink_db
```

### Verificar Conexión

```bash
# Usando Docker
docker-compose exec postgres psql -U lotolink -d lotolink_db -c "SELECT version();"

# Usando psql local
psql -h localhost -U lotolink -d lotolink_db -c "SELECT version();"
```

---

## 📊 Migraciones de Base de Datos

### ¿Qué son las Migraciones?

Las migraciones son cambios versionados del esquema de base de datos que permiten:
- Control de versiones del esquema
- Aplicar cambios de forma consistente en todos los ambientes
- Revertir cambios si es necesario
- Documentar la evolución del esquema

### Migraciones Disponibles

LotoLink incluye las siguientes migraciones:

1. **CreateInitialSchema** - Crea las tablas principales:
   - `users` - Usuarios y autenticación
   - `bancas` - Configuración de operadores de lotería
   - `plays` - Registros de jugadas
   - `outgoing_requests` - Solicitudes a APIs externas
   - `webhook_events` - Eventos de webhooks
   - `settings` - Configuración de la aplicación

2. **AddWalletTransactionsTable** - Historial de transacciones de billetera
3. **AddSucursalesTable** - Sucursales de bancas

### Ejecutar Migraciones en Producción

**⚠️ IMPORTANTE:** Siempre crea un backup antes de ejecutar migraciones en producción.

```bash
# 1. Crear backup
./scripts/backup-database.sh

# 2. Ejecutar migraciones
cd /opt/lotolink/backend
npm run migration:run

# 3. Verificar el estado
npm run typeorm migration:show

# En Docker:
docker-compose exec backend npm run migration:run
```

### Comandos Útiles de Migraciones

```bash
# Ver historial de migraciones
npm run typeorm migration:show

# Revertir última migración (solo si es necesario)
npm run migration:revert

# Generar nueva migración desde cambios en entidades
npm run migration:generate -- -n NombreMigracion

# Crear migración vacía
npm run migration:create -- -n NombreMigracion
```

### Solución de Problemas con Migraciones

```bash
# Si una migración falla, verificar logs
docker-compose logs backend

# Conectar a la base de datos y verificar estado
docker-compose exec postgres psql -U lotolink -d lotolink_db

# Ver tabla de migraciones
SELECT * FROM migrations ORDER BY timestamp DESC;

# Si es necesario, limpiar y reintentar
npm run migration:revert
npm run migration:run
```

📖 **Documentación completa:** Ver [docs/DATABASE_OPERATIONS.md](docs/DATABASE_OPERATIONS.md)

---

## 💾 Backups y Restauración

### Script de Backup Automático

LotoLink incluye un script robusto para backups: `scripts/backup-database.sh`

**Características:**
- Backups comprimidos con gzip
- Rotación automática (retención configurable)
- Logging detallado
- Soporte para S3 (opcional)
- Verificación de integridad

### Configurar Variables de Backup

```bash
# Editar variables en .bashrc o .profile
export BACKUP_DIR="/var/backups/lotolink/postgres"
export RETENTION_DAYS="30"
export DATABASE_PASSWORD="tu_password"

# Opcional: para backup en S3
export S3_BUCKET="my-lotolink-backups"
```

### Ejecutar Backup Manual

```bash
# Backup con configuración por defecto
./scripts/backup-database.sh

# Con retención personalizada
RETENTION_DAYS=14 ./scripts/backup-database.sh

# En Docker
docker-compose exec postgres pg_dump -U lotolink lotolink_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Programar Backups Automáticos

#### Usando Cron (Recomendado para VPS)

```bash
# Editar crontab
crontab -e

# Agregar backup diario a las 2 AM
0 2 * * * /opt/lotolink/scripts/backup-database.sh >> /var/log/lotolink/backup.log 2>&1

# Backup cada 6 horas
0 */6 * * * /opt/lotolink/scripts/backup-database.sh >> /var/log/lotolink/backup.log 2>&1

# Con variables de entorno
0 2 * * * RETENTION_DAYS=14 S3_BUCKET=my-backups /opt/lotolink/scripts/backup-database.sh >> /var/log/lotolink/backup.log 2>&1
```

#### Usando Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: lotolink-db-backup
spec:
  schedule: "0 2 * * *"  # Diario a las 2 AM
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
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h $DATABASE_HOST -U lotolink lotolink_db | \
              gzip > /backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          restartPolicy: OnFailure
```

### Restaurar desde Backup

```bash
# Usando el script de restauración
./scripts/restore-database.sh

# O especificar archivo de backup
./scripts/restore-database.sh /path/to/backup_20260103_020000.sql.gz

# Restauración manual
gunzip -c backup.sql.gz | psql -U lotolink -d lotolink_db

# En Docker
docker-compose exec -T postgres psql -U lotolink -d lotolink_db < backup.sql
```

### Verificar Backups

```bash
# Listar backups disponibles
ls -lh /var/backups/lotolink/postgres/

# Verificar integridad de backup comprimido
gunzip -t /var/backups/lotolink/postgres/latest.sql.gz

# Ver tamaño de backups
du -sh /var/backups/lotolink/postgres/*

# Probar restauración en base de datos de prueba
createdb -U lotolink lotolink_db_test
gunzip -c backup.sql.gz | psql -U lotolink -d lotolink_db_test
dropdb -U lotolink lotolink_db_test
```

### Backup a la Nube (Opcional)

```bash
# AWS S3
export S3_BUCKET="my-lotolink-backups"
./scripts/backup-database.sh  # El script subirá automáticamente a S3

# Manual con AWS CLI
aws s3 cp backup.sql.gz s3://my-lotolink-backups/backups/

# Google Cloud Storage
gsutil cp backup.sql.gz gs://my-lotolink-backups/postgres/
```

📖 **Documentación completa:** Ver [docs/DATABASE_OPERATIONS.md](docs/DATABASE_OPERATIONS.md)

---

## 🏥 Health Checks y Monitoreo

### Endpoints de Health Check

LotoLink proporciona endpoints para verificar el estado de la aplicación:

#### GET /health

Endpoint básico de salud que siempre responde (a menos que la aplicación esté completamente caída).

```bash
curl http://localhost:3000/health
```

Respuesta:
```json
{
  "status": "ok",
  "timestamp": "2026-01-03T16:00:00.000Z",
  "service": "lotolink-backend",
  "version": "1.0.0",
  "uptime": 3600,
  "uptimeHuman": "1h 0m 0s",
  "checks": {
    "database": "connected"
  }
}
```

#### GET /health/ready

Endpoint de readiness que verifica que todos los servicios críticos estén disponibles.

```bash
curl http://localhost:3000/health/ready
```

Respuesta exitosa (200):
```json
{
  "status": "ready",
  "timestamp": "2026-01-03T16:00:00.000Z",
  "checks": {
    "database": "ok"
  }
}
```

Respuesta con error (503):
```json
{
  "status": "not_ready",
  "timestamp": "2026-01-03T16:00:00.000Z",
  "checks": {
    "database": {
      "status": "error",
      "error": "Connection refused"
    }
  }
}
```

### Usar Health Checks en Producción

#### Docker Compose

```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

#### Kubernetes Probes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: lotolink-backend
spec:
  containers:
  - name: backend
    image: lotolink-backend:latest
    # Liveness: ¿La aplicación está viva?
    livenessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
    
    # Readiness: ¿La aplicación está lista para recibir tráfico?
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 3
```

#### Nginx Health Check

```nginx
upstream backend {
    server backend:3000 max_fails=3 fail_timeout=30s;
    
    # Health check (nginx plus)
    # health_check interval=10s fails=3 passes=2 uri=/health;
}
```

### Monitoreo con Scripts

```bash
# Script simple de monitoreo
#!/bin/bash
HEALTH_URL="http://localhost:3000/health"
READY_URL="http://localhost:3000/health/ready"

# Verificar health
if curl -f -s "$HEALTH_URL" > /dev/null; then
    echo "✅ Aplicación está viva"
else
    echo "❌ Aplicación no responde"
    # Enviar alerta
fi

# Verificar readiness
if curl -f -s "$READY_URL" > /dev/null; then
    echo "✅ Aplicación está lista"
else
    echo "⚠️ Aplicación no está lista (DB desconectada?)"
    # Enviar alerta
fi
```

### Integración con Monitoreo Externo

#### Uptime Robot

```bash
# Configurar en https://uptimerobot.com
# Monitor Type: HTTP(s)
# URL: https://api.tu-dominio.com/health
# Interval: 5 minutos
# HTTP Method: GET
# Expected Status Code: 200
```

#### Prometheus

```yaml
scrape_configs:
  - job_name: 'lotolink-backend'
    metrics_path: '/health'
    static_configs:
      - targets: ['backend:3000']
```

#### Grafana Alert

```json
{
  "alert": "LotoLinkDown",
  "expr": "up{job=\"lotolink-backend\"} == 0",
  "for": "2m",
  "annotations": {
    "summary": "LotoLink backend is down"
  }
}
```

### Logs de Salud

```bash
# Ver logs del backend
docker-compose logs -f backend | grep health

# Ver logs de nginx (health checks)
tail -f /var/log/nginx/access.log | grep health

# Monitorear en tiempo real
watch -n 5 'curl -s http://localhost:3000/health | jq'
```

---

## 🌐 Configuración de Dominio y HTTPS

### 1. Configurar DNS

En tu proveedor de dominio (Namecheap, GoDaddy, etc.), crea estos registros DNS:

```
Tipo    Nombre      Valor                 TTL
A       @           IP_DE_TU_SERVIDOR     3600
A       www         IP_DE_TU_SERVIDOR     3600
A       api         IP_DE_TU_SERVIDOR     3600
```

Espera 10-30 minutos para que se propaguen los cambios.

### 2. Instalar Nginx

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3. Configurar Nginx como Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/lotolink
```

Contenido:

```nginx
# Configuración para LOTOLINK
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Redirigir a HTTPS (se configurará después con certbot)
    return 301 https://$server_name$request_uri;
}

# API Backend
server {
    listen 80;
    server_name api.tu-dominio.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Frontend
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    root /opt/lotolink;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

Habilita el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/lotolink /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Instalar Certificado SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificados SSL
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com -d api.tu-dominio.com

# Seguir las instrucciones en pantalla
# Selecciona la opción 2 para redirigir todo el tráfico a HTTPS

# Verificar renovación automática
sudo certbot renew --dry-run
```

### 5. Verificar HTTPS

Abre tu navegador y visita:
- `https://tu-dominio.com` (Frontend)
- `https://api.tu-dominio.com/health` (Backend)

---

## 🔌 Configuración de Servicios Externos

### 1. Configurar Stripe

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com)
2. Cambia a modo Live
3. Ve a Developers → API Keys
4. Copia tu **Secret Key** (empieza con `sk_live_`)
5. Ve a Developers → Webhooks
6. Crea un nuevo endpoint: `https://api.tu-dominio.com/api/v1/webhooks/stripe`
7. Selecciona eventos: `payment_intent.succeeded`, `payment_intent.failed`
8. Copia el **Webhook Secret** (empieza con `whsec_`)
9. Actualiza tu archivo `.env` con estos valores

### 2. Configurar Email (Gmail)

1. Ve a tu cuenta de Google
2. Habilita verificación en 2 pasos
3. Ve a Seguridad → Contraseñas de aplicaciones
4. Genera una contraseña para "Correo"
5. Usa esta contraseña en `EMAIL_PASSWORD` de tu `.env`

### 3. Configurar Sentry (Opcional pero recomendado)

```bash
npm install @sentry/node --save
```

Agrega a tu `.env`:

```bash
SENTRY_DSN=https://tu-dsn@sentry.io/proyecto
SENTRY_ENVIRONMENT=production
```

---

## 📱 Despliegue del Frontend

### Opción 1: Servir archivos estáticos con Nginx

Ya está configurado en la sección de Nginx. Solo asegúrate de que los archivos HTML estén en `/opt/lotolink/`.

### Opción 2: Usar CDN (Recomendado para mejor rendimiento)

```bash
# Subir archivos a S3/CloudFront o similar
# O usar servicios como Netlify/Vercel para el frontend

# Si usas Netlify:
# 1. Conecta tu repositorio
# 2. Build command: (vacío, ya que es HTML estático)
# 3. Publish directory: /
# 4. Actualiza API_BASE en los archivos HTML al dominio de tu API
```

### Actualizar URL del API en el Frontend

```bash
cd /opt/lotolink

# Buscar y reemplazar localhost por tu dominio
sed -i 's|http://localhost:3000|https://api.tu-dominio.com|g' index.html
sed -i 's|http://localhost:3000|https://api.tu-dominio.com|g' admin-panel.html
```

---

## 📊 Monitoreo y Mantenimiento

### 1. Configurar Prometheus (Opcional)

Ver guía completa en: [docs/OBSERVABILITY_GUIDE.md](docs/OBSERVABILITY_GUIDE.md)

### 2. Logs del Sistema

```bash
# Ver logs del backend (si usas Docker)
docker-compose logs -f backend

# Ver logs del backend (si usas PM2)
pm2 logs lotolink-backend

# Ver logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ver logs de PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### 3. Monitoreo de Recursos

```bash
# Instalar htop para monitoreo en tiempo real
sudo apt install htop -y
htop

# Ver uso de disco
df -h

# Ver uso de memoria
free -h

# Ver procesos de Docker
docker stats
```

### 4. Actualizar la Aplicación

```bash
cd /opt/lotolink

# Hacer backup antes de actualizar
./scripts/backup-lotolink-db.sh

# Pull de los últimos cambios
git pull origin main

# Si usas Docker
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Si usas PM2
cd backend
npm install
npm run build
pm2 restart lotolink-backend
```

---

## 🔧 Troubleshooting

### Problema: Backend no inicia

**Síntomas:** Error al ejecutar `docker-compose up` o `pm2 start`

**Soluciones:**
```bash
# 1. Verificar logs
docker-compose logs backend

# 2. Verificar variables de entorno
docker-compose exec backend env | grep DATABASE

# 3. Verificar conexión a PostgreSQL
docker-compose exec backend sh
psql -h postgres -U lotolink -d lotolink_db
# Ingresa la contraseña cuando lo pida

# 4. Reiniciar servicios
docker-compose restart
```

### Problema: "Cannot connect to database"

**Síntomas:** Error de conexión a PostgreSQL

**Soluciones:**
```bash
# 1. Verificar que PostgreSQL esté corriendo
docker-compose ps postgres
# o
sudo systemctl status postgresql

# 2. Verificar credenciales en .env
cat backend/.env | grep DATABASE

# 3. Probar conexión manual
psql -h localhost -U lotolink -d lotolink_db

# 4. Verificar que el usuario tenga permisos
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE lotolink_db TO lotolink;
\q
```

### Problema: 502 Bad Gateway en Nginx

**Síntomas:** Error 502 al acceder al sitio

**Soluciones:**
```bash
# 1. Verificar que el backend esté corriendo
curl http://localhost:3000/health

# 2. Verificar logs de Nginx
sudo tail -f /var/log/nginx/error.log

# 3. Verificar configuración de Nginx
sudo nginx -t

# 4. Reiniciar Nginx
sudo systemctl restart nginx
```

### Problema: Certificado SSL no se renueva

**Síntomas:** Advertencia de certificado expirado

**Soluciones:**
```bash
# 1. Renovar manualmente
sudo certbot renew

# 2. Verificar que el cron esté activo
sudo systemctl status certbot.timer

# 3. Probar renovación
sudo certbot renew --dry-run

# 4. Ver logs de certbot
sudo journalctl -u certbot
```

### Problema: Alta latencia o lentitud

**Síntomas:** Respuestas lentas del API

**Soluciones:**
```bash
# 1. Verificar recursos del servidor
htop
df -h
free -h

# 2. Verificar conexiones a la base de datos
docker-compose exec postgres psql -U lotolink -d lotolink_db
SELECT count(*) FROM pg_stat_activity;

# 3. Optimizar PostgreSQL
# Editar postgresql.conf para aumentar recursos

# 4. Agregar índices faltantes
# Ver sección de Base de Datos

# 5. Implementar cache con Redis
# Ya está configurado en la aplicación
```

### Problema: Errores de CORS

**Síntomas:** "CORS policy blocked" en el navegador

**Soluciones:**
```bash
# 1. Verificar CORS_ORIGIN en backend/.env
CORS_ORIGIN=https://tu-dominio.com

# 2. Verificar que el frontend use el dominio correcto
cat index.html | grep API_BASE

# 3. Agregar dominio a whitelist en backend
# Editar backend/.env y agregar tu dominio
```

---

## ✅ Checklist de Producción

Antes de lanzar a producción, verifica:

### Seguridad
- [ ] JWT_SECRET es único y seguro (min 48 caracteres)
- [ ] HMAC_SECRET es único y diferente al JWT_SECRET
- [ ] Contraseñas de base de datos son seguras
- [ ] HTTPS está configurado y funcionando
- [ ] Firewall configurado (solo puertos 80, 443, 22 abiertos)
- [ ] Stripe está en modo Live (no Test)
- [ ] Variables de entorno sensibles no están en el código
- [ ] Rate limiting está habilitado
- [ ] CORS configurado solo para tu dominio

### Base de Datos
- [ ] PostgreSQL corriendo y accesible
- [ ] Migraciones ejecutadas correctamente (`npm run migration:run`)
- [ ] Backups automáticos configurados (cron o k8s)
- [ ] Script de backup probado y funcional
- [ ] Script de restore probado
- [ ] Índices creados
- [ ] Usuario de BD tiene permisos correctos
- [ ] Backup offsite configurado (S3, etc.)

### Backend
- [ ] Backend inicia sin errores
- [ ] `/health` endpoint responde correctamente (200 OK)
- [ ] `/health/ready` endpoint verifica conectividad de BD
- [ ] Health checks configurados en Docker/K8s
- [ ] USE_MOCK_* están en false
- [ ] Logs se guardan correctamente
- [ ] PM2 o Docker configurado para auto-restart
- [ ] Email envío funciona

### Frontend
- [ ] API_BASE apunta a tu dominio de producción
- [ ] Archivos estáticos se sirven correctamente
- [ ] HTTPS funciona sin advertencias
- [ ] Login/registro funciona
- [ ] Panel de admin accesible

### Infraestructura
- [ ] Nginx configurado correctamente
- [ ] Certificado SSL instalado y auto-renovación funciona
- [ ] DNS configurado y propagado
- [ ] Monitoreo configurado (logs, métricas)
- [ ] Backups funcionando

### Servicios Externos
- [ ] Stripe configurado en modo Live
- [ ] Webhooks de Stripe configurados
- [ ] Email SMTP configurado
- [ ] (Opcional) Sentry configurado

### Testing
- [ ] Crear una cuenta de prueba funciona
- [ ] Login funciona
- [ ] Crear una jugada funciona
- [ ] Recibir notificación por email funciona
- [ ] Panel de admin accesible para cuentas admin
- [ ] Procesar un pago con Stripe funciona

### Documentación
- [ ] README actualizado con instrucciones de producción
- [ ] Credenciales documentadas de forma segura
- [ ] Runbooks creados para equipo de soporte
- [ ] Plan de recuperación ante desastres documentado

---

## 🆘 Soporte

### Recursos Útiles

- **Documentación del Proyecto:** [README.md](README.md)
- **Guía de Inicio Rápido:** [QUICK_START.md](QUICK_START.md)
- **Guía de Seguridad:** [SECURITY_SUMMARY.md](SECURITY_SUMMARY.md)
- **Guía de Testing:** [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)
- **Guía de Observabilidad:** [docs/OBSERVABILITY_GUIDE.md](docs/OBSERVABILITY_GUIDE.md)

### Comandos Útiles de Referencia Rápida

```bash
# Ver status de todos los servicios (Docker)
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Reiniciar un servicio específico
docker-compose restart backend

# Ejecutar comando en contenedor
docker-compose exec backend sh

# Backup de base de datos
docker-compose exec postgres pg_dump -U lotolink lotolink_db > backup.sql

# Restaurar base de datos
docker-compose exec -T postgres psql -U lotolink lotolink_db < backup.sql

# Ver uso de recursos
docker stats

# Limpiar contenedores e imágenes no usadas
docker system prune -a
```

---

## 🎯 Próximos Pasos

Después de completar el despliegue:

1. **Testing exhaustivo:** Ejecuta todas las pruebas en producción
2. **Monitoreo:** Configura alertas para errores críticos
3. **Optimización:** Revisa métricas y optimiza según necesidad
4. **Documentación:** Documenta cualquier configuración específica
5. **Capacitación:** Entrena a tu equipo en el uso del sistema
6. **Marketing:** ¡Lanza oficialmente tu plataforma!

---

## 📞 Contacto y Ayuda

Si encuentras problemas durante el despliegue:

1. Revisa los logs del sistema
2. Consulta la sección de [Troubleshooting](#-troubleshooting)
3. Revisa la documentación en `/docs`
4. Crea un issue en GitHub con detalles del problema

---

**¡Felicidades por desplegar LOTOLINK!** 🎉

---

**Última actualización:** 2025-12-19  
**Versión:** 1.0.0  
**Mantenido por:** LOTOLINK Team
