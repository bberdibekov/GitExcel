// src/taskpane/features/comparison/components/dialog/FloatingToolbar.tsx
import * as React from "react";
import { Button, Tooltip } from "@fluentui/react-components";
import {
  DocumentText24Regular,
  Filter24Regular,
  Settings24Regular,
  ArrowReply24Regular,
} from "@fluentui/react-icons";
import { useFloatingToolbarStyles } from "./Styles/FloatingToolbar.styles";

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

  return (
    <div className={styles.toolbarContainer}>
      <Tooltip content="Summary & Info" relationship="label" withArrow>
        <Button appearance="subtle" icon={<DocumentText24Regular />} onClick={onSummaryClick} />
      </Tooltip>
      <Tooltip content="Filters" relationship="label" withArrow>
        <Button appearance="subtle" icon={<Filter24Regular />} onClick={onFilterClick} />
      </Tooltip>
      <Tooltip content="Comparison Settings" relationship="label" withArrow>
        <Button appearance="subtle" icon={<Settings24Regular />} onClick={onSettingsClick} />
      </Tooltip>
      <Tooltip content="Restore Options" relationship="label" withArrow>
        <Button
          appearance="subtle"
          icon={<ArrowReply24Regular />}
          onClick={onRestoreClick}
          disabled={isRestoreDisabled}
        />
      </Tooltip>
    </div>
  );
};

export default FloatingToolbar;