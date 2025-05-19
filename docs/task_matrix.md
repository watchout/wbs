# Task Matrix

The following table summarizes key tasks and requirements derived from `README.md` and `docs/functional_spec.md`.

| Area | Task/Requirement | Notes & Tools |
| --- | --- | --- |
| **Realtime Sync** | Keep rooms synchronized via WebSocket with <1s P95 latency | Socket.IO based implementation |
| **Google Calendar Sync** | Bidirectional incremental sync triggered by webhooks | Google Calendar API |
| **Offline Kiosk** | PWA with IndexedDB caching for 24h operation without WiFi | Nuxt PWA module |
| **Multilanguage** | Support ja, en, vi, zhHans, fil, ne, ptBR | i18n setup |
| **RBAC** | Roles ADMIN, MEMBER, DEVICE via OAuth2 & MagicLink auth | Role-based permissions |
| **IaC** | Terraform one-command VPS and load balancer creation | `terraform apply` in `infra/` |
| **CI/CD** | Build Docker image and deploy via SSH; Watchtower handles updates | GitHub Actions + Watchtower |
| **Dev Setup** | Clone repo, install dependencies, copy `.env.sample`, run `pnpm dev` | Node 20 + pnpm |
| **Project Scripts** | Build, lint, test, e2e, Prisma commands | `pnpm build` / `pnpm lint` / `pnpm test` ... |
| **Docker (local)** | `docker compose up --build` runs full stack | Docker Compose |
| **Deployment** | Apply Terraform, run bootstrap script, CI pushes image | `infra/` + `scripts/bootstrap_vps.sh` |
| **Environment Variables** | Configure `DATABASE_URL`, Google OAuth, JWT secret, `APP_BASE_URL` | See `.env.sample` |
| **Quality Gates** | 90% unit test coverage, Playwright e2e, k6 load test, Lighthouse PWA 80 | Automated in CI |
| **Contribution** | PRs must pass lint & tests; reviewed by `@watchout/core`; merges autodeploy | Conventional Commits |


