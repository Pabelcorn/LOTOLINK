#!/bin/bash

# LOTOLINK - Script de Detención
# Este script detiene el backend y el panel de administración

set -e

echo "🛑 Deteniendo LOTOLINK Sistema Completo..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PID file exists
if [ ! -f ".lotolink.pids" ]; then
    echo -e "${YELLOW}⚠️  No se encontró archivo de PIDs${NC}"
    echo "Intentando detener por nombre de proceso..."
    
    # Try to kill by process name
    if pgrep -f "ts-node-dev.*src/main.ts" > /dev/null; then
        pkill -f "ts-node-dev.*src/main.ts"
        echo -e "${GREEN}✅ Backend detenido${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend no encontrado en ejecución${NC}"
    fi
    
    if pgrep -f "http-server.*8080" > /dev/null; then
        pkill -f "http-server.*8080"
        echo -e "${GREEN}✅ Panel de administración detenido${NC}"
    else
        echo -e "${YELLOW}⚠️  Panel no encontrado en ejecución${NC}"
    fi
else
    # Read PIDs from file
    BACKEND_PID=$(sed -n '1p' .lotolink.pids)
    PANEL_PID=$(sed -n '2p' .lotolink.pids)
    
    # Kill backend
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill $BACKEND_PID
        echo -e "${GREEN}✅ Backend detenido (PID: $BACKEND_PID)${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend ya no está en ejecución${NC}"
    fi
    
    # Kill panel
    if ps -p $PANEL_PID > /dev/null 2>&1; then
        kill $PANEL_PID
        echo -e "${GREEN}✅ Panel de administración detenido (PID: $PANEL_PID)${NC}"
    else
        echo -e "${YELLOW}⚠️  Panel ya no está en ejecución${NC}"
    fi
    
    # Remove PID file
    rm .lotolink.pids
fi

# Clean up log files (optional)
if [ -f "backend.log" ]; then
    rm backend.log
    echo -e "${GREEN}✅ Log del backend eliminado${NC}"
fi

if [ -f "adminpanel.log" ]; then
    rm adminpanel.log
    echo -e "${GREEN}✅ Log del panel eliminado${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ LOTOLINK DETENIDO CORRECTAMENTE${NC}"
echo -e "${GREEN}========================================${NC}"
