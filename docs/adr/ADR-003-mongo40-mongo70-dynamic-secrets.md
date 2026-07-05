# ADR-003: MongoDB 4.0 and 7.0 Dynamic Secrets

## Status

Accepted for local-dev demo.

## Context

The project needs to validate Vault dynamic MongoDB credentials against both MongoDB 4.0 and MongoDB 7.0 while keeping service logic shared.

## Decision

Add both MongoDB versions to Docker Compose and configure Vault database configs:

- `database/config/mongo40`
- `database/config/mongo70`

Create roles:

- `mongo40-product-role`
- `mongo40-order-role`
- `mongo70-product-role`
- `mongo70-order-role`

Current assignment:

- product-service uses MongoDB 4.0 with `mongo40-product-role`
- order-service uses MongoDB 7.0 with `mongo70-order-role`

## Consequences

Positive:

- validates both Mongo versions locally
- keeps Mongo dynamic credential handling in shared code
- supports credential rotation without service restart

Negative:

- MongoDB root credentials are still static local bootstrap values
- Mongo roles are broad `readWrite` on `appdb`
- no production Mongo hardening is verified

## Production Readiness

Not production-ready as configured. Production requires hardened Mongo auth, TLS, network policy, backups, audit policy, role review, and verified rotation behavior under failure.
