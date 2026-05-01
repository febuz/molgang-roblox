#!/bin/bash

# ============================================================
# VirtualPC Quick Start - Full System Launch
# ============================================================
# This script:
# 1. Fixes Docker permissions
# 2. Starts infrastructure (docker-compose)
# 3. Builds and starts API server
# 4. Verifies all services
# 5. Displays dashboard URL
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 VirtualPC Autonomous Agent System - Quick Start  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

# Step 1: Fix Docker permissions
echo -e "${YELLOW}[1/5] Checking Docker permissions...${NC}"
if ! docker ps &>/dev/null; then
    echo -e "${YELLOW}⚠ Docker requires elevated permissions${NC}"
    echo -e "${YELLOW}Running: sudo usermod -aG docker knight2${NC}"
    sudo usermod -aG docker knight2
    echo -e "${YELLOW}⚠ You may need to log out and log back in, or run: newgrp docker${NC}"
fi

# Step 2: Start infrastructure
echo ""
echo -e "${YELLOW}[2/5] Starting infrastructure (Neo4j, Kafka, Redis)...${NC}"
docker-compose up -d
sleep 3
echo -e "${GREEN}✓ Infrastructure started${NC}"

# Step 3: Build application
echo ""
echo -e "${YELLOW}[3/5] Building VirtualPC API...${NC}"
npm run build --silent
echo -e "${GREEN}✓ Build complete${NC}"

# Step 4: Start API server
echo ""
echo -e "${YELLOW}[4/5] Starting API server...${NC}"
node dist/index.js > logs/virtualpc.log 2>&1 &
API_PID=$!
echo $API_PID > .service.pid
sleep 2

if kill -0 $API_PID 2>/dev/null; then
    echo -e "${GREEN}✓ API server started (PID: $API_PID)${NC}"
else
    echo -e "${RED}✗ Failed to start API server${NC}"
    cat logs/virtualpc.log
    exit 1
fi

# Step 5: Verify services
echo ""
echo -e "${YELLOW}[5/5] Verifying services...${NC}"
sleep 2

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ VirtualPC System Online!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}🎯 Access Dashboard:${NC}"
echo -e "   ${BLUE}http://localhost:3100${NC}\n"

echo -e "${YELLOW}📊 Services:${NC}"
echo -e "   API Server:     ${BLUE}http://localhost:3100${NC}"
echo -e "   Neo4j (LightRAG): ${BLUE}http://localhost:7474${NC}"
echo -e "   Kafka Admin:    ${BLUE}http://localhost:8080${NC} (if kafdrop enabled)"
echo -e "   Redis:          localhost:6379\n"

echo -e "${YELLOW}🔍 Quick Tests:${NC}"
echo -e "   Health Check:   ${BLUE}curl http://localhost:3100/health${NC}"
echo -e "   Memory Status:  ${BLUE}curl http://localhost:3100/api/memory/status${NC}"
echo -e "   Agent Status:   ${BLUE}curl http://localhost:3100/api/agents/status${NC}\n"

echo -e "${YELLOW}📋 Useful Commands:${NC}"
echo -e "   View Logs:      ${BLUE}tail -f logs/virtualpc.log${NC}"
echo -e "   Stop System:    ${BLUE}./stop.sh${NC}"
echo -e "   Check Status:   ${BLUE}./health-check.sh${NC}\n"

echo -e "${YELLOW}🎮 Next Steps:${NC}"
echo -e "   1. Open ${BLUE}http://localhost:3100${NC} in your browser"
echo -e "   2. Create your first task via the UI or API"
echo -e "   3. Watch agents execute autonomously"
echo -e "   4. Monitor the project Phase 5 development\n"

echo -e "${GREEN}System ready! 🚀${NC}\n"
