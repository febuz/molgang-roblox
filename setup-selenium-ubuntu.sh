#!/bin/bash

##########################################################
# VirtualPC Selenium Setup Script for Ubuntu
# Installs dependencies and configures Selenium automation
##########################################################

set -e

echo "🔧 VirtualPC Selenium Setup for Ubuntu"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on Ubuntu/Debian
if ! [ -f /etc/os-release ] || ! grep -q "Ubuntu\|Debian" /etc/os-release; then
  echo -e "${RED}❌ This script is designed for Ubuntu/Debian systems${NC}"
  exit 1
fi

# Check if running as root for system-level installations
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}⚠️  Some commands require sudo. You may be prompted for your password.${NC}"
fi

# Step 1: Update system packages
echo -e "\n${YELLOW}Step 1: Updating system packages...${NC}"
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# Step 2: Install Node.js if not present
echo -e "\n${YELLOW}Step 2: Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}Installing Node.js 20...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}✓ Node.js already installed: ${NODE_VERSION}${NC}"
fi

# Step 3: Install Chrome/Chromium
echo -e "\n${YELLOW}Step 3: Installing Chrome/Chromium...${NC}"
if ! command -v google-chrome &> /dev/null && ! command -v chromium &> /dev/null; then
  echo -e "${YELLOW}Installing Chromium...${NC}"
  sudo apt-get install -y chromium-browser chromium-chromedriver
else
  if command -v google-chrome &> /dev/null; then
    CHROME_VERSION=$(google-chrome --version)
    echo -e "${GREEN}✓ Google Chrome already installed: ${CHROME_VERSION}${NC}"
  else
    CHROMIUM_VERSION=$(chromium --version)
    echo -e "${GREEN}✓ Chromium already installed: ${CHROMIUM_VERSION}${NC}"
  fi
fi

# Step 4: Install Firefox (optional)
echo -e "\n${YELLOW}Step 4: Installing Firefox (optional)...${NC}"
if ! command -v firefox &> /dev/null; then
  echo -e "${YELLOW}Installing Firefox...${NC}"
  sudo apt-get install -y firefox firefox-geckodriver
else
  FIREFOX_VERSION=$(firefox --version)
  echo -e "${GREEN}✓ Firefox already installed: ${FIREFOX_VERSION}${NC}"
fi

# Step 5: Install ChromeDriver
echo -e "\n${YELLOW}Step 5: Ensuring ChromeDriver is available...${NC}"
if ! command -v chromedriver &> /dev/null; then
  echo -e "${YELLOW}Installing chromedriver...${NC}"
  sudo apt-get install -y chromium-chromedriver

  # Create symlink if needed
  if [ ! -f /usr/local/bin/chromedriver ]; then
    sudo ln -sf /usr/lib/chromium-browser/chromedriver /usr/local/bin/chromedriver 2>/dev/null || true
  fi
else
  CHROMEDRIVER_VERSION=$(chromedriver --version)
  echo -e "${GREEN}✓ ChromeDriver already installed: ${CHROMEDRIVER_VERSION}${NC}"
fi

# Step 6: Install other dependencies
echo -e "\n${YELLOW}Step 6: Installing additional dependencies...${NC}"
sudo apt-get install -y \
  ca-certificates \
  fonts-dejavu-core \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgbm1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libxdamage1 \
  libxrandr2 \
  libxss1 \
  libxtst6 \
  xdg-utils \
  wget \
  curl \
  git

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 7: Install Node.js dependencies
echo -e "\n${YELLOW}Step 7: Installing Node.js project dependencies...${NC}"
if [ -f "package.json" ]; then
  npm install --save-dev \
    selenium-webdriver \
    @types/selenium-webdriver \
    chrome-webdriver \
    geckodriver \
    webdriver
  echo -e "${GREEN}✓ Node.js dependencies installed${NC}"
else
  echo -e "${RED}❌ package.json not found. Please run this from the project root.${NC}"
  exit 1
fi

# Step 8: Create necessary directories
echo -e "\n${YELLOW}Step 8: Creating directories...${NC}"
mkdir -p tests/e2e/screenshots
mkdir -p tests/e2e/results
echo -e "${GREEN}✓ Directories created${NC}"

# Step 9: Verify installations
echo -e "\n${YELLOW}Step 9: Verifying installations...${NC}"
echo -e "\n${GREEN}Installed versions:${NC}"
echo "  • Node.js: $(node --version)"
echo "  • npm: $(npm --version)"

if command -v google-chrome &> /dev/null; then
  echo "  • Google Chrome: $(google-chrome --version)"
fi

if command -v chromium &> /dev/null; then
  echo "  • Chromium: $(chromium --version)"
fi

if command -v chromedriver &> /dev/null; then
  echo "  • ChromeDriver: $(chromedriver --version | head -1)"
fi

if command -v firefox &> /dev/null; then
  echo "  • Firefox: $(firefox --version)"
fi

if command -v geckodriver &> /dev/null; then
  echo "  • GeckoDriver: $(geckodriver --version)"
fi

# Step 10: Build TypeScript
echo -e "\n${YELLOW}Step 10: Building TypeScript...${NC}"
npm run build || echo -e "${YELLOW}⚠️  Build skipped (TypeScript may need config)${NC}"

echo -e "\n${GREEN}======================================"
echo -e "✅ Setup complete!"
echo -e "======================================${NC}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Start your VirtualPC application: npm run dev"
echo "2. In another terminal, run the Selenium automation:"
echo "   npx ts-node tests/e2e/selenium-launcher.ts"
echo ""
echo "Or compile and run:"
echo "   npm run build"
echo "   node dist/tests/e2e/selenium-launcher.js"
echo ""
echo -e "${YELLOW}For headless mode (no visual browser):${NC}"
echo "   Edit tests/e2e/selenium-launcher.ts and set: headless: true"
echo ""
