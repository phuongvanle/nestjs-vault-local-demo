import { CircuitBreaker } from './circuit-breaker';

describe('CircuitBreaker', () => {
  it('opens after failure threshold', () => {
    const breaker = new CircuitBreaker(2, 1000);

    breaker.recordFailure();
    expect(breaker.state).toBe('closed');

    breaker.recordFailure();
    expect(breaker.state).toBe('open');
    expect(() => breaker.assertCanCall()).toThrow('Vault circuit breaker is open');
  });

  it('closes after success', () => {
    const breaker = new CircuitBreaker(1, 1000);

    breaker.recordFailure();
    breaker.recordSuccess();

    expect(breaker.state).toBe('closed');
    expect(() => breaker.assertCanCall()).not.toThrow();
  });
});

