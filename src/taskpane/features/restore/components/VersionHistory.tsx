// src/taskpane/features/restore/components/VersionHistory.tsx
import * as React from "react";
import { IVersionViewModel } from "../../../types/types";
import { Checkbox, Button, Tooltip } from "@fluentui/react-components";
import { BranchCompare20Filled, ArrowClockwise20Filled, Desktop20Filled } from "@fluentui/react-icons";
import { useSharedStyles } from "../../../shared/styles/sharedStyles";
import FeatureBadge from "../../../shared/paywall/FeatureBadge";
import { useAppStore } from "../../../state/appStore";
import { comparisonWorkflowService } from "../../comparison/services/comparison.workflow.service";

interface VersionHistoryProps {
  versions: IVersionViewModel[];
  disabled?: boolean;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ versions, disabled }) => {
  const {
    selectedVersions,
    isRestoring,
    selectVersion,
    initiateRestore,
  } = useAppStore();
  
  const styles = useSharedStyles();

  if (versions.length === 0) {
    return <p>No versions saved yet.</p>;
  }

  const reversedVersions = [...versions].reverse();

  const renderRestoreButton = (version: IVersionViewModel) => {
    const isDisabled = isRestoring || !version.isRestorable || disabled;
    const button = (
      <Button
        size="small"
        appearance="subtle"
        icon={<ArrowClockwise20Filled />}
        onClick={() => initiateRestore(version.id)}
        disabled={isDisabled}
      />
    );

    return (
      <Tooltip content={version.restoreTooltip} relationship="label">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {button}
          {version.showProBadge && <FeatureBadge tier="pro" />}
        </div>
      </Tooltip>
    );
  };

  return (
    <div>
      {/* Current workbook item */}
      <div 
        className={`${styles.card} ${styles.flexRowSpaceBetween}`} 
        style={{ 
          flexShrink: 0,
          padding: '8px',
          marginBottom: '6px'
        }}
      >
        <div className={styles.flexRow}>
          <Checkbox
            checked={selectedVersions.includes('current')}
            onChange={() => selectVersion('current')}
            disabled={isRestoring || disabled}
          />
          <div style={{ marginLeft: "8px", display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Desktop20Filled style={{ fontSize: '16px' }} />
            <strong style={{ fontSize: '13px' }}>Current Workbook</strong>
          </div>
        </div>
      </div>

      {/* Historical versions */}
      {reversedVersions.map((version, index) => {
        const isFirstVersion = index === reversedVersions.length - 1;
        return (
          <div
            key={version.id}
            className={`${styles.card} ${styles.flexRowSpaceBetween}`}
            style={{ 
              flexShrink: 0,
              padding: '8px',
              marginBottom: '6px'
            }}
          >
            <div className={styles.flexRow} style={{ flex: 1, minWidth: 0 }}>
              <Checkbox
                checked={selectedVersions.includes(version.id)}
                onChange={() => selectVersion(version.id)}
                disabled={isRestoring || disabled}
              />
              <div style={{ marginLeft: "8px", minWidth: 0, flex: 1 }}>
                <strong style={{ fontSize: '13px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {version.comment}
                </strong>
                <div className={styles.textSubtle} style={{ fontSize: '11px', marginTop: '2px' }}>
                  {version.timestamp}
                </div>
              </div>
            </div>
            <div className={styles.flexRow} style={{ gap: '4px', flexShrink: 0 }}>
              {renderRestoreButton(version)}
              {!isFirstVersion && (
                <Tooltip content="Compare to Previous" relationship="label">
                  <Button 
                    size="small"
                    appearance="subtle" 
                    icon={<BranchCompare20Filled />}
                    onClick={() => comparisonWorkflowService.compareWithPrevious(version.id)}
                    disabled={isRestoring || disabled}
                  />
                </Tooltip>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VersionHistory;