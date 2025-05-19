# Tasks Backlog

Below is a list of atomic tasks derived from [functional_spec.md](docs/functional_spec.md).

| ID | Task |
|----|------|
| T1 | Implement realtime room synchronization via WebSocket (Socket.IO) with latency under 1 second (P95). |
| T2 | Add bidirectional Google Calendar integration using incremental sync and webhooks. |
| T3 | Provide offline kiosk support as a PWA with IndexedDB caching for 24 hours. |
| T4 | Implement multilanguage interface supporting `ja`, `en`, `vi`, `zhHans`, `fil`, `ne`, `ptBR`. |
| T5 | Add role based access control with `ADMIN`, `MEMBER`, and `DEVICE` roles using OAuth2 and MagicLink authentication. |
| T6 | Use Terraform (ConoHa provider) to deploy VPS and load balancer as code. |
| T7 | Configure CI/CD so GitHub Actions build Docker images, deploy over SSH, and Watchtower handles updates. |
| T8 | Set up system architecture: browsers and kiosks connect via HTTPS/WSS through an Nginx load balancer to multiple Nuxt instances using Prisma with PostgreSQL WAL stored in object storage. |
| T9 | Document development steps: clone repo, install deps, create `.env.local` from template with Google creds, run `pnpm dev`, optionally open Prisma Studio. |
| T10 | Verify prerequisites: Node 20, pnpm, Docker 24, Terraform 1.7. |
| T11 | Include project scripts such as `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm e2e`, `pnpm prisma:migrate`, `pnpm prisma:generate`, `pnpm prisma:studio`. |
| T12 | Provide docker-compose setup to build and run the local multi-service stack with ports for Nuxt and Postgres. |
| T13 | Document deployment workflow using Terraform in `infra`, running `scripts/bootstrap_vps.sh`, and building/pushing images via CI. |
| T14 | Describe required environment variables including `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `APP_BASE_URL`. |
| T15 | Enforce quality gates: Vitest 90% coverage, Playwright E2E tests, k6 load test 200 rps for 15 mins, Lighthouse PWA score 80. |
| T16 | Provide contribution guidelines: feature branches with Conventional Commits, `pnpm lint && pnpm test` passing, review by `@watchout/core`, merges auto-deploy to staging. |
| T17 | Apply MIT license attribution © 2025 watchout. |

## Detailed Task Breakdown

### T1 Realtime room synchronization
- **T1-a Socket.IO server setup**
  1. **T1-a-1** Install Socket.IO and create a basic server.
  2. **T1-a-2** Configure CORS and connection middleware.
  3. **T1-a-3** Log connect and disconnect events.
  4. **T1-a-4** Document server launch command.
- **T1-b Event and data definitions**
  1. **T1-b-1** Define event names for join, leave, update.
  2. **T1-b-2** Describe payload schemas.
  3. **T1-b-3** Implement event handlers.
  4. **T1-b-4** Validate incoming data.
- **T1-c Reconnection support**
  1. **T1-c-1** Implement automatic reconnect.
  2. **T1-c-2** Buffer events during reconnect.
  3. **T1-c-3** Handle connection errors.
  4. **T1-c-4** Test reconnection flows.
- **T1-d Redis Adapter for scaling**
  1. **T1-d-1** Add redis adapter package.
  2. **T1-d-2** Configure adapter with environment vars.
  3. **T1-d-3** Ensure multi-instance broadcast.
  4. **T1-d-4** Benchmark latency.
- **T1-e Performance measurement**
  1. **T1-e-1** Add metrics instrumentation.
  2. **T1-e-2** Run load tests to measure P95 latency.
  3. **T1-e-3** Optimize event serialization.
  4. **T1-e-4** Document results.

### T2 Google Calendar integration
- **T2-a OAuth credentials**
  1. **T2-a-1** Register app and obtain client ID/secret.
  2. **T2-a-2** Implement auth redirect handler.
  3. **T2-a-3** Store refresh tokens securely.
  4. **T2-a-4** Add token refresh logic.
- **T2-b Incremental sync**
  1. **T2-b-1** Save sync tokens per user.
  2. **T2-b-2** Build scheduled sync job.
  3. **T2-b-3** Update events in the database.
  4. **T2-b-4** Handle token updates.
- **T2-c Webhook endpoint**
  1. **T2-c-1** Expose endpoint to receive calendar updates.
  2. **T2-c-2** Verify webhook signatures.
  3. **T2-c-3** Queue changed events for processing.
  4. **T2-c-4** Acknowledge notifications.
- **T2-d Conflict resolution**
  1. **T2-d-1** Detect event changes from both sides.
  2. **T2-d-2** Apply merge strategy for conflicts.
  3. **T2-d-3** Log conflicts for review.
  4. **T2-d-4** Unit test merging logic.

### T3 Offline kiosk support
- **T3-a PWA manifest**
  1. **T3-a-1** Create manifest with icons.
  2. **T3-a-2** Register service worker.
  3. **T3-a-3** Ensure offline caching.
  4. **T3-a-4** Test installation.
- **T3-b IndexedDB cache**
  1. **T3-b-1** Define data schema for caching.
  2. **T3-b-2** Implement fetch and store logic.
  3. **T3-b-3** Evict data after 24h.
  4. **T3-b-4** Provide fallback to stale data.
- **T3-c Offline queue**
  1. **T3-c-1** Buffer operations while offline.
  2. **T3-c-2** Persist queue to IndexedDB.
  3. **T3-c-3** Resubmit when back online.
  4. **T3-c-4** Handle conflicts.
- **T3-d Auto retry**
  1. **T3-d-1** Detect network status changes.
  2. **T3-d-2** Retry failed updates.
  3. **T3-d-3** Show offline indicator.
  4. **T3-d-4** Configure retry interval.

### T4 Multilanguage interface
- **T4-a Setup i18n**
  1. **T4-a-1** Install Nuxt i18n.
  2. **T4-a-2** Configure available languages.
  3. **T4-a-3** Provide fallback locale.
  4. **T4-a-4** Add demo page.
- **T4-b Extract texts**
  1. **T4-b-1** Move UI strings to locale files.
  2. **T4-b-2** Use message keys in templates.
  3. **T4-b-3** Provide English translations.
  4. **T4-b-4** Provide Japanese translations.
- **T4-c Additional languages**
  1. **T4-c-1** Add Vietnamese locale file.
  2. **T4-c-2** Add simplified Chinese file.
  3. **T4-c-3** Add Filipino file.
  4. **T4-c-4** Add Nepali and Portuguese(BR) files.
- **T4-d Language switcher**
  1. **T4-d-1** Implement language switch component.
  2. **T4-d-2** Persist selected language.
  3. **T4-d-3** Auto-detect browser locale.
  4. **T4-d-4** Unit test the switcher.

### T5 Role based access control
- **T5-a Prisma schema**
  1. **T5-a-1** Add `role` column to user table.
  2. **T5-a-2** Run migration for new field.
  3. **T5-a-3** Update user model logic.
  4. **T5-a-4** Seed admin account.
- **T5-b Authentication flows**
  1. **T5-b-1** Implement OAuth2 login.
  2. **T5-b-2** Add MagicLink fallback.
  3. **T5-b-3** Store role in session.
  4. **T5-b-4** Document login steps.
- **T5-c Authorization guards**
  1. **T5-c-1** Create middleware for route protection.
  2. **T5-c-2** Decorate pages with required roles.
  3. **T5-c-3** Provide unauthorized redirect.
  4. **T5-c-4** Test guard logic.
- **T5-d Admin UI**
  1. **T5-d-1** Build role management page.
  2. **T5-d-2** Allow editing user roles.
  3. **T5-d-3** Audit log role changes.
  4. **T5-d-4** Add unit tests.

### T6 Terraform infrastructure
- **T6-a Modules**
  1. **T6-a-1** Set up VPS module.
  2. **T6-a-2** Configure load balancer module.
  3. **T6-a-3** Add object storage module.
  4. **T6-a-4** Output IP addresses.
- **T6-b tfvars sample**
  1. **T6-b-1** Create `terraform.tfvars.example`.
  2. **T6-b-2** Document required variables.
  3. **T6-b-3** Provide placeholder credentials.
  4. **T6-b-4** Update README instructions.
- **T6-c Apply script**
  1. **T6-c-1** Write script to run `terraform init` and `apply`.
  2. **T6-c-2** Include backend config options.
  3. **T6-c-3** Check for plan output.
  4. **T6-c-4** Secure state files.
- **T6-d Resource outputs**
  1. **T6-d-1** Capture output values.
  2. **T6-d-2** Export as `.env` snippet.
  3. **T6-d-3** Document value usage.
  4. **T6-d-4** Validate with `terraform output`.

### T7 CI/CD configuration
- **T7-a Build workflow**
  1. **T7-a-1** Create GitHub Actions for Docker build.
  2. **T7-a-2** Push images to registry.
  3. **T7-a-3** Trigger on PR merges.
  4. **T7-a-4** Cache pnpm modules.
- **T7-b Deploy secrets**
  1. **T7-b-1** Store SSH keys as repository secrets.
  2. **T7-b-2** Provide secret env variables.
  3. **T7-b-3** Use secrets in deploy job.
  4. **T7-b-4** Document key rotation.
- **T7-c Watchtower**
  1. **T7-c-1** Deploy Watchtower container.
  2. **T7-c-2** Configure polling interval.
  3. **T7-c-3** Tag images with semver.
  4. **T7-c-4** Test auto-update.
- **T7-d PR pipeline**
  1. **T7-d-1** Add test job on pull requests.
  2. **T7-d-2** Build images for verification.
  3. **T7-d-3** Run lint and unit tests.
  4. **T7-d-4** Report build status.

### T8 System architecture
- **T8-a Nginx configuration**
  1. **T8-a-1** Create Dockerfile for Nginx.
  2. **T8-a-2** Set up HTTPS/WSS reverse proxy.
  3. **T8-a-3** Include Let's Encrypt settings.
  4. **T8-a-4** Provide reload script.
- **T8-b Compose definitions**
  1. **T8-b-1** Define multiple Nuxt services.
  2. **T8-b-2** Add Postgres container.
  3. **T8-b-3** Link Redis for sockets.
  4. **T8-b-4** Configure compose network.
- **T8-c Prisma environment**
  1. **T8-c-1** Add env variables for database.
  2. **T8-c-2** Configure connection pooling.
  3. **T8-c-3** Document in `.env.sample`.
  4. **T8-c-4** Provide sample connection string.
- **T8-d WAL object storage**
  1. **T8-d-1** Configure WAL archiving.
  2. **T8-d-2** Add cron job to clean logs.
  3. **T8-d-3** Monitor disk usage.
  4. **T8-d-4** Document restore process.

### T9 Development documentation
- **T9-a Setup steps**
  1. **T9-a-1** Document git clone commands.
  2. **T9-a-2** Add `pnpm install` instructions.
  3. **T9-a-3** Provide `.env.sample` copying.
  4. **T9-a-4** Explain dev server start.
- **T9-b Environment template**
  1. **T9-b-1** List variables in `.env.sample`.
  2. **T9-b-2** Comment each variable purpose.
  3. **T9-b-3** Highlight mandatory vs optional.
  4. **T9-b-4** Link to detailed docs.
- **T9-c Running dev**
  1. **T9-c-1** Show `pnpm dev` command.
  2. **T9-c-2** Document expected output.
  3. **T9-c-3** Provide troubleshooting tips.
  4. **T9-c-4** Mention hot reload.
- **T9-d Prisma Studio**
  1. **T9-d-1** Provide command to open.
  2. **T9-d-2** Document login requirements.
  3. **T9-d-3** Show screenshot example.
  4. **T9-d-4** Encourage safe usage.

### T10 Prerequisite verification
- **T10-a Node version script**
  1. **T10-a-1** Add script to verify Node 20+.
  2. **T10-a-2** Print error if version mismatch.
  3. **T10-a-3** Include in preinstall step.
  4. **T10-a-4** Document usage.
- **T10-b Tool versions**
  1. **T10-b-1** Check pnpm version.
  2. **T10-b-2** Provide `docker --version` check.
  3. **T10-b-3** List Terraform version requirement.
  4. **T10-b-4** Give example commands.
- **T10-c Docker installation**
  1. **T10-c-1** Link to Docker docs.
  2. **T10-c-2** Document apt-based install.
  3. **T10-c-3** Validate with hello-world.
  4. **T10-c-4** Provide cross-platform notes.
- **T10-d Troubleshooting**
  1. **T10-d-1** Document common errors.
  2. **T10-d-2** Provide fix for permissions.
  3. **T10-d-3** Note WSL2 specifics.
  4. **T10-d-4** Provide support contact.

### T11 Project scripts
- **T11-a Verify package.json**
  1. **T11-a-1** List existing scripts.
  2. **T11-a-2** Add missing lint/test/e2e commands.
  3. **T11-a-3** Document each script.
  4. **T11-a-4** Ensure cross-platform paths.
- **T11-b Documentation**
  1. **T11-b-1** Add README section for scripts.
  2. **T11-b-2** Provide example usage.
  3. **T11-b-3** Show command output.
  4. **T11-b-4** Keep docs in sync.
- **T11-c Prisma commands**
  1. **T11-c-1** Document migrate command.
  2. **T11-c-2** Document generate command.
  3. **T11-c-3** Document studio command.
  4. **T11-c-4** Provide env usage examples.
- **T11-d Unified CI commands**
  1. **T11-d-1** Add alias for tests.
  2. **T11-d-2** Use same scripts in CI.
  3. **T11-d-3** Document environment setup.
  4. **T11-d-4** Outline results.

### T12 Docker compose environment
- **T12-a Compose file**
  1. **T12-a-1** Define services Nuxt, Postgres, Redis.
  2. **T12-a-2** Set volumes for database.
  3. **T12-a-3** Map ports for each service.
  4. **T12-a-4** Add depends_on directives.
- **T12-b Networks and volumes**
  1. **T12-b-1** Create network for backend.
  2. **T12-b-2** Persist volumes on host.
  3. **T12-b-3** Provide cleanup script.
  4. **T12-b-4** Document usage.
- **T12-c Environment variables**
  1. **T12-c-1** Use `env_file` directive.
  2. **T12-c-2** Document `.env` path.
  3. **T12-c-3** Provide defaults.
  4. **T12-c-4** Example override.
- **T12-d Usage instructions**
  1. **T12-d-1** Document `docker compose up --build`.
  2. **T12-d-2** Add stop and logs commands.
  3. **T12-d-3** Provide dev helper scripts.
  4. **T12-d-4** Encourage volume cleanup.

### T13 Deployment workflow
- **T13-a Terraform usage**
  1. **T13-a-1** Run `terraform init` in infra directory.
  2. **T13-a-2** Provide `terraform apply` example.
  3. **T13-a-3** Save remote state.
  4. **T13-a-4** Include cost estimation.
- **T13-b Bootstrap script**
  1. **T13-b-1** Outline `scripts/bootstrap_vps.sh` steps.
  2. **T13-b-2** Install server packages.
  3. **T13-b-3** Set up Docker runtime.
  4. **T13-b-4** Document script usage.
- **T13-c CI pipeline**
  1. **T13-c-1** Explain jobs running on merge.
  2. **T13-c-2** Build and push containers.
  3. **T13-c-3** SSH deploy to server.
  4. **T13-c-4** Tag images with git SHA.
- **T13-d Switching environments**
  1. **T13-d-1** Provide staging and prod workspaces.
  2. **T13-d-2** Document environment variables.
  3. **T13-d-3** Add manual approval gate.
  4. **T13-d-4** Document rollback process.

### T14 Environment variables
- **T14-a `.env.sample`**
  1. **T14-a-1** Add placeholders for variables.
  2. **T14-a-2** Comment each variable use.
  3. **T14-a-3** Provide sample values.
  4. **T14-a-4** Keep file tracked in repo.
- **T14-b Secrets management**
  1. **T14-b-1** Store secrets in GitHub.
  2. **T14-b-2** Ignore `.env.local`.
  3. **T14-b-3** Provide env validation script.
  4. **T14-b-4** Outline rotation steps.
- **T14-c Required vs optional**
  1. **T14-c-1** Mark mandatory variables.
  2. **T14-c-2** Provide defaults for optional ones.
  3. **T14-c-3** Document runtime checks.
  4. **T14-c-4** Maintain docs accordingly.
- **T14-d Change procedures**
  1. **T14-d-1** Explain how to rename variables.
  2. **T14-d-2** Document search/replace steps.
  3. **T14-d-3** Provide migration notes.
  4. **T14-d-4** Update README when changed.

### T15 Quality gates
- **T15-a Vitest coverage**
  1. **T15-a-1** Configure coverage threshold.
  2. **T15-a-2** Add coverage reporter.
  3. **T15-a-3** Fail CI when below threshold.
  4. **T15-a-4** Document commands.
- **T15-b Playwright tests**
  1. **T15-b-1** Create tests for Chrome.
  2. **T15-b-2** Add tests for Android WebView.
  3. **T15-b-3** Integrate into CI workflow.
  4. **T15-b-4** Document run instructions.
- **T15-c k6 load test**
  1. **T15-c-1** Write script `scripts/k6_schedule_sync.js`.
  2. **T15-c-2** Configure 200 rps for 15 minutes.
  3. **T15-c-3** Parse and store results.
  4. **T15-c-4** Document trend analysis.
- **T15-d Lighthouse**
  1. **T15-d-1** Measure PWA score.
  2. **T15-d-2** Document metrics collected.
  3. **T15-d-3** Add manual or CI step.
  4. **T15-d-4** Maintain threshold 80.

### T16 Contribution guidelines
- **T16-a Conventional commit template**
  1. **T16-a-1** Provide commit message example.
  2. **T16-a-2** Document commit types.
  3. **T16-a-3** Link to specification.
  4. **T16-a-4** Add commitlint rule.
- **T16-b Prehook**
  1. **T16-b-1** Run `pnpm lint && pnpm test` in husky pre-commit.
  2. **T16-b-2** Document setup steps.
  3. **T16-b-3** Provide fallback instructions.
  4. **T16-b-4** Example commit failure.
- **T16-c Review process**
  1. **T16-c-1** Require review by `@watchout/core`.
  2. **T16-c-2** Document PR template.
  3. **T16-c-3** Add CODEOWNERS file.
  4. **T16-c-4** Provide expected response time.
- **T16-d Auto deploy**
  1. **T16-d-1** Merge to main triggers deployment.
  2. **T16-d-2** Document environment differences.
  3. **T16-d-3** Provide manual rollback instructions.
  4. **T16-d-4** Link to CI logs.

### T17 MIT license
- **T17-a LICENSE file**
  1. **T17-a-1** Add MIT text with © 2025 watchout.
  2. **T17-a-2** Place file at repo root.
  3. **T17-a-3** Reference from README.
  4. **T17-a-4** Document year update process.
- **T17-b Header notices**
  1. **T17-b-1** Add short header in source files.
  2. **T17-b-2** Mention SPDX identifier.
  3. **T17-b-3** Document third-party licenses.
  4. **T17-b-4** Provide automation script.
- **T17-c README license**
  1. **T17-c-1** Add license section to README.
  2. **T17-c-2** Link to LICENSE file.
  3. **T17-c-3** Mention copyright notice.
  4. **T17-c-4** Explain open source obligations.
