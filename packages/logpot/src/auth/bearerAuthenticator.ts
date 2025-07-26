import { Authenticator } from './authenticator'

/**
 * HTTP Bearer auth implementation.
 *
 * @example
 * ```ts
 * const client = new BearerAuthenticator('token123')
 * await client.apply(init, url)
 * // init.headers.Authorization === 'Bearer token123'
 * ```
 */
export class BearerAuthenticator implements Authenticator {
  /**
   * @param token - Bearer token string.
   */
  constructor(private token: string) {}
  /**
   * Adds the Authorization header using the Bearer token.
   *
   * @param init - The fetch RequestInit to modify.
   */
  async apply(init: RequestInit): Promise<void> {
    init.headers = {
      ...(init.headers || {}),
      Authorization: `Bearer ${this.token}`,
    }
  }
}
