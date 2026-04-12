# 🎮 MOLGANG Virtual Server Deployment & GitHub Sync

Complete setup guide for deploying MOLGANG game on virtual server and syncing GitHub repository.

**Date**: 2026-04-12  
**Status**: Setup Instructions for Today  
**Goal**: Deploy game + sync GitHub with latest code

---

## 📋 Today's Objectives

### 1. ✅ Sync GitHub with Latest Code (5 days behind)
- [ ] Identify what code is 5 days behind on GitHub
- [ ] Pull latest code from development branch
- [ ] Update GitHub web version repository
- [ ] Commit and push to GitHub
- [ ] Verify GitHub is current

### 2. ✅ Setup Virtual Server for Game
- [ ] Create development environment
- [ ] Install dependencies
- [ ] Configure Rojo for development
- [ ] Setup web version (TypeScript/React)
- [ ] Start local game servers
- [ ] Test multiplayer synchronization

### 3. ✅ Configure Production Deployment
- [ ] Setup Docker containers
- [ ] Configure Kubernetes manifests
- [ ] Setup CI/CD pipeline
- [ ] Configure monitoring & logging
- [ ] Setup automated backups

---

## 📂 Current Repository Structure

```
molgang-roblox/
├── .github/
│   ├── workflows/
│   │   ├── deploy.yml
│   │   ├── test.yml
│   │   └── publish.yml
│   └── ISSUE_TEMPLATE/
├── src/
│   ├── game/
│   │   ├── modules/
│   │   │   ├── Market.lua      # Trading system
│   │   │   ├── Leaderboard.lua # Rankings
│   │   │   ├── MOLCO2.lua      # Currency
│   │   │   └── Physics.lua     # Game mechanics
│   │   ├── server/
│   │   ├── client/
│   │   └── shared/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   └── App.tsx
│   │   ├── public/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── server/
│       ├── src/
│       │   ├── api/
│       │   ├── services/
│       │   └── index.ts
│       └── package.json
├── rojo.project.json         # Rojo configuration
├── package.json              # Root dependencies
└── README.md
```

---

## 🔄 Step 1: Sync GitHub with Latest Code (5 Days Behind)

### 1.1 Check Current Status

```bash
# Go to MOLGANG directory
cd /path/to/molgang-roblox

# Check git status
git status
git log --oneline -10

# Check what's different from GitHub
git diff origin/main..HEAD
```

### 1.2 Identify 5-Day-Old Code

```bash
# Find commits from last 5 days
git log --since="5 days ago" --oneline

# See what changed
git show <commit-hash>
```

### 1.3 Update GitHub with Latest Code

```bash
# Ensure you have all latest code locally
git fetch origin

# Merge any upstream changes
git merge origin/main

# Update your branch with latest
git pull origin main

# Push your changes to GitHub
git push origin main

# Verify GitHub is updated
git log --oneline origin/main -5
```

### 1.4 Sync Web Version Specifically

If the **web version** is 5 days behind:

```bash
# Update web package
cd src/web

# Ensure dependencies are current
npm update

# Run tests to verify
npm test

# Build for production
npm run build

# Commit updates
cd ../..
git add src/web/
git commit -m "Update web version with latest code (5-day sync)"
git push origin main
```

### 1.5 Update Server Code

If the **server** is 5 days behind:

```bash
# Update server package
cd src/server

# Update dependencies
npm update

# Run tests
npm test

# Build
npm run build

# Commit
cd ../..
git add src/server/
git commit -m "Update server with latest code (5-day sync)"
git push origin main
```

---

## 🖥️ Step 2: Setup Virtual Server for Game

### 2.1 Development Environment Setup

```bash
# Install Rojo (version 7.4.4 as specified)
cargo install rojo --version 7.4.4

# Or use npm
npm install -g rojo@7.4.4

# Verify installation
rojo --version

# Navigate to project
cd molgang-roblox

# Start Rojo server
rojo serve
# Connects to Roblox Studio on localhost:34872
```

### 2.2 Roblox Studio Setup

```bash
# Open Roblox Studio
# Create new project OR open existing

# Plugin installation:
# 1. Get Rojo plugin from Roblox Creator Store
# 2. Enable Rojo plugin in Studio
# 3. Connect to localhost:34872
```

### 2.3 Web Version Setup

```bash
cd src/web

# Install dependencies
npm install

# Start development server
npm run dev
# Runs on http://localhost:3000

# In another terminal, start backend
cd ../server
npm install
npm run dev
# Runs on http://localhost:5000

# Test web version
# Open http://localhost:3000 in browser
```

### 2.4 Start Game Servers

```bash
# Terminal 1: Rojo development
rojo serve

# Terminal 2: Web frontend
cd src/web && npm run dev

# Terminal 3: Game server
cd src/server && npm run dev

# Terminal 4: Database (Neo4j)
docker run -p 7474:7474 -p 7687:7687 neo4j

# Terminal 5: Redis cache
redis-server

# Terminal 6: Monitoring
npm run monitor
```

### 2.5 Verify Setup

```bash
# Check all services running
lsof -i :3000   # Web frontend
lsof -i :5000   # Game server
lsof -i :7474   # Neo4j
lsof -i :6379   # Redis
lsof -i :34872  # Rojo

# All should show LISTEN status
```

---

## 🐳 Step 3: Docker Setup for Virtual Server

### 3.1 Create Dockerfile

```dockerfile
# Dockerfile for MOLGANG Game Server
FROM node:20-alpine

WORKDIR /app

# Copy game code
COPY src/ ./src/
COPY package*.json ./
COPY rojo.project.json ./

# Install dependencies
RUN npm ci
RUN npm install -g rojo@7.4.4

# Expose ports
EXPOSE 5000 34872 3000

# Start services
CMD npm run dev
```

### 3.2 Create docker-compose.yml

```yaml
version: '3.8'

services:
  game-server:
    build: .
    ports:
      - "5000:5000"
      - "3000:3000"
      - "34872:34872"
    environment:
      NODE_ENV: development
      DATABASE_URL: neo4j://neo4j:7687
      REDIS_URL: redis://redis:6379
    depends_on:
      - neo4j
      - redis
    volumes:
      - ./src:/app/src

  neo4j:
    image: neo4j:5.13
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      NEO4J_AUTH: neo4j/password
      NEO4J_PLUGINS: "[]"
    volumes:
      - neo4j_data:/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  neo4j_data:
  redis_data:
```

### 3.3 Deploy with Docker

```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f game-server

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

---

## ☸️ Step 4: Kubernetes Deployment

### 4.1 Create Deployment Manifest

```yaml
# molgang-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: molgang-game
  namespace: molgang
spec:
  replicas: 3
  selector:
    matchLabels:
      app: molgang-game
  template:
    metadata:
      labels:
        app: molgang-game
    spec:
      containers:
      - name: game-server
        image: molgang:latest
        ports:
        - containerPort: 5000
        - containerPort: 3000
        - containerPort: 34872
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          value: "neo4j://neo4j-service:7687"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: molgang-service
  namespace: molgang
spec:
  type: LoadBalancer
  selector:
    app: molgang-game
  ports:
  - name: game-server
    port: 5000
    targetPort: 5000
  - name: web-frontend
    port: 3000
    targetPort: 3000

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: molgang-hpa
  namespace: molgang
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: molgang-game
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### 4.2 Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace molgang

# Deploy
kubectl apply -f molgang-deployment.yaml

# Verify deployment
kubectl get pods -n molgang
kubectl get svc -n molgang

# Check logs
kubectl logs -f deployment/molgang-game -n molgang

# Scale up if needed
kubectl scale deployment molgang-game --replicas=5 -n molgang
```

---

## 🚀 Step 5: CI/CD Pipeline Setup

### 5.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy MOLGANG

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t molgang:${{ github.sha }} .
      
      - name: Push to registry
        run: docker push molgang:${{ github.sha }}
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/molgang-game \
            game-server=molgang:${{ github.sha }} \
            -n molgang
```

### 5.2 Automated Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode during development
npm run test:watch
```

---

## ✅ Verification Checklist

### Code Sync
- [ ] GitHub main branch is current (no 5-day lag)
- [ ] Web version code is latest
- [ ] Server code is latest
- [ ] All commits are pushed
- [ ] GitHub shows "All commits" status

### Virtual Server Setup
- [ ] Node.js installed (v20+)
- [ ] Rojo installed (v7.4.4)
- [ ] Dependencies installed (`npm ci`)
- [ ] All services starting without errors
- [ ] Web frontend accessible (http://localhost:3000)
- [ ] Game server accessible (http://localhost:5000)
- [ ] Rojo connected to Studio

### Docker Setup
- [ ] Docker installed and running
- [ ] Dockerfile builds successfully
- [ ] docker-compose.yml valid
- [ ] Containers start without errors
- [ ] Services accessible from host

### Kubernetes Setup
- [ ] kubectl configured for cluster
- [ ] Namespace created
- [ ] Deployment running (3+ pods)
- [ ] Service LoadBalancer working
- [ ] HPA scaling correctly
- [ ] Pods healthy and running

---

## 🎯 Quick Start Commands

```bash
# 1. Sync GitHub
cd molgang-roblox
git pull origin main
git push origin main

# 2. Start development (5 terminals)
# Terminal 1: Rojo
rojo serve

# Terminal 2: Web
cd src/web && npm run dev

# Terminal 3: Server
cd src/server && npm run dev

# Terminal 4: Neo4j
docker run neo4j

# Terminal 5: Redis
redis-server

# 3. Or use Docker
docker-compose up -d

# 4. Or deploy to Kubernetes
kubectl apply -f molgang-deployment.yaml
```

---

## 📊 Monitoring & Logs

### Development Mode
```bash
# Terminal logs
npm run dev

# With detailed output
DEBUG=molgang* npm run dev
```

### Production Mode
```bash
# Docker logs
docker-compose logs -f game-server

# Kubernetes logs
kubectl logs -f deployment/molgang-game -n molgang

# Get pod details
kubectl describe pod <pod-name> -n molgang
```

---

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Kill process on port
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Rojo Not Connecting
```bash
# Ensure Rojo is running
rojo serve

# Check if port 34872 is listening
lsof -i :34872

# Restart and check Studio plugin
```

### Database Connection Failed
```bash
# Check if Neo4j is running
curl http://localhost:7474

# Or start with Docker
docker run -p 7474:7474 -p 7687:7687 neo4j
```

### Dependencies Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm ci

# Update specific package
npm update package-name
```

---

## 📈 Performance Targets

### Development
- Page load: < 5 seconds
- Game start: < 10 seconds
- Hot reload: < 2 seconds

### Production
- Page load: < 3 seconds
- Game start: < 5 seconds
- Transaction: < 500ms
- Frame rate: 60 FPS

---

## 🎮 Game Features to Verify

- [ ] Market trading (buy/sell)
- [ ] Leaderboards updating
- [ ] MOLCO2 distribution
- [ ] Player progression
- [ ] Achievement unlocks
- [ ] Multiplayer sync
- [ ] Performance stable
- [ ] No errors in console

---

## 📞 Support

**Issues?**
- Check GitHub issues: https://github.com/febuz/molgang-roblox/issues
- Create new issue with:
  - Error message
  - Steps to reproduce
  - Environment (OS, Node version, etc.)

**Contributing?**
- Create feature branch
- Make changes
- Run tests
- Submit PR
- Code review

---

## 🎉 Success Criteria (Today)

✅ **GitHub Synced**
- All code current (not 5 days behind)
- All commits pushed
- Repository reflects latest development

✅ **Virtual Server Running**
- Game server operational
- Web version accessible
- All services healthy
- No errors in logs

✅ **Ready for Production**
- Docker containers working
- Kubernetes manifests ready
- CI/CD pipeline functional
- Monitoring in place

---

**Target**: All objectives completed by end of today (2026-04-12)

**Next Steps After Setup:**
1. Monitor performance metrics
2. Gather player feedback
3. Deploy web version beta
4. Begin user acquisition
5. Expand to additional platforms

---

**Last Updated**: 2026-04-12  
**Status**: Setup instructions ready  
**Setup Duration**: 2-4 hours estimated  
**Next Review**: Post-setup (same day)
