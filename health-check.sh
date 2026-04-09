#!/bin/bash

# ============================================================
# HEALTH CHECK - Verify All Services Are Running
# ============================================================
# Checks:
# - API server
# - Neo4j database
# - Kafka message queue
# - LightRAG memory
# - Cost tracking
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔍 System Health Check${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

HEALTHY=true

# Check API Server
echo -n "API Server (http://localhost:3100)... "
if curl -s http://localhost:3100/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    HEALTHY=false
fi

# Check Neo4j
echo -n "Neo4j (http://localhost:7474)... "
if docker ps --filter "name=neo4j" -q | grep -q .; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ (not running)${NC}"
    HEALTHY=false
fi

# Check Kafka
echo -n "Kafka Broker... "
if docker ps --filter "name=kafka" -q | grep -q .; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ (not running - check docker-compose)${NC}"
fi

# Check Memory API
echo -n "LightRAG Memory API... "
if curl -s http://localhost:3100/api/memory/status > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    HEALTHY=false
fi

# Check Cost Tracking
echo -n "Cost Tracking API... "
if curl -s http://localhost:3100/api/cost/summary > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC}"
fi

echo ""

if [ "$HEALTHY" = true ]; then
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ All critical services are operational!${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
    exit 0
else
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}⚠ Some services are not running${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
    exit 1
fi
