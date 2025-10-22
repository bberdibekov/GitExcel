// src/taskpane/components/VersionHistory.tsx

import * as React from "react";
import { IVersionViewModel } from "../types/types";
import { Checkbox, Button, Tooltip } from "@fluentui/react-components";
import { BranchCompare20Filled, ArrowClockwise20Filled } from "@fluentui/react-icons";
import { useSharedStyles } from "./sharedStyles";
import FeatureBadge from "./paywall/FeatureBadge";

// --- STEP 1: Import the central Zustand store ---
import { useAppStore } from "../state/appStore";

/**
 * The props for this component are simplified. It only receives the pre-calculated
 * view model data. All interactive state and actions are now sourced from the store.
 */
interface VersionHistoryProps {
  versions: IVersionViewModel[];
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ versions }) => {
  // --- STEP 2: Select all necessary state and actions from the store ---
  const {
    selectedVersions,
    isRestoring,
    selectVersion,
    compareWithPrevious,
    initiateRestore,
  } = useAppStore();

  const styles = useSharedStyles();

  if (versions.length === 0) {
    return <p>No versions saved yet.</p>;
  }

  // The logic to reverse the array for display remains the same.
  const reversedVersions = [...versions].reverse();

  /**
   * Renders the restore button with its tooltip and conditional PRO badge.
   * The logic is the same, but it now uses `isRestoring` from the store and
   * calls the `initiateRestore` action from the store.
   */
  const renderRestoreButton = (version: IVersionViewModel) => {
    // The button is disabled if the app is globally restoring,
    // or if this specific item is not restorable per the view model logic.
    const isDisabled = isRestoring || !version.isRestorable;

    const button = (
      <Button
        size="small"
        appearance="subtle"
        icon={<ArrowClockwise20Filled />}
        onClick={() => initiateRestore(version.id)} // Call action from store
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

  // --- STEP 3: The JSX now uses state and actions directly from the store ---
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
                checked={selectedVersions.includes(version.id)} // Use state from store
                onChange={() => selectVersion(version.id)}      // Call action from store
                disabled={isRestoring}                           // Use state from store
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
                    onClick={() => compareWithPrevious(version.id)} // Call action from store
                    disabled={isRestoring}                          // Use state from store
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