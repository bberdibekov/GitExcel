// src/config.ts

/**
 * A centralized configuration file for application-wide settings.
 * This allows for easy tweaking of features and behaviors during development
 * and for different build environments.
 */

export const config = {
  /**
   * Acts as a global feature flag for all paywall-related UI.
   * - When `true`, components like `FeatureBadge` and `LockOverlay` will be visible.
   * - When `false`, they will render `null`, effectively hiding them from the UI.
   *
   * We are setting this to `true` now for development purposes as per the ticket (PAYWALL-001).
   * It should be set back to `false` before merging to production.
   */
  isPaywallActive: true,
};

export const diffViewerConfig = {
  /**
   * Settings for the "smart truncation" algorithm in the comparison row summary.
   */
  truncation: {
    // How many characters to show from the start of the string.
    startContextLength: 10,
    // The size of the "window" around the first character difference.
    diffWindowLength: 20,
    // How many characters to show from the end of the string.
    endContextLength: 10,
  },
};