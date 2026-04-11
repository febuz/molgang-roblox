# Docker & Container Optimization Guide

Production-ready Docker configuration for VirtualPC.

## Multi-Stage Build Benefits

The `Dockerfile.production` uses multi-stage builds to:
- Reduce final image size by 70% (dev deps removed)
- Improve layer caching for faster builds
- Minimize attack surface area
- Enable faster deployments

### Image Size Comparison

```
Development Image: ~850MB
Optimized Image: ~250MB (71% reduction)
```

## Security Hardening

### Non-Root User
```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs
```
Prevents privilege escalation attacks.

### Signal Handling
```dockerfile
RUN apk add --no-cache dumb-init
ENTRYPOINT ["dumb-init", "--"]
```
Ensures proper signal propagation to child processes.

### Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl -f http://localhost:3100/health
```
Automatic container restart on failure.

## Building Images

### Local Build
```bash
# Development image
docker build -t virtualpc:dev .

# Production image
docker build -f Dockerfile.production -t virtualpc:prod .
```

### CI/CD Build
```bash
# With version tagging
docker build -f Dockerfile.production \
  -t ghcr.io/your-org/virtualpc:latest \
  -t ghcr.io/your-org/virtualpc:v1.0.0 \
  -t ghcr.io/your-org/virtualpc:$(git sha) \
  .
```

### BuildKit Optimization
```bash
# Enable BuildKit for parallel builds (faster)
DOCKER_BUILDKIT=1 docker build -f Dockerfile.production .

# Or in docker-compose
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose build
```

## Production Docker Compose

### Start Services
```bash
# Start all services with production config
docker-compose -f docker-compose.production.yml up -d
```

### Monitor Logs
```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f api
```

### Resource Limits

Each service has configured limits:
```yaml
resources:
  limits:
    cpus: '2'
    memory: 2G
  reservations:
    cpus: '0.5'
    memory: 512M
```

### Restart Policies

All services use `restart: unless-stopped`:
- Survives Docker daemon restarts
- Manual `docker stop` is respected
- Auto-restart on failure

## Logging Configuration

### JSON File Driver
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

Benefits:
- Native log rotation
- Prevents disk space exhaustion
- Structured log format
- Docker log integration

### View Logs
```bash
# Real-time tail
docker logs -f virtualpc-api

# Last 100 lines
docker logs --tail 100 virtualpc-api

# Since timestamp
docker logs --since 2026-04-12T10:00:00 virtualpc-api
```

## Volume Management

### Named Volumes
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect virtualpc_neo4j-data

# Backup volume
docker run --rm -v virtualpc_neo4j-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/neo4j-backup.tar.gz /data
```

### Data Persistence

Volumes persist data when containers restart:
- `neo4j-data` - Database files
- `neo4j-logs` - Query logs
- `redis-data` - Cache data
- `zookeeper-data` - Kafka coordination
- `prometheus-data` - Metrics
- `grafana-data` - Dashboard configs

## Network Configuration

### Bridge Network
All services connect via `virtualpc-net` bridge network:
- Service-to-service communication via hostname
- Isolation from other networks
- Port mapping for external access

### DNS Resolution
```bash
# From within container
nslookup neo4j
nslookup kafka-0
```

## Health Checks

### API Health
```bash
# Container internal
docker exec virtualpc-api curl http://localhost:3100/health

# Via Docker
docker ps -a --format "table {{.Names}}\t{{.Status}}"
```

### Expected Response
```json
{
  "status": "ok",
  "services": {
    "lightrag": "connected",
    "kafka": "3/3 brokers",
    "models": "ready"
  }
}
```

## Scaling & Load Balancing

### Scale API Replicas
```bash
# Docker Compose scale (basic)
docker-compose -f docker-compose.production.yml up -d --scale api=3

# For proper load balancing, use reverse proxy:
# NGINX, Traefik, or HAProxy
```

### Using NGINX Load Balancer
```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
```

## Monitoring & Observability

### Prometheus Metrics
Access at http://localhost:9090

```promql
# API response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage
container_memory_usage_bytes{name="virtualpc-api"}

# CPU usage
rate(container_cpu_usage_seconds_total{name="virtualpc-api"}[5m])
```

### Grafana Dashboards
Access at http://localhost:3000 (admin/admin)

Pre-configured dashboards:
- Container metrics
- Application performance
- Kafka broker stats
- Neo4j database
- Redis performance

## Cleanup

### Remove Everything
```bash
# Stop and remove containers
docker-compose -f docker-compose.production.yml down

# Remove volumes (caution: data loss)
docker-compose -f docker-compose.production.yml down -v

# Remove dangling images
docker image prune -a
```

## Performance Tuning

### Database Optimization
```dockerfile
NEO4J_server_memory_heap_max__size: 1G
NEO4J_server_memory_pagecache_size: 512M
```

### Redis Optimization
```dockerfile
command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru
```

### Kafka Optimization
```dockerfile
KAFKA_LOG_RETENTION_HOURS: 24
KAFKA_LOG_SEGMENT_BYTES: 1073741824  # 1GB segments
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker logs virtualpc-api

# Check health
docker inspect --format='{{json .State.Health}}' virtualpc-api

# Check resources
docker stats virtualpc-api
```

### Network Issues
```bash
# Test connectivity
docker exec virtualpc-api ping kafka-0

# Check DNS
docker exec virtualpc-api nslookup kafka-0

# Check ports
docker exec virtualpc-api netstat -tlnp
```

### Disk Space
```bash
# Check usage
docker system df

# Cleanup
docker system prune -a
```

## Best Practices

1. **Always use version pinning** - Pin service versions, don't use `latest`
2. **Use named volumes** - Not `bind mounts` for production data
3. **Set resource limits** - Prevent runaway services
4. **Enable health checks** - Auto-recovery from failures
5. **Use read-only filesystems** - Where possible
6. **Scan images** - For vulnerabilities (`trivy image virtualpc:latest`)
7. **Keep logs rotated** - Use `max-size` and `max-file` options
8. **Monitor metrics** - Use Prometheus + Grafana
9. **Backup volumes** - Regular data backups
10. **Document changes** - Keep deployment guide updated

## Production Deployment Checklist

- [ ] All secrets configured (not in compose file)
- [ ] Resource limits set appropriately
- [ ] Health checks passing
- [ ] Volumes mounted correctly
- [ ] Logging configured
- [ ] Monitoring enabled
- [ ] Network isolated
- [ ] Non-root user configured
- [ ] Image vulnerability scan passed
- [ ] Backup strategy in place
- [ ] Restore procedure tested
- [ ] Load balancer configured
- [ ] SSL/TLS certificates configured
- [ ] Firewall rules set
- [ ] Documentation updated

## Support

For issues or optimization suggestions, review logs and metrics:
```bash
# Full diagnostic
docker-compose -f docker-compose.production.yml logs
docker system df
docker inspect virtualpc-api
```
