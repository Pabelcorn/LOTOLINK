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
