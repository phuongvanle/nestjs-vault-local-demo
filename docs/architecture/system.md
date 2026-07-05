# System Architecture

## Scope

`repos/nestjs-vault-local-demo` is a local Docker Compose demo for Vault-backed service secrets.

The current system includes:

- Vault dev server
- PostgreSQL 16
- Redis 7
- RabbitMQ 3.13 management image
- MongoDB 4.0
- MongoDB 7.0
- five NestJS services: product, customer, inventory, order, payment

This project is frozen as a local-dev reference implementation. Do not add new Vault features without a new ADR and acceptance criteria.

## Runtime Topology

Vault is the secret control plane.

PostgreSQL is the relational store for all five services.

Redis and RabbitMQ credentials are distributed through Vault KV v2 static secrets.

MongoDB dynamic credentials are used by product-service and order-service only:

- product-service writes audit records to MongoDB 4.0 collection `product_audit_logs`
- order-service writes order events to MongoDB 7.0 collection `order_events`

## Docker Compose Services

`docker-compose.yml` defines:

- `vault`: HashiCorp Vault dev server on port `8200`
- `postgres`: app database on port `5432`
- `redis`: password-protected Redis on port `6379`
- `rabbitmq`: AMQP on `5672`, management UI on `15672`
- `mongo40`: MongoDB 4.0 on host port `27040`
- `mongo70`: MongoDB 7.0 on host port `27070`
- `product-service`: NestJS service on port `3001`
- `customer-service`: NestJS service on port `3002`
- `inventory-service`: NestJS service on port `3003`
- `order-service`: NestJS service on port `3004`
- `payment-service`: NestJS service on port `3005`

## Health Model

Each NestJS service exposes:

- `/health/live`
- `/health/startup`
- `/health/ready`
- `/metrics`

Readiness reports Vault reachability, PostgreSQL lease status, PostgreSQL status, Mongo status, Redis status, and RabbitMQ status. Health responses do not include passwords, tokens, or generated usernames.

## Test Scripts

- `scripts/init-vault.sh`: bootstraps KV, PostgreSQL roles, and MongoDB roles.
- `scripts/test-microservice-flow.sh`: validates HTTP flow, PostgreSQL dynamic credentials, metrics, and PostgreSQL lease recovery.
- `scripts/test-mongo-vault.sh`: validates MongoDB dynamic credentials and product/order Mongo writes.
- `scripts/setup-vault-dynamic-mongo.sh`: standalone Mongo dynamic secret bootstrap helper retained for local testing.

## Known Local-Dev Boundaries

- Vault runs in dev mode with root token defaults.
- Compose uses static local admin passwords for bootstrap.
- No TLS is enabled between services.
- No production Vault auth method is configured.
- No external monitoring or alerting stack is required for acceptance.
