#!/usr/bin/env sh
set -eu

VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-root}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-appdb}"
POSTGRES_USER="${POSTGRES_USER:-vaultadmin}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-vaultadminsecret}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-redissecret}"
RABBITMQ_HOST="${RABBITMQ_HOST:-rabbitmq}"
RABBITMQ_PORT="${RABBITMQ_PORT:-5672}"
RABBITMQ_DEFAULT_USER="${RABBITMQ_DEFAULT_USER:-appuser}"
RABBITMQ_DEFAULT_PASS="${RABBITMQ_DEFAULT_PASS:-rabbitsecret}"
RABBITMQ_DEFAULT_VHOST="${RABBITMQ_DEFAULT_VHOST:-/}"
MONGO_ROOT_USERNAME="${MONGO_ROOT_USERNAME:-mongo_root}"
MONGO_ROOT_PASSWORD="${MONGO_ROOT_PASSWORD:-mongo_root_password}"
VAULT_DB_DEFAULT_TTL="${VAULT_DB_DEFAULT_TTL:-60s}"
VAULT_DB_MAX_TTL="${VAULT_DB_MAX_TTL:-180s}"
MONGO_DB_DEFAULT_TTL="${MONGO_DB_DEFAULT_TTL:-60s}"
MONGO_DB_MAX_TTL="${MONGO_DB_MAX_TTL:-180s}"

api() {
  method="$1"
  path="$2"
  data="${3:-}"
  if [ -n "$data" ]; then
    curl -fsS -H "X-Vault-Token: ${VAULT_TOKEN}" -H "Content-Type: application/json" -X "$method" -d "$data" "${VAULT_ADDR}/v1/${path}" >/dev/null
  else
    curl -fsS -H "X-Vault-Token: ${VAULT_TOKEN}" -X "$method" "${VAULT_ADDR}/v1/${path}" >/dev/null
  fi
}

echo "Waiting for Vault at ${VAULT_ADDR}..."
until [ "$(curl -sS -o /dev/null -w '%{http_code}' "${VAULT_ADDR}/v1/sys/health" || true)" != "000" ]; do
  sleep 1
done

if ! curl -fsS -H "X-Vault-Token: ${VAULT_TOKEN}" "${VAULT_ADDR}/v1/sys/mounts" | grep -q '"secret/"'; then
  api POST sys/mounts/secret '{"type":"kv","options":{"version":"2"}}'
fi

api POST secret/data/dev/postgres "{\"data\":{\"host\":\"${POSTGRES_HOST}\",\"port\":\"${POSTGRES_PORT}\",\"database\":\"${POSTGRES_DB}\"}}"
api POST secret/data/dev/redis "{\"data\":{\"host\":\"${REDIS_HOST}\",\"port\":\"${REDIS_PORT}\",\"password\":\"${REDIS_PASSWORD}\"}}"
api POST secret/data/dev/rabbitmq "{\"data\":{\"host\":\"${RABBITMQ_HOST}\",\"port\":\"${RABBITMQ_PORT}\",\"username\":\"${RABBITMQ_DEFAULT_USER}\",\"password\":\"${RABBITMQ_DEFAULT_PASS}\",\"vhost\":\"${RABBITMQ_DEFAULT_VHOST}\"}}"
api POST secret/data/dev/mongo40 "{\"data\":{\"host\":\"mongo40\",\"port\":\"27017\",\"adminDatabase\":\"admin\",\"username\":\"${MONGO_ROOT_USERNAME}\",\"password\":\"${MONGO_ROOT_PASSWORD}\"}}"
api POST secret/data/dev/mongo70 "{\"data\":{\"host\":\"mongo70\",\"port\":\"27017\",\"adminDatabase\":\"admin\",\"username\":\"${MONGO_ROOT_USERNAME}\",\"password\":\"${MONGO_ROOT_PASSWORD}\"}}"

if ! curl -fsS -H "X-Vault-Token: ${VAULT_TOKEN}" "${VAULT_ADDR}/v1/sys/mounts" | grep -q '"database/"'; then
  api POST sys/mounts/database '{"type":"database"}'
fi

api POST database/config/appdb "{\"plugin_name\":\"postgresql-database-plugin\",\"allowed_roles\":\"product-service-role,customer-service-role,inventory-service-role,order-service-role,payment-service-role\",\"connection_url\":\"postgresql://{{username}}:{{password}}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=disable\",\"username\":\"${POSTGRES_USER}\",\"password\":\"${POSTGRES_PASSWORD}\"}"
api POST database/config/mongo40 "{\"plugin_name\":\"mongodb-database-plugin\",\"allowed_roles\":\"mongo40-product-role,mongo40-order-role\",\"connection_url\":\"mongodb://{{username}}:{{password}}@mongo40:27017/admin\",\"username\":\"${MONGO_ROOT_USERNAME}\",\"password\":\"${MONGO_ROOT_PASSWORD}\"}"
api POST database/config/mongo70 "{\"plugin_name\":\"mongodb-database-plugin\",\"allowed_roles\":\"mongo70-product-role,mongo70-order-role\",\"connection_url\":\"mongodb://{{username}}:{{password}}@mongo70:27017/admin\",\"username\":\"${MONGO_ROOT_USERNAME}\",\"password\":\"${MONGO_ROOT_PASSWORD}\"}"

role() {
  role_name="$1"
  tables="$2"
  sequences="$3"
  api POST "database/roles/${role_name}" "{\"db_name\":\"appdb\",\"creation_statements\":\"CREATE ROLE \\\"{{name}}\\\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO \\\"{{name}}\\\"; GRANT USAGE ON SCHEMA public TO \\\"{{name}}\\\"; GRANT SELECT, INSERT, UPDATE, DELETE ON ${tables} TO \\\"{{name}}\\\"; GRANT USAGE, SELECT ON ${sequences} TO \\\"{{name}}\\\";\",\"default_ttl\":\"${VAULT_DB_DEFAULT_TTL}\",\"max_ttl\":\"${VAULT_DB_MAX_TTL}\"}"
}

role product-service-role "products" "products_id_seq"
role customer-service-role "customers" "customers_id_seq"
role inventory-service-role "inventory" "inventory_id_seq"
role order-service-role "orders, order_items" "orders_id_seq, order_items_id_seq"
role payment-service-role "payments" "payments_id_seq"

mongo_role() {
  role_name="$1"
  db_name="$2"
  api POST "database/roles/${role_name}" "{\"db_name\":\"${db_name}\",\"creation_statements\":\"{\\\"db\\\":\\\"appdb\\\",\\\"roles\\\":[{\\\"role\\\":\\\"readWrite\\\",\\\"db\\\":\\\"appdb\\\"}]}\",\"default_ttl\":\"${MONGO_DB_DEFAULT_TTL}\",\"max_ttl\":\"${MONGO_DB_MAX_TTL}\"}"
}

mongo_role mongo40-product-role mongo40
mongo_role mongo40-order-role mongo40
mongo_role mongo70-product-role mongo70
mongo_role mongo70-order-role mongo70

echo "Vault KV, PostgreSQL roles, and MongoDB 4.0/7.0 dynamic roles have been configured."
