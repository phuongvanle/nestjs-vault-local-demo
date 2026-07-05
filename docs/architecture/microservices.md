# Microservices Architecture

## Services

| Service | Port | PostgreSQL role | Primary tables | Mongo usage |
| --- | ---: | --- | --- | --- |
| product-service | 3001 | `product-service-role` | `products` | MongoDB 4.0 audit logs |
| customer-service | 3002 | `customer-service-role` | `customers` | none |
| inventory-service | 3003 | `inventory-service-role` | `inventory` | none |
| order-service | 3004 | `order-service-role` | `orders`, `order_items` | MongoDB 7.0 order events |
| payment-service | 3005 | `payment-service-role` | `payments` | none |

## Shared Modules

Shared runtime code lives under `services/shared` and `libs/shared/mongo`.

Shared responsibilities:

- Vault client and token auth provider
- PostgreSQL dynamic credential provider
- PostgreSQL connection manager
- Mongo dynamic credential provider
- Mongo lease manager
- Mongo connection manager
- health and metrics controllers
- Redis/RabbitMQ health checks
- HTTP client for service-to-service calls

## Service-to-Service Flow

order-service calls:

- product-service for product price
- customer-service for customer existence
- inventory-service to reserve inventory

payment-service calls:

- order-service for order validation

## Connection Rotation Requirements

Database connections must be replaced without restarting services when credentials rotate. The old pool/client drains briefly, then the old Vault lease is revoked.

## Health Endpoints

`/health/ready` must indicate whether the service has valid database leases and working dependencies. It must not return raw secrets or generated usernames.

## Local-Dev Only Assumptions

The services currently trust the local Docker network and use environment variables for bootstrap configuration. Production deployment would require hardened auth, network policy, TLS, secret policy boundaries, and verified observability.
