/**
 * Applies authentication to fetch `RequestInit` and URL.
 *
 * @param init - The fetch init object to modify.
 * @param url - The request URL (used for query-based auth).
 */

export interface Authenticator {
  apply(init: RequestInit, url: URL): Promise<void>
}
