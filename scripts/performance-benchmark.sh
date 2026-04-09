#!/bin/bash

# VirtualPC Performance Benchmark Suite
# Comprehensive testing of all system components

set -e

BASE_URL="http://localhost:3100"
RESULTS_DIR="./benchmark-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="$RESULTS_DIR/benchmark_$TIMESTAMP.json"

mkdir -p $RESULTS_DIR

echo "════════════════════════════════════════════════════════════════"
echo "  VirtualPC Performance Benchmark Suite"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Initialize results JSON
cat > $RESULTS_FILE <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "baseUrl": "$BASE_URL",
  "results": {
    "latency": {},
    "throughput": {},
    "concurrent": {}
  }
}
EOF

benchmark_latency() {
  local endpoint=$1
  local name=$2
  local iterations=${3:-100}

  echo -n "Benchmarking $name latency ($iterations iterations)... "

  local total_time=0
  local min_time=999999
  local max_time=0

  for i in $(seq 1 $iterations); do
    local start_time=$(date +%s%N)
    curl -s -o /dev/null "$BASE_URL$endpoint"
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds

    total_time=$((total_time + response_time))
    if [ $response_time -lt $min_time ]; then min_time=$response_time; fi
    if [ $response_time -gt $max_time ]; then max_time=$response_time; fi
  done

  local avg_time=$((total_time / iterations))
  echo -e "${GREEN}✓${NC} Avg: ${avg_time}ms, Min: ${min_time}ms, Max: ${max_time}ms"
}

benchmark_throughput() {
  local endpoint=$1
  local name=$2
  local duration=${3:-10}

  echo -n "Benchmarking $name throughput (${duration}s)... "

  local request_count=0
  local start_time=$(date +%s)
  local end_time=$((start_time + duration))

  while [ $(date +%s) -lt $end_time ]; do
    curl -s -o /dev/null "$BASE_URL$endpoint"
    request_count=$((request_count + 1))
  done

  local rps=$((request_count / duration))
  echo -e "${GREEN}✓${NC} ${rps} req/s"
}

benchmark_concurrent() {
  local endpoint=$1
  local name=$2
  local concurrent_users=${3:-50}

  echo -n "Benchmarking $name concurrent users (${concurrent_users} concurrent)... "

  (
    for i in $(seq 1 $concurrent_users); do
      curl -s -o /dev/null "$BASE_URL$endpoint" &
    done
    wait
  )

  echo -e "${GREEN}✓${NC} Completed"
}

echo "🔍 Running Latency Benchmarks..."
benchmark_latency "/" "Root endpoint" 50
benchmark_latency "/api/dashboard" "Dashboard API" 50
benchmark_latency "/api/backlog" "Backlog API" 50
benchmark_latency "/api/agents/status" "Agent Status API" 50
benchmark_latency "/health" "Health check" 100

echo ""
echo "🔍 Running Throughput Benchmarks..."
benchmark_throughput "/" "Root endpoint" 5
benchmark_throughput "/api/dashboard" "Dashboard API" 5

echo ""
echo "🔍 Running Concurrency Benchmarks..."
benchmark_concurrent "/" "Root endpoint" 50
benchmark_concurrent "/api/dashboard" "Dashboard API" 50

echo ""
echo "════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ Benchmark Complete${NC}"
echo "Results saved to: $RESULTS_FILE"
echo "════════════════════════════════════════════════════════════════"
