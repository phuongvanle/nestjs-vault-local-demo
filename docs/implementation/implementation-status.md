# Implementation Status

## Current State

The local demo includes Vault KV static secrets, PostgreSQL dynamic secrets, MongoDB 4.0/7.0 dynamic secrets, Redis, RabbitMQ, and five NestJS services.

## Implemented

- Docker Compose services for Vault, PostgreSQL, Redis, RabbitMQ, MongoDB 4.0, MongoDB 7.0, and five app services.
- Vault KV bootstrap for PostgreSQL metadata, Redis, RabbitMQ, MongoDB 4.0, and MongoDB 7.0.
- Vault database config for PostgreSQL `appdb`.
- PostgreSQL dynamic roles for all five services.
- Vault database configs for MongoDB 4.0 and MongoDB 7.0.
- MongoDB dynamic roles for product and order services on both Mongo versions.
- Shared PostgreSQL dynamic credential provider and connection manager.
- Shared MongoDB credential provider, lease manager, connection manager, and health indicator.
- Product audit logs in MongoDB.
- Order events in MongoDB.
- Health endpoints with Mongo status.
- Test scripts for microservice flow and Mongo/Vault flow.

## Known Gaps

- Vault dev mode and root token are local only.
- No production Vault policy model is implemented.
- No TLS is configured.
- No production-grade backup/restore runbooks exist in this project.
- No full chaos or load testing has verified lease recovery under stress.
- ESLint is configured as a script but the repo lacks an ESLint 9 flat config.

## Last Updated

2026-07-04.
