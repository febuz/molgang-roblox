# Ollama + Local Model Setup Guide

Run open source models on your 2x 3090 GPUs to avoid Claude API limits.

---

## System Requirements

✅ **Your Hardware**:
- 2x NVIDIA RTX 3090 (24GB VRAM each = 48GB total)
- CUDA 11.8+ or 12.x
- 32GB+ RAM
- 100GB+ SSD for models

**Supported Models**:
- **Qwen 27B** - Best general purpose (18GB VRAM, full GPU offload)
- **Qwen 14B** - Fast reasoning (11GB VRAM, full GPU offload)
- **Qwen 7B** - Quick responses (5GB VRAM, full GPU offload)
- **DeepSeek R1 8B** - Logic/reasoning (5GB VRAM)
- **Phi 4 15B** - Creative tasks (10GB VRAM)
- **Mistral 7B** - Code/technical (5GB VRAM)
- **Llama 70B** - Complex tasks (45GB VRAM, both GPUs needed)

---

## Installation (Linux/macOS)

### Step 1: Install Ollama

```bash
# Linux
curl https://ollama.ai/install.sh | sh

# macOS
brew install ollama

# Windows (WSL2 with CUDA)
# Download from https://ollama.ai/download
```

### Step 2: Configure NVIDIA CUDA (Linux)

```bash
# Install NVIDIA Container Toolkit (if not already installed)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker
```

### Step 3: Start Ollama Service

```bash
# Option 1: Run in foreground (for testing)
ollama serve

# Option 2: Run as systemd service (recommended)
sudo systemctl start ollama
sudo systemctl enable ollama

# Check status
sudo systemctl status ollama

# View logs
journalctl -u ollama -f
```

### Step 4: Verify GPU Detection

```bash
# Check if CUDA is detected
nvidia-smi

# Verify Ollama sees GPUs
curl http://localhost:11434/api/tags
# Should return available models

# Test inference
ollama run qwen:7b "Hello, what is 2+2?"
```

---

## Pulling Models to Local System

Run once to download models (~5-40GB each):

```bash
# Download Qwen 27B (18GB) - RECOMMENDED for CPU planning
ollama pull qwen:27b

# Download Qwen 14B (11GB) - Good balance
ollama pull qwen:14b

# Download Qwen 7B (5GB) - Fast
ollama pull qwen:7b

# Download DeepSeek R1 8B (5GB) - Logic/reasoning
ollama pull deepseek-r1:8b

# Download Phi 4 15B (10GB) - Creative
ollama pull phi:latest

# Download Mistral 7B (5GB) - Code
ollama pull mistral:latest

# Download Llama 70B (45GB) - Complex reasoning
# ollama pull llama2:70b  # Only if you have both 3090s available
```

**Disk Space Usage**:
- Qwen 27B + 14B + 7B + DeepSeek: ~40GB
- Qwen 27B + 14B + Phi + Mistral: ~45GB
- All models: ~80GB

**GPU VRAM Usage** (with full offload):
- Qwen 27B: 18GB (one 3090)
- Qwen 14B: 11GB (one 3090)
- Phi 4 15B: 10GB (one 3090)
- Llama 70B: 45GB (both 3090s)

---

## Configuration Files

Create `/etc/ollama/.modelrc` for custom settings:

```bash
# GPU Configuration for 2x 3090s
export OLLAMA_NUM_GPU=2      # Use both GPUs
export OLLAMA_MAX_LOADED_MODELS=2  # Keep 2 models in VRAM
export OLLAMA_DEBUG=0        # Set to 1 for debug logs
export OLLAMA_HOST=0.0.0.0:11434  # Listen on all interfaces
```

---

## Integration with VirtualPC

### Step 1: Update Environment Variables

Add to your `.env` file:

```bash
# Ollama configuration
OLLAMA_ENABLED=true
OLLAMA_HOST=http://localhost:11434
OLLAMA_TIMEOUT=120000

# Agent model preferences (IMPORTANT: set these!)
AGENT_MODEL_FILL=qwen-27b      # CEO: best model
AGENT_MODEL_KAI=qwen-27b       # CTO: best local
AGENT_MODEL_ZIP=qwen-14b       # Developer: balanced
AGENT_MODEL_MIRA=phi-4-15b     # Artist: creative
AGENT_MODEL_LUNA=deepseek-r1-8b # Tech Artist: reasoning
```

### Step 2: API Endpoints for Model Management

**Get Ollama Status**
```bash
curl http://localhost:3100/api/models/ollama/status
```

Response:
```json
{
  "health": "operational",
  "models_available": ["qwen:27b", "qwen:14b", "phi:latest"],
  "gpu_memory": "24GB used / 48GB total"
}
```

**Execute with Unified Executor**
```bash
curl -X POST http://localhost:3100/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "zip",
    "task": "Implement user authentication",
    "prefer_local": true,
    "fallback_to_claude": true
  }'
```

Response:
```json
{
  "response": "I'll implement...",
  "model": "qwen-14b",
  "provider": "local",
  "latency_ms": 2340,
  "cost": 0,
  "tokens": { "prompt": 45, "completion": 267, "total": 312 },
  "fallback": false
}
```

**Get Model Statistics**
```bash
curl http://localhost:3100/api/models/stats
```

Response:
```json
{
  "qwen-27b": {
    "calls": 45,
    "fallbacks": 0,
    "avg_latency_ms": 2150,
    "total_cost": 0
  },
  "qwen-14b": {
    "calls": 123,
    "fallbacks": 2,
    "avg_latency_ms": 1800,
    "total_cost": 0
  }
}
```

**Set Agent Model Preferences**
```bash
curl -X POST http://localhost:3100/api/models/agent-preferences \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "zip",
    "models": ["qwen-14b", "qwen-7b", "claude-sonnet"]
  }'
```

---

## Performance Tuning for 3090 GPUs

### Optimize for Your Hardware

```bash
# Maximum VRAM usage (both GPUs)
export OLLAMA_NUM_GPU=2
export OLLAMA_KEEP_ALIVE=5m  # Keep models loaded for 5 min

# For single GPU at a time
export OLLAMA_NUM_GPU=1
export OLLAMA_MAX_LOADED_MODELS=3  # Load up to 3 models
```

### Model Selection for Different GPUs

**If you only want to use 1 GPU at a time**:
- Qwen 27B: 18GB (fits in one 3090)
- Qwen 14B + Phi 4: ~21GB (fits in one 3090)
- Qwen 7B + Mistral + Phi: ~20GB (fits in one 3090)

**If you have both 3090s working together**:
- Qwen 27B on GPU 0 (18GB)
- Qwen 14B on GPU 1 (11GB)
- Total: 29GB on 48GB

**For maximum capability**:
- Llama 70B across both GPUs (45GB total)

---

## Cost Analysis

### Monthly Cost Comparison

**With Local Models Only** (2x 3090 electricity):
- Ollama inference: ~$2-5/month (GPU electricity)
- Claude API: $0
- **Total: $2-5/month** ✅

**With Claude API Only**:
- 100 API calls × 1000 tokens × $0.000015: ~$1.50/month
- 1000 API calls: ~$15/month
- 10000 API calls: ~$150/month
- **Total: $15-150+/month** ❌

**Hybrid (Recommended)**:
- 90% local (Qwen): $2-5/month
- 10% Claude (complex): ~$1-5/month
- **Total: $3-10/month** ✅✅

---

## Monitoring & Troubleshooting

### Check Ollama Logs

```bash
# Linux/macOS
journalctl -u ollama -f
tail -f ~/.ollama/logs/server.log

# Windows/WSL2
Get-Content $env:APPDATA\ollama\logs\server.log -Tail 50 -Wait
```

### Memory Issues

```bash
# If models unload too quickly
export OLLAMA_KEEP_ALIVE=10m

# Monitor GPU memory
nvidia-smi -l 1  # Update every 1 second

# List loaded models
curl http://localhost:11434/api/tags | jq '.models[].name'
```

### GPU Not Being Used

```bash
# Verify GPU is detected
ollama list
# Should show "GPU: NVIDIA"

# Force GPU usage
export CUDA_VISIBLE_DEVICES=0,1  # Use both GPUs

# Restart Ollama
sudo systemctl restart ollama

# Verify
curl http://localhost:11434/api/tags
```

### Model Inference is Slow

```bash
# Check if model is in VRAM
nvidia-smi  # Should show model.bin process

# If not, model is on CPU (slow). Options:
# 1. Load smaller model
# 2. Increase OLLAMA_NUM_GPU
# 3. Decrease OLLAMA_MAX_LOADED_MODELS
```

---

## Model Recommendations by Task

| Agent | Primary | Secondary | Fallback |
|-------|---------|-----------|----------|
| Fill (CEO) | Qwen 27B | Qwen 14B | Claude Opus |
| Kai (CTO) | Qwen 27B | DeepSeek R1 8B | Claude Opus |
| Zip (Dev) | Qwen 14B | Phi 4 15B | Claude Sonnet |
| Mira (Artist) | Phi 4 15B | Qwen 14B | Claude Opus |
| Luna (Tech Artist) | DeepSeek R1 8B | Qwen 14B | Claude Sonnet |

---

## Quick Start Commands

```bash
# Start fresh
sudo systemctl restart ollama

# Pull recommended models
ollama pull qwen:27b
ollama pull qwen:14b
ollama pull deepseek-r1:8b
ollama pull phi:latest

# Test an inference
ollama run qwen:27b "You are a CEO. Plan a system architecture."

# Check status in VirtualPC
curl http://localhost:3100/api/models/ollama/status | jq '.'

# See which models are being used
curl http://localhost:3100/api/models/stats | jq '.'

# Check GPU usage
nvidia-smi
```

---

## Next Steps

1. ✅ Install Ollama
2. ✅ Download Qwen models (start with 7B + 27B)
3. ✅ Update `.env` with `OLLAMA_ENABLED=true`
4. ✅ Restart VirtualPC
5. ✅ Verify with: `curl http://localhost:3100/api/models/ollama/status`
6. ✅ See agents automatically use local models!

---

## Expected Results After Setup

- ✅ Agents use Qwen models by default (free, local)
- ✅ Falls back to Claude if local inference fails
- ✅ 90%+ cost reduction vs Claude-only
- ✅ < 3 second inference time on 3090
- ✅ Unlimited local inference (no API limits)
- ✅ Full GPU utilization on both 3090s

Your VirtualPC system is now **completely autonomous** without relying on expensive Claude API calls!
