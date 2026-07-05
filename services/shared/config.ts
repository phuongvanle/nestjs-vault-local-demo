export interface ServiceConfig {
  serviceName: string;
  port: number;
  vaultAddr: string;
  vaultToken: string;
  vaultDbMount: string;
  vaultDbRole: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  redisSecretPath: string;
  rabbitmqSecretPath: string;
}

export function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function serviceConfig(): ServiceConfig {
  return {
    serviceName: env('SERVICE_NAME'),
    port: Number(env('SERVICE_PORT')),
    vaultAddr: env('VAULT_ADDR'),
    vaultToken: env('VAULT_TOKEN'),
    vaultDbMount: env('VAULT_DB_MOUNT', 'database'),
    vaultDbRole: env('VAULT_DB_ROLE'),
    dbHost: env('DB_HOST', 'postgres'),
    dbPort: Number(env('DB_PORT', '5432')),
    dbName: env('DB_NAME', 'appdb'),
    redisSecretPath: env('REDIS_SECRET_PATH', 'secret/data/dev/redis'),
    rabbitmqSecretPath: env('RABBITMQ_SECRET_PATH', 'secret/data/dev/rabbitmq')
  };
}

