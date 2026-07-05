# ADR-002: PostgreSQL Dynamic Secrets

## Status

Accepted for local-dev demo.

## Context

Each NestJS service needs PostgreSQL access limited to its own tables.

## Decision

Use Vault Database Secrets Engine with `postgresql-database-plugin` and one role per service.

Roles:

- `product-service-role`
- `customer-service-role`
- `inventory-service-role`
- `order-service-role`
- `payment-service-role`

Shared code fetches `database/creds/<role>`, initializes a TypeORM `DataSource`, renews the lease, rotates on failure, and revokes old leases after draining.

## Consequences

Positive:

- generated credentials are short-lived
- each service receives table-specific grants
- lease and connection lifecycle logic is shared

Negative:

- local TTLs are intentionally short for testing
- lease IDs are logged for operational troubleshooting
- full production failure testing has not been completed

## Production Readiness

The architecture is production-oriented, but this local implementation is not production-ready until acceptance criteria are verified in a hardened environment.
