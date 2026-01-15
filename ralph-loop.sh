#!/bin/bash
# Ralph Loop v3.1 (Droid Migrated) - Infinite Agentic Loop
# Adaptado para Factory Droid

set -e

PROMPT_FILE="specs/prompt.md"
LOG_FILE="ralph-log.txt"
ITERATION=0
RESTART_SIGNAL="/tmp/ralph-restart-server"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

start_server() {
    echo -e "${BLUE}[SERVER] Iniciando pnpm dev...${NC}"
    pnpm dev > /tmp/next-dev.log 2>&1 &
    SERVER_PID=$!
    sleep 5
}

kill_server() {
    PID=$(lsof -ti :3000 2>/dev/null || true)
    if [ -n "$PID" ]; then
        kill -9 $PID 2>/dev/null || true
    fi
}

echo -e "${YELLOW}═══ RALPH LOOP (DROID EDITION) ═══${NC}"

while true; do
    ITERATION=$((ITERATION + 1))
    NEXT_TASK=$(grep -E "^\- \[ \]" specs/implementation_plan.md 2>/dev/null | head -1)

    if [ -z "$NEXT_TASK" ]; then
        echo -e "${GREEN}✅ ¡TODAS LAS TAREAS COMPLETADAS!${NC}"
        break
    fi

    echo -e "${BLUE}Iteración $ITERATION:${NC} $NEXT_TASK"
    
    # Ejecución via Droid Exec
    droid exec --auto medium -f "$PROMPT_FILE" >> "$LOG_FILE" 2>&1

    echo -e "${GREEN}✓${NC} Iteración $ITERATION completada. Esperando 3s..."
    sleep 3
done
