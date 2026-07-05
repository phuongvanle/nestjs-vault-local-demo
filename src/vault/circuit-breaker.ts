export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private stateValue: CircuitState = 'closed';

  constructor(
    private readonly failureThreshold = Number(process.env.VAULT_CIRCUIT_FAILURE_THRESHOLD ?? 5),
    private readonly resetAfterMs = Number(process.env.VAULT_CIRCUIT_RESET_AFTER_MS ?? 10000)
  ) {}

  get state(): CircuitState {
    if (this.stateValue === 'open' && Date.now() - this.openedAt >= this.resetAfterMs) {
      this.stateValue = 'half-open';
    }

    return this.stateValue;
  }

  assertCanCall(): void {
    if (this.state === 'open') {
      throw new Error('Vault circuit breaker is open');
    }
  }

  recordSuccess(): void {
    this.failures = 0;
    this.stateValue = 'closed';
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.stateValue = 'open';
      this.openedAt = Date.now();
    }
  }
}

