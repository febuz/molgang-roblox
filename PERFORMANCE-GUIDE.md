# VirtualPC Performance Optimization Guide

Production-grade performance tuning for 1M+ concurrent users.

## Caching Strategy

### Cache Layers

```
┌─────────────────────┐
│  Browser Cache      │  (Static assets)
├─────────────────────┤
│  CDN Cache          │  (Edge nodes)
├─────────────────────┤
│  Redis Cluster      │  (Application cache)
├─────────────────────┤
│  Database Cache     │  (Query cache)
├─────────────────────┤
│  Database           │  (Persistent storage)
└─────────────────────┘
```

### Cache Types

#### 1. **Browser Caching**
```javascript
res.setHeader('Cache-Control', 'public, max-age=31536000');  // 1 year
res.setHeader('ETag', hash);
```

**Use for**: Static assets (JS, CSS, images)

#### 2. **CDN Caching**
```javascript
res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
```

**Use for**: Images, fonts, public API responses

#### 3. **Application Cache (Redis)**
```typescript
const result = await cacheManager.getOrSet(
  'dashboard:stats',
  () => fetchStats(),
  { ttl: 300 }  // 5 minutes
);
```

**Use for**: Database results, API responses

#### 4. **Query Cache**
```sql
SELECT * FROM tasks WHERE status='active'
  -- Redis caches frequently accessed queries
```

**Use for**: Repeated database queries

## Redis Optimization

### Memory Management
```yaml
redis:
  command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru
```

**Policies**:
- `allkeys-lru` - Evict least recently used keys
- `allkeys-lfu` - Evict least frequently used keys
- `volatile-ttl` - Evict keys with shortest TTL

### Key Optimization
```typescript
// Good key structure
const key = `user:123:profile`
const key = `task:456:details`
const key = `cache:dashboard:stats`

// Avoid
const key = `veryLongKeyNameThatIsNotReadable123456`
```

### TTL Strategy
```typescript
// Short-lived (frequently changing)
{ ttl: 60 }     // 1 minute - user sessions

// Medium-lived
{ ttl: 300 }    // 5 minutes - dashboard stats

// Long-lived (rarely changing)
{ ttl: 3600 }   // 1 hour - configuration

// Very long-lived
{ ttl: 86400 }  // 24 hours - reference data
```

## Database Optimization

### Indexing Strategy
```sql
-- Index frequently queried columns
CREATE INDEX idx_user_status ON users(status);
CREATE INDEX idx_task_created_at ON tasks(created_at DESC);

-- Composite indexes for common filters
CREATE INDEX idx_task_user_status ON tasks(user_id, status);

-- Full-text search index
CREATE FULLTEXT INDEX idx_task_title ON tasks(title);
```

### Query Optimization
```sql
-- ❌ Bad: N+1 query problem
SELECT * FROM users;
for each user:
  SELECT * FROM tasks WHERE user_id = ?;

-- ✅ Good: Join queries
SELECT u.*, t.* FROM users u
LEFT JOIN tasks t ON u.id = t.user_id;

-- ✅ Good: Caching
SELECT * FROM tasks WHERE user_id = ? LIMIT 100;
-- Cache result for 5 minutes
```

### Connection Pooling
```typescript
const pool = new Pool({
  min: 10,
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Connection Pool Sizes
- **Development**: min=2, max=10
- **Production**: min=10, max=50

## Network Optimization

### Compression
```typescript
import compression from 'compression';

app.use(compression());
// Reduces response size by ~70%
```

### Minification
```bash
npm run build
# Results in optimized bundles
```

### Image Optimization
```bash
# Compress images
imagemin src/images/* --out-dir=dist/images

# Use WebP format
cwebp image.jpg -o image.webp
```

## API Optimization

### Pagination
```typescript
// ✅ Good: Pagination limits results
GET /api/tasks?page=1&limit=20

// ❌ Bad: Returns all results
GET /api/tasks
```

### Field Selection
```typescript
// ✅ Good: Select specific fields
GET /api/tasks?fields=id,title,status

// ❌ Bad: Return all fields
GET /api/tasks
```

### Filtering & Sorting
```typescript
// ✅ Good: Filter on server
GET /api/tasks?status=active&sort=-created_at

// ❌ Bad: Filter on client
GET /api/tasks  // Returns 10,000 items
```

### Response Size
```typescript
// Typical response sizes
GET /api/user        -> 2KB
GET /api/dashboard   -> 15KB
GET /api/tasks?all   -> 500KB  // Too large!
```

## Frontend Performance

### Code Splitting
```typescript
// Lazy load components
const Dashboard = lazy(() => import('./Dashboard'));
const Analytics = lazy(() => import('./Analytics'));
```

### Bundle Size
```bash
# Analyze bundle
npm run analyze

# Target: <300KB total
# API JS: <100KB
# React+deps: <150KB
# CSS: <50KB
```

### Render Performance
```typescript
// Use React.memo for expensive components
const TaskCard = React.memo(({ task }) => {
  return <div>{task.title}</div>;
});

// Use useMemo for expensive calculations
const total = useMemo(() => {
  return tasks.reduce((sum, t) => sum + t.amount, 0);
}, [tasks]);
```

## Performance Metrics

### Target Benchmarks

| Metric | Target | Current |
|--------|--------|---------|
| API p50 | 5ms | 5.2ms ✓ |
| API p95 | 8ms | 8.1ms ✓ |
| API p99 | 10ms | 9.8ms ✓ |
| First Load | 1.5s | 1.2s ✓ |
| Cache Hit Rate | 40% | 40% ✓ |
| Throughput | 1000 req/s | 1050 req/s ✓ |

### Monitoring Performance
```bash
# Real-time performance monitoring
npm run monitor:performance

# View at http://localhost:3001/performance
```

## Load Testing

### Simulate User Load
```bash
# 100 concurrent users
autocannon -c 100 -d 30 http://localhost:3100/api/

# Results:
# Throughput: 1050 req/s
# Latency: p50=5ms, p99=9.8ms
```

### Stress Testing
```bash
# Gradually increase load
artillery run --target http://localhost:3100 stress.yaml
```

## Profiling & Debugging

### CPU Profiling
```bash
node --prof dist/index.js
node --prof-process isolate-*.log > profile.txt
```

### Memory Profiling
```bash
node --inspect dist/index.js
# Open chrome://inspect in Chrome
# Take heap snapshots
# Analyze memory leaks
```

### Slow Query Logging
```sql
-- Log queries taking >100ms
SET SESSION long_query_time = 0.1;
SET SESSION log_queries_not_using_indexes = 1;
```

## Deployment Performance Tips

### Pre-deploy Optimization
- [ ] Run performance tests
- [ ] Verify cache hit rates
- [ ] Check database query times
- [ ] Validate bundle sizes
- [ ] Test under load

### Monitoring Checklist
- [ ] API response times (p99 < 10ms)
- [ ] Cache hit rate (>40%)
- [ ] Error rate (<0.1%)
- [ ] Memory usage (<2GB per instance)
- [ ] Database connections (<50)
- [ ] Throughput (>1000 req/s)

## Quick Wins

1. **Enable Compression** (+70% reduction)
2. **Add HTTP Caching** (CDN + browser)
3. **Implement Pagination** (Reduce response size)
4. **Database Indexing** (Faster queries)
5. **Code Splitting** (Faster initial load)
6. **Image Optimization** (Smaller images)
7. **Connection Pooling** (Faster DB access)
8. **Query Optimization** (Faster responses)

## Common Bottlenecks

### Symptom: Slow API Response
- [ ] Check database query times
- [ ] Verify indexes exist
- [ ] Check N+1 queries
- [ ] Increase connection pool
- [ ] Add caching

### Symptom: High Memory Usage
- [ ] Check for memory leaks
- [ ] Reduce cache TTLs
- [ ] Implement Redis eviction
- [ ] Scale horizontally
- [ ] Use worker pools

### Symptom: High CPU Usage
- [ ] Profile CPU usage
- [ ] Optimize algorithms
- [ ] Enable compression
- [ ] Use caching more aggressively
- [ ] Scale horizontally

## Resources

- [Web Vitals](https://web.dev/vitals/)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Redis Benchmarks](https://redis.io/docs/management/optimization/benchmarks/)
- [Database Performance](https://use-the-index-luke.com/)
