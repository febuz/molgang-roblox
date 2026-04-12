#!/bin/bash

##########################################################
# VirtualPC Selenium Launcher Wrapper
# Convenient script to launch VirtualPC in browser
##########################################################

set -e

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_URL="http://localhost:3000"
APP_PORT=3000
BROWSER="${1:-chrome}"
HEADLESS="${2:-false}"

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}   VirtualPC Selenium Launcher${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

# Function to check if port is in use
port_in_use() {
  nc -z localhost $APP_PORT 2>/dev/null
}

# Function to wait for application
wait_for_app() {
  local max_attempts=30
  local attempt=1

  echo -e "${YELLOW}⏳ Waiting for VirtualPC to start...${NC}"

  while [ $attempt -le $max_attempts ]; do
    if port_in_use; then
      echo -e "${GREEN}✅ VirtualPC is running at ${APP_URL}${NC}\n"
      return 0
    fi

    echo -n "."
    sleep 1
    attempt=$((attempt + 1))
  done

  echo -e "\n${RED}❌ Timeout: VirtualPC did not start within ${max_attempts} seconds${NC}"
  return 1
}

# Function to start VirtualPC if not running
start_app() {
  if port_in_use; then
    echo -e "${GREEN}✅ VirtualPC is already running at ${APP_URL}${NC}\n"
  else
    echo -e "${YELLOW}Starting VirtualPC...${NC}"

    if [ ! -f "package.json" ]; then
      echo -e "${RED}❌ package.json not found. Please run this from the VirtualPC project root.${NC}"
      exit 1
    fi

    # Start app in background
    npm run dev > /tmp/virtualpc.log 2>&1 &
    APP_PID=$!
    echo -e "${YELLOW}Started with PID: $APP_PID${NC}\n"

    # Wait for app to start
    if ! wait_for_app; then
      echo -e "${RED}Failed to start VirtualPC. Check logs:${NC}"
      cat /tmp/virtualpc.log
      exit 1
    fi
  fi
}

# Function to check dependencies
check_dependencies() {
  echo -e "${YELLOW}Checking dependencies...${NC}"

  local missing=false

  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    missing=true
  else
    echo -e "${GREEN}✓ Node.js: $(node --version)${NC}"
  fi

  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    missing=true
  else
    echo -e "${GREEN}✓ npm: $(npm --version)${NC}"
  fi

  case "$BROWSER" in
    chrome|chromium)
      if ! command -v google-chrome &> /dev/null && ! command -v chromium &> /dev/null; then
        echo -e "${RED}❌ Chrome/Chromium not found${NC}"
        echo -e "${YELLOW}Install with: sudo apt-get install chromium-browser${NC}"
        missing=true
      else
        if command -v google-chrome &> /dev/null; then
          echo -e "${GREEN}✓ Chrome: $(google-chrome --version | awk '{print $3}')${NC}"
        else
          echo -e "${GREEN}✓ Chromium: $(chromium --version | awk '{print $2}')${NC}"
        fi
      fi
      ;;
    firefox)
      if ! command -v firefox &> /dev/null; then
        echo -e "${RED}❌ Firefox not found${NC}"
        echo -e "${YELLOW}Install with: sudo apt-get install firefox${NC}"
        missing=true
      else
        echo -e "${GREEN}✓ Firefox: $(firefox --version | awk '{print $3}')${NC}"
      fi
      ;;
  esac

  if [ "$missing" = true ]; then
    echo -e "\n${YELLOW}Run setup to install missing dependencies:${NC}"
    echo -e "${BLUE}  bash setup-selenium-ubuntu.sh${NC}"
    exit 1
  fi

  echo -e "${GREEN}✅ All dependencies present\n${NC}"
}

# Function to run tests
run_tests() {
  echo -e "${YELLOW}Running Selenium tests...${NC}"
  echo -e "${YELLOW}Browser: ${BROWSER}${NC}"
  echo -e "${YELLOW}Headless: ${HEADLESS}\n${NC}"

  # Set environment variables
  export HEADLESS=$HEADLESS
  export BROWSER=$BROWSER

  # Run tests
  if [ -f "tsconfig.json" ]; then
    npx ts-node tests/e2e/selenium-launcher.ts
  else
    npm run test:e2e
  fi
}

# Main execution
main() {
  # Check dependencies
  check_dependencies

  # Start app if needed
  start_app

  # Run tests
  run_tests

  echo -e "\n${GREEN}════════════════════════════════════════${NC}"
  echo -e "${GREEN}   ✅ Automation Complete${NC}"
  echo -e "${GREEN}════════════════════════════════════════${NC}\n"

  # Ask if user wants to keep browser open
  if [ "$HEADLESS" = "false" ]; then
    echo -e "${YELLOW}Browser will close in 10 seconds...${NC}"
    sleep 10
  fi
}

# Run main function
main "$@"
