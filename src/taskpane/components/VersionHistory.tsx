// src/taskpane/components/VersionHistory.tsx

import * as React from "react";
import { IVersionViewModel } from "../types/types";
import { Checkbox, Button, Tooltip } from "@fluentui/react-components";
import { BranchCompare20Filled, ArrowClockwise20Filled } from "@fluentui/react-icons";
import { useSharedStyles } from "./sharedStyles";
import FeatureBadge from "./paywall/FeatureBadge";

interface VersionHistoryProps {
  versions: IVersionViewModel[];
  selectedVersions: number[];
  isRestoring: boolean;
  onVersionSelect: (versionId: number) => void;
  onCompareToPrevious: (versionId: number) => void;
  onRestore: (versionId: number) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ 
  versions, 
  selectedVersions, 
  isRestoring,
  onVersionSelect, 
  onCompareToPrevious,
  onRestore
}) => {
  const styles = useSharedStyles();

  if (versions.length === 0) {
    return <p>No versions saved yet.</p>;
  }

  const reversedVersions = [...versions].reverse();

  const renderRestoreButton = (version: IVersionViewModel) => {
    // The button is disabled if the entire app is in a restore state,
    // OR if the pre-calculated ViewModel logic says this item is not restorable.
    const isDisabled = isRestoring || !version.isRestorable;

    const button = (
      <Button 
        size="small"
        appearance="subtle" 
        icon={<ArrowClockwise20Filled />}
        onClick={() => onRestore(version.id)}
        disabled={isDisabled}
      />
    );

    return (
      <Tooltip content={version.restoreTooltip} relationship="label">
        {/* We use a div to group the button and the optional badge for correct tooltip behavior. */}
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
                onChange={() => onVersionSelect(version.id)}
                disabled={isRestoring}
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
                  <Button 
                    size="small"
                    appearance="subtle" 
                    icon={<BranchCompare20Filled />}
                    onClick={() => onCompareToPrevious(version.id)}
                    disabled={isRestoring}
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