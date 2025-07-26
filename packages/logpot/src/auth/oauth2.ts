import { RetryAction, withRetry } from '@logpot/utils'
import { isRetryableHttpError } from '@logpot/utils'

import { HttpAuthOAuth2 } from './auth'
import { Authenticator } from './authenticator'

const DEFAULTS: HttpAuthOAuth2 = {
  type: 'oauth2',
  tokenUrl: '',
  clientId: '',
  clientSecret: '',
}

/**
 * Response from OAuth2 token endpoint.
 */
export interface FetchTokenResponse {
  /** Access token string. */
  access_token?: string
  /** Lifetime of the token in seconds. */
  expires_in?: number
  /** Scopes granted by the token. */
  scope?: string
}

/**
 * OAuth2-based authenticator that fetches and caches a bearer token.
 *
 * Uses client credentials grant and supports retry/backoff on transient failures.
 *
 * @example
 * ```ts
 * const auth: HttpAuthOAuth2 = {
 *   type: 'oauth2',
 *   tokenUrl: 'https://auth.example.com/token',
 *   clientId: 'id',
 *   clientSecret: 'secret',
 *   retry: { maxRetry: 3 }
 * }
 * const client = new OAuth2Authenticator(auth)
 * await client.apply(init, url)
 * // init.headers.Authorization === 'Bearer <token>'
 * ```
 */
export class OAuth2Authenticator implements Authenticator {
  /** Current scope used when fetching the token. */
  private currentScope?: string
  /** Timestamp (ms) when the access token expires. */
  private expiresAt = 0
  /** Cached access token string. */
  private accessToken? = ''
  /**
   * @param opts - OAuth2 authentication options, including token URL,
   * client credentials, optional scope, and retry settings.
   */
  constructor(private opts: HttpAuthOAuth2) {
    this.currentScope = opts.scope
    this.opts = { ...DEFAULTS, ...opts }
  }
  /**
   * Invalidates the current token, forcing a refetch on next request.
   */
  invalidate() {
    this.expiresAt = 0
  }
  /**
   * Performs the HTTP request to fetch a new token from the OAuth2 token endpoint.
   *
   * @param signal - Optional AbortSignal to cancel the fetch on timeout.
   * @throws If the network response is not OK or the JSON is malformed.
   * @returns The parsed token response, including access_token and expires_in.
   */
  private async fetchToken(signal?: AbortSignal) {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.opts.clientId,
      client_secret: this.opts.clientSecret,
      ...(this.currentScope ? { scope: this.currentScope } : {}),
    })

    const res = await fetch(this.opts.tokenUrl, {
      method: 'POST',
      body: params,
      signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '<unreadable>')
      throw new Error(`Token fetch failed ${res.status}: ${text}`)
    }

    const json: FetchTokenResponse = await res.json()
    if (typeof json.access_token !== 'string') {
      throw new Error('Token response missing access_token')
    }
    if (isNaN(Number(json.expires_in))) {
      throw new Error('Token response missing expires_in')
    }
    return json
  }
  /**
   * Fetches a new token with retry/backoff logic based on configured options.
   *
   * Will retry on errors deemed retryable by `isRetryableHttpError`.
   */
  private async fetchTokenWithRetry(): Promise<void> {
    const data = await withRetry(
      (signal) => this.fetchToken(signal),
      this.opts.retry,
      (_attempt, err) => {
        return isRetryableHttpError(err)
          ? RetryAction.CONTINUE
          : RetryAction.STOP
      }
    )
    this.accessToken = data.access_token
    const expiresIn = Number(data.expires_in)
    this.expiresAt = Date.now() + expiresIn * 1000 - 5000
    if (typeof data.scope === 'string') {
      this.currentScope = data.scope
    }
  }
  /**
   * Applies the current or newly fetched bearer token to the request headers.
   *
   * @param init - The RequestInit object for fetch.
   * @throws If token fetch fails after retries.
   */
  async apply(init: RequestInit): Promise<void> {
    if (!this.accessToken || Date.now() >= this.expiresAt) {
      await this.fetchTokenWithRetry()
    }
    init.headers = {
      ...(init.headers || {}),
      Authorization: `Bearer ${this.accessToken}`,
    }
  }
}
