# WBS Whiteboard Signage System

> **Nuxt3 + Prisma + Socket.IO + ConoHaVPS**
> Collaborative scheduling & signage platform replacing physical whiteboards.

---

## Key Features

| Category           | Highlights                                                     |
| ------------------ | -------------------------------------------------------------- |
| **Realtime**      | WebSocket (Socket.IO) roombased sync (<1s P95)              |
| **GoogleSync**    | Bidirectional with incrementalSync & Webhooks                 |
| **Offline Kiosk**  | PWA + IndexedDB (24h cache) keeps screens alive without WiFi |
| **Multilanguage** | ja / en / vi / zhHans / fil / ne / ptBR                      |
| **RBAC**           | `ADMIN / MEMBER / DEVICE` roles; OAuth2& MagicLink auth     |
| **IaC**            | Terraform (ConoHa provider) onecommand infra spinup          |
| **CI/CD**          | GitHubActions  Dockerbuild  SSH deploy + Watchtower        |

---

## Architecture Overview

```mermaid
flowchart TD
  Browser & Kiosk -->|HTTPS/WSS| Nginx_LB
  subgraph DockerSwarm / VPS
    Nginx_LB --> Nuxt_App_1
    Nginx_LB --> Nuxt_App_2
    Nuxt_App_1 -- Prisma --> Postgres
    Nuxt_App_2 -- Prisma --> Postgres
  end
  Postgres -- WALObjectStorage
```

---

## Environment Setup

### Prerequisites

* **Node 20** (LTS)
* **pnpm** (v9+)
* **Docker 24** (Postgres, Redis containers)
* **Terraform 1.7+** (infrastructure provisioning)

### Quick Start (Development)

```bash
# 1. Clone & install dependencies
$ git clone git@github.com:watchout/wbs.git && cd wbs
$ pnpm install

# 2. Configure environment
$ cp .env.sample .env.local
# Required: DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET

# 3. Spin up local services (Postgres + Redis)
$ docker compose up -d postgres redis

# 4. Initialize database
$ pnpm db:push

# 5. Start development server (Nuxt + Socket.IO)
$ pnpm dev

# 6. (Optional) Open Prisma Studio
$ pnpm db:studio
```

The app runs at `http://localhost:3000` with hot-reload enabled.

---

## ProjectScripts

| Script                 | What it does                        |
| ---------------------- | ----------------------------------- |
| `pnpm dev`             | Start Socket.IO server (dev mode)  |
| `pnpm build`           | NuxtSSG/SSR build                  |
| `pnpm lint`            | ESLint + Stylelint + Prettier check |
| `pnpm test`            | Vitest unit tests                   |
| `pnpm e2e`             | Playwright e2e                      |
| `pnpm prisma:migrate`  | DB migration (Postgres)             |
| `pnpm prisma:generate` | Generate Prisma client              |
| `pnpm prisma:studio`   | GUI DB browser                      |

---

## Docker(ProdlikeLocal)

```bash
# Build & run multiservice stack
$ docker compose up --build

# Nuxt: http://localhost:3000
# Postgres: localhost:5432  (user/pass in compose)
```

---

## Deploy (ConoHaVPS)

```bash
# 1. Provision VPS + LB + ObjectStorage
$ cd infra
$ terraform init && terraform apply -auto-approve

# 2. Firsttime remote bootstrap (SSH)
$ ./scripts/bootstrap_vps.sh   # installs docker + watchtower

# 3. Build & push image via CI (automated)
```

> **Hint:** default domains & IPs are output by Terraform (`terraform output`).

---

## EnvironmentVariables

| Key                                         | Description                       |
| ------------------------------------------- | --------------------------------- |
| `DATABASE_URL`                              | Postgres connection string        |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth2 creds                      |
| `JWT_SECRET`                                | 32byte secret for session tokens |
| `APP_BASE_URL`                              | e.g. `https://wbs.example.com` (used for Socket.IO CORS)    |

See `.env.sample` for full list.

---

## Documentation

For a full list of functional requirements, see:

- [Functional Specification (EN)](docs/functional_spec.md)
- [機能仕様書 (JA)](docs/functional_spec.ja.md)
- [Realtime Socket Events (EN)](docs/socket_events.md)
- [リアルタイムイベント仕様 (JA)](docs/socket_events.ja.md)

---

## Test Strategy

### Coverage Goals
* **Unit Tests**: Vitest with minimum 15% line coverage threshold
* **E2E Tests**: Playwright on Chrome & AndroidWebView
* **Load Testing**: k6 (`scripts/k6_schedule_sync.js`, 200rps for 15min)
* **Performance**: Lighthouse PWA score ≥80
* **Type Safety**: Full TypeScript coverage via vue-tsc

### Test Execution
```bash
# Run all unit tests
$ pnpm test

# Watch mode for development
$ pnpm test:watch

# Generate coverage report (HTML + LCOV)
$ pnpm test:coverage

# Analyze test performance
$ pnpm test:perf

# Run E2E tests (requires running app)
$ pnpm e2e
```

### Quality Gates
Automated CI gates enforce:
* ✅ Lint pass (ESLint + Stylelint + Prettier)
* ✅ TypeScript type safety
* ✅ Unit test suite passes (coverage ≥15%)
* ✅ Build succeeds (Nuxt SSR/SSG)
* ✅ Coverage report uploaded to artifacts

See [TESTING.md](TESTING.md) for detailed testing guide.

---

## Development Workflow

### Local Development Cycle
1. **Create feature branch** from `main`
   ```bash
   $ git checkout -b feat/description
   ```

2. **Code & test locally**
   ```bash
   $ pnpm dev              # Start dev server
   $ pnpm test:watch       # Watch mode for unit tests
   $ pnpm test:coverage    # Check coverage before commit
   ```

3. **Lint & format before commit**
   ```bash
   $ pnpm lint             # ESLint + Stylelint + Prettier check
   $ pnpm typecheck        # Vue/TypeScript type checking
   ```

4. **Use conventional commits**
   ```
   feat: add real-time sync for schedules
   fix: resolve race condition in socket events
   docs: update testing guide
   refactor: simplify notification dispatch
   ```

5. **Push & open PR** (CI runs automatically)
   ```bash
   $ git push origin feat/description
   # Create PR from GitHub UI
   ```

6. **CI pipeline runs**
   - Lint pass ✅
   - Type check ✅
   - Unit tests + coverage ✅
   - Build check ✅
   - Code review + approval ✅

7. **Merge to main** → auto-deployed to staging by GitHub Actions

### Pre-Commit Hooks
Husky is configured to:
- Block commits with TypeScript errors
- Enforce conventional commit format
- Auto-lint staged files

See `.husky/` for hook configuration.

## Contributing

1. Fork → feature branch → PR (ConventionalCommits)
2. `pnpm lint && pnpm test && pnpm typecheck` must pass
3. Reviewers: any `@watchout/core` member
4. Once merged, GitHub Actions auto-deploys to staging

---

## Code Examples

### Real-time Schedule Sync (Socket.IO)

```typescript
// Client: composables/useScheduleSync.ts
export const useScheduleSync = () => {
  const socket = useWebSocket()
  const schedules = ref([])

  // Listen for schedule updates
  socket.on('schedule:updated', (data) => {
    schedules.value = data
  })

  // Emit schedule change
  const updateSchedule = async (id: string, changes: any) => {
    socket.emit('schedule:update', { id, ...changes })
  }

  return { schedules, updateSchedule }
}

// Server: server/api/socket.ts
io.on('connection', (socket) => {
  socket.on('schedule:update', async (data) => {
    const schedule = await db.schedule.update({
      where: { id: data.id },
      data: data
    })
    io.emit('schedule:updated', schedule)
  })
})
```

### Google Calendar Integration

```typescript
// server/services/googleSync.ts
export class GoogleSyncService {
  async syncScheduleToGoogle(scheduleId: string) {
    const schedule = await db.schedule.findUnique({ where: { id: scheduleId } })
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: schedule.title,
        start: { dateTime: schedule.startTime },
        end: { dateTime: schedule.endTime }
      }
    })
  }

  // Webhook for Google → WBS sync
  async handleGoogleWebhook(event: GoogleEvent) {
    await db.schedule.upsert({
      where: { googleEventId: event.id },
      create: {
        title: event.summary,
        startTime: new Date(event.start.dateTime),
        endTime: new Date(event.end.dateTime),
        googleEventId: event.id
      },
      update: {
        title: event.summary,
        startTime: new Date(event.start.dateTime),
        endTime: new Date(event.end.dateTime)
      }
    })
  }
}
```

### Offline PWA Cache Strategy

```typescript
// plugins/serviceworker.client.ts
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}

// Offline-first fetch with fallback
async function fetchWithCache(url: string) {
  try {
    const response = await fetch(url)
    // Cache successful response
    const cache = await caches.open('v1')
    cache.put(url, response.clone())
    return response
  } catch (error) {
    // Return cached version if offline
    const cached = await caches.match(url)
    if (cached) return cached
    throw error
  }
}
```

### Testing Pattern (Unit Test)

```typescript
// tests/scheduleVersion.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ScheduleService } from '~/server/services/schedule'

describe('ScheduleService', () => {
  let service: ScheduleService

  beforeEach(() => {
    service = new ScheduleService()
  })

  it('should increment version on update', async () => {
    const schedule = await service.create({
      title: 'Meeting',
      startTime: new Date()
    })
    expect(schedule.version).toBe(1)

    const updated = await service.update(schedule.id, { title: 'Updated' })
    expect(updated.version).toBe(2)
  })

  it('should validate time constraints', () => {
    expect(() => {
      service.create({
        title: 'Invalid',
        startTime: new Date('2024-03-16T11:00:00'),
        endTime: new Date('2024-03-16T10:00:00')  // Start > End
      })
    }).toThrow('End time must be after start time')
  })
})
```

See [TESTING.md](TESTING.md) for more test examples and [CI-CD.md](CI-CD.md) for deployment examples.

---

## License

MIT License
