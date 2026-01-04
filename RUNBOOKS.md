# 📚 LOTOLINK - Runbooks Operativos

**Versión:** 1.0  
**Fecha:** 4 de Enero, 2026  
**Mantenido por:** DevOps Team

---

## 🎯 Propósito

Este documento contiene procedimientos operativos detallados (runbooks) para tareas comunes y respuesta a incidentes en producción.

---

## 📖 Índice

1. [Despliegue a Producción](#1-despliegue-a-producción)
2. [Rollback de Despliegue](#2-rollback-de-despliegue)
3. [Incidentes Comunes](#3-incidentes-comunes)
4. [Comandos de Emergencia](#4-comandos-de-emergencia)
5. [Mantenimiento Programado](#5-mantenimiento-programado)

---

## 1. Despliegue a Producción

### Pre-requisitos

- [ ] PR aprobado y mergeado
- [ ] Tests CI/CD pasando
- [ ] Backup reciente disponible
- [ ] Ventana de mantenimiento comunicada
- [ ] On-call engineer disponible

### Procedimiento Completo

```bash
#!/bin/bash
# Despliegue a Producción - LOTOLINK
# Ejecutar como: ./deploy-production.sh <version>

set -e

VERSION="${1:-latest}"
NAMESPACE="lotolink-prod"
DEPLOYMENT="lotolink-backend"

echo "========================================="
echo "LOTOLINK - Despliegue a Producción"
echo "Versión: $VERSION"
echo "Fecha: $(date)"
echo "========================================="

# 1. Verificar acceso
echo "1. Verificando acceso a cluster..."
kubectl cluster-info
kubectl get nodes

# 2. Verificar estado actual
echo "2. Estado actual del deployment..."
kubectl get deployment $DEPLOYMENT -n $NAMESPACE
kubectl get pods -n $NAMESPACE -l app=lotolink-backend

# 3. Backup de configuración actual
echo "3. Backup de configuración..."
kubectl get deployment $DEPLOYMENT -n $NAMESPACE -o yaml > backup-deployment-$(date +%Y%m%d-%H%M%S).yaml

# 4. Backup de base de datos
echo "4. Ejecutando backup de DB..."
kubectl exec -n $NAMESPACE deployment/lotolink-backend -- /app/scripts/backup-database.sh

# Esperar que backup complete
sleep 30

# 5. Actualizar imagen
echo "5. Actualizando imagen a $VERSION..."
kubectl set image deployment/$DEPLOYMENT \
  lotolink-backend=lotolink/backend:$VERSION \
  -n $NAMESPACE

# 6. Esperar rollout
echo "6. Esperando rollout..."
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE --timeout=10m

# 7. Verificar pods
echo "7. Verificando pods nuevos..."
kubectl get pods -n $NAMESPACE -l app=lotolink-backend

# 8. Ejecutar migraciones (si aplica)
echo "8. Ejecutando migraciones..."
POD=$(kubectl get pod -n $NAMESPACE -l app=lotolink-backend -o jsonpath="{.items[0].metadata.name}")
kubectl exec -n $NAMESPACE $POD -- npm run migration:run

# 9. Health checks
echo "9. Verificando health checks..."
for i in {1..5}; do
  echo "Intento $i..."
  curl -f https://api.lotolink.com/health || echo "Health check falló"
  curl -f https://api.lotolink.com/health/ready || echo "Ready check falló"
  sleep 5
done

# 10. Smoke tests
echo "10. Ejecutando smoke tests..."
./scripts/smoke-tests.sh

# 11. Verificar métricas
echo "11. Verificando métricas iniciales..."
kubectl top pods -n $NAMESPACE -l app=lotolink-backend

# 12. Notificar éxito
echo "========================================="
echo "✅ Despliegue completado exitosamente"
echo "Versión desplegada: $VERSION"
echo "Pods activos:"
kubectl get pods -n $NAMESPACE -l app=lotolink-backend
echo "========================================="

# Notificar a Slack
curl -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"✅ Despliegue exitoso a producción: $VERSION\"}"

echo "IMPORTANTE: Monitorear logs y métricas por las próximas 2 horas"
```

### Post-Despliegue

**Monitoreo Inmediato (primeros 30 min):**
```bash
# 1. Seguir logs en tiempo real
kubectl logs -f -n lotolink-prod deployment/lotolink-backend --tail=100

# 2. Watch pods
watch kubectl get pods -n lotolink-prod

# 3. Métricas de error
# En Grafana: Dashboard "LOTOLINK Production"
# Verificar:
# - Error rate < 1%
# - Latency P95 < 1s
# - CPU/Memory stable
```

**Validación Completa (primera hora):**
```bash
# Ejecutar post-merge verification
./scripts/post-merge-verification.sh

# E2E smoke tests
./e2e-test-purchase.sh
./e2e-test-admin.sh
```

---

## 2. Rollback de Despliegue

### Cuándo Hacer Rollback

- Error rate > 5% sostenido por 5 minutos
- Latencia P95 > 5s
- Health checks fallando
- Funcionalidad crítica no funciona
- Decisión de Tech Lead

### Procedimiento de Rollback Rápido

```bash
#!/bin/bash
# Rollback Inmediato - LOTOLINK

set -e

NAMESPACE="lotolink-prod"
DEPLOYMENT="lotolink-backend"

echo "⚠️  INICIANDO ROLLBACK DE EMERGENCIA"
echo "Fecha: $(date)"

# 1. Rollback de Kubernetes
echo "1. Ejecutando rollback de deployment..."
kubectl rollout undo deployment/$DEPLOYMENT -n $NAMESPACE

# 2. Esperar rollout
echo "2. Esperando que rollback complete..."
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE --timeout=5m

# 3. Verificar estado
echo "3. Verificando pods después de rollback..."
kubectl get pods -n $NAMESPACE -l app=lotolink-backend

# 4. Health checks
echo "4. Verificando health..."
for i in {1..3}; do
  curl -f https://api.lotolink.com/health && echo "✅ Health OK" || echo "❌ Health FAIL"
  sleep 3
done

# 5. Verificar migraciones (puede necesitar revert)
echo "5. IMPORTANTE: Verificar si necesitas revertir migraciones"
echo "Si desplegaste nuevas migraciones, ejecuta:"
echo "kubectl exec -n $NAMESPACE deployment/$DEPLOYMENT -- npm run migration:revert"

# 6. Notificar
echo "✅ Rollback completado"
curl -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d '{"text":"⚠️  ROLLBACK ejecutado en producción"}'

echo "ACCIÓN REQUERIDA: Investigar causa del problema"
```

### Rollback de Migraciones

```bash
# Si el problema fue causado por migraciones

# 1. Conectar al pod
kubectl exec -it -n lotolink-prod deployment/lotolink-backend -- /bin/bash

# 2. Dentro del pod
cd /app/backend

# 3. Revertir última migración
npm run migration:revert

# 4. Verificar estado
npm run typeorm migration:show -d src/infrastructure/database/data-source.ts

# 5. Si múltiples migraciones, revertir todas las nuevas
# Repetir migration:revert N veces

# 6. O restaurar backup completo (más drástico)
# Desde fuera del pod:
kubectl exec -n lotolink-prod deployment/lotolink-backend -- \
  /app/scripts/restore-database.sh /backups/latest.sql.gz
```

---

## 3. Incidentes Comunes

### 3.1 Backend No Responde (HTTP 502/504)

**Síntomas:**
- API devuelve 502 Bad Gateway o 504 Gateway Timeout
- Health checks fallando
- Pods crasheando

**Diagnóstico:**
```bash
# 1. Ver estado de pods
kubectl get pods -n lotolink-prod

# Si pods en CrashLoopBackOff:
# 2. Ver logs del pod que falla
kubectl logs -n lotolink-prod <pod-name> --tail=100

# 3. Ver eventos recientes
kubectl get events -n lotolink-prod --sort-by='.lastTimestamp' | tail -20

# 4. Describir pod para ver razón de falla
kubectl describe pod -n lotolink-prod <pod-name>
```

**Solución:**
```bash
# Opción 1: Reiniciar pods
kubectl rollout restart deployment/lotolink-backend -n lotolink-prod

# Opción 2: Escalar a 0 y luego subir
kubectl scale deployment/lotolink-backend --replicas=0 -n lotolink-prod
sleep 10
kubectl scale deployment/lotolink-backend --replicas=3 -n lotolink-prod

# Opción 3: Si es problema de imagen, rollback
kubectl rollout undo deployment/lotolink-backend -n lotolink-prod
```

### 3.2 Base de Datos Desconectada

**Síntomas:**
- `/health/ready` devuelve 503
- Logs muestran "database connection failed"
- Error: "ECONNREFUSED" en logs

**Diagnóstico:**
```bash
# 1. Verificar conectividad desde pod
kubectl exec -it -n lotolink-prod deployment/lotolink-backend -- /bin/bash
# Dentro del pod:
nc -zv postgres-service 5432
# O
pg_isready -h postgres-service -p 5432

# 2. Verificar estado de PostgreSQL
kubectl get pods -n lotolink-prod -l app=postgres

# 3. Ver logs de PostgreSQL
kubectl logs -n lotolink-prod deployment/postgres --tail=100

# 4. Verificar secrets
kubectl get secret postgres-credentials -n lotolink-prod -o yaml
```

**Solución:**
```bash
# Si PostgreSQL está down:
kubectl rollout restart deployment/postgres -n lotolink-prod

# Si es problema de credenciales:
# Verificar y actualizar secret
kubectl create secret generic postgres-credentials \
  --from-literal=username=lotolink \
  --from-literal=password=<new-password> \
  --dry-run=client -o yaml | kubectl apply -f -

# Reiniciar backend para recargar credenciales
kubectl rollout restart deployment/lotolink-backend -n lotolink-prod
```

### 3.3 Rate Limit Demasiado Restrictivo

**Síntomas:**
- Usuarios reportan "Too Many Requests"
- Logs muestran muchos HTTP 429
- Métricas muestran > 5% de requests con 429

**Diagnóstico:**
```bash
# 1. Ver rate de 429s
kubectl logs -n lotolink-prod deployment/lotolink-backend | grep "429" | tail -50

# 2. En Prometheus
rate(http_requests_total{status="429"}[5m])
```

**Solución Temporal:**
```bash
# Aumentar límite temporalmente
kubectl set env deployment/lotolink-backend \
  RATE_LIMIT_MAX=200 \
  -n lotolink-prod

# O editar ConfigMap si usas uno
kubectl edit configmap lotolink-config -n lotolink-prod
# Cambiar RATE_LIMIT_MAX y RATE_LIMIT_TTL

# Reiniciar para aplicar
kubectl rollout restart deployment/lotolink-backend -n lotolink-prod
```

**Solución Permanente:**
- Actualizar valores en secrets/configmap
- Desplegar nueva versión con límites ajustados

### 3.4 Webhooks de Stripe Fallando

**Síntomas:**
- Pagos no se reflejan en wallet
- Logs muestran "webhook signature verification failed"
- Alertas de webhook failures

**Diagnóstico:**
```bash
# 1. Ver logs de webhooks
kubectl logs -n lotolink-prod deployment/lotolink-backend | grep "webhook"

# 2. Verificar secret de Stripe
kubectl get secret stripe-credentials -n lotolink-prod -o jsonpath='{.data.webhook_secret}' | base64 -d

# 3. Verificar en Stripe Dashboard
# https://dashboard.stripe.com/webhooks
# Ver si eventos están siendo enviados

# 4. Consultar eventos no procesados en DB
kubectl exec -n lotolink-prod deployment/lotolink-backend -- \
  psql $DATABASE_URL -c "SELECT id, event_type, status, created_at FROM webhook_events WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;"
```

**Solución:**
```bash
# Si el webhook_secret está incorrecto:
# 1. Obtener el secret correcto de Stripe Dashboard

# 2. Actualizar secret
kubectl create secret generic stripe-credentials \
  --from-literal=secret_key=sk_live_xxx \
  --from-literal=webhook_secret=whsec_xxx \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. Reiniciar backend
kubectl rollout restart deployment/lotolink-backend -n lotolink-prod

# 4. Re-procesar webhooks fallidos (si tienes retry mechanism)
# O manualmente ajustar wallets afectados
```

### 3.5 Disco Lleno (Backups)

**Síntomas:**
- Alerta: "Disk space low"
- Backups fallando
- Pods evicted por falta de espacio

**Diagnóstico:**
```bash
# 1. Ver uso de disco en nodes
kubectl get nodes
kubectl describe node <node-name> | grep -A5 "Allocated resources"

# 2. Ver PVCs
kubectl get pvc -n lotolink-prod

# 3. Conectar al pod de backups y ver espacio
kubectl exec -it -n lotolink-prod <backup-pod> -- df -h

# 4. Ver tamaño de backups
kubectl exec -it -n lotolink-prod <backup-pod> -- ls -lh /backups
```

**Solución:**
```bash
# Limpieza inmediata de backups viejos
kubectl exec -n lotolink-prod <backup-pod> -- \
  find /backups -name "backup_*.sql.gz" -mtime +7 -delete

# Expandir PVC (si storage class lo permite)
kubectl patch pvc lotolink-backup-pvc -n lotolink-prod \
  -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'

# Verificar expansión
kubectl get pvc lotolink-backup-pvc -n lotolink-prod -w
```

---

## 4. Comandos de Emergencia

### Detener Todo (Emergencia Crítica)

```bash
# SOLO en emergencia extrema (seguridad, data breach, etc.)

echo "⚠️⚠️⚠️ DETENIENDO SISTEMA EN PRODUCCIÓN ⚠️⚠️⚠️"
echo "Requiere aprobación de CTO/Security Lead"
read -p "¿Estás seguro? (escribe 'CONFIRMAR'): " CONFIRM

if [ "$CONFIRM" = "CONFIRMAR" ]; then
  # Escalar backend a 0
  kubectl scale deployment/lotolink-backend --replicas=0 -n lotolink-prod
  
  # Poner página de mantenimiento
  # (requiere configuración previa en ingress/load balancer)
  
  # Notificar
  curl -X POST "$SLACK_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d '{"text":"🚨 SISTEMA DETENIDO EN PRODUCCIÓN - EMERGENCIA"}'
  
  echo "Sistema detenido. Investigar causa y restaurar cuando sea seguro."
else
  echo "Operación cancelada"
fi
```

### Restaurar Desde Backup (Emergencia)

```bash
#!/bin/bash
# Restauración de Emergencia desde Backup

echo "⚠️  RESTAURACIÓN DE EMERGENCIA"
echo "Esto SOBRESCRIBIRÁ la base de datos actual"
read -p "¿Continuar? (escribe 'SI'): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
  echo "Operación cancelada"
  exit 0
fi

# 1. Detener backend
kubectl scale deployment/lotolink-backend --replicas=0 -n lotolink-prod

# 2. Listar backups disponibles
echo "Backups disponibles:"
aws s3 ls s3://lotolink-backups-prod/backups/postgres/ | tail -10

read -p "Ingresa nombre del backup a restaurar: " BACKUP_NAME

# 3. Descargar backup
aws s3 cp "s3://lotolink-backups-prod/backups/postgres/$BACKUP_NAME" /tmp/$BACKUP_NAME

# 4. Restaurar
kubectl exec -n lotolink-prod deployment/postgres -- \
  bash -c "
    export PGPASSWORD=\$DATABASE_PASSWORD
    dropdb -h localhost -U lotolink lotolink_db --if-exists
    createdb -h localhost -U lotolink lotolink_db
    gunzip -c /tmp/$BACKUP_NAME | psql -h localhost -U lotolink -d lotolink_db
  "

# 5. Verificar
kubectl exec -n lotolink-prod deployment/postgres -- \
  psql -U lotolink -d lotolink_db -c "\dt"

# 6. Reiniciar backend
kubectl scale deployment/lotolink-backend --replicas=3 -n lotolink-prod

echo "✅ Restauración completada"
```

### Forzar Limpieza de Pods Stuck

```bash
# Si pods quedan en estado Terminating indefinidamente
kubectl delete pod <pod-name> -n lotolink-prod --grace-period=0 --force
```

### Ver Credenciales en Emergencia

```bash
# SOLO en emergencia y con autorización
# Ver todas las variables de entorno del pod
kubectl exec -n lotolink-prod deployment/lotolink-backend -- env | grep -E "DATABASE|STRIPE|JWT"

# O ver secrets
kubectl get secret postgres-credentials -n lotolink-prod -o json | jq '.data | map_values(@base64d)'
```

---

## 5. Mantenimiento Programado

### Actualizar Certificados SSL

```bash
# Con cert-manager automático (recomendado)
kubectl get certificate -n lotolink-prod
kubectl describe certificate lotolink-tls -n lotolink-prod

# Forzar renovación
kubectl delete secret lotolink-tls -n lotolink-prod
# cert-manager recreará automáticamente

# Manual con certbot
sudo certbot renew --nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Actualizar Dependencias del Backend

```bash
# 1. En desarrollo, actualizar package.json
cd backend
npm update
npm audit fix

# 2. Verificar tests
npm test
npm run test:e2e

# 3. Build nueva imagen
docker build -t lotolink/backend:v1.2.0 .
docker push lotolink/backend:v1.2.0

# 4. Desplegar siguiendo runbook de despliegue
```

### Limpieza de Logs Antiguos

```bash
# Limpieza en pods (si no usas log aggregation)
kubectl exec -n lotolink-prod deployment/lotolink-backend -- \
  find /var/log/lotolink -name "*.log" -mtime +30 -delete

# Rotación de logs con logrotate (en nodes)
cat > /etc/logrotate.d/lotolink <<EOF
/var/log/lotolink/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 lotolink lotolink
    sharedscripts
    postrotate
        systemctl reload lotolink-backend
    endscript
}
EOF
```

### Rotación de Base de Datos Password

```bash
# Ver procedimiento completo en GO_NO_GO_PRODUCTION_READINESS.md
# Sección 7.2 - Rotación de Secretos
```

---

## 6. Monitoreo y Alertas

### Dashboards Críticos

**Grafana Dashboards:**
- `LOTOLINK Production Overview` - Métricas generales
- `LOTOLINK Backend Performance` - Latencia, throughput
- `LOTOLINK Database` - DB performance, connections
- `LOTOLINK Kubernetes` - Pods, nodes, resources

**URLs:**
- Grafana: https://grafana.lotolink.com
- Prometheus: https://prometheus.lotolink.com
- Alertmanager: https://alertmanager.lotolink.com

### Queries Útiles

```promql
# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Latency P95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Request rate
rate(http_requests_total[5m])

# Database connections
pg_stat_database_numbackends

# Memory usage
container_memory_usage_bytes{pod=~"lotolink-backend.*"} / 1024 / 1024 / 1024
```

---

## 7. Contactos de Emergencia

| Rol | Contacto | Horario |
|-----|----------|---------|
| On-call Engineer | +1-XXX-XXX-XXXX | 24/7 |
| Tech Lead | +1-XXX-XXX-XXXX | Lun-Vie 9-18 |
| DevOps Lead | +1-XXX-XXX-XXXX | 24/7 (on-call) |
| Security Lead | +1-XXX-XXX-XXXX | On-demand |
| CTO | +1-XXX-XXX-XXXX | Emergencias |

**Slack Channels:**
- `#lotolink-incidents` - Incidentes activos
- `#lotolink-alerts` - Alertas automáticas
- `#lotolink-deployments` - Notificaciones de deploys

**PagerDuty:**
- Service: `LOTOLINK Production`
- Escalation Policy: `LOTOLINK On-Call`

---

## 8. Checklist Post-Incidente

Después de resolver un incidente:

- [ ] Documentar causa raíz
- [ ] Actualizar este runbook si aplica
- [ ] Crear postmortem (para incidentes > 30min)
- [ ] Identificar mejoras preventivas
- [ ] Actualizar alertas si es necesario
- [ ] Compartir aprendizajes con el equipo

**Template de Postmortem:** Ver `docs/postmortem-template.md`

---

**Mantenido por:** DevOps Team  
**Última actualización:** 4 de Enero, 2026  
**Próxima revisión:** Mensual o después de cada incidente mayor
