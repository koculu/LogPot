import { ApiKeyAuthenticator } from './apiKeyAuthenticator'
import { HttpAuth } from './auth'
import { Authenticator } from './authenticator'
import { BasicAuthenticator } from './basicAuthenticator'
import { BearerAuthenticator } from './bearerAuthenticator'
import { NoneAuthenticator } from './noneAuthenticator'
import { OAuth2Authenticator } from './oauth2'

/**
 * Create an Authenticator from a `HttpAuth` config.
 *
 * @param auth - Authentication configuration.
 * @returns Appropriate authenticator instance.
 *
 * @example
 * ```ts
 * const authConfig: HttpAuthBasic = { type: 'basic', username: 'u', password: 'p' }
 * const client = createAuthenticator(authConfig)
 * await client.apply(init, url)
 * ```
 */
export function createAuthenticator(auth: HttpAuth): Authenticator {
  switch (auth.type) {
    case 'none':
      return new NoneAuthenticator()
    case 'basic':
      return new BasicAuthenticator(auth.username, auth.password)
    case 'bearer':
      return new BearerAuthenticator(auth.token)
    case 'apiKey':
      return new ApiKeyAuthenticator(auth.in, auth.name, auth.value)
    case 'oauth2':
      return new OAuth2Authenticator(auth)
    default:
      return new NoneAuthenticator()
  }
}
