// src/taskpane/services/AuthService.ts

import * as jose from 'jose';

export interface ILicense {
  tier: 'free' | 'pro';
  userId: string;
  status: 'verified' | 'expired' | 'none';
  /** The expiration date as a JavaScript-compatible timestamp (milliseconds). */
  expiresAt: number; 
}

const MOCK_JWT_SECRET = 'a-secure-secret-key-for-development-only-do-not-use-in-production';
const MOCK_SECRET_KEY = new TextEncoder().encode(MOCK_JWT_SECRET);
const LICENSE_TOKEN_KEY = 'licenseToken';
const MOCK_LICENSE_TIER_KEY = 'mockLicenseTier'; // The key for our localStorage override.


class AuthService {
  /**
   * For development only. Overrides the license state until cleared.
   * A page reload is required for the change to take effect.
   */
  public setMockTier(tier: 'pro' | 'free'): void {
    localStorage.setItem(MOCK_LICENSE_TIER_KEY, tier);
    console.log(`[AuthService] Mock tier set to: "${tier}". Reload to apply.`);
  }

  /**
   * For development only. Clears any overridden license state.
   * A page reload is required for the change to take effect.
   */
  public clearMockTier(): void {
    localStorage.removeItem(MOCK_LICENSE_TIER_KEY);
    console.log('[AuthService] Mock tier cleared. Reload to revert to default behavior.');
  }

  /**
   * Generates a simple, non-expiring license object for mocking purposes.
   */
  private _createMockLicense(tier: 'pro' | 'free'): ILicense {
    return {
      tier,
      userId: `mock-user-${tier}`,
      status: 'verified',
      expiresAt: Date.now() + 3600 * 1000 * 24, // Expires in 24 hours
    };
  }

  public async getVerifiedLicense(): Promise<ILicense> {
    // First, check for a developer override in localStorage.
    const mockTier = localStorage.getItem(MOCK_LICENSE_TIER_KEY);
    if (mockTier === 'pro' || mockTier === 'free') {
      console.warn(`[AuthService] Using MOCKED license tier: "${mockTier}"`);
      return this._createMockLicense(mockTier);
    }

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


  private async _tryGetLocalLicense(): Promise<ILicense | null> {
    // check if the Office context and roamingSettings are available.
    // This prevents crashes when running outside a proper Office host environment (e.g., standalone browser).
    if (!Office.context || !Office.context.roamingSettings) {
      console.warn('[AuthService] Office context or roamingSettings not available. This is expected if not running inside a sideloaded Office Add-in. Proceeding without a local license.');
      return null;
    }

    const token = Office.context.roamingSettings.get(LICENSE_TOKEN_KEY) as string | null;

    if (!token) {
      console.log('[AuthService] No local token found in roaming settings.');
      return null;
    }

    try {
      const { payload } = await jose.jwtVerify(token, MOCK_SECRET_KEY);
      return {
        tier: payload.tier as 'pro' | 'free',
        userId: payload.sub,
        status: 'verified',
        expiresAt: payload.exp * 1000,
      };
    } catch (error) {
      console.error('[AuthService] Local token verification failed:', error.message);
      Office.context.roamingSettings.remove(LICENSE_TOKEN_KEY);
      // We still need to check for context here before saving.
      if (Office.context.roamingSettings.saveAsync) {
        await new Promise(resolve => Office.context.roamingSettings.saveAsync(resolve));
      }
      return null;
    }
  }

  private async _fetchAndStoreNewLicense(): Promise<ILicense> {
    console.log('[AuthService] Generating a new mock "pro" license...');
    const payload = {
      tier: 'pro',
      sub: `user_${Math.random().toString(36).substring(2, 9)}`,
    };

    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(MOCK_SECRET_KEY);
      
    // Add the same check here before attempting to set and save.
    if (Office.context && Office.context.roamingSettings) {
        Office.context.roamingSettings.set(LICENSE_TOKEN_KEY, token);
        await new Promise(resolve => Office.context.roamingSettings.saveAsync(resolve));
        console.log('[AuthService] New mock license stored in roaming settings.');
    } else {
        console.warn('[AuthService] Office context not available. Cannot store new license token.');
    }

    const decodedPayload = jose.decodeJwt(token);
    return {
      tier: decodedPayload.tier as 'pro' | 'free',
      userId: decodedPayload.sub,
      status: 'verified',
      expiresAt: decodedPayload.exp * 1000,
    };
  }
}

export const authService = new AuthService();