#!/usr/bin/env sh
set -eu

VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-root}"
MONGO_ROOT_USERNAME="${MONGO_ROOT_USERNAME:-mongo_root}"
MONGO_ROOT_PASSWORD="${MONGO_ROOT_PASSWORD:-mongo_root_password}"
MONGO_TTL="${MONGO_TTL:-1h}"
MONGO_MAX_TTL="${MONGO_MAX_TTL:-24h}"

wait_http() {
  until [ "$(curl -sS -o /dev/null -w '%{http_code}' "$1" || true)" != "000" ]; do sleep 1; done
}

api() {
  method="$1"; path="$2"; data="${3:-}"
  if [ -n "$data" ]; then
    curl -fsS -H "X-Vault-Token: ${VAULT_TOKEN}" -H "Content-Type: application/json" -X "$method" -d "$data" "${VAULT_ADDR}/v1/${path}" >/dev/null
  else
    curl -fsS -H "X-Vault-Token: ${VAULT_TOKEN}" -X "$method" "${VAULT_ADDR}/v1/${path}" >/dev/null
  fi
}

echo "Waiting for Vault..."
wait_http "${VAULT_ADDR}/v1/sys/health"

echo "Waiting for MongoDB 4.0 and 7.0..."
until docker exec mongo40 mongo admin -u "${MONGO_ROOT_USERNAME}" -p "${MONGO_ROOT_PASSWORD}" --quiet --eval 'db.runCommand({ping:1}).ok' >/dev/null 2>&1; do sleep 2; done
until docker exec mongo70 mongosh admin -u "${MONGO_ROOT_USERNAME}" -p "${MONGO_ROOT_PASSWORD}" --quiet --eval 'db.runCommand({ping:1}).ok' >/dev/null 2>&1; do sleep 2; done

if ! curl -fsS -H "X-Vault-Token: ${VAULT_TOKEN}" "${VAULT_ADDR}/v1/sys/mounts" | grep -q '"database/"'; then
  api POST sys/mounts/database '{"type":"database"}'
fi

mongo_roles='{\"db\":\"appdb\",\"roles\":[{\"role\":\"readWrite\",\"db\":\"appdb\"}]}'

api POST database/config/mongo40 "{\"plugin_name\":\"mongodb-database-plugin\",\"allowed_roles\":\"mongo40-product-role,mongo40-order-role\",\"connection_url\":\"mongodb://{{username}}:{{password}}@mongo40:27017/admin\",\"username\":\"${MONGO_ROOT_USERNAME}\",\"password\":\"${MONGO_ROOT_PASSWORD}\"}"
api POST database/config/mongo70 "{\"plugin_name\":\"mongodb-database-plugin\",\"allowed_roles\":\"mongo70-product-role,mongo70-order-role\",\"connection_url\":\"mongodb://{{username}}:{{password}}@mongo70:27017/admin\",\"username\":\"${MONGO_ROOT_USERNAME}\",\"password\":\"${MONGO_ROOT_PASSWORD}\"}"

api POST database/roles/mongo40-product-role "{\"db_name\":\"mongo40\",\"creation_statements\":\"${mongo_roles}\",\"default_ttl\":\"${MONGO_TTL}\",\"max_ttl\":\"${MONGO_MAX_TTL}\"}"
api POST database/roles/mongo40-order-role "{\"db_name\":\"mongo40\",\"creation_statements\":\"${mongo_roles}\",\"default_ttl\":\"${MONGO_TTL}\",\"max_ttl\":\"${MONGO_MAX_TTL}\"}"
api POST database/roles/mongo70-product-role "{\"db_name\":\"mongo70\",\"creation_statements\":\"${mongo_roles}\",\"default_ttl\":\"${MONGO_TTL}\",\"max_ttl\":\"${MONGO_MAX_TTL}\"}"
api POST database/roles/mongo70-order-role "{\"db_name\":\"mongo70\",\"creation_statements\":\"${mongo_roles}\",\"default_ttl\":\"${MONGO_TTL}\",\"max_ttl\":\"${MONGO_MAX_TTL}\"}"

echo "Vault dynamic MongoDB roles configured for MongoDB 4.0 and 7.0."
