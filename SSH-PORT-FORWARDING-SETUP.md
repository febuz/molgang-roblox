# SSH Port Forwarding Setup Guide

**Purpose**: Access VirtualPC dashboard (http://localhost:3100) remotely via SSH tunneling

---

## Quick Start

### On Your Local Machine

```bash
# Forward local 3100 → remote 3100 (VirtualPC dashboard)
ssh -L 3100:localhost:3100 knight2@your-server-ip -N

# Then open: http://localhost:3100 in browser
```

---

## Full Setup (macOS/Linux)

### Step 1: Verify Remote Server Setup

On the server where VirtualPC runs:

```bash
# Check VirtualPC is running on port 3100
curl http://localhost:3100/api/dashboard | jq '.overview'

# Should show: { "total_tasks": X, "completed": Y, ...}
```

### Step 2: Create SSH Tunnel (Method 1: Manual)

```bash
# One-time tunnel (runs in foreground)
ssh -L 3100:localhost:3100 knight2@your-server-ip -N

# Or in background (add &)
ssh -L 3100:localhost:3100 knight2@your-server-ip -N &
```

### Step 3: Create SSH Tunnel (Method 2: Config)

Create/edit `~/.ssh/config`:

```
Host virtualpc-tunnel
    HostName your-server-ip
    User knight2
    LocalForward 3100 localhost:3100
    ServerAliveInterval 60
    ServerAliveCountMax 10
    ControlMaster auto
    ControlPath ~/.ssh/cm_socket_%h_%p_%r
    ControlPersist yes
```

Then connect with:

```bash
ssh virtualpc-tunnel -N
# Opens tunnel, stays open
# Ctrl+C to close
```

### Step 4: Test Access

```bash
# In another terminal
curl http://localhost:3100/api/dashboard | jq '.'

# Should return dashboard data
```

### Step 5: Access in Browser

Open: **http://localhost:3100**

Login with:
- Username: `ceo`
- Password: `ceo123`

(Or use other accounts: kai, zip, mira, luna)

---

## Advanced Setup (Linux Server - Persistent)

### Option A: systemd Service (Recommended)

Create `/etc/systemd/user/ssh-tunnel-virtualpc.service`:

```ini
[Unit]
Description=SSH Tunnel to VirtualPC
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/ssh -N -L 3100:localhost:3100 knight2@localhost
ExecStop=/bin/kill $MAINPID
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

Enable and start:

```bash
systemctl --user enable ssh-tunnel-virtualpc.service
systemctl --user start ssh-tunnel-virtualpc.service
systemctl --user status ssh-tunnel-virtualpc.service
```

Check logs:

```bash
systemctl --user logs -f ssh-tunnel-virtualpc.service
```

### Option B: tmux Session (Lightweight)

```bash
# Start named tmux session
tmux new-session -d -s ssh-tunnel "ssh -L 3100:localhost:3100 knight2@your-server-ip -N"

# List sessions
tmux list-sessions

# Attach to session
tmux attach-session -t ssh-tunnel

# Detach (Ctrl+B, then D)

# Kill session
tmux kill-session -t ssh-tunnel
```

### Option C: screen Session

```bash
# Start named screen session
screen -dmS ssh-tunnel ssh -L 3100:localhost:3100 knight2@your-server-ip -N

# List sessions
screen -ls

# Attach to session
screen -r ssh-tunnel

# Detach (Ctrl+A, then D)

# Kill session
screen -XS ssh-tunnel quit
```

---

## Router Configuration (For External Access)

**If accessing from outside your home network:**

### Step 1: Port Forward on Your Router

In router admin (usually 192.168.1.1 or 192.168.0.1):

1. Go to Port Forwarding
2. External Port: `22` (or custom SSH port)
3. Internal IP: Your server's local IP (e.g., 192.168.1.100)
4. Internal Port: `22`
5. Protocol: TCP
6. Save and reboot router

### Step 2: Find Your External IP

```bash
# Check your public IP
curl https://ifconfig.me

# Or
dig +short myip.opendns.com @resolver1.opendns.com
```

### Step 3: Connect Remotely

```bash
# From outside your network
ssh -L 3100:localhost:3100 knight2@YOUR-EXTERNAL-IP -N

# Then access http://localhost:3100
```

---

## Windows Setup (PuTTY)

### Step 1: Download PuTTY

https://www.putty.org/

### Step 2: Configure Tunnel

1. Open PuTTY
2. Session → Host Name: `knight2@your-server-ip`
3. Go to: SSH → Tunnels
4. Source port: `3100`
5. Destination: `localhost:3100`
6. Click "Add"
7. Session → Save session as "virtualpc-tunnel"
8. Click "Open"

### Step 3: Authenticate

Login with SSH key or password

### Step 4: Leave Terminal Open

Keep PuTTY window open while accessing http://localhost:3100

---

## Troubleshooting

### Connection Refused

```bash
# Check if VirtualPC is actually running on server
ssh knight2@your-server-ip
curl http://localhost:3100/api/dashboard

# If not running, start it:
cd /home/knight2/virtualpc
npm run build && npm start
```

### Cannot Connect to localhost:3100

```bash
# Check if tunnel is active
lsof -i :3100

# Should show: ssh listening on 3100
```

### Permission Denied (Public Key)

```bash
# Add your public key to server
cat ~/.ssh/id_rsa.pub | ssh knight2@your-server-ip "cat >> ~/.ssh/authorized_keys"

# Set permissions
ssh knight2@your-server-ip "chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

### Slow Connection

```bash
# Test with compression
ssh -C -L 3100:localhost:3100 knight2@your-server-ip -N
```

---

## Security Best Practices

1. **Use SSH Keys, Not Passwords**
   ```bash
   ssh-keygen -t ed25519
   # Add public key to server ~/.ssh/authorized_keys
   ```

2. **Change SSH Default Port**
   ```bash
   # Edit /etc/ssh/sshd_config on server
   Port 2222  # Instead of 22
   systemctl restart sshd
   ```

3. **Disable Root Login**
   ```bash
   # Edit /etc/ssh/sshd_config
   PermitRootLogin no
   ```

4. **Use Fail2Ban** (prevent brute force)
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   ```

5. **Monitor Login Attempts**
   ```bash
   # Check who's logged in
   who
   # View SSH logs
   tail -f /var/log/auth.log
   ```

---

## Multi-Machine Setup

**Forward multiple ports for different services:**

```bash
ssh -L 3100:localhost:3100 \
    -L 8080:localhost:8080 \
    -L 5432:localhost:5432 \
    knight2@your-server-ip -N
```

Maps:
- Local 3100 → Remote 3100 (VirtualPC)
- Local 8080 → Remote 8080 (Other service)
- Local 5432 → Remote 5432 (PostgreSQL)

---

## Reverse Tunnel (Share Local Service Remotely)

**If you want to expose local machine to a remote server:**

```bash
# From local machine
ssh -R 3100:localhost:3100 knight2@your-server-ip -N

# Then on server, access via localhost:3100
```

---

## Monitoring Active Tunnels

```bash
# List all SSH tunnels
ps aux | grep "ssh -L"

# Monitor specific tunnel
watch -n1 'lsof -i :3100'
```

---

## Access VirtualPC Securely

Once tunnel is active, visit:

**http://localhost:3100**

### Login Credentials (Demo):

| Username | Password | Role |
|----------|----------|------|
| ceo | ceo123 | CEO |
| kai | kai123 | CTO |
| zip | zip123 | Developer |
| mira | mira123 | Artist |
| luna | luna123 | Tech Artist |

### Demo Features:

- 📊 Dashboard: System overview, agent status, cost analysis
- 📑 Tasks: Task scheduling, agent workload, efficiency
- 📋 Backlog: 10 priority-weighted items
- ⚠️ Issues: Active issues with blockers
- 🔢 Numerai: Competition data, eligible shares, data quality
- 🧠 Memory: Neo4j knowledge base
- ⚙️ Settings: System health, infrastructure status

---

## Troubleshooting Connection Issues

### SSH Tunnel Closes Unexpectedly

```bash
# Add keep-alive to ~/.ssh/config
ServerAliveInterval 60
ServerAliveCountMax 10
```

### "Bind to port 3100 failed: Can't assign requested address"

Port already in use:
```bash
# Find what's using port 3100
lsof -i :3100
# Kill it or use different port:
ssh -L 3001:localhost:3100 knight2@your-server-ip -N
# Then access http://localhost:3001
```

### "Could not resolve hostname"

```bash
# Check if server is reachable
ping your-server-ip
# Or
ssh knight2@your-server-ip "echo connected"
```

---

## One-Liner Cheatsheet

```bash
# Quick tunnel
ssh -L 3100:localhost:3100 knight2@your-server-ip -N

# With custom port
ssh -L 3001:localhost:3100 knight2@your-server-ip -N

# Tunnel in background
ssh -L 3100:localhost:3100 knight2@your-server-ip -N &

# With compression
ssh -C -L 3100:localhost:3100 knight2@your-server-ip -N

# Via bastion host (jump server)
ssh -L 3100:localhost:3100 user@bastion -J jumphost -N

# Kill all SSH tunnels
pkill -f "ssh -L"
```

---

## Next Steps

1. ✅ SSH tunnel active
2. ✅ VirtualPC dashboard accessible at http://localhost:3100
3. ✅ Login with demo account
4. 📝 Explore dashboard features
5. 📝 Create production users (in CEO dashboard)
6. 📝 Configure 2FA (coming in future update)

---

**Status**: ✅ Ready for remote access
**Security**: Demo passwords - change before production
**Monitoring**: Check `/api/audit/*` endpoints for access logs
