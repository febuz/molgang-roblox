#!/bin/bash

# VirtualPC Comprehensive System Test Script
# Tests all endpoints and verifies system operation

set -e

BASE_URL="http://localhost:3100"
PASS=0
FAIL=0

echo "════════════════════════════════════════════════════════════════"
echo "  VirtualPC System Comprehensive Test Suite"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_endpoint() {
  local method=$1
  local endpoint=$2
  local expected_status=$3
  local description=$4

  echo -n "Testing $description... "

  if [ "$method" = "GET" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
  else
    status=$(curl -s -X $method -H "Content-Type: application/json" \
      -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint" \
      -d '{"test": "data"}')
  fi

  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $status)"
    ((PASS++))
  else
    echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $status)"
    ((FAIL++))
  fi
}

test_endpoint_json() {
  local endpoint=$1
  local field=$2
  local description=$3

  echo -n "Testing $description... "

  response=$(curl -s "$BASE_URL$endpoint")
  if echo "$response" | grep -q "$field"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
  fi
}

echo "🔍 Testing Frontend..."
test_endpoint "GET" "/" "200" "React UI root route"

echo ""
echo "🔍 Testing Core APIs..."
test_endpoint "GET" "/health" "200" "Health check endpoint"
test_endpoint "GET" "/api/dashboard" "200" "Dashboard API"
test_endpoint "GET" "/api/agents/status" "200" "Agent status API"
test_endpoint "GET" "/api/backlog" "200" "Backlog list API"
test_endpoint "GET" "/api/issues" "200" "Issues list API"
test_endpoint "GET" "/api/memory/status" "200" "Memory status API"
test_endpoint "GET" "/api/cost/dashboard" "200" "Cost dashboard API"

echo ""
echo "🔍 Testing Static Files..."
test_endpoint "GET" "/bundle.js" "200" "React bundle file"
test_endpoint "GET" "/index.html" "200" "Index HTML"

echo ""
echo "🔍 Testing API Content..."
test_endpoint_json "/api/dashboard" "agents" "Dashboard contains agents"
test_endpoint_json "/api/dashboard" "cost_optimization" "Dashboard contains costs"
test_endpoint_json "/health" "status" "Health check returns status"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Test Results:"
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"
echo "════════════════════════════════════════════════════════════════"

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}✗ SOME TESTS FAILED${NC}"
  exit 1
fi
