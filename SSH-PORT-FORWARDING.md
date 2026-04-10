# SSH Port Forwarding Setup for VirtualPC

Guide to accessing VirtualPC remotely through SSH port forwarding.

## Overview

VirtualPC runs on `localhost:3100` and needs to be accessible through SSH for remote access and router port forwarding.

## Quick Setup (Development)

### Option 1: SSH Local Port Forwarding

Forward your local machine's port to VirtualPC:

```bash
# On your local machine
ssh -L 3100:localhost:3100 knight2@your-server-ip
```

Then access VirtualPC at: `http://localhost:3100`

### Option 2: SSH Remote Port Forwarding (Reverse)

If you're behind a NAT and want to expose your local VirtualPC:

```bash
# Forward remote server port 3100 back to your local machine
ssh -R 3100:localhost:3100 knight2@your-server-ip
```

Then access from anywhere: `http://your-server-ip:3100`

---

## Production Setup (Router Port Forwarding)

### Step 1: Find VirtualPC Server IP

```bash
# On the VirtualPC host machine
hostname -I
# Output: 192.168.1.100 (or your local network IP)
```

### Step 2: Configure Router Port Forwarding

1. Open router admin panel (usually `192.168.1.1` or `192.168.0.1`)
2. Login with router credentials
3. Navigate to: **Port Forwarding** (varies by router model)
4. Add new rule:
   - **External Port**: 3100
   - **Internal Port**: 3100
   - **Internal IP**: 192.168.1.100 (VirtualPC server IP)
   - **Protocol**: TCP
   - **Enable**: Yes

5. Save and reboot router

### Step 3: Access Remotely

```bash
# From anywhere on internet
curl http://your-public-ip:3100/health

# Or in browser
http://your-public-ip:3100
```

### Step 4: Configure Dynamic DNS (Optional)

If your ISP changes your public IP, use dynamic DNS:

```bash
# Get current public IP
curl ifconfig.me

# Set up dynamic DNS (optional - for permanent access)
# Services: Cloudflare, No-IP, Duck DNS
```

---

## SSH Keys Setup (Recommended)

### Generate SSH Key Pair

```bash
# On your local machine
ssh-keygen -t ed25519 -C "virtualpc-access"
# Save to: ~/.ssh/virtualpc_key
```

### Copy Public Key to Server

```bash
# On server
mkdir -p ~/.ssh
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... your-public-key-here
EOF

chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### Use Key in SSH Command

```bash
# On local machine
ssh -i ~/.ssh/virtualpc_key -L 3100:localhost:3100 knight2@your-server-ip
```

---

## Firewall Configuration

### UFW (Ubuntu/Debian)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow port 3100 (if not using port forwarding)
sudo ufw allow 3100/tcp

# Enable firewall
sudo ufw enable
```

### iptables (Manual Control)

```bash
# Allow port 3100
sudo iptables -A INPUT -p tcp --dport 3100 -j ACCEPT

# Save rules
sudo iptables-save > /etc/iptables/rules.v4
```

---

## Testing Port Forwarding

### From Local Network

```bash
# Test internal IP
curl http://192.168.1.100:3100/health

# Test localhost
curl http://localhost:3100/health
```

### From External Network

```bash
# Get public IP first
PUBLIC_IP=$(curl ifconfig.me)

# Test external access
curl http://$PUBLIC_IP:3100/health
```

### SSH Tunnel Test

```bash
# Start SSH tunnel in background
ssh -L 3100:localhost:3100 knight2@your-server-ip -N &

# Verify in new terminal
curl http://localhost:3100/health

# Kill tunnel
pkill -f "ssh -L 3100"
```

---

## Security Considerations

### ⚠️ Important

1. **Enable Authentication**: Add JWT tokens for remote access
2. **Use HTTPS**: Self-signed cert for production
3. **Rate Limiting**: Prevent brute force attacks
4. **Firewall Rules**: Only allow necessary ports
5. **VPN**: Consider routing through VPN for extra security

### HTTPS Setup

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

# Configure Express to use HTTPS
# (See Advanced section below)
```

### Environment Variables

```bash
# .env
SSH_PORT_FORWARDING_ENABLED=true
ALLOWED_REMOTE_IPS=192.168.1.0/24,your-office-ip
REQUIRE_VPN=false
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000
```

---

## Monitoring Remote Access

VirtualPC automatically logs all remote connections:

```bash
# View remote access logs
curl http://localhost:3100/api/audit/log?filter=remote-access

# Check security alerts
curl http://localhost:3100/api/security/alerts?level=warning
```

Remote access events logged include:
- Source IP address
- Device/Browser fingerprint
- Session ID
- Timestamp
- Command executed
- Result status

---

## Advanced: Custom SSH Config

Create `~/.ssh/config` for easier access:

```
Host virtualpc
    HostName your-server-ip
    User knight2
    IdentityFile ~/.ssh/virtualpc_key
    LocalForward 3100 localhost:3100
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Then connect with:
```bash
ssh virtualpc
```

---

## Troubleshooting

### Port 3100 Not Accessible

```bash
# Check if VirtualPC is running
ps aux | grep "node dist/index.js"

# Check if port is bound
sudo netstat -tlnp | grep 3100

# Check firewall
sudo ufw status
sudo iptables -L | grep 3100

# Check router port forwarding (login to router admin panel)
```

### SSH Connection Refused

```bash
# Verify SSH is running
sudo systemctl status ssh

# Check SSH is listening on port 22
sudo netstat -tlnp | grep :22

# Test SSH connectivity
ssh -v knight2@your-server-ip
```

### Connection Timeout

```bash
# Check if server IP is correct
ping your-server-ip

# Check if port forwarding is enabled in router
# (Telnet or nc to test)
nc -zv your-public-ip 3100

# Check server firewall
sudo ufw status
```

---

## Docker Container Port Forwarding

If running VirtualPC in Docker:

```bash
# Run container with port mapping
docker run -d \
  -p 3100:3100 \
  --name virtualpc \
  virtualpc:latest
```

Then port forward to container port 3100 instead of localhost:3100.

---

## Reverse Proxy Setup (Nginx)

For production with custom domain:

```nginx
server {
    listen 80;
    server_name virtualpc.yourdomain.com;

    location / {
        proxy_pass http://localhost:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable with:
```bash
sudo ln -s /etc/nginx/sites-available/virtualpc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Then access via: `http://virtualpc.yourdomain.com`

---

## Testing Checklist

- [ ] VirtualPC running on localhost:3100
- [ ] SSH key configured for passwordless login
- [ ] SSH local port forwarding working
- [ ] Firewall allows port 3100
- [ ] Router port forwarding configured
- [ ] External IP can reach port 3100
- [ ] HTTPS certificates installed (production)
- [ ] Rate limiting configured
- [ ] Remote access logging enabled
- [ ] Security alerts configured

Once all checked, VirtualPC is ready for remote access through SSH!
