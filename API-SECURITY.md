# API Security & Rate Limiting Guide

Production security implementation for VirtualPC APIs.

## Rate Limiting Strategies

### 1. Per-IP Rate Limiting
Limits requests from each IP address.

```typescript
const rateLimiter = new AdvancedRateLimiter();

app.use('/api/', rateLimiter.perIp({
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 100,      // 100 requests per minute
}));
```

**Use case**: Protect against brute force attacks.

### 2. Per-User Rate Limiting
Limits requests per authenticated user.

```typescript
app.use('/api/premium/', rateLimiter.perUser({
  windowMs: 60 * 1000,
  maxRequests: 1000,
}));
```

**Use case**: Fair usage for authenticated users.

### 3. Tier-Based Rate Limiting
Different limits for free/pro/enterprise tiers.

```typescript
const tierLimits = {
  free: { requestsPerMinute: 10, burstLimit: 15 },
  pro: { requestsPerMinute: 100, burstLimit: 150 },
  enterprise: { requestsPerMinute: 1000, burstLimit: 1500 },
};
```

**Use case**: Monetization and SLA guarantees.

### 4. Sliding Window Rate Limiting
More accurate tracking with sliding time windows.

```typescript
app.use('/api/critical/', rateLimiter.slidingWindow(60000, 100));
```

**Use case**: Prevent exact limit manipulation.

## Security Headers

### Content-Security-Policy
```
default-src 'self'
script-src 'self' 'unsafe-inline'
style-src 'self' 'unsafe-inline'
```
Prevents XSS attacks.

### X-Frame-Options
```
DENY
```
Prevents clickjacking attacks.

### Strict-Transport-Security
```
max-age=31536000; includeSubDomains
```
Forces HTTPS connections.

### X-Content-Type-Options
```
nosniff
```
Prevents MIME type sniffing.

## CORS Configuration

### Allowed Origins
```javascript
allowedOrigins: [
  'http://localhost:3000',
  'https://app.virtualpc.com',
]
```

### Preflight Requests
All cross-origin requests require successful preflight (OPTIONS).

## Authentication & Authorization

### JWT Implementation
```typescript
// Check JWT in Authorization header
const token = req.get('Authorization')?.replace('Bearer ', '');

if (!token) {
  return res.status(401).json({ error: 'Unauthorized' });
}

const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded;
```

### API Key Management
```bash
# Generate API key
openssl rand -hex 32

# Usage in header
curl -H "X-API-Key: your-key-here" https://api.virtualpc.com/data
```

## Implementation

### Global Security Middleware
```typescript
import { securityHeaders, corsHeaders } from './src/security/securityHeaders';

app.use(securityHeaders);
app.use(corsHeaders);
app.use(rateLimiter.perIp({ windowMs: 60000, maxRequests: 100 }));
```

### Endpoint-Specific Limits
```typescript
app.post('/api/auth/login',
  rateLimiter.perIp({ windowMs: 900000, maxRequests: 5 }),  // 5 per 15 minutes
  handleLogin
);

app.get('/api/data',
  rateLimiter.tierBased(getTierFromUser),
  handleGetData
);
```

## Monitoring & Alerts

### Rate Limit Exceeded
```json
{
  "status": "error",
  "message": "Too many requests",
  "retryAfter": 45,
  "limit": 100,
  "remaining": 0,
  "reset": "2026-04-12T10:05:00Z"
}
```

### Headers in Response
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 23
X-RateLimit-Reset: 2026-04-12T10:05:00Z
```

### Tracking Rate Limits
```bash
# Check current rate limit stats
GET /api/admin/rate-limits

Response:
{
  "totalKeys": 1234,
  "entries": {
    "192.168.1.1": {
      "count": 45,
      "resetTime": 1681234567890
    }
  }
}
```

## Best Practices

### 1. Graduated Penalties
```typescript
// First limit: warning
// Second limit: delay
// Third limit: block
```

### 2. Whitelist Trusted IPs
```typescript
const trustedIps = ['10.0.0.0/8', '192.168.0.0/16'];
if (isIpInRange(req.ip, trustedIps)) {
  return next();  // Skip rate limiting
}
```

### 3. DDoS Protection
- Limit connection time
- Limit request body size
- Block empty user agents
- Monitor for patterns

### 4. API Key Rotation
```bash
# Automatic key rotation every 90 days
$ npm run rotate-api-keys
```

### 5. Encryption in Transit
```bash
# All API endpoints use TLS 1.3
curl -I https://api.virtualpc.com/health
```

## Configuration by Environment

### Development
```env
RATE_LIMIT_WINDOW=600000      # 10 minutes
RATE_LIMIT_MAX_REQUESTS=1000  # Generous
```

### Staging
```env
RATE_LIMIT_WINDOW=60000       # 1 minute
RATE_LIMIT_MAX_REQUESTS=500   # Moderate
```

### Production
```env
RATE_LIMIT_WINDOW=60000       # 1 minute
RATE_LIMIT_MAX_REQUESTS=100   # Strict
TIER_BASED_LIMITS=true        # Enable tiers
```

## Testing Security

### Load Test Rate Limits
```bash
# Test 150 requests in 60 seconds (exceeds limit of 100)
ab -n 150 -c 10 http://localhost:3100/api/
```

### Security Headers Test
```bash
# Verify all security headers present
curl -I https://api.virtualpc.com | grep -E "Content-Security|X-Frame|Strict-Transport"
```

### CORS Test
```bash
# Test preflight request
curl -X OPTIONS \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  https://api.virtualpc.com/api/
```

## Troubleshooting

### Users Getting Rate Limited
1. Check tier assignment
2. Review cleanup process
3. Adjust limits if needed
4. Implement progressive delays

### Security Headers Not Appearing
```bash
curl -I https://api.virtualpc.com | grep "Content-Security"
```

### CORS Errors
1. Check origin whitelist
2. Verify preflight handling
3. Check Authorization header
4. Review logs for errors

## Security Checklist

- [ ] All endpoints behind rate limiting
- [ ] Security headers configured
- [ ] CORS properly restricted
- [ ] JWT validation in place
- [ ] API keys rotated regularly
- [ ] HTTPS/TLS 1.3 enforced
- [ ] Input validation implemented
- [ ] SQL injection protection
- [ ] XSS protection enabled
- [ ] CSRF tokens validated
- [ ] Audit logs enabled
- [ ] DDoS mitigation active
- [ ] Security tests pass
- [ ] Penetration test completed
- [ ] Incident response plan ready

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [API Security Best Practices](https://www.api.gov/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
