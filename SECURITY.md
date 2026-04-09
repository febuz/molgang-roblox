# VirtualPC Security Layer - Comprehensive Guide

Complete security implementation for VirtualPC autonomous agent system, including TLS/SSL, rate limiting, JWT authentication, and RBAC.

---

## 🔒 Security Components

### 1. **TLS/SSL Encryption** (HTTPS)
- All traffic encrypted using TLS 1.2+
- Self-signed certificates (development) or Let's Encrypt (production)
- HSTS headers for browser enforcement
- Perfect Forward Secrecy enabled

### 2. **Rate Limiting**
- Global: 30 requests/second per IP
- API endpoints: 10 requests/second with 20-request burst
- Admin endpoints: 5 requests/second
- Static files: 50 requests/second
- Returns 429 (Too Many Requests) when exceeded

### 3. **JWT Authentication**
- Bearer token validation
- Token expiration (24h default)
- Refresh token support (7d default)
- Token revocation capability
- Signature verification with HS256

### 4. **API Key Authentication**
- Alternative to JWT tokens
- X-API-Key header validation
- Suitable for service-to-service communication
- Can be used instead of or alongside JWT

### 5. **Role-Based Access Control (RBAC)**
- **Admin**: Full system access, manage agents/tokens
- **Agent**: Task execution, read/write own resources
- **User**: Read/write own resources only

### 6. **Security Headers**
- `Strict-Transport-Security`: Forces HTTPS
- `X-Content-Type-Options`: Prevents MIME sniffing
- `X-Frame-Options`: Clickjacking protection
- `X-XSS-Protection`: XSS filtering
- `Content-Security-Policy`: Restricts resource loading

---

## 🔑 JWT Token Structure

### Token Generation

```typescript
{
  "sub": "agent-id",           // Subject (agent identifier)
  "agent_name": "kai",         // Agent name
  "role": "agent",             // Role (admin, agent, user)
  "permissions": [             // Array of permissions
    "read:own",
    "write:own",
    "execute:tasks"
  ],
  "iat": 1712765123,           // Issued At timestamp
  "exp": 1712851523            // Expiration timestamp
}
```

### Token Usage

```bash
# Bearer token in Authorization header
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." http://localhost/api/memory/status

# Or X-Access-Token header
curl -H "X-Access-Token: eyJhbGciOiJIUzI1NiIs..." http://localhost/api/memory/status

# Or X-API-Key header
curl -H "X-API-Key: ak_1234567890abcdef" http://localhost/api/memory/status
```

---

## 🚀 Deployment Setup

### 1. Self-Signed Certificates (Development)

Already generated in `Dockerfile.nginx`. For testing:

```bash
# Verify certificate
openssl x509 -in nginx.certs/cert.pem -text -noout

# Test HTTPS connection
curl -k https://localhost/health
```

### 2. Let's Encrypt Certificates (Production)

```bash
# Using Certbot with Docker
docker run -it --rm -v /etc/letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com

# Copy certificates to nginx certs directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx.certs/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx.certs/key.pem
```

### 3. Docker Deployment

```bash
# Start entire stack with Nginx
docker-compose up -d

# Verify all services
./health-check.sh
```

---

## 🔐 Authentication Flow

### 1. Agent Login/Token Generation

```bash
# Generate token for agent
curl -X POST http://localhost:3100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "kai",
    "agent_name": "Kai",
    "password": "secure_password"
  }'

# Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "24h"
}
```

### 2. Using Token for Subsequent Requests

```bash
# Store token
TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Use in API requests
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3100/api/memory/status
```

### 3. Token Refresh

```bash
curl -X POST http://localhost:3100/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

---

## 📋 RBAC Permissions

### Admin Permissions
```
- read:all          # Read any resource
- write:all         # Write any resource
- delete:all        # Delete any resource
- manage:agents     # Manage agent configuration
- manage:tokens     # Create/revoke tokens
- view:analytics    # View system analytics
```

### Agent Permissions
```
- read:own          # Read own resources
- write:own         # Write own resources
- read:shared       # Read shared resources
- execute:tasks     # Execute tasks
```

### User Permissions
```
- read:own          # Read own resources
- write:own         # Write own resources
```

### Usage

```typescript
// Protect endpoint with permission check
app.get('/api/cost/dashboard', 
  validateToken,
  requirePermission('view:analytics'),
  getCostDashboard
);

// Require specific role
app.delete('/api/agents/:id',
  validateToken,
  requireRole('admin'),
  deleteAgent
);
```

---

## 🛡️ Security Best Practices

### 1. Environment Variables

**Never commit secrets!** Always use `.env`:

```env
JWT_SECRET=your-very-long-secret-key-min-32-chars
TOKEN_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d
API_KEY_ROTATION_DAYS=30
```

Rotate JWT_SECRET periodically:
```bash
# Generate new secret
openssl rand -base64 32
```

### 2. CORS Configuration

For cross-origin requests from web frontends:

```nginx
# Nginx config
add_header Access-Control-Allow-Origin "https://trusted-domain.com" always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
```

### 3. Rate Limiting Strategy

```
Public endpoints (signup, login): 5 req/s
API endpoints: 10 req/s
Admin endpoints: 5 req/s (stricter)
Static files: 50 req/s (permissive)
```

### 4. Logging & Monitoring

```bash
# View access logs
tail -f /var/log/nginx/access.log

# View error logs
tail -f /var/log/nginx/error.log

# Monitor failed authentication
grep "401\|403" /var/log/nginx/access.log
```

### 5. Regular Security Audits

```bash
# Check certificate expiration
openssl x509 -enddate -noout -in nginx.certs/cert.pem

# Audit active tokens
npm run audit:tokens

# Check for revoked tokens
npm run audit:revocations
```

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized

```
Error: {"error":"Missing authentication token"}
```

**Solution:**
- Include `Authorization: Bearer <token>` header
- Or use `X-API-Key` header
- Or use `X-Access-Token` header

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost/api/endpoint
```

### Issue: 429 Too Many Requests

```
Error: {"error":"Rate limit exceeded","retry_after":60}
```

**Solution:**
- Wait before making more requests
- Implement exponential backoff in clients
- For legitimate high-volume: contact admin to adjust limits

```bash
# Wait 60 seconds before retry
sleep 60
curl -H "Authorization: Bearer $TOKEN" http://localhost/api/endpoint
```

### Issue: 403 Forbidden (Insufficient Permissions)

```
Error: {"error":"Insufficient permissions"}
```

**Solution:**
- Token's role lacks required permissions
- Request admin to grant permissions
- Check user's assigned role:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/auth/me
```

### Issue: Token Expired

```
Error: {"error":"Invalid or expired token"}
```

**Solution:**
- Refresh token using refresh endpoint
- Or request new token via login

```bash
curl -X POST http://localhost/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"..."}'
```

---

## 📊 Monitoring & Analytics

### Active Connections
```bash
# Monitor current connections
watch 'ss -tupn | grep 3100'
```

### Request Rate
```bash
# Requests per minute
tail -f /var/log/nginx/access.log | wc -l
```

### Failed Authentications
```bash
# Count 401 errors in last hour
tail -f /var/log/nginx/access.log | grep " 401 " | wc -l
```

### Token Usage
```bash
# Monitor token validations
npm run monitor:tokens
```

---

## 🔄 Token Lifecycle

```
1. GENERATE: Agent logs in, receives token + refresh token
   ↓
2. VALIDATE: Token included in every API request
   ↓
3. USE: Request processed if token valid & permissions sufficient
   ↓
4. EXPIRE: Token expires after 24 hours (default)
   ↓
5. REFRESH: Use refresh token to get new token
   ↓
6. REVOKE: Admin can revoke token for immediate logout
```

---

## 🚨 Security Incident Response

### If Token is Compromised

1. **Immediate**: Revoke the token
```bash
npm run revoke:token <token>
```

2. **Short-term**: Rotate all tokens for that agent
```bash
npm run rotate:agent-tokens <agent-id>
```

3. **Long-term**: Investigate the breach
- Check logs for unauthorized access
- Audit changes made with that token
- Reset agent credentials

### If Certificate Expires

1. **Check expiration**:
```bash
openssl x509 -enddate -noout -in nginx.certs/cert.pem
```

2. **Renew certificate**:
```bash
# For Let's Encrypt
sudo certbot renew

# For self-signed
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

3. **Reload Nginx**:
```bash
docker exec virtualpc-nginx nginx -s reload
```

---

## 📚 Security References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
- [Nginx Security](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [TLS/SSL Ciphers](https://wiki.mozilla.org/Security/Server_Side_TLS)

---

## ✅ Security Checklist

- [ ] Change `JWT_SECRET` to strong random value (32+ chars)
- [ ] Set up production HTTPS certificates (Let's Encrypt)
- [ ] Configure appropriate rate limits for your use case
- [ ] Enable logging and monitoring
- [ ] Set up automatic certificate renewal
- [ ] Configure CORS for your domains
- [ ] Rotate tokens and credentials regularly
- [ ] Audit access logs periodically
- [ ] Test security endpoints and headers
- [ ] Document security procedures for your team

---

**VirtualPC Security Layer Ready for Production** ✅
