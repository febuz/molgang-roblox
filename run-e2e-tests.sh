#!/bin/bash

##########################################################
# VirtualPC End-to-End Test Runner
# Comprehensive E2E testing with Selenium
##########################################################

set -e

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Default configuration
APP_PORT=3000
APP_URL="http://localhost:${APP_PORT}"
BROWSER="chrome"
HEADLESS=true
VERBOSE=false
CLEANUP=true
TIMEOUT=300

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --browser)
      BROWSER="$2"
      shift 2
      ;;
    --no-headless)
      HEADLESS=false
      shift
      ;;
    --headless)
      HEADLESS=true
      shift
      ;;
    --port)
      APP_PORT="$2"
      APP_URL="http://localhost:${APP_PORT}"
      shift 2
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --no-cleanup)
      CLEANUP=false
      shift
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      show_help
      exit 1
      ;;
  esac
done

# Function to show help
show_help() {
  echo -e "${BLUE}VirtualPC E2E Test Runner${NC}"
  echo ""
  echo "Usage: bash run-e2e-tests.sh [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --browser BROWSER      Browser to use: chrome, firefox (default: chrome)"
  echo "  --headless            Run in headless mode (default: true)"
  echo "  --no-headless         Run with visible browser window"
  echo "  --port PORT           Application port (default: 3000)"
  echo "  --verbose, -v         Show verbose output"
  echo "  --no-cleanup          Keep application running after tests"
  echo "  --timeout SECONDS     Test timeout in seconds (default: 300)"
  echo "  --help, -h            Show this help message"
  echo ""
  echo "Examples:"
  echo "  bash run-e2e-tests.sh"
  echo "  bash run-e2e-tests.sh --browser firefox --no-headless"
  echo "  bash run-e2e-tests.sh --port 3001 --verbose"
}

# Function to print header
print_header() {
  echo -e "\n${BLUE}════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}════════════════════════════════════════════${NC}\n"
}

# Function to print status
print_status() {
  echo -e "${YELLOW}→${NC} $1"
}

# Function to print success
print_success() {
  echo -e "${GREEN}✅${NC} $1"
}

# Function to print error
print_error() {
  echo -e "${RED}❌${NC} $1"
}

# Function to check if port is in use
port_in_use() {
  nc -z localhost $APP_PORT 2>/dev/null
}

# Function to wait for port
wait_for_port() {
  local max_attempts=30
  local attempt=1

  print_status "Waiting for application on port ${APP_PORT}..."

  while [ $attempt -le $max_attempts ]; do
    if port_in_use; then
      print_success "Application is running at ${APP_URL}"
      return 0
    fi

    echo -n "."
    sleep 1
    attempt=$((attempt + 1))
  done

  echo ""
  print_error "Application did not start within ${max_attempts} seconds"
  return 1
}

# Function to start application
start_application() {
  print_header "Starting VirtualPC Application"

  if port_in_use; then
    print_success "Application already running at ${APP_URL}"
    return 0
  fi

  if [ ! -f "package.json" ]; then
    print_error "package.json not found. Run from project root."
    exit 1
  fi

  print_status "Starting application in background..."
  npm run dev > /tmp/virtualpc-test.log 2>&1 &
  APP_PID=$!
  echo "PID: $APP_PID"

  if ! wait_for_port; then
    print_error "Failed to start application. Log:"
    cat /tmp/virtualpc-test.log
    exit 1
  fi

  return 0
}

# Function to run tests
run_tests() {
  print_header "Running E2E Tests"

  print_status "Configuration:"
  echo "  Browser:  ${BROWSER}"
  echo "  URL:      ${APP_URL}"
  echo "  Headless: ${HEADLESS}"
  echo "  Timeout:  ${TIMEOUT}s"
  echo ""

  # Export configuration
  export TEST_HEADLESS=$HEADLESS
  export TEST_BROWSER=$BROWSER
  export TEST_URL=$APP_URL
  export TEST_TIMEOUT=$TIMEOUT

  if [ "$VERBOSE" = true ]; then
    export DEBUG=virtualpc:*
  fi

  # Run tests
  if ! npx ts-node tests/e2e/selenium-launcher.ts; then
    print_error "Tests failed"
    return 1
  fi

  print_success "Tests completed successfully"
  return 0
}

# Function to analyze results
analyze_results() {
  print_header "Test Results Analysis"

  if [ -f "tests/e2e/results/virtualpc-test-results.json" ]; then
    print_status "Results file found"

    # Count passed/failed
    local total=$(jq 'length' tests/e2e/results/virtualpc-test-results.json)
    local passed=$(jq '[.[] | select(.passed == true)] | length' tests/e2e/results/virtualpc-test-results.json)
    local failed=$((total - passed))

    echo ""
    echo "  Total Tests:  ${total}"
    echo "  Passed:       ${passed}"
    echo "  Failed:       ${failed}"
    echo "  Success Rate: $(echo "scale=1; ($passed/$total)*100" | bc)%"
    echo ""

    # Show failed tests
    if [ $failed -gt 0 ]; then
      print_error "Failed tests:"
      jq '.[] | select(.passed == false) | .test' tests/e2e/results/virtualpc-test-results.json | sed 's/"//g' | sed 's/^/  • /'
      echo ""
      return 1
    else
      print_success "All tests passed!"
      return 0
    fi
  else
    print_error "Results file not found"
    return 1
  fi
}

# Function to generate report
generate_report() {
  print_header "Generating Report"

  local report_file="tests/e2e/results/e2e-test-report.html"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  local success_rate=$(echo "scale=1; ($(jq '[.[] | select(.passed == true)] | length' tests/e2e/results/virtualpc-test-results.json) / $(jq 'length' tests/e2e/results/virtualpc-test-results.json))*100" | bc)

  cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>VirtualPC E2E Test Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      margin: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .metric {
      padding: 15px;
      background: #f9f9f9;
      border-left: 4px solid #667eea;
      border-radius: 4px;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
      margin-top: 5px;
    }
    .passed { border-left-color: #4caf50; }
    .failed { border-left-color: #f44336; }
    .metric-value.green { color: #4caf50; }
    .metric-value.red { color: #f44336; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #667eea;
      color: white;
    }
    tr:hover {
      background: #f5f5f5;
    }
    .status-pass {
      color: #4caf50;
      font-weight: bold;
    }
    .status-fail {
      color: #f44336;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 VirtualPC E2E Test Report</h1>

    <div class="summary">
      <div class="metric">
        <div class="metric-label">Total Tests</div>
        <div class="metric-value">-</div>
      </div>
      <div class="metric passed">
        <div class="metric-label">Passed</div>
        <div class="metric-value green">-</div>
      </div>
      <div class="metric failed">
        <div class="metric-label">Failed</div>
        <div class="metric-value red">-</div>
      </div>
      <div class="metric">
        <div class="metric-label">Success Rate</div>
        <div class="metric-value">-%</div>
      </div>
    </div>

    <h2>Test Results</h2>
    <table>
      <thead>
        <tr>
          <th>Test Name</th>
          <th>Status</th>
          <th>Duration (ms)</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody id="test-results">
        <tr><td colspan="4">Loading results...</td></tr>
      </tbody>
    </table>

    <div class="footer">
      <p>Generated on <strong>TIMESTAMP</strong></p>
      <p>Browser: <strong>BROWSER</strong> | URL: <strong>URL</strong></p>
    </div>
  </div>

  <script>
    // Load results from JSON
    fetch('virtualpc-test-results.json')
      .then(r => r.json())
      .then(data => {
        const tbody = document.getElementById('test-results');
        tbody.innerHTML = '';

        let passed = 0;
        let failed = 0;

        data.forEach(result => {
          const row = document.createElement('tr');
          const status = result.passed ? 'PASS' : 'FAIL';
          const statusClass = result.passed ? 'status-pass' : 'status-fail';
          const error = result.error ? `<code>${result.error}</code>` : '-';

          if (result.passed) passed++;
          else failed++;

          row.innerHTML = `
            <td>${result.test}</td>
            <td class="${statusClass}">${status}</td>
            <td>${result.duration}</td>
            <td>${error}</td>
          `;
          tbody.appendChild(row);
        });

        // Update summary
        const total = passed + failed;
        const rate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

        document.querySelectorAll('.metric-value')[0].textContent = total;
        document.querySelectorAll('.metric-value')[1].textContent = passed;
        document.querySelectorAll('.metric-value')[2].textContent = failed;
        document.querySelectorAll('.metric-value')[3].textContent = rate + '%';
      })
      .catch(e => console.error('Failed to load results:', e));
  </script>
</body>
</html>
EOF

  sed -i "s|TIMESTAMP|${timestamp}|g" "$report_file"
  sed -i "s|BROWSER|${BROWSER}|g" "$report_file"
  sed -i "s|URL|${APP_URL}|g" "$report_file"

  print_success "Report generated: $report_file"
}

# Function to cleanup
cleanup() {
  if [ "$CLEANUP" = true ] && [ ! -z "$APP_PID" ]; then
    print_header "Cleanup"
    print_status "Stopping application (PID: $APP_PID)..."

    if kill $APP_PID 2>/dev/null; then
      print_success "Application stopped"
    else
      print_status "Application already stopped"
    fi
  fi
}

# Main execution
main() {
  trap cleanup EXIT

  print_header "VirtualPC E2E Test Runner"

  # Start application
  start_application

  # Run tests
  if ! run_tests; then
    print_error "Test execution failed"
    exit 1
  fi

  # Analyze results
  if ! analyze_results; then
    print_error "Some tests failed"
    exit 1
  fi

  # Generate report
  if [ -f "tests/e2e/results/virtualpc-test-results.json" ]; then
    generate_report
  fi

  print_header "✅ All Tests Passed Successfully"
}

# Run main function
main "$@"
