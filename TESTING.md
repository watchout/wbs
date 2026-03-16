# WBS Testing Guide

> Comprehensive testing strategy for the Whiteboard Signage System

---

## Overview

WBS uses a multi-layered testing approach to ensure reliability, performance, and maintainability:

| Layer | Tool | Coverage | Frequency |
|-------|------|----------|-----------|
| **Unit** | Vitest | Composables, utilities, helpers | On save (watch) / commit |
| **Integration** | Vitest + mocks | Server routes, API handlers | On commit |
| **E2E** | Playwright | User workflows, critical paths | On PR / pre-deploy |
| **Load** | k6 | Real-world traffic simulation | Weekly / pre-production |
| **Performance** | Lighthouse | PWA, accessibility, SEO | On build |
| **Type Safety** | vue-tsc | TypeScript compile errors | On commit |

---

## Unit Testing (Vitest)

### Setup

Tests are in `tests/` directory, organized by feature:

```
tests/
├── setup.ts              # Global test setup
├── helpers.ts            # Shared test utilities
├── security.test.ts      # Security/auth tests
├── notification.test.ts  # Notification system tests
├── scheduleVersion.test.ts  # Version control tests
├── backup.test.ts        # Backup/restore logic tests
├── ai-chat.test.ts       # AI integration tests
└── e2e/                  # Playwright E2E specs
    ├── auth.spec.ts
    ├── api.spec.ts
    └── navigation.spec.ts
```

### Configuration

Vitest is configured in `vitest.config.ts`:

```typescript
{
  environment: 'node',
  setupFiles: ['./tests/setup.ts'],
  exclude: ['node_modules/**', 'tests/e2e/**'],
  coverage: {
    provider: 'v8',
    lines: 15,           // Minimum threshold
    functions: 15,
    branches: 10,
    statements: 15
  }
}
```

### Running Unit Tests

```bash
# Run once
$ pnpm test

# Watch mode (rerun on file changes)
$ pnpm test:watch

# With coverage report (HTML + JSON + LCOV)
$ pnpm test:coverage

# Specific file
$ pnpm test -- tests/security.test.ts

# With verbose output
$ pnpm test -- --reporter=verbose
```

### Writing a Unit Test

Example: Testing a composable

```typescript
// composables/useSchedule.ts
import { describe, it, expect } from 'vitest'
import { useSchedule } from '~/composables/useSchedule'

describe('useSchedule', () => {
  it('should create a new schedule', () => {
    const { createSchedule } = useSchedule()
    const schedule = createSchedule({
      title: 'Team Meeting',
      startTime: new Date('2024-03-16T10:00:00'),
      endTime: new Date('2024-03-16T11:00:00')
    })

    expect(schedule).toHaveProperty('id')
    expect(schedule.title).toBe('Team Meeting')
  })

  it('should validate time range', () => {
    const { createSchedule } = useSchedule()
    
    expect(() => {
      createSchedule({
        title: 'Invalid',
        startTime: new Date('2024-03-16T11:00:00'),
        endTime: new Date('2024-03-16T10:00:00')  // End before start!
      })
    }).toThrow('End time must be after start time')
  })
})
```

### Coverage Thresholds

Minimum coverage requirements:
- **Lines**: 15%
- **Functions**: 15%
- **Branches**: 10%
- **Statements**: 15%

Generate and view coverage:

```bash
$ pnpm test:coverage
# Open coverage/index.html in browser
```

### Best Practices

✅ **DO:**
- Test behavior, not implementation details
- Use descriptive test names (`should validate email format`)
- Mock external dependencies (API calls, database)
- Keep tests focused and independent
- Use fixtures for reusable test data

❌ **DON'T:**
- Write tests that depend on test execution order
- Mock everything (test real logic paths)
- Skip error cases or edge conditions
- Leave test code as documentation only (also update docs)

---

## Integration Testing

Integration tests in Vitest verify component & API interactions:

```typescript
// tests/notification.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationService } from '~/server/services/notification'
import { PrismaClient } from '@prisma/client'

describe('NotificationService', () => {
  let service: NotificationService
  let prisma: PrismaClient

  beforeEach(() => {
    prisma = new PrismaClient()
    service = new NotificationService(prisma)
  })

  it('should send notification and log to database', async () => {
    const spy = vi.spyOn(service, 'send')
    
    await service.notify({
      userId: 'user-123',
      message: 'Schedule updated',
      type: 'update'
    })

    expect(spy).toHaveBeenCalled()
    // Verify database write
  })
})
```

---

## E2E Testing (Playwright)

### Setup

Playwright E2E tests are in `tests/e2e/`:

```typescript
// playwright.config.ts
{
  testDir: './tests/e2e',
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: false
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry'
  }
}
```

### Running E2E Tests

```bash
# Run all E2E tests (starts dev server automatically)
$ pnpm e2e

# Specific test file
$ pnpm e2e tests/e2e/auth.spec.ts

# UI mode (interactive)
$ pnpm e2e -- --ui

# Debug mode (step through)
$ pnpm e2e -- --debug
```

### Example E2E Test

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can sign in with OAuth', async ({ page }) => {
    // Navigate to login
    await page.goto('/')
    await page.click('text=Sign In')

    // Fill OAuth form (mocked)
    await page.fill('input[name="email"]', 'test@example.com')
    await page.click('button:has-text("Continue")')

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Welcome')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.click('button:has-text("Sign In")')

    await expect(page.locator('.error-message')).toContainText('Invalid credentials')
  })
})
```

### Best Practices

✅ **DO:**
- Test critical user workflows (auth, schedule creation, sync)
- Use page object model for complex scenarios
- Test across browsers (Chrome, Firefox, Safari)
- Mock external APIs (Google Calendar, OAuth providers)

❌ **DON'T:**
- Test implementation details (DOM selectors can change)
- Create brittle tests dependent on visual regression
- Test error states that only happen in production

---

## Load Testing (k6)

Load tests simulate real-world traffic patterns using k6:

```bash
# Run load test
$ npm run perf:load

# Custom scenario
$ k6 run scripts/k6_schedule_sync.js --vus 100 --duration 5m
```

### Example Load Test

```javascript
// scripts/k6_schedule_sync.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 200,           // 200 concurrent users
  duration: '15m',    // 15 minutes
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // P95 < 500ms
    http_req_failed: ['rate<0.1']  // 10% failure rate threshold
  }
}

export default function () {
  // Simulate user syncing a schedule
  const res = http.post('http://localhost:3000/api/schedule/sync', {
    schedule: { title: 'Meeting', start: '10:00' }
  })

  check(res, {
    'status is 200': (r) => r.status === 200,
    'sync completes under 500ms': (r) => r.timings.duration < 500
  })

  sleep(1)  // Wait 1s before next request
}
```

Targets:
- **P95 latency**: <500ms
- **P99 latency**: <1s
- **Error rate**: <10%

---

## Performance & PWA (Lighthouse)

Lighthouse audits measure:
- **Performance**: Load time, rendering metrics
- **PWA**: Installability, offline support
- **Accessibility**: WCAG compliance
- **SEO**: Search engine optimization

```bash
# Run automated Lighthouse check in CI
# (Triggered on PR & pre-deploy)
```

Target score: **≥80** (desktop PWA)

---

## CI/CD Pipeline

### GitHub Actions Workflow

Automated on every `push` to `main` and `pull_request`:

1. **Lint** (2 min)
   - ESLint + Stylelint + Prettier

2. **Type Check** (3 min)
   - vue-tsc full project check

3. **Tests** (5 min)
   - Unit tests + coverage
   - Coverage threshold validation
   - Test performance analysis
   - Coverage report upload to artifacts

4. **Build** (4 min)
   - Nuxt SSR/SSG build check
   - Build size analysis

**Total CI time**: ~15 minutes per PR

See `.github/workflows/ci.yml` for full pipeline configuration.

### CI Environment

Tests run in Docker with:
- Node 20
- PostgreSQL 15 (test service)
- Ubuntu latest

Test database:
```sql
postgresql://test:test@localhost:5432/wbs_test
```

---

## Debugging Tests

### Print Debug Info

```typescript
import { describe, it, expect } from 'vitest'

it('should debug values', () => {
  const result = someFunction()
  console.log('🐛 Result:', result)  // Visible with --reporter=verbose
  expect(result).toBe('expected')
})
```

Run with verbose output:
```bash
$ pnpm test -- --reporter=verbose
```

### Interactive Debugging

```bash
# Node debugger
$ node --inspect-brk node_modules/.bin/vitest

# Then open chrome://inspect
```

### Playwright Inspector

```bash
# UI mode with inspector
$ pnpm e2e -- --ui

# Debug single test
$ pnpm e2e -- --debug
```

---

## Coverage Goals & Roadmap

### Current State (March 2024)
- **Threshold**: 15% line coverage
- **Coverage**: Targeting critical paths (auth, sync, notifications)

### Near-term (Q2 2024)
- ✅ E2E tests for all user workflows
- ✅ Load testing with k6 (200 RPS)
- ✅ Performance budget <500ms P95

### Long-term (H2 2024)
- 📊 Increase unit coverage to 50%+
- 📊 Add visual regression testing
- 📊 Implement chaos testing for resilience

---

## Troubleshooting

### Tests timeout
```bash
# Increase timeout for slow systems
$ pnpm test -- --testTimeout=10000
```

### Database connection errors in CI
```bash
# Check postgres service is healthy
$ docker logs <container_id>
```

### E2E test flakiness
- Use explicit waits instead of hard sleeps
- Verify network conditions in CI
- Check for race conditions in async code

### Coverage not updating
```bash
# Clear cache
$ rm -rf coverage/ .vitest
$ pnpm test:coverage
```

---

## Resources

- **Vitest**: https://vitest.dev
- **Playwright**: https://playwright.dev
- **k6**: https://k6.io
- **Lighthouse**: https://developers.google.com/web/tools/lighthouse

---

## Questions?

Check the [main README](README.md) or existing test files in `tests/` for patterns.
