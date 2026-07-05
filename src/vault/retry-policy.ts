export interface RetryPolicy {
  retries: number;
  timeoutMs: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export function retryPolicyFromEnv(): RetryPolicy {
  return {
    retries: Number(process.env.VAULT_RETRY_LIMIT ?? 5),
    timeoutMs: Number(process.env.VAULT_TIMEOUT_MS ?? 5000),
    baseDelayMs: Number(process.env.VAULT_RETRY_BASE_DELAY_MS ?? 250),
    maxDelayMs: Number(process.env.VAULT_RETRY_MAX_DELAY_MS ?? 5000)
  };
}

export function backoffDelay(policy: RetryPolicy, attempt: number): number {
  const exponential = Math.min(policy.baseDelayMs * 2 ** attempt, policy.maxDelayMs);
  const jitter = Math.floor(Math.random() * policy.baseDelayMs);
  return exponential + jitter;
}

