# Scripts de Verificación Post-Merge

Este directorio contiene scripts ejecutables para validar el sistema después del merge del PR #76 de seguridad y readiness.

## Scripts Disponibles

### 1. test-rate-limit.sh
**Propósito:** Verificar que el rate limiting está funcionando correctamente.

**Uso:**
```bash
./test-rate-limit.sh
```

**Qué hace:**
- Envía 110 requests al endpoint de login
- Verifica que después de 100 requests se active el rate limit (HTTP 429)
- Valida la configuración de 100 req/15min

**Antes de ejecutar:**
- Reemplaza `<tu-host>` con tu dominio en el archivo

### 2. e2e-test-purchase.sh
**Propósito:** Probar el flujo completo de compra de jugada.

**Uso:**
```bash
./e2e-test-purchase.sh
```

**Qué hace:**
1. Registra un usuario de prueba
2. Carga el wallet con Stripe
3. Crea una jugada
4. Verifica el estado de la jugada

**Requisitos:**
- `jq` instalado para procesar JSON
- Backend corriendo
- Reemplazar `<tu-host>` con tu dominio

### 3. e2e-test-admin.sh
**Propósito:** Probar el flujo completo del panel de administración.

**Uso:**
```bash
./e2e-test-admin.sh
```

**Qué hace:**
1. Login como administrador
2. Registra una nueva banca
3. Aprueba la banca
4. Activa la banca
5. Lista todas las bancas

**Requisitos:**
- `jq` instalado
- Credenciales de admin configuradas
- Backend corriendo
- Reemplazar `<tu-host>` y credenciales

### 4. simple-monitoring.sh
**Propósito:** Monitoreo continuo del estado del backend.

**Uso:**
```bash
# Ejecutar en foreground
./simple-monitoring.sh

# Ejecutar en background
nohup ./simple-monitoring.sh > /dev/null 2>&1 &
```

**Qué hace:**
- Verifica health check cada 60 segundos
- Verifica readiness check
- Mide tiempos de respuesta
- Envía alertas cuando detecta problemas
- Registra todo en `/var/log/lotolink/monitoring.log`

**Configuración:**
- Crear directorio: `sudo mkdir -p /var/log/lotolink`
- Dar permisos: `sudo chown -R $USER:$USER /var/log/lotolink`

### 5. scripts/post-merge-verification.sh
**Propósito:** Verificación rápida post-merge de componentes críticos.

**Uso:**
```bash
./scripts/post-merge-verification.sh
```

**Qué hace:**
1. Health checks (liveness y readiness)
2. Verifica migraciones ejecutadas
3. Verifica existencia de backups
4. Prueba CORS

**Nota:** Este es un script de verificación rápida. Para pruebas exhaustivas, usa los otros scripts.

## Configuración General

### Antes de Usar los Scripts

1. **Instalar dependencias:**
   ```bash
   # jq para procesar JSON
   sudo apt-get install jq
   
   # curl (normalmente ya está instalado)
   sudo apt-get install curl
   ```

2. **Reemplazar placeholders:**
   En todos los scripts, busca y reemplaza:
   - `<tu-host>` → Tu dominio (ej: `lotolink.com` o `localhost:3000`)
   - `<tu-dominio.com>` → Tu dominio permitido en CORS
   - `tu_password_admin` → Tu contraseña de admin real

3. **Configurar permisos:**
   ```bash
   # Todos los scripts ya tienen permisos de ejecución
   # Si necesitas agregarlos manualmente:
   chmod +x test-rate-limit.sh
   chmod +x e2e-test-purchase.sh
   chmod +x e2e-test-admin.sh
   chmod +x simple-monitoring.sh
   chmod +x scripts/post-merge-verification.sh
   ```

## Orden Recomendado de Ejecución

Para una verificación completa post-merge, ejecuta en este orden:

1. **scripts/post-merge-verification.sh** - Verificación rápida básica
2. **test-rate-limit.sh** - Validar seguridad (rate limiting)
3. **e2e-test-purchase.sh** - Validar flujo de usuario
4. **e2e-test-admin.sh** - Validar flujo de administración
5. **simple-monitoring.sh** - Dejar corriendo para monitoreo continuo

## Solución de Problemas

### Error: "jq: command not found"
```bash
sudo apt-get update
sudo apt-get install jq
```

### Error: "curl: command not found"
```bash
sudo apt-get update
sudo apt-get install curl
```

### Error: "Permission denied"
```bash
chmod +x nombre-del-script.sh
```

### Los scripts no pueden crear logs
```bash
sudo mkdir -p /var/log/lotolink
sudo chown -R $USER:$USER /var/log/lotolink
```

## Documentación Relacionada

Para más información sobre los procedimientos de verificación, consulta:

- [POST_MERGE_VERIFICATION.md](../POST_MERGE_VERIFICATION.md) - Documentación completa
- [IMPLEMENTATION_SUMMARY_POST_MERGE.md](../IMPLEMENTATION_SUMMARY_POST_MERGE.md) - Resumen de implementación
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - Guía de despliegue

## Soporte

Si encuentras problemas:

1. Revisa los logs: `tail -f /var/log/lotolink/monitoring.log`
2. Verifica que el backend esté corriendo: `curl https://<tu-host>/health`
3. Consulta la documentación en POST_MERGE_VERIFICATION.md

---

**Creado:** 4 de Enero, 2026  
**Versión:** 1.0  
**Parte del PR:** #76 - Security + Readiness
