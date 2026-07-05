#!/usr/bin/env sh
set -eu

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-postgres-local-demo}"
POSTGRES_USER="${POSTGRES_USER:-vaultadmin}"
POSTGRES_DB="${POSTGRES_DB:-appdb}"

docker exec -i "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < scripts/postgres-init/001-schema.sql

echo "Microservice schema bootstrap completed."

