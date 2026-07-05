# Production Readiness Acceptance

## Verified Locally

- `npm run build` completed successfully on 2026-07-04 during implementation.
- `npm test -- --runInBand` completed successfully on 2026-07-04 during implementation.
- `docker compose config` completed successfully on 2026-07-04 during implementation.
- Shell syntax checks passed for Vault/Mongo scripts on 2026-07-04 during implementation.

## Required Before Production Claim

- Vault is not running in dev mode.
- Vault auth is non-root and policy-scoped.
- Vault audit device is enabled and reviewed.
- TLS is enabled for Vault, PostgreSQL, MongoDB, Redis, RabbitMQ, and service traffic as required.
- PostgreSQL dynamic credential revoke and expiry recovery are verified under load.
- MongoDB 4.0 dynamic credential revoke and expiry recovery are verified under load.
- MongoDB 7.0 dynamic credential revoke and expiry recovery are verified under load.
- Redis and RabbitMQ static secret handling is reviewed and rotation procedure is documented.
- Health endpoints and metrics are verified to contain no secrets.
- Logs are reviewed to ensure no secret values appear.
- Backup and restore procedures exist for PostgreSQL and MongoDB.
- Monitoring and alerting exist for lease renewal failures, Vault outage, database outage, and dependency readiness.

## Current Production Readiness Statement

This project is a local-dev reference implementation. It is not verified production-ready.
