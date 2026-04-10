#!/bin/bash

# Comprehensive test script for all new integrated systems
# Tests: Metrics, TaskScheduler, SeasonalEvents, Deployments, Collaboration, Analytics, Backups, Audit

BASE_URL="http://localhost:3100"
PASS=0
FAIL=0

function test_endpoint() {
    local method=$1
    local path=$2
    local data=$3
    local description=$4

    echo -n "Testing: $description... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$path")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$path")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [[ $http_code =~ ^[2][0-9][0-9]$ ]]; then
        echo "✓ PASS (HTTP $http_code)"
        ((PASS++))
    else
        echo "✗ FAIL (HTTP $http_code)"
        echo "  Response: $body"
        ((FAIL++))
    fi
}

echo "╔════════════════════════════════════════════════╗"
echo "║  VirtualPC System Integration Tests            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# ========== METRICS SYSTEM ==========
echo "📊 Metrics Dashboard Tests"
test_endpoint "GET" "/api/metrics/system" "" "Get system metrics"
test_endpoint "GET" "/api/metrics/agents" "" "Get agent metrics"
test_endpoint "GET" "/api/metrics/infrastructure" "" "Get infrastructure metrics"
test_endpoint "GET" "/api/metrics/performance" "" "Get performance metrics"
echo ""

# ========== TASK SCHEDULER ==========
echo "📋 Task Scheduler Tests"
test_endpoint "GET" "/api/tasks/schedule" "" "Get team schedule"
test_endpoint "GET" "/api/tasks/agent/kai" "" "Get agent schedule (kai)"
test_endpoint "POST" "/api/tasks/schedule" '{"title":"Test Task","description":"For testing","skills_required":["development"],"priority":"high","estimated_hours":8}' "Schedule new task"
echo ""

# ========== SEASONAL EVENTS ==========
echo "🎮 Seasonal Events Tests"
test_endpoint "GET" "/api/events/active" "" "Get active events"
test_endpoint "GET" "/api/events/challenges" "" "Get challenges"
test_endpoint "GET" "/api/events/leaderboard" "" "Get leaderboard"
test_endpoint "POST" "/api/events/progress/spring-festival" '{"player_id":"player123","progress_data":{"completed":5}}' "Update event progress"
echo ""

# ========== DEPLOYMENT MANAGER ==========
echo "🚀 Deployment Manager Tests"
test_endpoint "GET" "/api/deployments/readiness/production" "" "Check deployment readiness"
test_endpoint "POST" "/api/deployments/start" '{"version":"1.2.3","environment":"staging","services":["api","web"]}' "Start deployment"
test_endpoint "GET" "/api/deployments/history/production?limit=10" "" "Get deployment history"
echo ""

# ========== COLLABORATION ==========
echo "👥 Collaboration Tests"
test_endpoint "GET" "/api/collaboration/team-summary" "" "Get team summary"
test_endpoint "POST" "/api/collaboration/start" '{"type":"task-discussion","participants":["kai","zip"],"priority":"high"}' "Start collaboration"
test_endpoint "POST" "/api/workspaces/create" '{"name":"Sprint Planning","owner":"fill","members":["kai","zip"]}' "Create workspace"
echo ""

# ========== ANALYTICS ==========
echo "📈 Advanced Analytics Tests"
test_endpoint "GET" "/api/analytics/health" "" "Get health score"
test_endpoint "GET" "/api/analytics/performance?agent=kai&hours=24" "" "Get performance report"
test_endpoint "GET" "/api/analytics/trends?hours=24" "" "Get trends"
test_endpoint "GET" "/api/analytics/insights?priority=high" "" "Get insights"
test_endpoint "POST" "/api/analytics/track" '{"type":"task-completion","agent":"zip","duration":5000,"status":"success","metadata":{"task":"dev-feature"}}' "Track analytics event"
echo ""

# ========== BACKUP MANAGER ==========
echo "💾 Backup & Disaster Recovery Tests"
test_endpoint "GET" "/api/backups/statistics" "" "Get backup statistics"
test_endpoint "GET" "/api/recovery/status" "" "Get disaster recovery status"
test_endpoint "POST" "/api/backups/create" '{"database":"neo4j","type":"full"}' "Create backup"
echo ""

# ========== AUDIT LOGGER ==========
echo "🔒 Security & Audit Logging Tests"
test_endpoint "GET" "/api/security/health" "" "Get security health"
test_endpoint "GET" "/api/compliance/report?days=30" "" "Get compliance report"
test_endpoint "GET" "/api/security/alerts?level=warning" "" "Get security alerts"
test_endpoint "POST" "/api/audit/log" '{"user_id":"user123","action":"login","resource":"system","status":"success","details":{"ip":"192.168.1.1"}}' "Log audit event"
echo ""

# ========== OPENCLAW ==========
echo "⚡ OpenClaw Autonomous Execution Tests"
test_endpoint "POST" "/api/openclaw/command" '{"agent":"kai","command":"get-status"}' "Execute OpenClaw command"
test_endpoint "GET" "/api/openclaw/history" "" "Get OpenClaw history"
test_endpoint "GET" "/api/openclaw/stats" "" "Get execution statistics"
echo ""

echo "╔════════════════════════════════════════════════╗"
echo "║  Test Results Summary                          ║"
echo "╠════════════════════════════════════════════════╣"
echo "║  ✓ Passed: $PASS                              "
echo "║  ✗ Failed: $FAIL                              "
echo "╚════════════════════════════════════════════════╝"

if [ $FAIL -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed! System integration complete."
    exit 0
else
    echo ""
    echo "⚠️  Some tests failed. Review the output above."
    exit 1
fi
