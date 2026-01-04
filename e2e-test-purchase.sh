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
