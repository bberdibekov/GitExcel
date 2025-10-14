// src/taskpane/components/VersionHistory.tsx

import * as React from "react";
import { IVersion } from "../types/types";
import { Checkbox, Button, Tooltip } from "@fluentui/react-components";
import { BranchCompare20Filled } from "@fluentui/react-icons";


interface VersionHistoryProps {
  versions: IVersion[];
  selectedVersions: number[];
  onVersionSelect: (versionId: number) => void;
  onCompareToPrevious: (versionId: number) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ versions, selectedVersions, onVersionSelect, onCompareToPrevious }) => {
  if (versions.length === 0) {
    return <p>No versions saved yet.</p>;
  }

  const reversedVersions = [...versions].reverse();

  return (
    <div>
      {reversedVersions.map((version, index) => {
        const isFirstVersion = index === reversedVersions.length - 1;

        return (
          <div key={version.id} style={{ border: "1px solid #ccc", padding: "8px", marginBottom: "5px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Checkbox
                checked={selectedVersions.includes(version.id)}
                onChange={() => onVersionSelect(version.id)}
              />
              <div style={{ marginLeft: "10px" }}>
                <strong>{version.comment}</strong>
                <div style={{ fontSize: "12px", color: "#666" }}>{version.timestamp}</div>
              </div>
            </div>
            
            {!isFirstVersion && (
              <Tooltip content="Compare to Previous" relationship="label">
                <Button 
                  size="small"
                  // Use a more subtle appearance for icon buttons
                  appearance="subtle" 
                  // The icon is the button's content
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