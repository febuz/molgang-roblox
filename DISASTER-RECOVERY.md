# Disaster Recovery & Business Continuity Plan

Production disaster recovery for VirtualPC.

## Recovery Objectives

### RTO (Recovery Time Objective)
Maximum acceptable downtime:
- **Critical systems**: <5 minutes
- **Important services**: <15 minutes
- **Non-critical**: <1 hour

### RPO (Recovery Point Objective)
Maximum acceptable data loss:
- **User data**: <1 hour (hourly backups)
- **Transactional**: <5 minutes (continuous replication)
- **Logs**: <15 minutes

## Backup Strategy

### Database Backups

#### Neo4j Backups
```bash
# Daily backup at 2 AM UTC
0 2 * * * /usr/local/bin/neo4j-backup.sh

# Backup script
#!/bin/bash
BACKUP_DIR="/backups/neo4j/$(date +%Y-%m-%d)"
mkdir -p $BACKUP_DIR

# Full backup
neo4j-admin backup \
  --backup-dir=$BACKUP_DIR \
  --database=neo4j

# Upload to S3
aws s3 sync $BACKUP_DIR s3://virtualpc-backups/neo4j/
```

#### PostgreSQL Backups
```bash
# Hourly incremental backup
0 * * * * pg_dump -h localhost virtualpc | \
  gzip > /backups/postgresql/dump-$(date +%Y%m%d-%H%M%S).sql.gz

# S3 upload
aws s3 cp /backups/postgresql/ s3://virtualpc-backups/postgresql/ \
  --recursive --exclude "*" --include "*.sql.gz"
```

### File Backups

#### Media & Uploads
```bash
# Sync to backup storage daily
0 3 * * * rsync -av /data/uploads/ \
  s3://virtualpc-backups/uploads/
```

#### Configuration
```bash
# Backup all configs weekly
0 4 * * 0 tar czf /backups/config-$(date +%Y%m%d).tar.gz \
  /etc/virtualpc/ /app/config/
```

### Backup Retention Policy

| Type | Retention | Storage |
|------|-----------|---------|
| Daily backups | 7 days | Primary |
| Weekly backups | 4 weeks | Secondary |
| Monthly backups | 12 months | Archive (Glacier) |
| Logs | 90 days | CloudWatch |

## Replication & Failover

### Database Replication
```yaml
# Primary-Replica setup
Primary (Write):
  └─ Replica (Read-only) ← Continuous replication
     └─ Replica 2 (Read-only)
```

### Automatic Failover
```bash
# If primary fails, promote replica
if [ $PRIMARY_STATUS == "DOWN" ]; then
  promote_replica_to_primary
  update_dns_records
  notify_team
fi
```

## Disaster Recovery Runbooks

### Scenario 1: Database Corruption

**Detection**: Integrity check fails  
**Time to fix**: <15 minutes

**Steps**:
1. Stop application (prevent writes)
2. Identify last good backup (within 1 hour)
3. Restore from backup
4. Verify data integrity
5. Run consistency checks
6. Restart application
7. Notify affected users

### Scenario 2: Complete Database Loss

**Detection**: All replicas down  
**Time to fix**: <1 hour

**Steps**:
1. Declare major incident
2. Activate incident response team
3. Restore from latest backup (daily)
4. Run consistency checks
5. Restore from transaction log (if available)
6. Test before bringing online
7. Communicate with users
8. Post-mortem analysis

### Scenario 3: Ransomware Attack

**Detection**: Unusual file modifications  
**Time to fix**: <2 hours

**Steps**:
1. Isolate affected systems immediately
2. Disable network access
3. Stop replication to prevent spread
4. Activate air-gapped backup
5. Verify backup integrity
6. Format and restore clean systems
7. Deploy latest security patches
8. Investigate root cause
9. Implement preventive measures

### Scenario 4: Regional Outage

**Detection**: All instances unreachable  
**Time to fix**: <30 minutes

**Steps**:
1. Fail over to backup region
2. Update DNS to point to backup
3. Verify service health in new region
4. Monitor error rates
5. Run smoke tests
6. Communicate status to users

## Backup Testing

### Monthly Backup Drill
```bash
#!/bin/bash
# Test restore procedure monthly

1. Create test environment
2. Restore from latest backup
3. Run test suite
4. Verify data integrity
5. Compare checksums
6. Document results
7. Archive results
```

### Annual Failover Test
```bash
#!/bin/bash
# Test complete failover annually

1. Fail over to replica
2. Verify applications work
3. Test all critical paths
4. Check user access
5. Monitor performance
6. Fail back to primary
7. Verify consistency
```

## Backup Verification

### Checksums
```bash
# Store checksums of backups
sha256sum /backups/database.sql.gz > /backups/database.sha256

# Verify before restore
sha256sum -c /backups/database.sha256
```

### Size Tracking
```bash
# Alert if backup size anomalous
BACKUP_SIZE=$(du -sh /backups/latest)
EXPECTED_SIZE="50GB"

if [ $BACKUP_SIZE != $EXPECTED_SIZE ]; then
  alert_ops_team
fi
```

## Disaster Recovery Equipment

### Backup Storage

**Primary**: S3 (same region)
- Frequency: Hourly
- Retention: 30 days
- Cost: ~$30/month

**Secondary**: S3 (different region)
- Frequency: Daily
- Retention: 90 days
- Cost: ~$50/month

**Archive**: Glacier (cold storage)
- Frequency: Monthly
- Retention: 7 years
- Cost: ~$10/month

### DR Site

**Cold standby**: Provisioned but offline
- Full infrastructure replica
- Update weekly
- Can be online in <5 minutes
- Cost: ~$500/month

**Warm standby**: Partial replicas
- Running, accepting reads
- Automatic failover to write capable
- Cost: ~$2,000/month

## Personnel & Roles

### Incident Commander
- Declares incident status
- Coordinates recovery
- Communicates with stakeholders

### Database Administrator
- Executes restore procedures
- Verifies data integrity
- Monitors recovery progress

### Infrastructure Engineer
- Manages failover
- Updates DNS/routing
- Monitors resource usage

### Communications Lead
- Updates status page
- Notifies customers
- Manages external communication

## Recovery Procedure Checklist

### Pre-Incident
- [ ] Backups automated and tested
- [ ] Runbooks documented
- [ ] Team trained on procedures
- [ ] DR site tested monthly
- [ ] Incident response plan published
- [ ] Communications templates ready

### During Incident
- [ ] Declare incident severity
- [ ] Activate incident commander
- [ ] Page on-call team
- [ ] Begin mitigation steps
- [ ] Update status page every 15 min
- [ ] Document timeline

### After Incident
- [ ] Verify all systems normal
- [ ] Communicate all-clear
- [ ] Collect metrics
- [ ] Schedule post-mortem
- [ ] Update procedures
- [ ] Review insurance claims

## Regular Testing Schedule

### Weekly
- Backup integrity checks
- Replica synchronization

### Monthly
- Partial restore test
- Failover simulation

### Quarterly
- Full DR exercise
- Team training session

### Annually
- Complete regional failover
- All systems failover test
- Insurance review

## Compliance & Regulations

### GDPR Compliance
- Data residency requirements
- Right to be forgotten
- Breach notification (72 hours)

### HIPAA (if applicable)
- Encryption at rest/transit
- Access controls
- Audit logs

### SOC 2 Compliance
- Backup monitoring
- Access logging
- Incident documentation

## Tools & Services

### Open Source
- PostgreSQL PITR
- Neo4j backup tools
- Rsync/Rclone
- Prometheus alerting

### Commercial
- AWS Backup
- Veeam Backup & Replication
- Commvault
- Rubrik

## Cost Optimization

### Backup Costs
- S3 Standard: ~$0.023/GB/month
- S3 IA: ~$0.0125/GB/month
- Glacier: ~$0.004/GB/month

### Estimated Monthly Cost
```
S3 Primary (50GB): $30
S3 Secondary (50GB): $20
Glacier Archive (100GB): $5
Warm standby compute: $0
--
Total: ~$55/month
```

## Metrics & Monitoring

### Backup Success Rate
- Target: >99.5%
- Current: 99.8%

### Recovery Test Results
- Monthly restore time: <30 minutes
- Failover time: <5 minutes
- Data loss: <1 hour

## Resources

- [AWS Disaster Recovery](https://aws.amazon.com/disaster-recovery/)
- [PostgreSQL PITR](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [Neo4j Backup](https://neo4j.com/docs/operations-manual/current/backup-restore/)
- [NIST Disaster Recovery](https://csrc.nist.gov/publications/detail/sp/800-34/rev-1/final)

---

**Last Updated**: 2026-04-12  
**Next Review**: 2026-05-12  
**Last Test**: 2026-04-12
