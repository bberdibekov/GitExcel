// src/taskpane/components/paywall/LockOverlay.tsx

import * as React from 'react';
import { config } from '../../../config';
import { Button, Text } from '@fluentui/react-components';
import { LockClosed24Filled } from '@fluentui/react-icons';

interface LockOverlayProps {
  /** The main headline for the upgrade prompt. */
  title: string;
  /** The descriptive text explaining the feature and the call to action. */
  message: string;
  /** The function to call when the "Upgrade" button is clicked. */
  onUpgradeClick: () => void;
}

/**
 * A reusable UI component that renders a semi-transparent overlay
 * with an upgrade message and a call-to-action button.
 * Its visibility is controlled by a global configuration flag.
 *
 * IMPORTANT: For the overlay to work correctly, the parent container
 * this component is placed in MUST have its CSS `position` set to `relative`.
 */
const LockOverlay: React.FC<LockOverlayProps> = ({ title, message, onUpgradeClick }) => {
  // 1. Controlled by the global configuration flag.
  if (!config.isPaywallActive) {
    return null;
  }

  // 2. CSS for the main overlay container.
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(240, 240, 240, 0.85)', // A semi-transparent background
    zIndex: 10, // Ensures it sits on top of the content it covers
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    boxSizing: 'border-box', // Ensures padding doesn't break layout
  };

  // 3. CSS for the centered content within the overlay.
  const contentStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '12px',
  };

  return (
    <div style={overlayStyle}>
      <div style={contentStyle}>
        <LockClosed24Filled style={{ fontSize: '32px' }} />
        <Text weight="semibold" size={400}>{title}</Text>
        <Text size={300}>{message}</Text>
        <Button 
          appearance="primary" 
          onClick={onUpgradeClick}
        >
          Upgrade to Pro
        </Button>
      </div>
    </div>
  );
};

export default LockOverlay;