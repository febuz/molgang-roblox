#!/bin/bash

##########################################################
# VirtualPC Interactive Demo Runner
# Demonstrates Selenium with mouse control and game nav
##########################################################

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}   VirtualPC + MOLGANG Interactive Demo${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

# Check if VirtualPC is running
echo -e "${YELLOW}Checking if VirtualPC is running...${NC}"
if ! nc -z localhost 3000 2>/dev/null; then
  echo -e "${YELLOW}Starting VirtualPC in background...${NC}"
  npm run dev > /tmp/virtualpc-demo.log 2>&1 &
  APP_PID=$!
  echo "PID: $APP_PID"

  echo -e "${YELLOW}Waiting for application to start...${NC}"
  for i in {1..30}; do
    if nc -z localhost 3000 2>/dev/null; then
      echo -e "${GREEN}✅ VirtualPC is running${NC}\n"
      break
    fi
    echo -n "."
    sleep 1
  done
fi

# Run the interactive demo
echo -e "${YELLOW}Running interactive demo...${NC}"
echo -e "${YELLOW}This will demonstrate:${NC}"
echo "  1. VirtualPC interface navigation"
echo "  2. Mouse movement tracking"
echo "  3. Form interaction"
echo "  4. Performance metrics"
echo "  5. MOLGANG game navigation"
echo ""

npx ts-node tests/e2e/interactive-demo.ts

echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ Interactive Demo Complete${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "\n📁 Check screenshots: ${BLUE}tests/e2e/screenshots/${NC}\n"
