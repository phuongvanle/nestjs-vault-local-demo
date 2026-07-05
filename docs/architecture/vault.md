# Vault Architecture

## Vault Mounts

`scripts/init-vault.sh` configures:

- `secret/`: KV v2 mount for static service configuration and static Redis/RabbitMQ secrets.
- `database/`: Vault Database Secrets Engine mount for PostgreSQL and MongoDB dynamic credentials.

## KV Static Secret Flow

KV paths:

- `secret/data/dev/postgres`: PostgreSQL host, port, and database metadata.
- `secret/data/dev/redis`: Redis host, port, and password.
- `secret/data/dev/rabbitmq`: RabbitMQ host, port, username, password, and vhost.
- `secret/data/dev/mongo40`: MongoDB 4.0 bootstrap metadata.
- `secret/data/dev/mongo70`: MongoDB 7.0 bootstrap metadata.

Redis and RabbitMQ use static KV values. This flow must remain separate from dynamic database credentials.

## PostgreSQL Dynamic Secret Flow

Vault database config:

- `database/config/appdb`
- plugin: `postgresql-database-plugin`
- roles: `product-service-role`, `customer-service-role`, `inventory-service-role`, `order-service-role`, `payment-service-role`

Each service reads `database/creds/<service-role>` through the shared `VaultClient` and `DynamicDbCredentialProvider`.

The generated PostgreSQL role receives table-specific grants only.

## MongoDB Dynamic Secret Flow

Vault database configs:

- `database/config/mongo40`
- `database/config/mongo70`

Vault Mongo roles:

- `mongo40-product-role`
- `mongo40-order-role`
- `mongo70-product-role`
- `mongo70-order-role`

The current service assignment is:

- product-service -> MongoDB 4.0 -> `mongo40-product-role`
- order-service -> MongoDB 7.0 -> `mongo70-order-role`

Mongo generated users receive `readWrite` on `appdb`.

## Lease Lifecycle

PostgreSQL and MongoDB dynamic credentials have short local TTLs. Managers fetch credentials at startup, renew leases before expiry, rotate connections when renewal fails or TTL is low, and revoke old leases after a drain period.

## Security Notes

No health endpoint, metric, or log should expose passwords, Vault tokens, or generated credential values. Lease IDs and TTLs are operational metadata and are currently logged.

## Production Gaps

- Vault dev mode is not production-ready.
- Root token auth is local only.
- No TLS, policies, audit device, or HA storage are configured.
- Acceptance has not verified production Vault hardening.
