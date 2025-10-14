// src/taskpane/services/AuthService.ts

import * as jose from 'jose';

/**
 * The contract defining the structure of a user's license.
 * This is the object our application will work with after a JWT has been verified.
 */
export interface ILicense {
  tier: 'free' | 'pro';
  userId: string;
  status: 'verified' | 'expired' | 'none';
  /** The expiration date as a JavaScript-compatible timestamp (milliseconds). */
  expiresAt: number; 
}

// --- MOCK IMPLEMENTATION DETAILS (FOR DEVELOPMENT ONLY) ---
// In a real application, the public key would be loaded from an environment variable.
// We are using a symmetric key (HS256) for the mock to keep it simple. The client
// only needs one secret to both sign (mock) and verify the token.
const MOCK_JWT_SECRET = 'a-secure-secret-key-for-development-only-do-not-use-in-production';
const MOCK_SECRET_KEY = new TextEncoder().encode(MOCK_JWT_SECRET);

// --- CONSTANTS ---
const LICENSE_TOKEN_KEY = 'licenseToken';

/**
 * A decoupled service for managing user authentication and license tiers.
 * Designed with an offline-first principle.
 */
class AuthService {
  /**
   * The primary public entry point for the service.
   * It orchestrates the process of retrieving a verified license, prioritizing
   * a locally stored token before fetching a new one.
   *
   * @returns A promise that resolves to a valid ILicense object.
   */
  public async getVerifiedLicense(): Promise<ILicense> {
    console.log('[AuthService] Attempting to get verified license...');
    const localLicense = await this._tryGetLocalLicense();

    if (localLicense) {
      console.log('[AuthService] Valid local license found.', localLicense);
      return localLicense;
    }

    console.log('[AuthService] No valid local license. Fetching a new one (mock).');
    const newLicense = await this._fetchAndStoreNewLicense();
    return newLicense;
  }

  /**
   * Attempts to retrieve and verify a JWT from roaming settings.
   * This function contains the core "offline-first" logic.
   *
   * @returns A promise that resolves to an ILicense object if successful, otherwise null.
   */
  private async _tryGetLocalLicense(): Promise<ILicense | null> {
    const token = Office.context.roamingSettings.get(LICENSE_TOKEN_KEY) as string | null;

    if (!token) {
      console.log('[AuthService] No local token found in roaming settings.');
      return null;
    }

    try {
      // The `jwtVerify` function from 'jose' handles three critical checks at once:
      // 1. Verifies the signature is cryptographically correct.
      // 2. Checks that the token has not expired (via the `exp` claim).
      // 3. Ensures the token is not used before its time (via the `nbf` claim, if present).
      const { payload } = await jose.jwtVerify(token, MOCK_SECRET_KEY);

      // Map the verified JWT payload to our application's ILicense interface.
      return {
        tier: payload.tier as 'pro' | 'free',
        userId: payload.sub, // 'sub' (subject) is the standard claim for user ID
        status: 'verified',
        // The 'exp' claim is in seconds, so we multiply by 1000 for JS timestamps (ms).
        expiresAt: payload.exp * 1000,
      };
    } catch (error) {
      // This block catches any verification error (e.g., expired token, bad signature).
      console.error('[AuthService] Local token verification failed:', error.message);
      // It's good practice to remove a token that we know is invalid.
      Office.context.roamingSettings.remove(LICENSE_TOKEN_KEY);
      await new Promise(resolve => Office.context.roamingSettings.saveAsync(resolve));
      return null;
    }
  }

  /**
   * [MOCK] Simulates fetching a new license from a backend.
   * For AUTH-001, this function generates and signs a new "pro" tier JWT locally
   * to unblock development of premium features.
   *
   * @returns A promise that resolves to the newly created ILicense object.
   */
  private async _fetchAndStoreNewLicense(): Promise<ILicense> {
    console.log('[AuthService] Generating a new mock "pro" license...');
    // Create the JWT payload.
    const payload = {
      tier: 'pro',
      // In a real scenario, this would come from the user's Office identity.
      sub: `user_${Math.random().toString(36).substring(2, 9)}`,
    };

    // Use 'jose' to create and sign a new JWT.
    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      // Set a short expiration (1 hour) to make testing the expiration flow easier.
      .setExpirationTime('1h')
      .sign(MOCK_SECRET_KEY);
      
    // Persist the new token to roaming settings for the next session.
    Office.context.roamingSettings.set(LICENSE_TOKEN_KEY, token);
    await new Promise(resolve => Office.context.roamingSettings.saveAsync(resolve));
    console.log('[AuthService] New mock license stored in roaming settings.');

    // Decode the token we just created to return a valid ILicense object.
    const decodedPayload = jose.decodeJwt(token);
    return {
      tier: decodedPayload.tier as 'pro' | 'free',
      userId: decodedPayload.sub,
      status: 'verified',
      expiresAt: decodedPayload.exp * 1000,
    };
  }
}

// Export a singleton instance of the service.
export const authService = new AuthService();