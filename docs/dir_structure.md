# Directory Structure

The repository is organized as follows:

```text
.
├── README.md           # Project introduction and quickstart
├── openapi.yaml        # OpenAPI 3 definition for the HTTP API
├── docs/               # Additional documentation
│   ├── devops.md
│   ├── devops.ja.md
│   ├── functional_spec.md
│   ├── functional_spec.ja.md
│   ├── socket_events.md
│   ├── socket_events.ja.md
│   └── ui_flow.mmd
└── prisma/             # Prisma ORM schemas
    ├── schema.prisma
    └── 00~schema.prisma
```

- **README.md** — contains the main overview, setup steps and project scripts.
- **openapi.yaml** — REST API specification used by clients and server.
- **docs/** — collection of architecture and operational guides in English and Japanese.
- **prisma/** — database schema files for Prisma ORM.

