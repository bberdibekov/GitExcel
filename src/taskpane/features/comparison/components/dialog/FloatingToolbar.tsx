// src/taskpane/features/comparison/components/dialog/FloatingToolbar.tsx
import * as React from "react";
import { Button, Tooltip, Divider } from "@fluentui/react-components";
import {
  TextBulletListSquare24Regular,
  Filter24Regular,
  Settings24Regular,
  SaveSyncRegular,
} from "@fluentui/react-icons";
import { useFloatingToolbarStyles } from "./Styles/FloatingToolbar.styles";
import { useDraggable } from "../../hooks/useDraggable";
import { ActiveFlyout } from "../../../../state/comparisonStore"; // Import the type

// The props now just need to inform the parent which button was clicked.
interface FloatingToolbarProps {
  onFlyoutClick: (flyout: NonNullable<ActiveFlyout>) => void;
  onRestoreClick: () => void;
  isRestoreDisabled: boolean;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = (props) => {
  const { onFlyoutClick, onRestoreClick, isRestoreDisabled } = props;
  const styles = useFloatingToolbarStyles();
  const { dragNodeRef, style, onMouseDown } = useDraggable({
    initialPosition: { x: 16, y: 150 }
  });
  
  // The simple useDraggable is still perfect for the toolbar itself.

  return (
    <div
      ref={dragNodeRef}
      style={style}
      onMouseDown={onMouseDown}
      className={styles.toolbarContainer}
    >
      <div className={styles.dragHandle}>
        <span>⋮⋮</span>
      </div>

      <Tooltip content="Summary" relationship="label">
        <Button
          icon={<TextBulletListSquare24Regular />}
          onClick={() => onFlyoutClick('summary')}
          appearance="subtle"
        />
      </Tooltip>
      <Tooltip content="Filters" relationship="label">
        <Button
          icon={<Filter24Regular />}
          onClick={() => onFlyoutClick('filters')}
          appearance="subtle"
        />
      </Tooltip>
      <Tooltip content="Settings" relationship="label">
        <Button
          icon={<Settings24Regular />}
          onClick={() => onFlyoutClick('settings')}
          appearance="subtle"
        />
      </Tooltip>
      <Divider />
      <Tooltip content="Restore Changes" relationship="label">
        <Button
          icon={<SaveSyncRegular />}
          onClick={onRestoreClick}
          appearance="subtle"
          disabled={isRestoreDisabled}
        />
      </Tooltip>
    </div>
  );
};

export default FloatingToolbar;