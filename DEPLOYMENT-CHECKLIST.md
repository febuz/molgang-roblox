# Production Deployment Checklist

Complete pre-deployment verification for VirtualPC.

## Pre-Deployment (48 hours before)

### Code Quality
- [ ] All tests passing (>90% coverage)
- [ ] No console.logs in production code
- [ ] No hardcoded secrets or passwords
- [ ] ESLint passes without warnings
- [ ] Code reviewed by 2+ team members
- [ ] No commented-out code blocks
- [ ] Type checking passes (tsc --noEmit)

### Dependencies
- [ ] npm audit shows no critical issues
- [ ] All dependencies pinned to specific versions
- [ ] No deprecated packages
- [ ] Bundle size analyzed and acceptable
- [ ] Security scan passed

### Documentation
- [ ] README updated
- [ ] API documentation complete
- [ ] Deployment guide updated
- [ ] Troubleshooting guide complete
- [ ] Release notes prepared

### Performance
- [ ] Load testing completed
- [ ] Performance benchmarks met
- [ ] Database queries optimized
- [ ] Cache strategy verified
- [ ] Memory usage acceptable

## Staging Deployment (24 hours before)

### Deployment
- [ ] Deploy to staging environment
- [ ] Verify deployment succeeded
- [ ] Check health endpoints
- [ ] Verify database migrations
- [ ] Check logs for errors

### Testing
- [ ] Full regression test suite passes
- [ ] Smoke tests pass (all critical paths)
- [ ] API endpoints respond correctly
- [ ] WebSocket connections work
- [ ] Admin panel functional
- [ ] User workflows validated

### Data
- [ ] Database backup completed
- [ ] Data migration scripts tested
- [ ] Rollback procedure documented
- [ ] Backup restoration tested

### Monitoring
- [ ] Monitoring alerts configured
- [ ] Dashboards created
- [ ] Log aggregation working
- [ ] Metrics collection enabled
- [ ] On-call schedule active

## Production Deployment (Day of)

### Pre-Flight
- [ ] Team assembled and ready
- [ ] Communication channels open (Slack, PagerDuty)
- [ ] Incident commander assigned
- [ ] Rollback decision criteria defined
- [ ] Maintenance window announced (if needed)

### Deployment Steps
1. [ ] Create deployment branch
2. [ ] Tag release version (v1.0.0)
3. [ ] Build Docker image
4. [ ] Push image to registry
5. [ ] Verify image in registry
6. [ ] Update Kubernetes manifests (if K8s)
7. [ ] Apply infrastructure changes (if any)
8. [ ] Deploy to production
9. [ ] Monitor health checks
10. [ ] Verify rollout progress

### Verification (First 15 minutes)
- [ ] All pods/instances running
- [ ] No error spikes in logs
- [ ] API responding normally
- [ ] Response times acceptable
- [ ] Database connections healthy
- [ ] Cache hit rates normal
- [ ] WebSocket connections working
- [ ] Admin panel accessible

### Business Verification (First hour)
- [ ] Critical user workflows functional
- [ ] No reported issues from users
- [ ] Support team monitoring
- [ ] Analytics recording correctly
- [ ] Notifications sending
- [ ] Email sending working
- [ ] Payments processing (if applicable)

### Extended Monitoring (First 24 hours)
- [ ] Error rate stable
- [ ] Performance stable
- [ ] No database issues
- [ ] No cache issues
- [ ] Resource usage normal
- [ ] No memory leaks
- [ ] API quota acceptable

## Post-Deployment

### Immediate (1-4 hours)
- [ ] Create deployment summary
- [ ] Document any issues
- [ ] Update status page
- [ ] Communicate to team
- [ ] Stand down emergency status

### Short-term (24 hours)
- [ ] Run full test suite again
- [ ] Verify all features working
- [ ] Check user feedback
- [ ] Review metrics and logs
- [ ] Update documentation

### Follow-up (1 week)
- [ ] Retrospective meeting
- [ ] Document lessons learned
- [ ] Update procedures if needed
- [ ] Archive logs and metrics
- [ ] Plan improvements

## Rollback Procedure

### When to Rollback
- Critical feature broken
- Data corruption detected
- Security vulnerability discovered
- Performance degraded >50%
- Error rate >5%
- Deployment didn't complete

### Rollback Steps
1. [ ] Alert incident commander
2. [ ] Verify rollback decision
3. [ ] Notify team and users
4. [ ] Stop traffic to new version
5. [ ] Revert to previous version
6. [ ] Verify health checks
7. [ ] Monitor for 30 minutes
8. [ ] Communicate status
9. [ ] Root cause analysis

### Rollback Time
- Target: <5 minutes
- Acceptable: <15 minutes
- Test rollback every month

## Environment Checklist

### Development
```
✓ NODE_ENV=development
✓ Debug logging enabled
✓ CORS permissive
✓ Rate limiting disabled
✓ Database local/test
```

### Staging
```
✓ NODE_ENV=staging
✓ Debug logging enabled
✓ CORS controlled
✓ Rate limiting enabled
✓ Database staging copy
✓ Monitoring enabled
```

### Production
```
✓ NODE_ENV=production
✓ Debug logging disabled
✓ CORS restricted
✓ Rate limiting strict
✓ Database production
✓ Monitoring critical
✓ Backups enabled
✓ TLS/HTTPS required
```

## Secrets Management

### Deployment Secrets
- [ ] JWT_SECRET (>32 chars, random)
- [ ] DATABASE_URL (prod DB connection)
- [ ] REDIS_PASSWORD (strong password)
- [ ] API_KEYS (all providers)
- [ ] SIGNING_KEY (for tokens)
- [ ] ENCRYPTION_KEY (for sensitive data)

### Verification
- [ ] No secrets in code
- [ ] No secrets in logs
- [ ] No secrets in error messages
- [ ] Secrets rotated regularly
- [ ] Backup encryption keys exist
- [ ] Access logs show who accessed secrets

## Incident Response

### Incident Severity Levels
- **S1**: Critical service down (immediate response)
- **S2**: Major feature broken (within 15 min)
- **S3**: Minor issue or degradation (within 1 hour)
- **S4**: Low priority (next business day)

### Incident Response Steps
1. Assess severity and impact
2. Notify incident commander
3. Page on-call team if S1/S2
4. Investigate root cause
5. Implement fix or rollback
6. Verify resolution
7. Post-mortem within 24h
8. Document improvements

## Post-Deployment Communication

### Status Page Update
```
VirtualPC v1.0.0 deployed to production
- Deployment time: 15 minutes
- Zero downtime achieved
- All systems nominal
- No user impact
```

### Team Notification
```
@team VirtualPC v1.0.0 is now live in production!
✓ All features enabled
✓ Performance metrics nominal
✓ No known issues
```

### User Communication
```
VirtualPC has been upgraded with new features:
- Advanced analytics dashboard
- Improved performance (20% faster)
- Enhanced security
```

## Compliance & Audit

- [ ] Change log entry created
- [ ] Deployment documented
- [ ] Performance baseline recorded
- [ ] Security scan results archived
- [ ] Compliance requirements met
- [ ] Audit trail complete
- [ ] Backup retention verified

## Success Criteria

Deployment is successful if:
- ✓ All health checks pass
- ✓ Error rate <0.1%
- ✓ Response time p99 <10ms
- ✓ No critical bugs found
- ✓ All features working
- ✓ User feedback positive
- ✓ No data loss
- ✓ Zero user impact

## Deployment Timeline

```
Day 0 (48 hours before):
├─ Final code review
├─ Testing & QA
└─ Staging deployment

Day 1 (24 hours before):
├─ Staging validation
├─ Monitoring setup
└─ Team briefing

Day 2 (Deployment day):
├─ 09:00 - Pre-flight checks
├─ 10:00 - Begin deployment
├─ 10:15 - Verify production
├─ 10:30 - Business verification
├─ 11:00 - Stand down
└─ 12:00+ - Extended monitoring

Day 3-7 (Post-deployment):
├─ Daily monitoring
├─ Metrics review
└─ Improvements planning
```

## Emergency Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Incident Commander | [Name] | +1-XXX-XXX-XXXX | @ic |
| On-Call Engineer | [Name] | +1-XXX-XXX-XXXX | @oncall |
| DevOps Lead | [Name] | +1-XXX-XXX-XXXX | @devops |
| Product Manager | [Name] | +1-XXX-XXX-XXXX | @pm |

## Resources

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [K8S Deployment](./K8S-DEPLOYMENT-GUIDE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [Performance Guide](./PERFORMANCE-GUIDE.md)
- [Security Guide](./API-SECURITY.md)

---

**Last Updated**: 2026-04-12  
**Next Review**: 2026-05-12  
**Version**: 1.0.0
