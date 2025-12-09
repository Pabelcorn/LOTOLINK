# Lotolink — Arquitectura Técnica Completa

Documento listo para enviar a una IA de programación o a tu equipo de desarrollo. Contiene: visión general, componentes, endpoints (spec concretas), esquemas JSON, seguridad, DB mínima (Postgres), secuencias, despliegue, CI/CD, tests, y entregables esperados.

> 📋 **Evaluación Técnica:** Para un análisis detallado de por qué este stack tecnológico es óptimo y profesional, consulte [docs/TECH_EVALUATION.md](docs/TECH_EVALUATION.md)

> 🏦 **Guía de Integración para Bancas:** Para integrar bancas con Lotolink (API directa o App White-Label), consulte [docs/BANCA_INTEGRATION_GUIDE.md](docs/BANCA_INTEGRATION_GUIDE.md)

> 💻 **Ejemplos de Código:** Ejemplos de integración en Node.js, PHP y Java disponibles en [docs/integration-examples/](docs/integration-examples/)

> 🧪 **Guía de Pruebas:** Para probar que el sistema funciona correctamente, consulte [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)

## 📦 Paquete de Integración para Bancas

Para integrar una banca con Lotolink, descarga el paquete completo:

```bash
# Generar el paquete ZIP
./scripts/generate-integration-package.sh
```

El paquete incluye:
- Guía de integración completa (PDF-ready)
- Especificación OpenAPI 3.0
- Postman Collection lista para importar
- Ejemplos de código en Node.js, PHP y Java

Ver documentación completa en [`docs/BANCA_INTEGRATION_GUIDE_FULL.md`](docs/BANCA_INTEGRATION_GUIDE_FULL.md)

---

## Quick Start - Probar el Sistema

```bash
# 1. Clonar el repositorio
git clone https://github.com/pabelsims-ux/LOTLINK.git
cd LOTLINK

# 2. Ejecutar script de pruebas
chmod +x scripts/test-all.sh
./scripts/test-all.sh

# 3. (Opcional) Levantar servicios con Docker
docker-compose up -d

# 4. Abrir en el navegador:
#    - Frontend: abrir index.html
#    - API: http://localhost:3000
#    - Base de datos: http://localhost:8080
```

---

## 1. Resumen ejecutivo

Lotolink es un marketplace/intermediario que recibe jugadas (apuestas) de usuarios y las enruta a bancas que las registran y pagan premios. Soporta tres tipos de integración: **API directa (preferida)**, **App White-label para bancas** y **Middleware / Emulación** (último recurso). Este documento especifica la arquitectura recomendada para un desarrollo productivo, segura, escalable y fácil de entregar a una IA de programación.

---

## 2. Componentes principales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **App Web Cliente** | Interfaz usuario: registro, wallet, crear jugada, ver tickets, historial |
| 2 | **Backend Lotolink (API REST)** | Núcleo: recibe jugadas, valida, persistencia, enrutamiento a bancas, conciliación |
| 3 | **Gateway de Integración con Bancas** | Módulo que encapsula adapters por banca (API adapter / white-label adapter / middleware adapter) |
| 4 | **App White-label (Android + Web Admin)** | POS para dueños de bancas: cola de jugadas, aceptar/rechazar, conciliación local |
| 5 | **Web Admin / Dashboard** | Gestión de bancas, usuarios, disputas, métricas, conciliación y finanzas |
| 6 | **Webhooks Receiver** | Endpoint público para confirmaciones por parte de bancas |
| 7 | **Message Queue** | RabbitMQ / Kafka (cola para reintentos y desacoplar llamadas a bancas) |
| 8 | **DB (Postgres)** | Persistencia principal |
| 9 | **Cache (Redis)** | Sessions, rate limiting, locks para idempotencia |
| 10 | **Observability** | Prometheus + Grafana + Sentry |
| 11 | **CI/CD** | GitHub Actions / GitLab CI, deploy a Kubernetes (GKE/AKS/EKS) o a VMs |
| 12 | **CDN / Storage** | S3 para assets, logs exportados y backups |

---

## 3. Patrones arquitectónicos

* **Hexagonal Architecture** para backend (domain, adapters, ports). Facilita agregar adapters por banca.
* **Event-driven** para reintentos y webhooks: publicar eventos `play.created`, `play.confirmed`, `play.rejected`.
* **Idempotency** a nivel API: `Idempotency-Key` y `request_id` UUIDv4.
* **Security-by-design**: HMAC, OAuth2, mTLS según banca.

---

## 4. Esquema de endpoints (esenciales)

### 4.1 Endpoints públicos (consumidos por app cliente)

* `POST /api/v1/auth/register` — Registrar nuevo usuario (retorna JWT)
* `POST /api/v1/auth/login` — Login con teléfono (retorna JWT)
* `POST /api/v1/auth/refresh` — Renovar token de acceso

* `POST /api/v1/plays` — Crear jugada (Auth: JWT user)

  * Headers: `Authorization: Bearer <user_jwt>`, `Content-Type: application/json`
  * Body (ejemplo):

```json
{
  "request_id":"uuid-v4",
  "user_id":"user_123",
  "lottery_id":"lottoRD_01",
  "numbers":["03","07","12"],
  "bet_type":"quiniela",
  "amount":50.00,
  "currency":"DOP",
  "payment":{ "method":"wallet", "wallet_transaction_id":"wl_123" }
}
```

* Response 201: `{ "play_id":"internal-123", "status":"pending", "estimated_confirmation":"2025-..." }`

* `GET /api/v1/plays/{play_id}` — Obtener estado de jugada (Auth: JWT)

* `POST /api/v1/users/{user_id}/wallet/charge` — cargar/reembolsar (integración con pasarela)

### 4.2 Endpoints para integración banca (Gateway)

* **(Lotolink → Banca API)** `POST /v1/plays/register` (host: banca)

  * Headers: `Authorization: Bearer <token>` o `X-Signature`, `X-Timestamp`, `Idempotency-Key`
  * Payload: incluir `request_id`, `play`, `payment`, `user` minimal
  * Responses: `200 OK {status:confirmed, play_id_banca, ticket_code}` o `202 Accepted` (async)

* **(Banca → Lotolink webhook)** `POST /webhooks/plays/confirmation`

  * Validar firma y timestamp. Responder `200 OK`.

### 4.3 Admin / Banca white-label

* `POST /partner/v1/plays/push` — Lotolink -> app white-label via FCM/Socket
* `POST /partner/v1/plays/ack` — White-label -> Lotolink acepta/rechaza

---

## 5. Esquema JSON central (schema for play)

```json
{
  "request_id":"uuid-v4",
  "timestamp":"ISO-8601",
  "user":{ "user_id":"u_123","phone":"+1809..." },
  "play":{ "lottery_id":"lottoRD_01","numbers":["03","07","12"],"bet_type":"quiniela","amount":50.00 },
  "payment":{ "method":"wallet","wallet_transaction_id":"wl_987" }
}
```

---

## 6. Base de datos (Postgres) — tablas críticas

### users

`(id pk, phone unique, email, wallet_balance numeric, created_at)`

### plays

`(id pk, request_id uuid unique, user_id fk, play_data jsonb, amount numeric, currency varchar(3), status varchar, play_id_banca varchar, ticket_code varchar, created_at, updated_at)`

### bancas

`(id pk, name, integration_type enum('api','white_label','middleware'), endpoint, auth_type enum('oauth2','hmac','mtls','none'), client_id, secret, public_key, sla_ms int, created_at)`

### outgoing_requests

`(id pk, request_id uuid, banca_id fk, path, payload jsonb, status enum('pending','sent','failed','confirmed'), retries int, last_response jsonb, created_at)`

### webhook_events

`(id pk, source, event_type, payload jsonb, signature_valid bool, processed bool, created_at)`

---

## 7. Seguridad — Auth & Firma

* **Usuarios:** JWT con short TTL, refresh tokens si aplica.
* **Comunicación con bancas:** Preferir OAuth2 client_credentials. Alternativa HMAC-SHA256 por banca.
* **Cálculo de HMAC:** `signature = base64(hmac_sha256(shared_secret, method + path + timestamp + body))`
* **Replay protection:** `X-Timestamp` y ventana 120s.
* **Idempotency:** `Idempotency-Key` header + DB constraint.
* **mTLS:** opcional para bancas grandes.

---

## 8. Secuencia (diagrama ASCII)

```
User App -> Lotolink API: POST /plays
Lotolink -> DB: insert play pending
Lotolink -> Queue: publish play.created
Worker -> Banca Adapter (API): POST /v1/plays/register
alt banca responds sync
  Banca -> Lotolink: 200 OK
  Lotolink -> DB: update play confirmed
  Lotolink -> User App: push ticket
else async
  Banca -> Lotolink: 202 Accepted
  Banca -> Lotolink Webhook: /webhooks/plays/confirmation
  Lotolink -> DB: update play confirmed
end
```

---

## 9. Retries y tolerancia a fallos

* Retries exponenciales para 5xx hasta 5 intentos.
* Colas persistentes y dead-letter queue (DLQ) para inspección manual.
* Heartbeat del worker y alertas si cola no procesa.

---

## 10. Observability

* **Logs estructurados** (JSON) con `request_id` y `request_id_banca`.
* **Traces** (OpenTelemetry) para seguimiento cross-service.
* **Métricas:** TPS, latencia, error rate, confirm rate.
* **Alertas:** >2% 5xx en 5 minutos, webhook fail >10% en 10m.

---

## 11. Deploy y infra (sugerido)

* K8s (EKS/GKE/AKS) o Docker Compose para MVP.
* Postgres en managed (RDS/CloudSQL) con replicas de lectura.
* Redis para cache y locks.
* RabbitMQ/Kafka para colas.
* Ingress + cert-manager para TLS.

---

## 12. Estructura del Proyecto

```
LOTLINK/
├── backend/                    # Backend API (Node.js/TypeScript/NestJS)
│   ├── src/
│   │   ├── domain/             # Entidades, value objects, eventos
│   │   ├── application/        # Servicios y DTOs
│   │   ├── infrastructure/     # DB, HTTP, Queue adapters
│   │   └── ports/              # Interfaces (hexagonal)
│   ├── test/                   # Tests unitarios e integración
│   ├── Dockerfile
│   └── package.json
├── desktop-app/                # 💻 Desktop Application (Electron)
│   ├── main.js                 # Electron main process
│   ├── preload.js              # Preload script (security)
│   ├── index.html              # Application UI
│   ├── package.json            # Desktop dependencies
│   ├── build.sh                # Build script (current platform)
│   ├── build-all.sh            # Build script (all platforms)
│   ├── README.md               # Desktop app documentation
│   └── DISTRIBUTION.md         # Distribution and release guide
├── mock-banca/                 # Servicio mock para testing
│   ├── index.js
│   ├── Dockerfile
│   └── package.json
├── docs/
│   └── openapi.yaml            # OpenAPI 3.0 specification
├── e2e/                        # Tests end-to-end
├── .github/
│   └── workflows/
│       ├── ci-cd.yml           # GitHub Actions pipeline
│       └── build-installers.yml # Desktop installer builds
├── index.html                  # 🌐 Web App (Single Page Application)
├── index (20) (3).html         # 🎨 Enhanced UI Template
└── README.md                   # Este documento
```

### Plataforma

| Plataforma | Tecnología | Ubicación | Comando |
|------------|------------|-----------|---------|
| **Web** | HTML/CSS/JavaScript | `index.html` | Abrir directamente en navegador |
| **Desktop** | Electron | `desktop-app/` | `cd desktop-app && npm start` |

### Desktop Application

La aplicación de escritorio está disponible para **Windows, macOS y Linux** con diseño profesional glass morphism y bordes redondeados.

**Características principales:**
- ✨ Diseño glass morphism profesional y elegante
- 🎨 Bordes redondeados que se difuminan con la pantalla
- 🖥️ Controles de ventana nativos por plataforma (macOS/Windows/Linux)
- 🌓 Soporte completo de modo oscuro
- 📱 Transición perfecta entre modo ventana y pantalla completa
- ⚡ Alto rendimiento y experiencia nativa

**Inicio rápido:**
```bash
cd desktop-app
npm install
npm start              # Ejecutar en modo desarrollo
npm run build          # Construir para la plataforma actual
npm run build:all      # Construir para todas las plataformas
```

**Construcción automatizada de instaladores:**
Los instaladores se construyen automáticamente mediante GitHub Actions:
- 🔄 Build automático en cada push a `main`
- 📦 Generación de instaladores para Windows, macOS y Linux
- 🚀 Publicación automática en GitHub Releases para versiones etiquetadas

Para descargar los instaladores:
1. Ve a la sección [Releases](https://github.com/Pabelcorn/LOTOLINK/releases)
2. Descarga el instalador para tu plataforma
3. Instala y ejecuta LotoLink

Ver documentación completa en [`desktop-app/README.md`](desktop-app/README.md) y [`desktop-app/DISTRIBUTION.md`](desktop-app/DISTRIBUTION.md)

---

## 13. OpenAPI ejemplo (fragmento)

Ver archivo completo en `docs/openapi.yaml`

```yaml
openapi: 3.0.3
info:
  title: Lotolink Public API
  version: '1.0.0'
paths:
  /api/v1/plays:
    post:
      summary: Create play
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePlayRequest'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PlayResponse'
```

---

## 14. Tests recomendados

### Tests Implementados (76 tests)

El proyecto incluye una suite completa de tests:

| Categoría | Tests | Descripción |
|-----------|-------|-------------|
| **Unit Tests - Entidades** | 23 | Tests para Play y User entities |
| **PlayService** | 8 | Idempotencia, confirmación, rechazo |
| **WebhookService** | 8 | Validación HMAC, timestamps, replay protection |
| **UserService** | 8 | Wallet operations, user creation |
| **AuthController** | 6 | Register, login, token refresh |
| **MockBancaAdapter** | 5 | Integración con bancas |
| **StructuredLogger** | 14 | Logging y observabilidad |

```bash
cd backend
npm test              # Ejecutar todos los tests (76)
npm run test:cov      # Tests con cobertura
npm run test:watch    # Tests en modo watch
```

### Tests E2E y Seguridad (Pendientes)
* E2E tests con mock banca y con white-label flow
* Security tests (signature, replay)

---

## 15. Cómo ejecutar

### Backend

```bash
cd backend
npm install
cp .env.example .env  # Configurar variables
npm run start:dev     # Desarrollo
npm run test          # Tests
npm run build         # Build producción
```

### Mock Banca

```bash
cd mock-banca
npm install
npm start             # Puerto 4000 por defecto
```

### Docker Compose (ejemplo)

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
      
  mock-banca:
    build: ./mock-banca
    ports:
      - "4000:4000"
      
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: lotolink
      POSTGRES_PASSWORD: password
      POSTGRES_DB: lotolink_db
      
  redis:
    image: redis:7-alpine
```

---

## 16. Checklist mínimo para entregar

- [x] Este documento en la raíz del repo (README)
- [x] Backend con arquitectura hexagonal implementada
- [x] OpenAPI 3.0 specification (docs/openapi.yaml)
- [x] Mock banca service para testing
- [x] CI/CD con GitHub Actions
- [x] Dockerfiles para backend y mock-banca
- [x] Tests unitarios básicos
- [x] **App Web** - Single Page Application en `index.html`
- [x] **Desktop App** - Aplicación de escritorio con Electron
- [x] **Instaladores Desktop** - Build automatizado para Windows, macOS y Linux
- [ ] Postgres connection string (secrets) - configurar en deployment
- [ ] Shared secrets para bancas de prueba (mock) - configurar en .env
- [ ] Certificados TLS (dev self-signed ok) - configurar en deployment
- [ ] App white-label - desarrollo separado

---

## 17. Notas finales

* Diseño modular: comienza con MVP: backend + mock-banca + app cliente + 1 white-label. Luego migrar bancas a API directa.
* Mantén contratos JSON estables y versionados.

---

## 18. Próximos Pasos Sugeridos

Una vez clonado el repositorio, siga estos pasos para validar y preparar el sistema:

### 1. Ejecutar Tests Unitarios del Backend

```bash
cd backend
npm install
npm test
```

### 2. Ejecutar Tests E2E Localmente

Los tests E2E requieren que los servicios estén ejecutándose:

```bash
# Terminal 1: Iniciar backend
cd backend && npm run start:dev

# Terminal 2: Iniciar mock-banca
cd mock-banca && npm install && npm start

# Terminal 3: Ejecutar tests E2E
cd e2e && npm install && npm test
```

### 3. Ejecutar Smoke Tests

Los smoke tests validan la funcionalidad crítica del sistema:

```bash
# Los scripts ya tienen permisos de ejecución
./scripts/smoke-tests.sh
```

Si los servicios están ejecutándose en URLs diferentes:

```bash
BASE_URL=http://localhost:3000 MOCK_BANCA_URL=http://localhost:4000 ./scripts/smoke-tests.sh
```

### 4. Probar Reconciliación (Dry-run)

Validar el script de reconciliación sin hacer cambios:

```bash
./scripts/reconciliation.sh --dry-run --verbose
```

### 5. Configurar Observabilidad (Prometheus/Grafana)

Siga la guía detallada en [docs/OBSERVABILITY_GUIDE.md](docs/OBSERVABILITY_GUIDE.md) para:
- Configurar Prometheus para métricas
- Instalar Grafana para visualización
- Configurar alertas con Alertmanager
- Integrar con Sentry para error tracking

### 6. Antes de Producción

- [ ] **Contratar pentest externo** - Auditoría de seguridad por terceros
- [ ] Configurar secrets en producción (DATABASE_URL, JWT_SECRET, HMAC_SECRET)
- [ ] Configurar certificados TLS válidos
- [ ] Configurar backup automatizado de base de datos
- [ ] Configurar monitoreo con alertas (Prometheus + Grafana + PagerDuty/Slack)
- [ ] Revisar y ajustar rate limiting según carga esperada

---

## AI Virtual Assistant Integration (Luna)

LotoLink incorpora a **Luna**, una asistente virtual IA integral que mejora la experiencia del usuario a través de la aplicación.

### Características del Asistente IA

#### 1. Integración del Modelo de Lenguaje (LLM)
- **Arquitectura lista para GPT-5**: La aplicación está preparada para integrarse con modelos de lenguaje avanzados
- **Instrucciones personalizadas**: El modelo está configurado para guiar al usuario en cada etapa del juego de lotería
- **Respuestas naturales y coherentes**: Genera respuestas variadas y contextuales

#### 2. Síntesis de Voz (TTS)
- **Voces configurables**: Masculina o femenina
- **Múltiples acentos**: Español (España, México, Dominicano, Argentina, Colombia)
- **Velocidad ajustable**: Lenta, normal o rápida
- **Control de volumen**: Ajustable según preferencia del usuario

#### 3. Interacción Fluida y Contexto
- **Memoria conversacional**: Mantiene el contexto de hasta 20 mensajes
- **Reconocimiento de intención**: Interpreta comandos naturales del usuario
- **Guía paso a paso**: Desde la selección de banca hasta los números finales

#### 4. Flujo de Interacción
1. **Bienvenida**: Luna saluda al usuario al abrir la app
2. **Selección de Banca**: Guía para elegir la sucursal
3. **Selección de Lotería**: Ayuda a elegir entre Leidsa, Loteka, La Primera, etc.
4. **Tipo de Juego**: Explica Quiniela, Palé, Tripleta
5. **Selección de Números**: Acepta números por voz o escritura

#### 5. Configuración de API (Para Producción)

```javascript
// Configuración en AI_CONFIG:
{
  LLM_ENDPOINT: '/api/ai/chat',     // Endpoint del servidor LLM
  LLM_MODEL: 'gpt-5',               // Modelo a utilizar
  TTS_PROVIDER: 'google_wavenet',   // Proveedor TTS
  API_TIMEOUT_MS: 10000,            // Timeout de solicitudes
  ENCRYPTION_ENABLED: true          // Encriptación de datos
}
```

### Privacidad y Seguridad
- **Anonimización de datos**: Opción para no almacenar datos personales
- **Sin registro de conversaciones**: Por defecto no se guardan conversaciones
- **Encriptación**: Comunicaciones seguras con el servidor

### Comandos de Voz Soportados
- "Quiero jugar" - Inicia flujo guiado
- "Ayuda" - Muestra opciones disponibles
- "Perfil" / "Mi cuenta" - Navega al perfil
- "Bancas" / "Sucursales" - Muestra bancas cercanas
- "Loterías" - Lista todas las loterías
- "Cobrar premio" - Ir a sección de cobros
- "Cancelar" - Reinicia la selección

---

*Fin del documento.*
