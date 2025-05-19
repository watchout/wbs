# DevOps Strategy

*Japanese version: [devops.ja.md](./devops.ja.md)*

The Whiteboard Signage System (WBS) follows a reproducible and automated approach to deploying and maintaining the service. The main components are:

## Infrastructure as Code

* **Terraform** provisions the ConoHa VPS environment, including the load balancer and object storage. A single command (`terraform apply`) spins up the infrastructure.
* A bootstrap script installs Docker and Watchtower on the newly created VPS.

## Containerization and Deployment

* The application and dependencies run in Docker containers. A `docker compose` setup allows running the full stack locally in a production‑like manner.
* GitHub Actions builds the Docker image and deploys via SSH. Watchtower monitors the registry and updates the running containers when a new image is available.

## Continuous Integration

* CI enforces code quality using `pnpm lint`, unit tests with Vitest, and end‑to‑end tests with Playwright.
* Pull requests must pass all checks before merging. Once merged, GitHub Actions automatically deploys to the staging environment.

## Environment Management

* All services use environment variables (see `.env.sample`) for secrets and configuration. Key variables include database credentials, Google OAuth settings, JWT secret, and `APP_BASE_URL`.

## Quality Gates

* Unit tests aim for 90% line coverage.
* Playwright provides cross‑browser e2e coverage.
* Load testing with k6 and PWA audits with Lighthouse ensure performance and offline readiness.

This DevOps workflow delivers reliable deployments and keeps environments reproducible from development through production.
