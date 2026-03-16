# CI/CD Documentation

> Automated pipeline for testing, building, and deploying WBS

---

## Overview

WBS uses **GitHub Actions** for continuous integration and deployment:

- **CI Triggers**: Push to `main`, all pull requests
- **Total Runtime**: ~15 minutes per check
- **Deployment**: Auto-deploy to staging after merge

```
[Push/PR] → [Lint] → [Type Check] → [Tests] → [Build] → [Deploy (main only)]
```

---

## Pipeline Stages

### 1. Lint Check (2 min)

Validates code style and formatting.

```bash
# What runs in CI
npm run lint
```

**Checks:**
- ESLint (JavaScript/TypeScript syntax)
- Stylelint (CSS/SCSS style rules)
- Prettier (code formatting)

**Fails if:**
- Syntax errors exist
- Code doesn't match style rules
- Files aren't properly formatted

**Fix locally:**
```bash
$ pnpm lint
```

---

### 2. Type Check (3 min)

Validates TypeScript types across Vue components and server code.

```bash
# What runs in CI
npm run typecheck
```

**Checks:**
- Vue component TypeScript
- Server-side TypeScript
- No implicit `any` types

**Fails if:**
- Type mismatches detected
- Unused variables exist
- Missing type annotations

**Fix locally:**
```bash
$ pnpm typecheck
```

---

### 3. Test Suite (5 min)

Runs unit tests, integration tests, and coverage validation.

```bash
# What runs in CI
npm test                     # Run all tests
npm run test:coverage        # Generate coverage report
npm run test:perf            # Analyze performance
```

**Checks:**
- ✅ All unit tests pass
- ✅ Integration tests pass
- ✅ Coverage meets 15% threshold
- ✅ Test execution time analyzed
- ✅ No type errors in tests

**Environment:**
- PostgreSQL 15 (test instance)
- Node 20
- Linux (Ubuntu latest)

**Test database:**
```
postgresql://test:test@localhost:5432/wbs_test
```

**Fails if:**
- Any test fails
- Coverage drops below 15%
- Database migrations fail

**Coverage report:**
- Uploaded as artifact (30-day retention)
- Path: `coverage/` → HTML & LCOV formats
- Access via: PR → Artifacts tab

**Fix locally:**
```bash
$ pnpm test              # Run once
$ pnpm test:watch        # Watch mode for TDD
$ pnpm test:coverage     # Generate report
```

---

### 4. Build Check (4 min)

Verifies the application builds successfully.

```bash
# What runs in CI
npm run build
```

**Checks:**
- ✅ Nuxt SSR bundle builds
- ✅ No build-time errors
- ✅ All assets generated
- ✅ No circular dependencies

**Build environment:**
```
NODE_ENV=production
NUXT_PUBLIC_SUPABASE_URL=<secret>
NUXT_PUBLIC_SUPABASE_KEY=<secret>
STRIPE_SECRET_KEY=<secret>
```

**Fails if:**
- Build fails
- Assets can't be processed
- Dependencies missing

**Fix locally:**
```bash
$ pnpm build             # Production build
$ pnpm preview           # Test production build locally
```

---

### 5. Deploy (Main only)

After successful merge to `main`:

```
[All checks pass] → [Auto-deploy to staging]
```

**What happens:**
1. Build Docker image
2. Push to registry
3. SSH deploy to staging VPS
4. Watchtower restarts container
5. Database migrations (if any)

**Deploy URL**: `https://staging.wbs.example.com`

**Manual deployment:**
```bash
# Deploy via Terraform
$ cd infra
$ terraform apply -auto-approve

# Or: SSH deploy
$ ./scripts/bootstrap_vps.sh
```

---

## GitHub Actions Files

### Main CI Pipeline

**File**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    # ...
  typecheck:
    # ...
  test:
    # ... includes postgres service
  build:
    # ...
```

Runs on every PR and push to `main`.

### Deploy Pipeline

**File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    # Build → Push → SSH Deploy
```

Runs only after successful CI on `main`.

### Critical Gates

**File**: `.github/workflows/critical-gates.yml`

Advanced checks:
- Security scanning
- SAST (static analysis)
- Dependency vulnerabilities
- License compliance

### SSOT Audit

**File**: `.github/workflows/ssot-audit.yml`

Single Source of Truth validation:
- Schema consistency across services
- Configuration alignment
- Documentation sync

---

## Code Examples

### Example 1: CI Success

```yaml
✅ Lint               PASSED (2m 15s)
✅ Type Check         PASSED (3m 42s)
✅ Tests              PASSED (5m 10s)
   Coverage: 28% (threshold: 15%)
   Coverage report uploaded
✅ Build              PASSED (4m 33s)

→ Ready for deployment
```

### Example 2: CI Failure (Coverage)

```yaml
✅ Lint               PASSED (2m 15s)
✅ Type Check         PASSED (3m 42s)
❌ Tests              FAILED
   Unit tests: 152 passed
   Coverage: 12% (threshold: 15%)
   ⚠️ Coverage is below threshold

→ Blocked until coverage improves
```

### Example 3: Deploy Success

```yaml
✅ All CI checks passed
🚀 Building Docker image...
📦 Pushing to registry...
🔧 SSH deploying to VPS...
🔄 Container restarted
✨ Live at https://staging.wbs.example.com
```

---

## Debugging CI Failures

### View Logs

1. Go to: **PR → Checks tab → Click failed check**
2. Scroll to failed step for details
3. Download artifacts if available

### Common Failures

#### Lint Fails
```
❌ ESLint error: Unexpected var

Fix:
$ pnpm lint      # See exact errors
# Fix files, commit, re-push
```

#### Tests Fail
```
❌ Test "should validate email" failed

Fix:
$ pnpm test -- --reporter=verbose
# Debug locally first, then push
```

#### Coverage Below Threshold
```
❌ Coverage: 10% (threshold: 15%)

Fix:
$ pnpm test:coverage          # Generate report
# Review coverage/index.html to find gaps
# Add tests for untested code paths
```

#### Build Fails
```
❌ Nuxt build error: Cannot find module 'xyz'

Fix:
$ pnpm install                # Ensure all deps installed
$ pnpm build                  # Reproduce locally
```

---

## Environment Variables

### CI Variables

These are automatically set in CI:

```
NODE_VERSION=20
DATABASE_URL=postgresql://test:test@localhost:5432/wbs_test
NUXT_PUBLIC_SUPABASE_URL=<from secrets>
NUXT_PUBLIC_SUPABASE_KEY=<from secrets>
STRIPE_SECRET_KEY=<from secrets>
SESSION_PASSWORD=<from secrets>
```

### Secrets (GitHub)

Sensitive variables stored in **Settings → Secrets and variables**:

| Secret | Usage | Rotation |
|--------|-------|----------|
| `STRIPE_SECRET_KEY` | Stripe API | Quarterly |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature | Quarterly |
| `DATABASE_URL` | Production DB | Never (rotate manually) |
| `SENTRY_DSN` | Error reporting | As needed |
| `DEPLOY_SSH_KEY` | VPS access | Quarterly |

---

## Performance Metrics

### Target Times

| Stage | Target | Actual |
|-------|--------|--------|
| Lint | <3min | ~2m 15s |
| Type Check | <5min | ~3m 42s |
| Tests | <8min | ~5m 10s |
| Build | <5min | ~4m 33s |
| **Total** | **<20min** | **~15min** |

### Optimization Tips

```bash
# Cache dependencies (pnpm)
# → Saves 1-2 minutes per run

# Parallelize jobs where possible
# → Lint & typecheck run in parallel

# Reuse existing server for E2E
# → Avoids duplicate startup time
```

---

## Deployment Flow

### Staging Deployment (Auto)

```
[Merge to main] → [CI passes] → [GitHub Actions] → [Build image] → [Push registry] → [SSH deploy] → [Restart container] → [Live]
```

**Timeline**: ~5 minutes after merge

**Verify**:
```bash
# Check staging is updated
$ curl https://staging.wbs.example.com/api/health

# View logs
$ ssh ubuntu@staging.wbs.example.com
$ docker logs wbs
```

### Production Deployment (Manual)

```bash
# 1. Tag release
$ git tag -a v1.2.3 -m "Release v1.2.3"
$ git push origin v1.2.3

# 2. Terraform apply to production
$ cd infra
$ terraform workspace select production
$ terraform apply

# 3. Verify
$ curl https://wbs.example.com/api/health
```

---

## Troubleshooting

### Workflows not triggering

**Problem**: Push to `main` but no workflow runs

**Fix**:
```bash
# Check if GitHub Actions is enabled
# Settings → Actions → Allow all actions

# Check workflow syntax
$ gh workflow list

# Re-trigger manually
$ gh run list
$ gh run rerun <run_id>
```

### Database connection timeout in tests

**Problem**: `ECONNREFUSED` in CI logs

**Fix**:
```yaml
# In ci.yml, verify postgres service:
services:
  postgres:
    image: postgres:15
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

### Out of disk space

**Problem**: Build fails with "No space left on device"

**Fix**:
```bash
# GitHub provides 14GB, but docker cleanup helps
- name: Clean up
  run: |
    docker system prune -a
    npm cache clean --force
```

### Secrets not accessible

**Problem**: Tests fail with "undefined" for env vars

**Fix**:
```bash
# Verify secrets exist
# Settings → Secrets and variables → Repository secrets

# Check workflow has access
jobs:
  test:
    env:
      STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
```

---

## Best Practices

✅ **DO:**
- Keep workflows simple and readable
- Use matrix for multiple environments
- Cache dependencies aggressively
- Upload coverage/test artifacts
- Document secrets and env vars

❌ **DON'T:**
- Hard-code secrets in YAML
- Run long-running tests in CI
- Skip quality gates
- Commit untracked secrets

---

## Resources

- **GitHub Actions**: https://docs.github.com/en/actions
- **Workflows**: `.github/workflows/`
- **CI Configuration**: `vitest.config.ts`, `playwright.config.ts`
- **Deployment**: `infra/`, `scripts/bootstrap_vps.sh`

---

## Questions?

Check `.github/workflows/` for the source of truth. Contact the team for secret access or deployment issues.
