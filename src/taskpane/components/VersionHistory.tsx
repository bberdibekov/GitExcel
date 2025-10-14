// src/taskpane/components/VersionHistory.tsx

import * as React from "react";
import { IVersion } from "../types/types";
import { Checkbox } from "@fluentui/react-components";

interface VersionHistoryProps {
  versions: IVersion[];
  selectedVersions: number[];
  onVersionSelect: (versionId: number) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ versions, selectedVersions, onVersionSelect }) => {
  if (versions.length === 0) {
    return <p>No versions saved yet.</p>;
  }

  return (
    <div>
      {[...versions].reverse().map((version) => (
        <div key={version.id} style={{ border: "1px solid #ccc", padding: "8px", marginBottom: "5px", display: "flex", alignItems: "center" }}>
          <Checkbox
            checked={selectedVersions.includes(version.id)}
            onChange={() => onVersionSelect(version.id)}
          />
          <div style={{ marginLeft: "10px" }}>
            <strong>{version.comment}</strong>
            <div style={{ fontSize: "12px", color: "#666" }}>{version.timestamp}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VersionHistory;