#!/bin/bash
# Ralph Loop v3.2 - Infinite Agentic Loop
# Uso: ./ralph-loop.sh [spec-folder]
# Ejemplo: ./ralph-loop.sh docs/specs/game-days
#
# Si no se pasa argumento, usa specs/ por defecto (compatible con estructura existente)
#
# Alertas de sonido via Claude Code hooks (~/.claude/hooks/ralph-detector.py)
# Server restart: El agente puede escribir a /tmp/ralph-restart-server para reiniciar

set -e  # Exit on error

# Directorio de spec (argumento o default)
SPEC_DIR="${1:-specs}"
PROMPT_FILE="$SPEC_DIR/prompt.md"
IMPL_PLAN="$SPEC_DIR/implementation_plan.md"
LOG_FILE="ralph-log.txt"

# Validar que existen los archivos
if [ ! -f "$PROMPT_FILE" ]; then
    echo -e "\033[0;31m[ERROR] No existe: $PROMPT_FILE\033[0m"
    echo "Uso: ./ralph-loop.sh [spec-folder]"
    echo "Ejemplo: ./ralph-loop.sh docs/specs/my-feature"
    exit 1
fi

if [ ! -f "$IMPL_PLAN" ]; then
    echo -e "\033[0;31m[ERROR] No existe: $IMPL_PLAN\033[0m"
    exit 1
fi

echo -e "\033[0;34m[CONFIG] Usando spec folder: $SPEC_DIR\033[0m"
ITERATION=0
SERVER_PID=""
MONITOR_PID=""
RESTART_SIGNAL="/tmp/ralph-restart-server"
MAX_TIMEOUT=600  # 10 minutos

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ═══════════════════════════════════════════════════════════════
# FUNCIONES DE SERVIDOR
# ═══════════════════════════════════════════════════════════════

# Función para iniciar el servidor
start_server() {
    echo -e "${BLUE}[SERVER] Iniciando servidor de desarrollo...${NC}"
    npm run dev > /tmp/next-dev.log 2>&1 &
    SERVER_PID=$!
    echo -e "${GREEN}[SERVER] Servidor iniciado (PID: $SERVER_PID)${NC}"

    # Esperar a que el servidor esté listo
    echo -e "${YELLOW}[SERVER] Esperando que el servidor esté listo...${NC}"
    for i in $(seq 1 30); do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo -e "${GREEN}[SERVER] ✅ Servidor responde en puerto 3000${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}[SERVER] ❌ Timeout esperando servidor${NC}"
            cat /tmp/next-dev.log
            return 1
        fi
        sleep 1
    done

    # Esperar a que Tailwind compile
    echo -e "${YELLOW}[SERVER] Esperando compilación de CSS (10s)...${NC}"
    sleep 10
    echo -e "${GREEN}[SERVER] ✅ Servidor completamente listo${NC}"
}

# Función para matar el servidor
kill_server() {
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        echo -e "${YELLOW}[SERVER] Matando servidor (PID: $SERVER_PID)${NC}"
        kill -TERM "$SERVER_PID" 2>/dev/null || true
        sleep 2
        kill -9 "$SERVER_PID" 2>/dev/null || true
    fi

    # Matar cualquier next-server huérfano en puertos 3000-3010
    for port in $(seq 3000 3010); do
        PID=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$PID" ]; then
            kill -9 $PID 2>/dev/null || true
        fi
    done
    sleep 1
}

# Función para reiniciar el servidor
restart_server() {
    echo -e "${YELLOW}[SERVER] ═══ REINICIANDO SERVIDOR ═══${NC}"
    echo "[SERVER] Reinicio solicitado por agente: $(date)" >> "$LOG_FILE"
    kill_server
    start_server
    echo -e "${GREEN}[SERVER] ═══ SERVIDOR REINICIADO ═══${NC}"
    echo "[SERVER] Reinicio completado: $(date)" >> "$LOG_FILE"
}

# Monitor de señal de reinicio (corre en background)
restart_monitor() {
    while true; do
        if [ -f "$RESTART_SIGNAL" ]; then
            echo -e "${YELLOW}[MONITOR] Señal de reinicio detectada${NC}"
            rm -f "$RESTART_SIGNAL"
            restart_server
        fi
        sleep 2
    done
}

# ═══════════════════════════════════════════════════════════════
# CLEANUP: Mata servidor y limpia al salir
# ═══════════════════════════════════════════════════════════════
cleanup() {
    echo ""
    echo -e "${YELLOW}[CLEANUP] Limpiando procesos...${NC}"

    # Matar monitor de reinicio
    if [ -n "$MONITOR_PID" ] && kill -0 "$MONITOR_PID" 2>/dev/null; then
        kill -9 "$MONITOR_PID" 2>/dev/null || true
    fi

    # Matar servidor
    kill_server

    # Limpiar archivo de señal
    rm -f "$RESTART_SIGNAL"

    echo -e "${GREEN}[CLEANUP] ✅ Limpieza completada${NC}"
    echo "═══ RALPH LOOP TERMINADO (cleanup): $(date) ═══" >> "$LOG_FILE"
}

# Registrar cleanup para cuando el script termine
trap cleanup EXIT
trap cleanup SIGINT
trap cleanup SIGTERM

# ═══════════════════════════════════════════════════════════════
# PRE-LIMPIEZA: Matar servidores existentes y señales previas
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[PRE-CLEANUP] Verificando servidores existentes...${NC}"
kill_server
rm -f "$RESTART_SIGNAL"
echo -e "${GREEN}[PRE-CLEANUP] ✅ Listo${NC}"

# ═══════════════════════════════════════════════════════════════
# INICIAR SERVIDOR DE DESARROLLO
# ═══════════════════════════════════════════════════════════════
cd "$(dirname "$0")"
start_server || exit 1

# ═══════════════════════════════════════════════════════════════
# INICIAR MONITOR DE REINICIO (background)
# ═══════════════════════════════════════════════════════════════
echo -e "${BLUE}[MONITOR] Iniciando monitor de reinicio...${NC}"
restart_monitor &
MONITOR_PID=$!
echo -e "${GREEN}[MONITOR] Monitor activo (PID: $MONITOR_PID)${NC}"
echo -e "${BLUE}[MONITOR] El agente puede reiniciar con: echo restart > $RESTART_SIGNAL${NC}"

# Header
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                     RALPH LOOP v3.2                           ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Servidor: PID $SERVER_PID (puerto 3000)                      ║"
echo "║  Monitor:  PID $MONITOR_PID (reinicio automático)             ║"
echo "║  Spec Dir: $SPEC_DIR                                 ║"
echo "║  Log: $LOG_FILE                                      ║"
echo "║  Reinicio: echo restart > $RESTART_SIGNAL      ║"
echo "║  Para detener: Ctrl+C (limpia automáticamente)               ║"
echo "║  Para monitorear: tail -f $LOG_FILE                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Iniciar log
echo "" >> "$LOG_FILE"
echo "═══════════════════════════════════════════════════════════════" >> "$LOG_FILE"
echo "RALPH LOOP v3.2 INICIADO: $(date)" >> "$LOG_FILE"
echo "Spec Dir: $SPEC_DIR" >> "$LOG_FILE"
echo "Servidor PID: $SERVER_PID" >> "$LOG_FILE"
echo "═══════════════════════════════════════════════════════════════" >> "$LOG_FILE"

# Loop principal
while true; do
    ITERATION=$((ITERATION + 1))

    # Mostrar en terminal
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} ═══ ITERACIÓN $ITERATION ═══"

    # Siguiente tarea
    NEXT_TASK=$(grep -E "^\- \[ \]" "$IMPL_PLAN" 2>/dev/null | head -1)

    if [ -z "$NEXT_TASK" ]; then
        echo -e "${GREEN}✅ ¡TODAS LAS TAREAS COMPLETADAS!${NC}"
        echo "RALPH_COMPLETE: Todas las tareas del plan completadas" >> "$LOG_FILE"
        break
    fi

    echo -e "${YELLOW}Siguiente:${NC} $NEXT_TASK"

    # Log
    echo "" >> "$LOG_FILE"
    echo "═══ ITERACIÓN $ITERATION - $(date '+%H:%M:%S') ═══" >> "$LOG_FILE"
    echo "Tarea: $NEXT_TASK" >> "$LOG_FILE"

    # Ejecutar Claude
    echo -e "${BLUE}Ejecutando Claude...${NC}"

    # Ejecutar Claude (sin timeout en Mac, ctrl+c para cancelar si se atora)
    cat "$PROMPT_FILE" | claude -p --dangerously-skip-permissions >> "$LOG_FILE" 2>&1 || {
        echo -e "${YELLOW}[WARN] Claude terminó con código de salida $?${NC}"
    }

    # Resultado
    echo -e "${GREEN}✓${NC} Iteración $ITERATION completada"
    echo "Commits recientes:"
    git log --oneline -2 2>/dev/null || true

    echo ""
    echo -e "${YELLOW}Siguiente iteración en 3s... (Ctrl+C para detener)${NC}"
    sleep 3
done

echo ""
echo -e "${GREEN}═══ RALPH LOOP COMPLETADO EXITOSAMENTE ═══${NC}"
