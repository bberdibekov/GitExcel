// src/taskpane/components/VersionHistory.tsx

import * as React from "react";
import { IVersion } from "../types/types";
import { Checkbox, Button, Tooltip } from "@fluentui/react-components";
import { BranchCompare20Filled } from "@fluentui/react-icons";
import { useSharedStyles } from "./sharedStyles";

interface VersionHistoryProps {
  versions: IVersion[];
  selectedVersions: number[];
  onVersionSelect: (versionId: number) => void;
  onCompareToPrevious: (versionId: number) => void;
}

/**
 * Renders the list of all saved versions. It provides checkboxes for selection,
 * a quick-action button to compare a version to its predecessor, and handles the
 * empty state when no versions have been saved.
 */
const VersionHistory: React.FC<VersionHistoryProps> = ({ versions, selectedVersions, onVersionSelect, onCompareToPrevious }) => {
  // Call the shared style hook to get the generated class names.
  const styles = useSharedStyles();

  if (versions.length === 0) {
    return <p>No versions saved yet.</p>;
  }

  const reversedVersions = [...versions].reverse();

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
              />
              <div style={{ marginLeft: "10px" }}>
                <strong>{version.comment}</strong>
                <div className={styles.textSubtle}>{version.timestamp}</div>
              </div>
            </div>
            
            {!isFirstVersion && (
              <Tooltip content="Compare to Previous" relationship="label">
                <Button 
                  size="small"
                  appearance="subtle" 
                  icon={<BranchCompare20Filled />}
                  onClick={() => onCompareToPrevious(version.id)}
                />
              </Tooltip>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default VersionHistory;