# Monitoring & Observability Setup Guide

Production monitoring infrastructure for VirtualPC.

## Three Pillars of Observability

### 1. Metrics
Quantitative measurements of system behavior.

### 2. Logs
Event records and debugging information.

### 3. Traces
Request flow through distributed system.

## Metrics Collection

### Prometheus Setup
```yaml
# config/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'virtualpc-api'
    static_configs:
      - targets: ['localhost:3100']
```

### Key Metrics to Track

#### Application Metrics
```
http_requests_total           # Total requests
http_request_duration_seconds # Request latency
http_request_size_bytes       # Request size
http_response_size_bytes      # Response size
http_errors_total             # Error count by code
```

#### Business Metrics
```
user_registrations_total      # New users
task_created_total            # Tasks created
task_completed_total          # Tasks completed
revenue_total                 # If applicable
```

#### System Metrics
```
process_cpu_seconds_total     # CPU time
process_resident_memory_bytes # Memory usage
nodejs_gc_duration_seconds    # Garbage collection
```

#### Cache Metrics
```
cache_hits_total              # Cache hit count
cache_misses_total            # Cache miss count
cache_hit_rate                # Hit rate percentage
redis_operations_total        # Redis operations
```

#### Database Metrics
```
db_query_duration_seconds     # Query latency
db_connections_total          # Connection count
db_query_errors_total         # Query failures
```

## Logging Strategy

### Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| DEBUG | Development | Variable values, function calls |
| INFO | Status | Request received, data saved |
| WARN | Attention needed | Deprecated API, retry needed |
| ERROR | Error occurred | API call failed, validation error |
| FATAL | Critical error | Database unavailable, crash |

### Structured Logging
```json
{
  "timestamp": "2026-04-12T10:30:45.123Z",
  "level": "info",
  "message": "Task created",
  "context": {
    "userId": "user123",
    "taskId": "task456",
    "sprintId": "week1"
  },
  "duration_ms": 45,
  "status": "success"
}
```

### Log Aggregation
Tools: ELK Stack, Datadog, CloudWatch

```bash
# View recent errors
curl -s http://logs.virtualpc.com/_search?q=level:error | jq .

# Search by user
curl -s http://logs.virtualpc.com/_search?q=userId:user123 | jq .

# Performance analysis
curl -s http://logs.virtualpc.com/_search?q=duration_ms:>100 | jq .
```

## Distributed Tracing

### OpenTelemetry Setup
```typescript
import { BasicTracerProvider } from '@opentelemetry/tracing';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const provider = new BasicTracerProvider();
provider.addSpanProcessor(
  new BatchSpanProcessor(
    new JaegerExporter({
      endpoint: 'http://localhost:6831',
    })
  )
);

provider.register();
```

### Trace Flow
```
User Request
  ├─ Authentication (5ms)
  ├─ Business Logic (12ms)
  │  ├─ Database Query (8ms)
  │  └─ Cache Check (1ms)
  ├─ Response Serialization (2ms)
  └─ Total: 19ms
```

## Dashboards

### Grafana Dashboard
Pre-configured dashboards for:
1. **System Health**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

2. **API Performance**
   - Request rate
   - Response latency (p50, p95, p99)
   - Error rate
   - Throughput

3. **Business Metrics**
   - User growth
   - Task completion rate
   - Feature usage
   - Revenue (if applicable)

4. **Resource Utilization**
   - Database connections
   - Cache hit rate
   - API quota usage
   - Storage consumption

### Dashboard URLs
- System: http://grafana.virtualpc.com/d/system
- API: http://grafana.virtualpc.com/d/api-performance
- Business: http://grafana.virtualpc.com/d/business
- Resources: http://grafana.virtualpc.com/d/resources

## Alerting

### Alert Rules

#### Critical Alerts
```yaml
- alert: APIDown
  expr: up{job="virtualpc-api"} == 0
  for: 1m
  severity: critical

- alert: ErrorRateHigh
  expr: rate(http_errors_total[5m]) > 0.05
  for: 5m
  severity: critical

- alert: DatabaseDown
  expr: up{job="neo4j"} == 0
  for: 1m
  severity: critical
```

#### Warning Alerts
```yaml
- alert: HighLatency
  expr: histogram_quantile(0.99, http_request_duration_seconds) > 15
  for: 5m
  severity: warning

- alert: HighMemory
  expr: process_resident_memory_bytes > 1.5e9
  for: 10m
  severity: warning

- alert: LowCacheHitRate
  expr: cache_hit_rate < 0.35
  for: 10m
  severity: warning
```

### Notification Channels
- PagerDuty (critical)
- Slack (warning, info)
- Email (escalation)
- SMS (critical, on-call)

## Synthetic Monitoring

### Uptime Checks
```bash
# Monitor every 60 seconds
curl -f https://api.virtualpc.com/health || alert

# Check critical endpoints
curl -f https://api.virtualpc.com/api/analytics/dashboard || alert
curl -f https://api.virtualpc.com/api/agents/status || alert
```

### Transaction Monitoring
Simulate user workflows:
1. Sign in
2. Create task
3. Update task
4. Sign out

Alert if any step fails.

## Performance Monitoring

### Golden Signals
Track 4 key metrics:

1. **Latency** (request latency)
   - p50, p95, p99
   - Target: p99 < 10ms

2. **Traffic** (throughput)
   - Requests per second
   - Target: >1000 req/s

3. **Errors** (error rate)
   - Errors per second
   - Target: <0.1%

4. **Saturation** (resource usage)
   - CPU, memory, disk
   - Target: <70% utilization

## Health Checks

### Liveness Probe
Checks if service is running:
```bash
GET /health
Response: 200 OK
```

### Readiness Probe
Checks if service is ready for traffic:
```bash
GET /ready
Response: 200 OK (if ready), 503 (if not)
```

### Dependency Checks
```
GET /health
{
  "status": "ok",
  "services": {
    "api": "up",
    "database": "up",
    "cache": "up",
    "kafka": "up"
  }
}
```

## Observability Best Practices

1. **Instrument Early**
   - Add metrics before they're needed
   - Start with basic metrics
   - Expand based on needs

2. **Structured Logging**
   - JSON format
   - Include context
   - Correlation IDs

3. **Sensible Defaults**
   - Good baseline metrics
   - Reasonable thresholds
   - Actionable alerts

4. **Incident Response**
   - Document playbooks
   - On-call rotation
   - Blameless post-mortems

5. **Data Retention**
   - Metrics: 15 days
   - Logs: 90 days
   - Traces: 7 days

## Tools & Services

### Self-Hosted
- Prometheus (metrics)
- Grafana (dashboards)
- ELK Stack (logs)
- Jaeger (tracing)

### SaaS
- DataDog
- New Relic
- Sentry (error tracking)
- LogRocket (session replay)

## Troubleshooting

### No Metrics Appearing
1. Verify Prometheus scrape config
2. Check metrics endpoint responds
3. Review firewall rules
4. Check time sync

### Missing Logs
1. Verify log shipper running
2. Check network connectivity
3. Review log pipeline
4. Check disk space

### Slow Queries Not Showing
1. Verify query timeout threshold
2. Check database is logging
3. Review log aggregation

## Cost Optimization

### Metrics Optimization
- Reduce cardinality (fewer label combinations)
- Increase scrape interval for non-critical metrics
- Archive old metrics

### Log Optimization
- Reduce log verbosity in production
- Compress archived logs
- Sample high-volume logs

### Trace Optimization
- Sample traces (10-20%)
- Reduce retention period
- Filter internal calls

## Compliance & Audit

### Data Privacy
- PII redaction in logs
- Encryption in transit
- Encryption at rest
- Access controls

### Audit Trail
- Track configuration changes
- Log all access to sensitive data
- Retention per regulations
- Regular audit reviews

## Getting Started Checklist

- [ ] Deploy Prometheus
- [ ] Deploy Grafana
- [ ] Configure log aggregation
- [ ] Set up alerting rules
- [ ] Create dashboards
- [ ] Define SLOs/SLIs
- [ ] Document runbooks
- [ ] Set up on-call rotation
- [ ] Test alert notifications
- [ ] Plan data retention

## Resources

- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [OpenTelemetry](https://opentelemetry.io/)
- [SRE Book - Monitoring](https://sre.google/sre-book/monitoring-distributed-systems/)

---

**Last Updated**: 2026-04-12  
**Next Review**: 2026-05-12
