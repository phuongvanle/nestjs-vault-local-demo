# ADR-001: Vault KV Static Secrets

## Status

Accepted for local-dev demo.

## Context

Redis and RabbitMQ credentials are static in the local Docker Compose environment. The services need a consistent way to retrieve them without embedding values in service code.

## Decision

Use Vault KV v2 under `secret/data/dev/*` for static Redis and RabbitMQ credentials and static database location metadata.

## Consequences

Positive:

- keeps static secret retrieval behind the same Vault client path
- avoids hardcoding Redis/RabbitMQ credentials in service code
- preserves a simple local bootstrap flow

Negative:

- static credentials do not rotate automatically
- local defaults are not production-grade

## Production Readiness

This pattern is not production-ready as configured. Production needs policy-scoped access, non-root auth, audit logging, TLS, and a rotation plan for static credentials.
