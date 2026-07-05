export interface VaultAuthProvider {
  getToken(): Promise<string>;
  describe(): string;
}

export class TokenVaultAuthProvider implements VaultAuthProvider {
  async getToken(): Promise<string> {
    const token = process.env.VAULT_TOKEN;
    if (!token) {
      throw new Error('VAULT_TOKEN is required for token auth');
    }

    return token;
  }

  describe(): string {
    return 'token';
  }
}

