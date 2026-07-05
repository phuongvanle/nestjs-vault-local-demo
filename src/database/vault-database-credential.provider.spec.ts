import { VaultDatabaseCredentialProvider } from './vault-database-credential.provider';

describe('VaultDatabaseCredentialProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, VAULT_DATABASE_CREDENTIALS_PATH: 'database/creds/app-role' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('maps Vault dynamic credential lease response', async () => {
    const vault = {
      readLease: jest.fn().mockResolvedValue({
        data: { username: 'v-root-1', password: 'secret' },
        leaseId: 'database/creds/app-role/abc',
        leaseDuration: 60,
        renewable: true
      })
    };
    const provider = new VaultDatabaseCredentialProvider(vault as never);

    const credential = await provider.fetchDatabaseCredential();

    expect(credential.username).toBe('v-root-1');
    expect(credential.leaseId).toBe('database/creds/app-role/abc');
    expect(credential.leaseDuration).toBe(60);
    expect(credential.renewable).toBe(true);
  });
});

