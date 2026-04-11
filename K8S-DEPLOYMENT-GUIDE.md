# VirtualPC Kubernetes Deployment Guide

Complete guide for deploying VirtualPC to production Kubernetes clusters.

## Prerequisites

- Kubernetes 1.24+ cluster
- kubectl configured with cluster access
- Helm 3.x (optional but recommended)
- Storage class configured (e.g., fast-ssd)
- Ingress controller (NGINX recommended)
- Cert-manager for TLS

## Quick Start

### 1. Create Namespace & Secrets

```bash
# Create production namespace
kubectl create namespace virtualpc-prod

# Create secrets (use sealed-secrets in production)
kubectl create secret generic virtualpc-secrets \
  --from-literal=JWT_SECRET=your-secret-key \
  --from-literal=NEO4J_PASSWORD=your-password \
  --from-literal=REDIS_PASSWORD=your-password \
  --from-literal=DATABASE_URL=postgresql://user:pass@postgres/virtualpc \
  -n virtualpc-prod
```

### 2. Deploy Manifest

```bash
# Apply the production manifest
kubectl apply -f k8s-production-manifest.yaml

# Verify deployment
kubectl rollout status deployment/virtualpc-api -n virtualpc-prod
kubectl get pods -n virtualpc-prod
```

### 3. Verify Services

```bash
# Check service endpoints
kubectl get svc -n virtualpc-prod

# Port-forward for local testing
kubectl port-forward svc/virtualpc-api 3100:80 -n virtualpc-prod

# Test API
curl http://localhost:3100/health
```

## Configuration

### Environment Variables

Edit the ConfigMap in the manifest:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  namespace: virtualpc-prod
  name: virtualpc-config
data:
  LOG_LEVEL: "info"           # debug, info, warn, error
  CACHE_TTL: "3600"           # Cache timeout in seconds
  RATE_LIMIT: "1000"          # Requests per second
```

### Resource Limits

Adjust based on your cluster capacity:

```yaml
resources:
  requests:
    cpu: 500m        # Minimum CPU
    memory: 512Mi    # Minimum memory
  limits:
    cpu: 2000m       # Maximum CPU
    memory: 2Gi      # Maximum memory
```

### Auto-Scaling

HPA scales from 3 to 50 replicas based on:
- CPU utilization > 70%
- Memory utilization > 80%

Customize thresholds in HPA spec.

## Networking

### Ingress Setup

```bash
# Install NGINX Ingress Controller (if not present)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx

# Install Cert-Manager for automatic TLS
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Network Policies

The manifest includes restrictive network policies:
- Ingress only from NGINX controller
- Egress to Kafka, Neo4j, Redis only
- DNS access for external lookups

### Load Balancing

Service type: LoadBalancer
- Supports sticky sessions
- Rate limiting per IP
- Auto-scales with HPA

## Monitoring & Observability

### Prometheus Metrics

Metrics exposed on port 9090 (/metrics)

```bash
# Deploy Prometheus (using Helm)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack
```

### Logs

Logs output to stdout/stderr, collected by:
- Kubernetes log aggregation
- Fluentd/Logstash
- ELK Stack or Datadog

Access logs:

```bash
kubectl logs deployment/virtualpc-api -n virtualpc-prod -f
```

### Health Checks

Liveness probe: `/health` - restarts unhealthy pods
Readiness probe: `/ready` - removes from load balancer if not ready

## Deployment Strategies

### Rolling Update (Default)

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1              # 1 extra pod
    maxUnavailable: 0        # 0 pods unavailable
```

Zero-downtime deployments with gradual rollout.

### Blue-Green Deployment

Deploy new version alongside old:

```bash
# Deploy new version as "virtualpc-api-green"
# Switch ingress to point to green
# Keep blue for quick rollback
```

### Canary Deployment

Use Flagger or Argo Rollouts:

```bash
# Deploy 10% traffic to new version
# Monitor metrics
# Gradually increase to 100%
```

## Backup & Recovery

### Database Backup

```bash
# Backup Neo4j
kubectl exec neo4j-pod -n virtualpc-prod -- \
  neo4j-admin dump --database=neo4j --to=/data/backup.dump

# Restore
kubectl exec neo4j-pod -n virtualpc-prod -- \
  neo4j-admin load --from=/data/backup.dump --database=neo4j --force
```

### PVC Snapshots

```bash
# Create snapshot
kubectl apply -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: virtualpc-snapshot
  namespace: virtualpc-prod
spec:
  volumeSnapshotClassName: csi-snapshotter
  source:
    persistentVolumeClaimName: virtualpc-data-pvc
EOF
```

## Scaling

### Manual Scaling

```bash
# Scale to 10 replicas
kubectl scale deployment virtualpc-api --replicas=10 -n virtualpc-prod
```

### Automatic Scaling

HPA automatically manages replicas between 3-50 based on metrics.

Monitor HPA status:

```bash
kubectl get hpa -n virtualpc-prod -w
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n virtualpc-prod

# Check logs
kubectl logs <pod-name> -n virtualpc-prod

# Check events
kubectl get events -n virtualpc-prod
```

### Service Not Reachable

```bash
# Check service
kubectl get svc virtualpc-api -n virtualpc-prod

# Check endpoints
kubectl get endpoints virtualpc-api -n virtualpc-prod

# Check network policies
kubectl get networkpolicy -n virtualpc-prod
```

### High Resource Usage

```bash
# Check resource metrics
kubectl top nodes
kubectl top pods -n virtualpc-prod

# Check HPA status
kubectl describe hpa virtualpc-api-hpa -n virtualpc-prod
```

## Security Best Practices

1. **Secrets Management**
   - Use sealed-secrets or external-secrets operator
   - Never commit secrets to git
   - Rotate regularly

2. **Network Policies**
   - Restrict ingress/egress traffic
   - Use pod selectors for fine-grained control
   - Default-deny with explicit allows

3. **RBAC**
   - Minimal permissions for service accounts
   - Use roles instead of cluster-roles where possible
   - Audit role usage regularly

4. **Pod Security**
   - Run as non-root user
   - Use read-only filesystem where possible
   - Scan images for vulnerabilities

5. **Network Security**
   - TLS for all connections
   - Rate limiting on ingress
   - DDoS protection (optional)

## Production Checklist

- [ ] All secrets configured
- [ ] Storage class configured
- [ ] Ingress controller installed
- [ ] Cert-manager configured
- [ ] Resource limits set
- [ ] HPA configured
- [ ] Network policies applied
- [ ] Monitoring/logging configured
- [ ] Backups configured
- [ ] Disaster recovery tested
- [ ] Security scan completed
- [ ] Load testing passed
- [ ] Documentation updated

## Support

For issues or questions:
- Check logs: `kubectl logs <pod-name> -n virtualpc-prod`
- Check events: `kubectl describe pod <pod-name> -n virtualpc-prod`
- Review manifest: `kubectl get deployment virtualpc-api -o yaml -n virtualpc-prod`
