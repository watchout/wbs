# WBS  Whiteboard Signage System

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

## GettingStarted (Dev)

```bash
# 1. Clone & install deps
$ git clone git@github.com:watchout/wbs.git && cd wbs
$ pnpm install

# 2. Copy env template & fill Google creds
$ cp .env.sample .env.local

# 3. Start dev stack (Nuxt + SQLite)
$ pnpm dev

# 4. Prisma studio (optional)
$ pnpm prisma:studio
```

### Prerequisites

* **Node20**
* **pnpm**
* **Docker24** (for Postgres/Redis)
* **Terraform1.7** (if provisioning infra)

---

## ProjectScripts

| Script                 | What it does                        |
| ---------------------- | ----------------------------------- |
| `pnpm dev`             | Nuxtdev server + hmr               |
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
| `APP_BASE_URL`                              | e.g. `https://wbs.example.com`    |

See `.env.sample` for full list.

---

## Documentation

For a full list of functional requirements, see:

- [Functional Specification (EN)](docs/functional_spec.md)
- [機能仕様書 (JA)](docs/functional_spec.ja.md)

---

## Quality Gates

* **Unit**  Vitest (90% line coverage target)
* **E2E**  Playwright on Chrome & AndroidWebView
* **Load**  k6 (`scripts/k6_schedule_sync.js`, 200rps for 15min)
* **Lighthouse**  PWA score 80

---

## Contributing

1. Fork  featurebranch  PR (ConventionalCommits)
2. `pnpm lint && pnpm test` must pass
3. Reviewers: any `@watchout/core` member
4. Once merged, GitHubActions autodeploys to staging

---

## License

MIT  2025watchout

