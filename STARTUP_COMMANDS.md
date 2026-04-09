# VirtualPC - Startup Commands

Run these commands in your terminal to launch the full system:

## Option 1: Automatic Setup (Recommended)
```bash
sudo usermod -aG docker knight2 && newgrp docker && docker-compose up -d && ./start.sh
```

## Option 2: Step-by-Step

### Step 1: Fix Docker permissions
```bash
sudo usermod -aG docker knight2
newgrp docker
```

### Step 2: Start infrastructure
```bash
cd /home/knight2/virtualpc
docker-compose up -d
```

### Step 3: Start API server
```bash
./start.sh
```

### Step 4: Verify everything
```bash
./health-check.sh
```

## Option 3: Just Start API (without Docker infrastructure)
If you don't have Docker permissions yet, you can start just the API server:
```bash
cd /home/knight2/virtualpc
npm run build
node dist/index.js
```

## What Each Component Does

- **docker-compose up -d** → Starts Neo4j, Kafka, Zookeeper, Redis
- **./start.sh** → Starts the VirtualPC API server on port 3100
- **health-check.sh** → Verifies all services are running

## Access Points

Once running:
- Dashboard: http://localhost:3100
- Neo4j: http://localhost:7474
- Check health: curl http://localhost:3100/health

## Stop the System

```bash
./stop.sh
docker-compose down
```
