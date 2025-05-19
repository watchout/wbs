# Functional Specification

This document compiles requirements mentioned in the project's README.

- **Realtime Synchronization**: WebSocket (Socket.IO) based room synchronization with a target latency of under one second (P95).
- **Socket.IO Events**: `room:join`, `room:leave`, `room:update` are used for room membership and data updates.
- **Google Calendar Sync**: Bidirectional integration using incremental sync and webhooks.
- **Offline Kiosk Support**: PWA with IndexedDB caching for 24 hours to keep screens functional without WiFi.
- **Multilanguage Interface**: Supports `ja`, `en`, `vi`, `zhHans`, `fil`, `ne`, `ptBR` languages.
- **Role Based Access Control**: `ADMIN`, `MEMBER`, and `DEVICE` roles with OAuth2 and MagicLink authentication.
- **Infrastructure as Code**: Terraform (ConoHa provider) allows one command VPS and load balancer deployment.
- **CI/CD**: GitHub Actions build Docker images and deploy via SSH with Watchtower handling container updates.
- **System Architecture**: Browsers and kiosk devices communicate over HTTPS/WSS through an Nginx load balancer to multiple Nuxt application instances. Each instance connects to PostgreSQL via Prisma. PostgreSQL writes ahead logs are stored in object storage.
- **Development Steps**: clone the repository, install dependencies, copy `.env.sample` to `.env.local` with Google credentials, start the development stack with `pnpm dev`, and optionally launch Prisma Studio.
- **Prerequisites**: Node 20, pnpm, Docker 24 (for Postgres/Redis), Terraform 1.7 (for provisioning infrastructure).
- **Project Scripts**: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm e2e`, `pnpm prisma:migrate`, `pnpm prisma:generate`, `pnpm prisma:studio`.
- **Docker (Prod‑like Local)**: `docker compose up --build` builds and runs the multiservice stack; Nuxt available at http://localhost:3000, Postgres at localhost:5432.
- **Deployment Workflow**: run Terraform in `infra` directory, bootstrap VPS with `scripts/bootstrap_vps.sh`, then build and push container images via CI.
- **Environment Variables**: at minimum `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `APP_BASE_URL`. See `.env.sample` for full list.
- **Quality Gates**: Vitest unit tests targeting 90% coverage, Playwright E2E tests on Chrome and Android WebView, k6 load test at 200 rps for 15 minutes, Lighthouse PWA score of 80.
- **Contribution Requirements**: create feature branch and PR using Conventional Commits; `pnpm lint && pnpm test` must pass; review required by a member of `@watchout/core`; merges trigger automatic staging deployment via GitHub Actions.
- **License**: MIT (© 2025 watchout).

