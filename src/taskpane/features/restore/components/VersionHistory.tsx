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

  // --- START: "COMPARE MODE" LOGIC ---
  const isInCompareMode = selectedVersions.length === 1;
  const sourceCompareId = isInCompareMode ? selectedVersions[0] : null;

  const handleTargetedCompare = (targetVersionId: number | 'current') => {
    // This action adds the second version to the selection array in the store.
    selectVersion(targetVersionId);
    
    // Immediately call the comparison service. Because the service uses `getState()`,
    // it will see the updated selection array with two items and run the comparison.
    // Zustand's `set` is synchronous, so this is a safe operation.
    comparisonWorkflowService.runComparison();
  };
  // --- END: "COMPARE MODE" LOGIC ---

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

  const renderActionButtons = (version: IVersionViewModel, isFirstVersion: boolean) => {
    // When in compare mode, non-selected rows get a special, direct compare button.
    if (isInCompareMode && version.id !== sourceCompareId) {
      return (
        <Tooltip content="Compare with selected" relationship="label">
          <Button
            size="small"
            appearance="primary"
            icon={<BranchCompare20Filled />}
            onClick={() => handleTargetedCompare(version.id)}
            disabled={isRestoring || disabled}
          />
        </Tooltip>
      );
    }

    // Default view: Show the standard restore and "compare to previous" buttons.
    return (
      <>
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
      </>
    );
  };

  const isCurrentWorkbookSelectedForCompare = isInCompareMode && sourceCompareId === 'current';

  return (
    <div>
      {/* Current workbook item */}
      <div 
        className={`${styles.card} ${styles.flexRowSpaceBetween} ${isCurrentWorkbookSelectedForCompare ? styles.card_info : ''}`} 
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
        <div className={styles.flexRow} style={{ gap: '4px', flexShrink: 0 }}>
          {isInCompareMode && !isCurrentWorkbookSelectedForCompare && (
            <Tooltip content="Compare with selected" relationship="label">
              <Button
                size="small"
                appearance="primary"
                icon={<BranchCompare20Filled />}
                onClick={() => handleTargetedCompare('current')}
                disabled={isRestoring || disabled}
              />
            </Tooltip>
          )}
        </div>
      </div>

      {/* Historical versions */}
      {reversedVersions.map((version, index) => {
        const isFirstVersion = index === reversedVersions.length - 1;
        const isSelectedForCompare = isInCompareMode && sourceCompareId === version.id;

        return (
          <div
            key={version.id}
            className={`${styles.card} ${styles.flexRowSpaceBetween} ${isSelectedForCompare ? styles.card_info : ''}`}
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
              {renderActionButtons(version, isFirstVersion)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VersionHistory;