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
