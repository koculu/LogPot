import { Authenticator } from './authenticator'

/**
 * No-op authenticator.
 *
 * @example
 * ```ts
 * const client = new NoneAuthenticator()
 * await client.apply(init, url) // nothing changes
 * ```
 */
export class NoneAuthenticator implements Authenticator {
  async apply(): Promise<void> {
    /* no-op */
  }
}
