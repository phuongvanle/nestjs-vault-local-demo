#!/usr/bin/env sh
set -eu

BASE_PRODUCT="${BASE_PRODUCT:-http://127.0.0.1:3001}"
BASE_CUSTOMER="${BASE_CUSTOMER:-http://127.0.0.1:3002}"
BASE_INVENTORY="${BASE_INVENTORY:-http://127.0.0.1:3003}"
BASE_ORDER="${BASE_ORDER:-http://127.0.0.1:3004}"
BASE_PAYMENT="${BASE_PAYMENT:-http://127.0.0.1:3005}"
VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-root}"
RUN_ID="$(date +%s)"

json_post() {
  curl -fsS -H 'Content-Type: application/json' -X POST -d "$2" "$1"
}

json_patch() {
  curl -fsS -H 'Content-Type: application/json' -X PATCH -d "$2" "$1"
}

id_from() {
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))"
}

for url in "$BASE_PRODUCT" "$BASE_CUSTOMER" "$BASE_INVENTORY" "$BASE_ORDER" "$BASE_PAYMENT"; do
  i=0
  until curl -fsS "$url/health/ready" >/dev/null; do
    i=$((i + 1))
    [ "$i" -lt 60 ] || { echo "Service not ready: $url"; exit 1; }
    sleep 2
  done
done

product="$(json_post "$BASE_PRODUCT/products" "{\"name\":\"Demo Product\",\"sku\":\"SKU-${RUN_ID}\",\"price\":\"19.90\",\"status\":\"active\"}")"
product_id="$(printf '%s' "$product" | id_from)"
curl -fsS "$BASE_PRODUCT/products/$product_id" >/dev/null
json_patch "$BASE_PRODUCT/products/$product_id" '{"status":"active"}' >/dev/null

customer="$(json_post "$BASE_CUSTOMER/customers" "{\"fullName\":\"Demo Customer\",\"email\":\"demo.customer.${RUN_ID}@example.com\",\"phone\":\"0900000000\",\"status\":\"active\"}")"
customer_id="$(printf '%s' "$customer" | id_from)"
curl -fsS "$BASE_CUSTOMER/customers/$customer_id" >/dev/null

inventory="$(json_post "$BASE_INVENTORY/inventory" "{\"productId\":$product_id,\"quantity\":10,\"reservedQuantity\":0,\"warehouseCode\":\"HCM-01\"}")"
inventory_id="$(printf '%s' "$inventory" | id_from)"
curl -fsS "$BASE_INVENTORY/inventory/$inventory_id" >/dev/null

order="$(json_post "$BASE_ORDER/orders" "{\"customerId\":$customer_id,\"items\":[{\"productId\":$product_id,\"quantity\":2}]}")"
order_id="$(printf '%s' "$order" | id_from)"
json_patch "$BASE_ORDER/orders/$order_id/status" '{"status":"confirmed"}' >/dev/null

payment="$(json_post "$BASE_PAYMENT/payments" "{\"orderId\":$order_id,\"amount\":\"39.80\",\"provider\":\"local\"}")"
payment_id="$(printf '%s' "$payment" | id_from)"
json_patch "$BASE_PAYMENT/payments/$payment_id/status" '{"status":"paid"}' >/dev/null

for role in product-service-role customer-service-role inventory-service-role order-service-role payment-service-role; do
  curl -fsS -H "X-Vault-Token: $VAULT_TOKEN" "$VAULT_ADDR/v1/database/creds/$role" >/tmp/${role}.json
done

users="$(cat /tmp/*-service-role.json | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const users=d.trim().split(/\\n/).map(x=>JSON.parse(x).data.username); console.log(new Set(users).size)})")"
[ "$users" = "5" ] || { echo "Expected 5 distinct Vault db usernames, got $users"; exit 1; }

for port in 3001 3002 3003 3004 3005; do
  curl -fsS "http://127.0.0.1:${port}/metrics" | grep -q 'vault_secret_fetch_total'
done

product_lease_key="$(curl -fsS -H "X-Vault-Token: $VAULT_TOKEN" -X LIST "$VAULT_ADDR/v1/sys/leases/lookup/database/creds/product-service-role" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const keys=JSON.parse(d).data.keys; console.log(keys[keys.length-1])})" 2>/dev/null || true)"
if [ -n "$product_lease_key" ]; then
  curl -fsS -H "X-Vault-Token: $VAULT_TOKEN" -H 'Content-Type: application/json' \
    -X POST -d "{\"lease_id\":\"database/creds/product-service-role/${product_lease_key}\"}" \
    "$VAULT_ADDR/v1/sys/leases/revoke" >/dev/null
  sleep 45
  curl -fsS "$BASE_PRODUCT/health/ready" >/dev/null
  curl -fsS "$BASE_CUSTOMER/health/ready" >/dev/null
  curl -fsS "$BASE_ORDER/health/ready" >/dev/null
fi

echo "Microservice flow passed: product=$product_id customer=$customer_id inventory=$inventory_id order=$order_id payment=$payment_id"
