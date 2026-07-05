export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(private readonly threshold = 5, private readonly resetMs = 10000) {}

  canCall(): boolean {
    if (this.state === 'open' && Date.now() - this.openedAt > this.resetMs) this.state = 'half-open';
    return this.state !== 'open';
  }

  success() {
    this.failures = 0;
    this.state = 'closed';
  }

  failure() {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
  }
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function backoff(attempt: number): number {
  const base = Number(process.env.VAULT_RETRY_BASE_DELAY_MS ?? 250);
  const max = Number(process.env.VAULT_RETRY_MAX_DELAY_MS ?? 5000);
  return Math.min(base * 2 ** attempt, max) + Math.floor(Math.random() * base);
}

