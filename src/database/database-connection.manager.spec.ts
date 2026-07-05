import { DatabaseConnectionManager } from './database-connection.manager';

jest.mock('typeorm', () => {
  const actual = jest.requireActual('typeorm');
  return {
    ...actual,
    DataSource: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue({
        isInitialized: true,
        query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
        destroy: jest.fn().mockResolvedValue(undefined),
        getRepository: jest.fn()
      })
    }))
  };
});

describe('DatabaseConnectionManager', () => {
  it('fetches a credential and marks startup complete', async () => {
    const config = {
      getDatabaseStaticConfig: jest.fn().mockResolvedValue({ host: 'postgres', port: 5432, database: 'appdb' })
    };
    const credentials = {
      fetchDatabaseCredential: jest.fn().mockResolvedValue({
        username: 'v-user',
        password: 'secret',
        leaseId: 'lease-1',
        leaseDuration: 60,
        renewable: true,
        fetchedAt: new Date()
      }),
      renew: jest.fn(),
      revoke: jest.fn()
    };
    const metrics = {
      vaultSecretRotationTotal: { inc: jest.fn() },
      dbConnectionRotationTotal: { inc: jest.fn() },
      dbConnectionActive: { set: jest.fn() },
      leaseRemainingSeconds: { set: jest.fn() },
      credentialAgeSeconds: { set: jest.fn() },
      vaultLeaseRenewTotal: { inc: jest.fn() },
      vaultLeaseRenewFailureTotal: { inc: jest.fn() }
    };
    const manager = new DatabaseConnectionManager(config as never, credentials as never, metrics as never);

    await manager.onModuleInit();

    expect(credentials.fetchDatabaseCredential).toHaveBeenCalledTimes(1);
    expect(manager.isStartupComplete).toBe(true);
    expect(manager.getLeaseSnapshot().leaseId).toBe('lease-1');

    await manager.onModuleDestroy();
  });
});

