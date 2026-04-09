# VirtualPC GPU-Ready Distributed Deployment Guide

Complete guide for deploying VirtualPC with GPU acceleration, multi-instance orchestration, and automatic scaling.

---

## 🖥️ GPU Requirements

### Hardware

**Minimum Setup:**
- 1x NVIDIA GPU (2GB+ VRAM) - supports local inference
- 8GB system RAM
- 100GB storage

**Recommended Setup:**
- 3x NVIDIA GPUs (4GB+ VRAM each) - parallel processing
- 32GB+ system RAM
- 500GB+ SSD storage

**Production Setup:**
- 8x NVIDIA GPUs in distributed cluster
- Kubernetes orchestration
- NFS shared storage
- 24/7 monitoring

### Software

- NVIDIA CUDA 12.2+
- NVIDIA cuDNN 8.5+
- Docker 20.10+
- docker-compose 2.0+
- NVIDIA Docker runtime

### Installation

```bash
# Install NVIDIA CUDA Toolkit
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-repo-ubuntu2204_12.2.0-1_amd64.deb
sudo dpkg -i cuda-repo-ubuntu2204_12.2.0-1_amd64.deb
sudo apt-get update
sudo apt-get install cuda-toolkit-12-2

# Install cuDNN
# Download from https://developer.nvidia.com/cudnn
sudo dpkg -i cudnn-local-repo-ubuntu2204-8.5.0.96_1.0-1_amd64.deb
sudo apt-get update
sudo apt-get install libcudnn8

# Install NVIDIA Docker
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker
```

### Verify Installation

```bash
# Check CUDA
nvidia-smi

# Test Docker GPU access
docker run --rm --gpus all nvidia/cuda:12.2.0-runtime-ubuntu22.04 nvidia-smi
```

---

## 🚀 Single-Machine GPU Deployment

### 1. Multi-Instance with GPU Assignment

```bash
# Start 3 API instances on separate GPUs
docker-compose -f docker-compose.gpu.yml up -d

# Verify GPU allocation
docker ps
docker exec virtualpc-api-1 nvidia-smi
docker exec virtualpc-api-2 nvidia-smi
docker exec virtualpc-api-3 nvidia-smi
```

### 2. Verify Load Balancing

```bash
# Make requests through Nginx
for i in {1..10}; do
  curl -H "Authorization: Bearer $TOKEN" http://localhost/api/health
  echo "Request $i completed"
done

# Check which instance handled each request
tail -f logs/virtualpc.log | grep "Request from"
```

### 3. Monitor GPU Usage

```bash
# Real-time GPU monitoring
watch nvidia-smi

# Or from docker
docker exec virtualpc-api-1 watch -n 1 nvidia-smi
```

### 4. Performance Tuning

```yaml
# In docker-compose.gpu.yml for each instance
environment:
  CUDA_VISIBLE_DEVICES: "0"  # Assign specific GPU
  GPU_MEMORY_FRACTION: 0.8   # Use 80% of GPU memory
  TF_FORCE_GPU_ALLOW_GROWTH: "true"  # Dynamic allocation
```

---

## ☸️ Kubernetes GPU Deployment (Production)

### 1. Prerequisites

```bash
# Install Kubernetes (kubeadm, kubelet, kubectl)
curl -fsSLo get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh

# Install NVIDIA GPU Operator
helm repo add nvidia https://nvidia.github.io/gpu-operator
helm repo update
helm install gpu-operator nvidia/gpu-operator --namespace gpu-operator-system --create-namespace
```

### 2. Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace virtualpc

# Deploy all services
kubectl apply -f k8s-deployment.yaml

# Verify deployment
kubectl get pods -n virtualpc
kubectl get svc -n virtualpc
kubectl describe node  # Check GPU resources
```

### 3. Build and Push Image

```bash
# Build GPU-enabled image
docker build -f Dockerfile.gpu -t your-registry/virtualpc:gpu-latest .

# Push to registry
docker push your-registry/virtualpc:gpu-latest

# Update k8s-deployment.yaml with new image
sed -i 's|image: virtualpc:latest|image: your-registry/virtualpc:gpu-latest|g' k8s-deployment.yaml
kubectl apply -f k8s-deployment.yaml
```

### 4. Monitor Kubernetes Deployment

```bash
# Check pod status
kubectl get pods -n virtualpc -w

# View logs from pod
kubectl logs -n virtualpc -l app=virtualpc-api --tail=100 -f

# Check GPU usage
kubectl top nodes
kubectl describe node <node-name> | grep -A 5 "gpu:"
```

### 5. Scale on GPU Availability

```bash
# Check GPU resources
kubectl get nodes -o json | jq '.items[] | {name: .metadata.name, gpus: .status.capacity."nvidia.com/gpu"}'

# Manual scaling
kubectl scale deployment virtualpc-api -n virtualpc --replicas=5

# Auto-scaling is configured in k8s-deployment.yaml
# Will scale from 3-10 replicas based on CPU/memory
```

---

## 📊 Performance Optimization

### GPU Memory Management

```typescript
// In src/index.ts
const gpuConfig = {
  cudaVisibleDevices: process.env.CUDA_VISIBLE_DEVICES || '0',
  gpuMemoryFraction: 0.8,  // Use 80% of GPU memory
  allowGrowth: true,        // Allocate dynamically
  maxMemoryAllocation: 4000 // MB per GPU
};
```

### Batch Processing on GPU

```typescript
// Leverage GPU for batch inference
const batch = [prompt1, prompt2, prompt3, ...]; // 32 prompts

// Process entire batch on GPU in parallel
const results = await modelRouter.batchInference(batch, 'claude-opus');
// Single GPU call instead of 32 sequential calls
```

### Pipeline Parallelization

```
GPU Instance 1: Processing batch 1 (32 prompts) → 2.5s
GPU Instance 2: Processing batch 2 (32 prompts) → 2.5s  (parallel)
GPU Instance 3: Processing batch 3 (32 prompts) → 2.5s  (parallel)
Result: 96 prompts processed in 2.5s instead of 7.5s
Speedup: 3x with 3 GPUs
```

---

## 🔍 Monitoring & Observability

### GPU Metrics in Prometheus

```bash
# View GPU metrics
curl http://localhost:9090/api/v1/query?query=nvidia_gpu_memory_used_mb

# Set up Grafana dashboard
1. Connect Prometheus (localhost:9090)
2. Import GPU dashboard: https://grafana.com/grafana/dashboards/7648
3. Monitor in real-time
```

### Key Metrics to Monitor

| Metric | Target | Alert |
|--------|--------|-------|
| GPU Memory Usage | <80% | >90% |
| GPU Utilization | >70% | <50% (idle) |
| Temp | <80°C | >85°C |
| Power | Varies | Monitor trend |
| Queue Depth | <50ms | >100ms |

### Health Check Script

```bash
#!/bin/bash
echo "=== GPU Health Check ==="
nvidia-smi

echo "=== API Instances ==="
for port in 3100 3101 3102; do
  curl -s http://localhost:$port/health | jq .
done

echo "=== System Load ==="
uptime
free -h
df -h

echo "=== Kafka Topics ==="
docker exec virtualpc-kafka kafka-topics.sh \
  --bootstrap-server localhost:9092 --list
```

---

## 🚨 Troubleshooting

### Issue: CUDA Out of Memory

```
Error: CUDA out of memory. Tried to allocate 4.00 GB

Solution:
1. Check GPU memory: nvidia-smi
2. Reduce batch size in docker-compose.gpu.yml
3. Reduce GPU memory fraction: GPU_MEMORY_FRACTION=0.6
4. Use mixed precision: TF_MIXED_PRECISION=float16
```

### Issue: GPU Not Detected in Docker

```
Error: No GPUs available

Solution:
1. Verify Docker GPU runtime:
   docker run --rm --gpus all nvidia/cuda:12.2.0-base nvidia-smi
   
2. Check /etc/docker/daemon.json:
   {
     "default-runtime": "nvidia",
     "runtimes": {
       "nvidia": {
         "path": "nvidia-container-runtime",
         "runtimeArgs": []
       }
     }
   }
   
3. Restart Docker: sudo systemctl restart docker
```

### Issue: Load Balancing Not Working

```bash
# Check Nginx upstream status
curl http://localhost/nginx_status

# Verify all instances are healthy
docker exec virtualpc-nginx curl http://api-1:3100/health
docker exec virtualpc-nginx curl http://api-2:3101/health
docker exec virtualpc-nginx curl http://api-3:3102/health

# Check Nginx logs
docker logs virtualpc-nginx
```

### Issue: Kubernetes GPU Not Allocating

```bash
# Check GPU operator status
kubectl get nodes -o json | jq '.items[].status.allocatable' | grep gpu

# Check GPU plugin
kubectl get daemonset -n gpu-operator-system

# Describe node for GPU resources
kubectl describe node <node-name> | grep -A 10 "Allocated resources"
```

---

## 📈 Scaling Strategies

### Horizontal Scaling (Add More Instances)

```yaml
# Scale from 3 to 6 instances
docker-compose -f docker-compose.gpu.yml up -d --scale api=6

# Or in Kubernetes
kubectl scale deployment virtualpc-api -n virtualpc --replicas=6
```

### Vertical Scaling (More GPUs per Instance)

```yaml
# Allocate 2 GPUs per instance
resources:
  reservations:
    devices:
      - driver: nvidia
        count: 2
        capabilities: [gpu]
```

### Adaptive Scaling

```bash
# Monitor and auto-scale based on queue depth
while true; do
  QUEUE_DEPTH=$(curl -s http://localhost:3100/api/queue/depth)
  if [ $QUEUE_DEPTH -gt 100 ]; then
    kubectl scale deployment virtualpc-api -n virtualpc --replicas=8
  elif [ $QUEUE_DEPTH -lt 10 ]; then
    kubectl scale deployment virtualpc-api -n virtualpc --replicas=3
  fi
  sleep 60
done
```

---

## 🔄 Rolling Updates with GPU

```bash
# Update without downtime (Kubernetes)
kubectl set image deployment/virtualpc-api \
  virtualpc-api=your-registry/virtualpc:gpu-v2 \
  -n virtualpc

# Monitor rollout
kubectl rollout status deployment/virtualpc-api -n virtualpc

# Rollback if needed
kubectl rollout undo deployment/virtualpc-api -n virtualpc
```

---

## 📋 Production Checklist

- [ ] Install NVIDIA CUDA and cuDNN
- [ ] Verify GPU detection with nvidia-smi
- [ ] Set up NVIDIA Docker runtime
- [ ] Build and test GPU container
- [ ] Configure GPU memory limits
- [ ] Set up multi-instance deployment
- [ ] Configure load balancer (Nginx/K8s)
- [ ] Set up Prometheus monitoring
- [ ] Create Grafana GPU dashboard
- [ ] Test failover scenarios
- [ ] Configure auto-scaling policies
- [ ] Set up alerting for GPU issues
- [ ] Document GPU allocation strategy
- [ ] Test disaster recovery
- [ ] Schedule GPU maintenance windows

---

## 📚 Resources

- [NVIDIA CUDA](https://developer.nvidia.com/cuda-toolkit)
- [NVIDIA Docker](https://github.com/NVIDIA/nvidia-docker)
- [Kubernetes GPU Support](https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/)
- [TensorFlow GPU Guide](https://www.tensorflow.org/install/gpu)
- [Prometheus GPU Exporter](https://github.com/NVIDIA/nvidia-docker/tree/master/samples/gpu-monitoring)

---

**GPU-Ready VirtualPC Production Deployment** ✅

All components configured for distributed GPU processing, automatic scaling, and 24/7 monitoring.
