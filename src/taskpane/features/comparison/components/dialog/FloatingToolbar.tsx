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
// --- ADDED: Import the new hook ---
import { useDraggable } from "../../hooks/useDraggable";


interface FloatingToolbarProps {
  onSummaryClick: () => void;
  onFilterClick: () => void;
  onSettingsClick: () => void;
  onRestoreClick: () => void;
  isRestoreDisabled: boolean;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = (props) => {
  const {
    onSummaryClick,
    onFilterClick,
    onSettingsClick,
    onRestoreClick,
    isRestoreDisabled,
  } = props;
  const styles = useFloatingToolbarStyles();
  // --- ADDED: Use the draggable hook ---
  const { dragNodeRef, style, onMouseDown } = useDraggable();

  return (
    // --- MODIFIED: Apply the ref, style, and onMouseDown handler from the hook ---
    <div
      ref={dragNodeRef}
      style={style}
      onMouseDown={onMouseDown}
      className={styles.toolbarContainer}
    >
      <Tooltip content="Summary" relationship="label">
        <Button
          icon={<TextBulletListSquare24Regular />}
          onClick={onSummaryClick}
          appearance="subtle"
        />
      </Tooltip>
      <Tooltip content="Filters" relationship="label">
        <Button
          icon={<Filter24Regular />}
          onClick={onFilterClick}
          appearance="subtle"
        />
      </Tooltip>
      <Tooltip content="Settings" relationship="label">
        <Button
          icon={<Settings24Regular />}
          onClick={onSettingsClick}
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