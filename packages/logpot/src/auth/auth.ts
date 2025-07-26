import { RetryOption } from '@logpot/utils'

/**
 * No authentication.
 *
 * @example
 * ```ts
 * // No auth: leave headers and URL unchanged
 * const auth: HttpAuthNone = { type: 'none' }
 * const client = createAuthenticator(auth)
 * await client.apply(init, url)  // no-op
 * ```
 */
export interface HttpAuthNone {
  /** Authentication type identifier. */
  type: 'none'
}

/**
 * HTTP Basic authentication credentials.
 *
 * @example
 * ```ts
 * const auth: HttpAuthBasic = {
 *   type: 'basic',
 *   username: 'alice',
 *   password: 's3cr3t'
 * }
 * const client = createAuthenticator(auth)
 * await client.apply(init, url)
 * // init.headers.Authorization === 'Basic YWxpY2U6czNjcjN0'
 * ```
 */
export interface HttpAuthBasic {
  /** Authentication type identifier. */
  type: 'basic'
  /** Username for basic authentication. */
  username: string
  /** Password for basic authentication. */
  password: string
}

/**
 * HTTP Bearer token authentication.
 *
 * @example
 * ```ts
 * const auth: HttpAuthBearer = {
 *   type: 'bearer',
 *   token: 'abc123.token.value'
 * }
 * const client = createAuthenticator(auth)
 * await client.apply(init, url)
 * // init.headers.Authorization === 'Bearer abc123.token.value'
 * ```
 */
export interface HttpAuthBearer {
  /** Authentication type identifier. */
  type: 'bearer'
  /** Bearer token string. */
  token: string
}

/**
 * API key authentication.
 *
 * @example
 * ```ts
 * // Header-based API key
 * const authHeader: HttpAuthApiKey = {
 *   type: 'apiKey',
 *   in: 'header',
 *   name: 'X-API-Key',
 *   value: 'key-xyz'
 * }
 * const client1 = createAuthenticator(authHeader)
 * await client1.apply(init, url)
 * // init.headers['X-API-Key'] === 'key-xyz'
 * ```
 *
 * @example
 * ```ts
 * // Query-based API key
 * const authQuery: HttpAuthApiKey = {
 *   type: 'apiKey',
 *   in: 'query',
 *   name: 'api_key',
 *   value: 'key-xyz'
 * }
 * const client2 = createAuthenticator(authQuery)
 * await client2.apply(init, url)
 * // url.searchParams.get('api_key') === 'key-xyz'
 * ```
 */
export interface HttpAuthApiKey {
  /** Authentication type identifier. */
  type: 'apiKey'
  /** Location of the API key (header or query string). */
  in: 'header' | 'query'
  /** Name of the header or query parameter. */
  name: string
  /** Value of the API key. */
  value: string
}
/**
 * OAuth2 (client credentials) authentication settings.
 *
 * @example
 * ```ts
 * const auth: HttpAuthOAuth2 = {
 *   type: 'oauth2',
 *   tokenUrl: 'https://auth.example.com/oauth2/token',
 *   clientId: 'my-client',
 *   clientSecret: 'shhh',
 *   scope: 'read write',
 *   retry: { maxRetry: 4, baseDelay: 1000 }
 * }
 * const client = createAuthenticator(auth)
 * await client.apply(init, url)
 * // init.headers.Authorization === 'Bearer <fetched_token>'
 * ```
 */
export interface HttpAuthOAuth2 {
  /** Authentication type identifier. */
  type: 'oauth2'
  /** URL to fetch the access token. */
  tokenUrl: string
  /** OAuth2 client identifier. */
  clientId: string
  /** OAuth2 client secret. */
  clientSecret: string
  /** Optional OAuth2 scopes. */
  scope?: string
  /** Retry options for token fetch. */
  retry?: RetryOption
}

/**
 * Union of all supported HTTP authentication configurations.
 */
export type HttpAuth =
  | HttpAuthNone
  | HttpAuthBasic
  | HttpAuthBearer
  | HttpAuthApiKey
  | HttpAuthOAuth2
