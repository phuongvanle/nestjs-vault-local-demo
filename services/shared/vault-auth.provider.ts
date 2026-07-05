export interface VaultAuthProvider {
  getToken(): Promise<string>;
}

export class TokenVaultAuthProvider implements VaultAuthProvider {
  async getToken(): Promise<string> {
    const token = process.env.VAULT_TOKEN;
    if (!token) throw new Error('VAULT_TOKEN is required for local dev token auth');
    return token;
  }
}

