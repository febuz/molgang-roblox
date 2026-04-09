#!/bin/bash

# ============================================================
# STOP SCRIPT - Shutdown Custom Paperclip Agent System
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$SCRIPT_DIR/.service.pid"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ⏹  Stopping Custom Paperclip Agent System${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

if [ ! -f "$PID_FILE" ]; then
    echo -e "${YELLOW}⚠ No running instance found${NC}"
    exit 0
fi

PID=$(cat "$PID_FILE")

if kill -0 "$PID" 2>/dev/null; then
    echo -e "${YELLOW}Stopping service (PID: $PID)...${NC}"
    kill $PID

    # Wait for graceful shutdown
    for i in {1..10}; do
        if ! kill -0 "$PID" 2>/dev/null; then
            break
        fi
        sleep 0.5
    done

    # Force kill if necessary
    if kill -0 "$PID" 2>/dev/null; then
        echo -e "${YELLOW}Force stopping...${NC}"
        kill -9 $PID 2>/dev/null || true
    fi

    echo -e "${GREEN}✓ Service stopped${NC}"
else
    echo -e "${YELLOW}⚠ Process $PID not found${NC}"
fi

rm -f "$PID_FILE"

echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""
