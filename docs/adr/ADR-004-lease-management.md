# ADR-004: Lease Management

## Status

Accepted for local-dev demo.

## Context

Dynamic database credentials require lifecycle management: initial fetch, renewal, rotation, recovery after revoke/expiration, and cleanup.

## Decision

Centralize lease lifecycle logic in shared managers:

- PostgreSQL: `DatabaseConnectionManager`
- MongoDB: `MongoConnectionManager` and `MongoLeaseManager`

Managers fetch credentials at startup, schedule renewal at a fraction of TTL, rotate on renewal failure or low TTL, and revoke drained leases.

## Consequences

Positive:

- services do not duplicate Vault lease logic
- PostgreSQL dynamic flow is preserved
- MongoDB dynamic flow follows the same lifecycle model
- credentials rotate without service restart

Negative:

- retry behavior is local and process-local
- no distributed coordination exists
- no production alerting is wired to lease renewal failures

## Production Readiness

The pattern is appropriate for production review, but production readiness is not claimed without verified acceptance tests for revoke, expiry, Vault outage, database failover, and metrics/alerts.
