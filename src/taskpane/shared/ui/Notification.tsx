// src/taskpane/components/Notification.tsx

import * as React from 'react';
import { Button, Text } from '@fluentui/react-components';
import { Dismiss20Filled } from '@fluentui/react-icons';
import { useSharedStyles } from '../styles/sharedStyles';

export type NotificationSeverity = 'error' | 'warning' | 'success';

interface NotificationProps {
  severity: NotificationSeverity;
  title: string;
  message: string;
  onDismiss: () => void;
}

/**
 * A reusable component for displaying dismissible notifications.
 * It uses a severity prop to determine its styling.
 */
const Notification: React.FC<NotificationProps> = ({ severity, title, message, onDismiss }) => {
  const styles = useSharedStyles();

  const getStyleForSeverity = () => {
    switch (severity) {
      case 'error':
        return styles.card_error;
      case 'warning':
        return styles.card_warning;
      case 'success':
        return styles.card_success;
      default:
        return styles.card_info; // Assuming a default 'info' style exists or could be added
    }
  };

  return (
    <div className={getStyleForSeverity()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text weight="semibold">{title}</Text>
        <Button 
          appearance="transparent" 
          icon={<Dismiss20Filled />} 
          onClick={onDismiss} 
          aria-label="Dismiss notification"
        />
      </div>
      <Text block style={{ marginTop: '4px' }}>{message}</Text>
    </div>
  );
};

export default Notification;