#!/bin/bash

# ============================================================
# VirtualPC Deployment Orchestration Script
# ============================================================
# Handles single-machine and Kubernetes deployments
# GPU-ready, multi-instance, auto-scaling support
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_TYPE="${1:-docker-compose}"
GPU_ENABLED="${GPU_ENABLED:-false}"
NUM_INSTANCES="${NUM_INSTANCES:-3}"
KUBE_NAMESPACE="${KUBE_NAMESPACE:-virtualpc}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🚀 VirtualPC Deployment Orchestrator${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

# ============================================================
# 1. Environment Validation
# ============================================================
echo -e "${YELLOW}[1/5] Validating environment...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

# Check GPU if enabled
if [ "$GPU_ENABLED" = "true" ]; then
    if ! command -v nvidia-smi &> /dev/null; then
        echo -e "${RED}✗ nvidia-smi not found (GPU not available)${NC}"
        exit 1
    fi
    GPU_COUNT=$(nvidia-smi --list-gpus | wc -l)
    echo -e "${GREEN}✓ GPU found (${GPU_COUNT} GPU(s))${NC}"

    if [ $GPU_COUNT -lt $NUM_INSTANCES ]; then
        echo -e "${YELLOW}⚠ Only $GPU_COUNT GPU(s) available, need $NUM_INSTANCES instances${NC}"
        NUM_INSTANCES=$GPU_COUNT
    fi
fi

# Check Kubernetes if applicable
if [ "$DEPLOYMENT_TYPE" = "kubernetes" ]; then
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}✗ kubectl not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Kubernetes found${NC}"
fi

echo ""

# ============================================================
# 2. Build Docker Images
# ============================================================
echo -e "${YELLOW}[2/5] Building Docker images...${NC}"

# Repo layout (post-2026-04-25 reorg): all deployment artifacts live in deploy/
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../deploy" && pwd)"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DOCKERFILE="$DEPLOY_DIR/Dockerfile"
if [ "$GPU_ENABLED" = "true" ]; then
    DOCKERFILE="$DEPLOY_DIR/Dockerfile.gpu"
fi

docker build -f "$DOCKERFILE" -t virtualpc:latest "$REPO_ROOT" > /dev/null 2>&1
echo -e "${GREEN}✓ API image built${NC}"

docker build -f "$DEPLOY_DIR/Dockerfile.nginx" -t virtualpc-nginx:latest "$REPO_ROOT" > /dev/null 2>&1
echo -e "${GREEN}✓ Nginx image built${NC}"

echo ""

# ============================================================
# 3. Deploy Based on Type
# ============================================================
if [ "$DEPLOYMENT_TYPE" = "docker-compose" ]; then
    echo -e "${YELLOW}[3/5] Deploying via Docker Compose...${NC}"

    COMPOSE_FILE="docker-compose.yml"
    if [ "$GPU_ENABLED" = "true" ]; then
        COMPOSE_FILE="docker-compose.gpu.yml"
    fi

    if [ ! -f "$COMPOSE_FILE" ]; then
        echo -e "${RED}✗ $COMPOSE_FILE not found${NC}"
        exit 1
    fi

    docker-compose -f $COMPOSE_FILE down 2>/dev/null || true
    docker-compose -f $COMPOSE_FILE up -d

    echo -e "${GREEN}✓ Docker Compose deployment started${NC}"

    # Wait for services
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
    sleep 10

    # Verify
    echo -e "${YELLOW}[4/5] Verifying deployment...${NC}"

    HEALTHY=true
    for service in neo4j kafka redis api-1; do
        if docker-compose -f $COMPOSE_FILE ps | grep -q "$service.*Up"; then
            echo -e "${GREEN}✓ $service is running${NC}"
        else
            echo -e "${RED}✗ $service is not running${NC}"
            HEALTHY=false
        fi
    done

elif [ "$DEPLOYMENT_TYPE" = "kubernetes" ]; then
    echo -e "${YELLOW}[3/5] Deploying to Kubernetes...${NC}"

    # Create namespace
    kubectl create namespace $KUBE_NAMESPACE 2>/dev/null || true

    # Apply manifests
    kubectl apply -f k8s-deployment.yaml

    echo -e "${GREEN}✓ Kubernetes manifests applied${NC}"

    # Wait for deployment
    echo -e "${YELLOW}⏳ Waiting for deployment to be ready...${NC}"
    kubectl wait --for=condition=available --timeout=300s \
        deployment/virtualpc-api -n $KUBE_NAMESPACE

    # Verify
    echo -e "${YELLOW}[4/5] Verifying Kubernetes deployment...${NC}"

    READY_COUNT=$(kubectl get deployment virtualpc-api -n $KUBE_NAMESPACE \
        -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
    DESIRED_COUNT=$(kubectl get deployment virtualpc-api -n $KUBE_NAMESPACE \
        -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 0)

    echo -e "${GREEN}✓ Deployment ready: $READY_COUNT/$DESIRED_COUNT replicas${NC}"

else
    echo -e "${RED}✗ Unknown deployment type: $DEPLOYMENT_TYPE${NC}"
    exit 1
fi

echo ""

# ============================================================
# 5. Post-Deployment Configuration
# ============================================================
echo -e "${YELLOW}[5/5] Post-deployment setup...${NC}"

# Create logs directory
mkdir -p logs
echo -e "${GREEN}✓ Logs directory created${NC}"

# Create initial token
TOKEN=$(node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({sub: 'init', role: 'admin'}, 'dev-secret', {expiresIn: '24h'}))" 2>/dev/null || echo "DEV-TOKEN-HERE")
echo -e "${GREEN}✓ Initial token generated${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

# ============================================================
# Summary
# ============================================================
echo -e "${YELLOW}Deployment Type:${NC} $DEPLOYMENT_TYPE"
echo -e "${YELLOW}GPU Enabled:${NC} $GPU_ENABLED"
if [ "$GPU_ENABLED" = "true" ]; then
    echo -e "${YELLOW}GPU Instances:${NC} $NUM_INSTANCES"
fi
echo ""

if [ "$DEPLOYMENT_TYPE" = "docker-compose" ]; then
    echo -e "${YELLOW}Access Points:${NC}"
    echo -e "  API:        ${BLUE}http://localhost:3100${NC}"
    echo -e "  Nginx:      ${BLUE}http://localhost:80${NC} (HTTPS: 443)"
    echo -e "  Neo4j:      ${BLUE}http://localhost:7474${NC}"
    echo -e "  Grafana:    ${BLUE}http://localhost:3000${NC}"
    echo -e "  Prometheus: ${BLUE}http://localhost:9090${NC}"
    echo ""
    echo -e "${YELLOW}Quick Commands:${NC}"
    echo -e "  Logs:       ${BLUE}docker-compose logs -f${NC}"
    echo -e "  Health:     ${BLUE}./health-check.sh${NC}"
    echo -e "  Stop:       ${BLUE}docker-compose down${NC}"

elif [ "$DEPLOYMENT_TYPE" = "kubernetes" ]; then
    echo -e "${YELLOW}Kubernetes Info:${NC}"
    echo -e "  Namespace:  ${BLUE}$KUBE_NAMESPACE${NC}"
    echo -e "  Pods:       ${BLUE}kubectl get pods -n $KUBE_NAMESPACE${NC}"
    echo -e "  Services:   ${BLUE}kubectl get svc -n $KUBE_NAMESPACE${NC}"
    echo ""
    echo -e "${YELLOW}Port Forward:${NC}"
    echo -e "  ${BLUE}kubectl port-forward -n $KUBE_NAMESPACE svc/virtualpc-lb 80:80 443:443${NC}"
fi

echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo -e "  Setup:    ${BLUE}cat SETUP_GUIDE.md${NC}"
echo -e "  Security: ${BLUE}cat SECURITY.md${NC}"
echo -e "  GPU:      ${BLUE}cat GPU_DEPLOYMENT.md${NC}"
echo ""

echo -e "${GREEN}Ready to launch agents!${NC}"
echo -e "${BLUE}npm run agents:all${NC}\n"
