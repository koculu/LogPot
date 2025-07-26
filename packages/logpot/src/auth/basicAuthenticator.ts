import { Authenticator } from './authenticator'

/**
 * HTTP Basic auth implementation.
 *
 * @example
 * ```ts
 * const client = new BasicAuthenticator('alice', 's3cr3t')
 * await client.apply(init, url)
 * // init.headers.Authorization === 'Basic YWxpY2U6czNjcjN0'
 * ```
 */
export class BasicAuthenticator implements Authenticator {
  /**
   * @param user - Username for basic auth.
   * @param pass - Password for basic auth.
   */
  constructor(private user: string, private pass: string) {}
  /**
   * Adds the Authorization header using a Base64-encoded username:password.
   *
   * @param init - The fetch RequestInit to modify.
   */
  async apply(init: RequestInit): Promise<void> {
    const creds = Buffer.from(`${this.user}:${this.pass}`, 'utf8').toString(
      'base64'
    )
    init.headers = { ...(init.headers || {}), Authorization: `Basic ${creds}` }
  }
}
