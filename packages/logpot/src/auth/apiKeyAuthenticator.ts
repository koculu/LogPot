import { Authenticator } from './authenticator'

/**
 * API key auth implementation.
 *
 * @example
 * ```ts
 * // Header-based API key
 * const client1 = new ApiKeyAuthenticator('header', 'X-API-Key', 'xyz');
 * const init1: RequestInit = {};
 * const url1 = new URL('https://api.example.com/data');
 * await client1.apply(init1, url1);
 * // After apply():
 * console.log(init1.headers);
 * // → { 'X-API-Key': 'xyz' }
 * console.log(url1.toString());
 * // → 'https://api.example.com/data'
 * ```
 *
 * @example
 * ```ts
 * // Query-based API key
 * const client2 = new ApiKeyAuthenticator('query', 'api_key', 'xyz');
 * const init2: RequestInit = {};
 * const url2 = new URL('https://api.example.com/data');
 * await client2.apply(init2, url2);
 * // After apply():
 * console.log(init2.headers);
 * // → undefined (no header added)
 * console.log(url2.toString());
 * // → 'https://api.example.com/data?api_key=xyz'
 * ```
 */
export class ApiKeyAuthenticator implements Authenticator {
  /**
   * @param position - Where to place the API key (header or query).
   * @param name - Name of the header or query parameter.
   * @param value - Value of the API key.
   */
  constructor(
    private position: 'header' | 'query',
    private name: string,
    private value: string
  ) {}
  /**
   * Applies the API key to the request init or URL query parameters.
   *
   * @param init - The fetch RequestInit to modify.
   * @param url - The request URL for query-based auth.
   */
  async apply(init: RequestInit, url: URL): Promise<void> {
    if (this.position === 'header') {
      init.headers = { ...(init.headers || {}), [this.name]: this.value }
    } else {
      url.searchParams.set(this.name, this.value)
    }
  }
}
