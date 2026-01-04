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
