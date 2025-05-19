# Functional Specification

This document summarizes key requirements extracted from the project README. No additional SRS notes were present in the repository.

## Features
- **Realtime Updates**: schedule data synchronized across rooms with Socket.IO in under one second P95 latency.
- **Google Calendar Sync**: bidirectional synchronization using incremental sync and webhooks.
- **Offline Kiosk Mode**: Progressive Web App with IndexedDB caching keeps signage operational for 24 hours without Wi‑Fi.
- **Multi‑language Support**: interface localized in Japanese, English, Vietnamese, Simplified Chinese, Filipino, Nepali and Brazilian Portuguese.
- **Role‑based Access Control**: `ADMIN`, `MEMBER`, and `DEVICE` roles with OAuth2 and MagicLink authentication.
- **Infrastructure as Code**: one‑command deployment on ConoHa VPS via Terraform.
- **Automated CI/CD**: GitHub Actions builds Docker images and uses SSH deploy with Watchtower.
- **Quality Gates**:
  - Vitest unit tests targeting 90% line coverage.
  - Playwright end‑to‑end tests on Chrome and Android WebView.
  - Load testing with k6 at 200 RPS for 15 minutes.
  - Lighthouse PWA score of 80 or higher.

## Architecture Overview
A load balancer routes HTTPS/WSS traffic to multiple Nuxt application containers which connect to a shared Postgres database via Prisma. Database write‑ahead logs are stored in Object Storage.
