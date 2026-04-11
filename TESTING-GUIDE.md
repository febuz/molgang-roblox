# VirtualPC Testing & QA Guide

Comprehensive testing strategy for production quality.

## Test Structure

```
tests/
├── unit/               # Unit tests (functions, classes)
├── integration/        # Integration tests (API endpoints)
├── e2e/               # End-to-end tests (full workflows)
└── performance/       # Performance and load tests
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suite
```bash
npm test -- rateLimiter.test.ts
npm test -- api.test.ts
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm test -- --coverage
```

### Integration Tests Only
```bash
npm run test:integration
```

## Unit Tests

Test individual functions and classes in isolation.

### Example: Rate Limiter Tests
```typescript
describe('AdvancedRateLimiter', () => {
  it('should allow requests within limit', () => {
    const limiter = new AdvancedRateLimiter();
    // Test implementation...
  });

  it('should reject requests exceeding limit', () => {
    const limiter = new AdvancedRateLimiter();
    // Test implementation...
  });
});
```

**Coverage Target**: >90% for business logic

## Integration Tests

Test API endpoints with real/mocked dependencies.

### Testing Endpoints
```typescript
describe('API Integration Tests', () => {
  it('should get dashboard stats', async () => {
    const response = await fetch('/api/analytics/dashboard');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('stats');
  });
});
```

**Coverage Target**: All critical paths

## End-to-End Tests

Test complete user workflows.

### Example: User Workflow
```typescript
describe('User Workflow', () => {
  it('should create and manage tasks', async () => {
    // 1. User signs up
    // 2. User creates task
    // 3. User updates task
    // 4. User deletes task
  });
});
```

## Performance Tests

### Load Testing
```bash
# 100 concurrent users, 1000 requests
ab -n 1000 -c 100 http://localhost:3100/api/
```

### Stress Testing
```bash
# Gradually increase load until failure
autocannon -c 100 -d 30 http://localhost:3100/api/
```

### Memory Profiling
```bash
node --inspect dist/index.js
# Chrome DevTools → chrome://inspect
```

## Test Data & Fixtures

### Setup Test Data
```typescript
beforeEach(async () => {
  // Create test users
  await User.create({ name: 'Test User' });
  
  // Create test tasks
  await Task.create({ title: 'Test Task' });
});
```

### Cleanup After Tests
```typescript
afterEach(async () => {
  // Clean up test data
  await User.deleteMany();
  await Task.deleteMany();
});
```

## Mocking & Stubbing

### Mock External Services
```typescript
jest.mock('kafkajs', () => ({
  Kafka: jest.fn(() => ({
    admin: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
  })),
}));
```

### Mock HTTP Requests
```typescript
import nock from 'nock';

nock('https://api.external.com')
  .get('/data')
  .reply(200, { data: 'mocked' });
```

## Coverage Targets

| Layer | Target | Current |
|-------|--------|---------|
| Statements | 90% | 92% |
| Branches | 80% | 88% |
| Functions | 90% | 91% |
| Lines | 90% | 92% |

## CI/CD Integration

Tests run automatically on:
- Every push to feature branch
- Every pull request
- Before deployment

### GitHub Actions
```yaml
- name: Run tests
  run: npm test -- --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Performance Benchmarks

### Target Metrics
- API Response: <10ms p99
- Database Query: <15ms p99
- Cache Hit Rate: >40%
- Throughput: >1000 req/sec

### Running Benchmarks
```bash
npm run benchmark
# Results saved to benchmark-results.json
```

## Security Testing

### OWASP Top 10 Tests
- SQL Injection
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- Authentication bypass
- Authorization bypass
- Insecure Direct Object Reference (IDOR)
- Security misconfiguration
- Sensitive data exposure
- XXE (XML External Entity)
- Broken authentication

### Running Security Tests
```bash
npm run test:security
npm audit
npm audit fix
```

## Accessibility Testing

### WCAG 2.1 Compliance
```bash
npm run test:a11y
```

### Manual Testing Checklist
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast sufficient
- [ ] Focus indicators visible
- [ ] Forms labeled correctly

## Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Testing Browsers
```bash
npm run test:browsers
```

## Continuous Testing

### Watch Mode
```bash
npm run test:watch
```

### Test on Save
```bash
npm run test:watch -- --onlyChanged
```

## Test Reporting

### Coverage Report
```bash
npm test -- --coverage --coverageReporters=html
open coverage/index.html
```

### JUnit XML (for CI)
```bash
npm test -- --reporters=default --reporters=jest-junit
```

### Test Trends
Coverage reports stored in:
```
coverage/
├── coverage-final.json
├── index.html
└── lcov-report/
```

## Debugging Tests

### Run Single Test
```bash
npm test -- --testNamePattern="should allow requests within limit"
```

### Debug with Node Inspector
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

### Console Logging
```typescript
test('example', () => {
  console.log('Debug info');
  expect(true).toBe(true);
});
```

## Test Database

### Setup Test Database
```bash
npm run db:reset:test
```

### Keep Test Data Between Runs
```typescript
jest.setTimeout(10000);
// Don't cleanup between tests
```

## Common Issues

### Tests Timeout
Increase timeout in jest.config.js:
```javascript
testTimeout: 30000  // 30 seconds
```

### Memory Leak in Tests
Cleanup properly:
```typescript
afterEach(() => {
  jest.clearAllTimers();
  jest.restoreAllMocks();
});
```

### Flaky Tests
Use `beforeEach`/`afterEach` to ensure clean state:
```typescript
beforeEach(() => {
  // Reset state
});
```

## Best Practices

1. **Test Behavior, Not Implementation** - Focus on what the code does, not how
2. **Keep Tests DRY** - Extract common setup to helper functions
3. **Use Meaningful Names** - Test name should describe expected behavior
4. **Arrange-Act-Assert** - Clear test structure
5. **Mock External Dependencies** - Don't call real APIs in tests
6. **Test Error Cases** - Not just the happy path
7. **Keep Tests Fast** - Mock slow operations
8. **One Assert Per Test** - Multiple assertions per test is ok if they're related

## Pre-Commit Hooks

Automatically run tests before commit:
```bash
# Install husky
npm install husky

# Add pre-commit hook
husky add .husky/pre-commit "npm test"
```

## Test Dashboard

Monitor test metrics:
```bash
npm run test:dashboard
# View at http://localhost:3001/dashboard
```

## Support & Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Supertest (HTTP Testing)](https://github.com/visionmedia/supertest)
- [Nock (HTTP Mocking)](https://github.com/nock/nock)
