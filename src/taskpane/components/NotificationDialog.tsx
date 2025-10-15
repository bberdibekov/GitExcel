// src/taskpane/components/NotificationDialog.tsx

import * as React from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  Button,
  tokens,
  Text,
} from '@fluentui/react-components';
import {
  ErrorCircle24Filled,
  CheckmarkCircle24Filled,
  Warning24Filled,
} from '@fluentui/react-icons';

// The shape of the notification object this component expects
export type NotificationSeverity = 'error' | 'warning' | 'success';
export interface INotification {
  severity: NotificationSeverity;
  title: string;
  message: string;
}

interface NotificationDialogProps {
  notification: INotification | null;
  onDismiss: () => void;
}

/**
 * A reusable modal dialog for displaying polished, severity-based notifications.
 * Its visibility and content are controlled by the `notification` prop.
 */
const NotificationDialog: React.FC<NotificationDialogProps> = ({ notification, onDismiss }) => {
  if (!notification) {
    return null;
  }

  const renderIcon = (severity: NotificationSeverity) => {
    // Revert to a more appropriate size and add right margin for side-by-side layout.
    const iconStyle = { fontSize: '28px', marginRight: tokens.spacingHorizontalL };
    switch (severity) {
      case 'error':
        return <ErrorCircle24Filled style={{ ...iconStyle, color: tokens.colorPaletteRedBorderActive }} />;
      case 'success':
        return <CheckmarkCircle24Filled style={{ ...iconStyle, color: tokens.colorPaletteGreenBorderActive }} />;
      case 'warning':
        return <Warning24Filled style={{ ...iconStyle, color: tokens.colorPaletteYellowBorderActive }} />;
      default:
        return null;
    }
  };

  return (
    <Dialog
      modalType="alert"
      open={true}
      onOpenChange={(_event, data) => {
        if (!data.open) {
          onDismiss();
        }
      }}
    >
      <DialogSurface>
        <DialogBody style={{ padding: tokens.spacingVerticalXXL, gap: tokens.spacingVerticalL }}>
            
            {/* 1. Top section: Icon and Title side-by-side */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {renderIcon(notification.severity)}
                <DialogTitle>{notification.title}</DialogTitle>
            </div>

            {/* 2. Middle section: Message, indented to align with the title */}
            <Text as="p" style={{ 
                // Indent message to align with the start of the title text
                marginLeft: `calc(32px + ${tokens.spacingHorizontalL})`,
                // Ensure text wraps correctly and doesn't push the dialog width
                maxWidth: '400px', 
            }}>
                {notification.message}
            </Text>
          
            {/* 3. Bottom section: Actions, with default (right-aligned) layout */}
            <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                    <Button appearance="primary" onClick={onDismiss}>
                        Close
                    </Button>
                </DialogTrigger>
            </DialogActions>

        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default NotificationDialog;