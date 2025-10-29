// src/taskpane/features/restore/components/VersionHistory.tsx

import * as React from "react";
import { IVersionViewModel } from "../../../types/types";
import { Checkbox, Button, Tooltip } from "@fluentui/react-components";
import { BranchCompare20Filled, ArrowClockwise20Filled } from "@fluentui/react-icons";
import { useSharedStyles } from "../../../shared/styles/sharedStyles";
import FeatureBadge from "../../../shared/paywall/FeatureBadge";
import { useAppStore } from "../../../state/appStore";

// --- STEP 1: Import the new orchestrator service ---
import { comparisonWorkflowService } from "../../comparison/services/comparison.workflow.service";

interface VersionHistoryProps {
  versions: IVersionViewModel[];
  disabled?: boolean;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ versions, disabled }) => {
  // --- STEP 2: Select only the state and actions needed from the store. ---
  // `compareWithPrevious` is no longer needed here.
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
      {reversedVersions.map((version, index) => {
        const isFirstVersion = index === reversedVersions.length - 1;

        return (
          <div
            key={version.id}
            className={`${styles.card} ${styles.flexRowSpaceBetween}`}
          >
            <div className={styles.flexRow}>
              <Checkbox
                checked={selectedVersions.includes(version.id)}
                onChange={() => selectVersion(version.id)}
                disabled={isRestoring || disabled}
              />
              <div style={{ marginLeft: "10px" }}>
                <strong>{version.comment}</strong>
                <div className={styles.textSubtle}>{version.timestamp}</div>
              </div>
            </div>
            
            <div className={styles.flexRow} style={{ gap: '8px' }}>
              {renderRestoreButton(version)}

              {!isFirstVersion && (
                <Tooltip content="Compare to Previous" relationship="label">
                  {/* --- STEP 3: The onClick handler now calls the new service --- */}
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