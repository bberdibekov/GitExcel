// src/taskpane/components/paywall/FeatureBadge.tsx

import * as React from 'react';
import { config } from '../../../config';
import { useSharedStyles } from '../sharedStyles';

interface FeatureBadgeProps {
  /** The required tier to display (e.g., "pro"). */
  tier: string;
}

/**
 * A small, reusable UI component that displays a "PRO" label.
 * Its visibility is controlled by a global configuration flag, making it
 * safe to implement in the UI before the paywall is officially launched.
 */
const FeatureBadge: React.FC<FeatureBadgeProps> = ({ tier }) => {
  const styles = useSharedStyles();

  // 1. This component is controlled by a global configuration flag.
  // If the paywall is not active, it renders nothing.
  if (!config.isPaywallActive) {
    return null;
  }

  // 2. If the paywall is active, it renders the styled badge.
  return (
    <span className={styles.badge_pro}>
      {tier.toUpperCase()}
    </span>
  );
};

export default FeatureBadge;