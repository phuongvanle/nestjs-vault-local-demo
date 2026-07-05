#!/usr/bin/env sh
set -eu

VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-root}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

docker exec mongo40 mongo admin -u mongo_root -p mongo_root_password --quiet --eval 'db.runCommand({ping:1}).ok' >/dev/null
docker exec mongo70 mongosh admin -u mongo_root -p mongo_root_password --quiet --eval 'db.runCommand({ping:1}).ok' >/dev/null

for role in mongo40-product-role mongo40-order-role mongo70-product-role mongo70-order-role; do
  curl -fsS -H "X-Vault-Token: $VAULT_TOKEN" "$VAULT_ADDR/v1/database/creds/$role" >"${TMP_DIR}/${role}.json"
done

TMP_DIR="$TMP_DIR" node <<'NODE'
const fs = require('fs');
const dir = process.env.TMP_DIR;
for (const role of ['mongo40-product-role','mongo40-order-role','mongo70-product-role','mongo70-order-role']) {
  const doc = JSON.parse(fs.readFileSync(`${dir}/${role}.json`, 'utf8'));
  if (!doc.lease_id || !doc.data.username || !doc.data.password) throw new Error(`bad lease for ${role}`);
}
NODE

mongo40_user="$(TMP_DIR="$TMP_DIR" node -e "console.log(JSON.parse(require('fs').readFileSync(process.env.TMP_DIR + '/mongo40-product-role.json')).data.username)")"
mongo40_pass="$(TMP_DIR="$TMP_DIR" node -e "console.log(JSON.parse(require('fs').readFileSync(process.env.TMP_DIR + '/mongo40-product-role.json')).data.password)")"
mongo70_user="$(TMP_DIR="$TMP_DIR" node -e "console.log(JSON.parse(require('fs').readFileSync(process.env.TMP_DIR + '/mongo70-product-role.json')).data.username)")"
mongo70_pass="$(TMP_DIR="$TMP_DIR" node -e "console.log(JSON.parse(require('fs').readFileSync(process.env.TMP_DIR + '/mongo70-product-role.json')).data.password)")"

docker exec mongo40 mongo appdb -u "$mongo40_user" -p "$mongo40_pass" --authenticationDatabase admin --quiet --eval 'db.runCommand({connectionStatus:1}).ok' >/dev/null
docker exec mongo70 mongosh appdb -u "$mongo70_user" -p "$mongo70_pass" --authenticationDatabase admin --quiet --eval 'db.runCommand({connectionStatus:1}).ok' >/dev/null

product="$(curl -fsS -H 'Content-Type: application/json' -X POST http://127.0.0.1:3001/products -d "{\"name\":\"Mongo Audit Product $(date +%s)\",\"sku\":\"MONGO-$(date +%s)\",\"price\":\"9.90\",\"status\":\"active\"}")"
product_id="$(printf '%s' "$product" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))")"
curl -fsS -H 'Content-Type: application/json' -X POST "http://127.0.0.1:3001/products/${product_id}/audit-logs" -d '{"action":"manual-test","before":null,"after":{"ok":true}}' >/dev/null

customer="$(curl -fsS -H 'Content-Type: application/json' -X POST http://127.0.0.1:3002/customers -d "{\"fullName\":\"Mongo Customer\",\"email\":\"mongo.$(date +%s)@example.com\",\"status\":\"active\"}")"
customer_id="$(printf '%s' "$customer" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))")"
inventory="$(curl -fsS -H 'Content-Type: application/json' -X POST http://127.0.0.1:3003/inventory -d "{\"productId\":$product_id,\"quantity\":5,\"reservedQuantity\":0,\"warehouseCode\":\"MONGO\"}")"
order="$(curl -fsS -H 'Content-Type: application/json' -X POST http://127.0.0.1:3004/orders -d "{\"customerId\":$customer_id,\"items\":[{\"productId\":$product_id,\"quantity\":1}]}")"
order_id="$(printf '%s' "$order" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))")"
curl -fsS -H 'Content-Type: application/json' -X POST "http://127.0.0.1:3004/orders/${order_id}/events" -d '{"eventType":"manual-test","payload":{"ok":true}}' >/dev/null

lease="$(TMP_DIR="$TMP_DIR" node -e "console.log(JSON.parse(require('fs').readFileSync(process.env.TMP_DIR + '/mongo70-product-role.json')).lease_id)")"
curl -fsS -H "X-Vault-Token: $VAULT_TOKEN" -H 'Content-Type: application/json' -X POST -d "{\"lease_id\":\"$lease\",\"increment\":\"1h\"}" "$VAULT_ADDR/v1/sys/leases/renew" >/dev/null
curl -fsS -H "X-Vault-Token: $VAULT_TOKEN" -H 'Content-Type: application/json' -X POST -d "{\"lease_id\":\"$lease\"}" "$VAULT_ADDR/v1/sys/leases/revoke" >/dev/null

echo "Mongo Vault dynamic secrets test passed: product=$product_id order=$order_id"
