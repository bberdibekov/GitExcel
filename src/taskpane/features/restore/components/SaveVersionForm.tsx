// NEW src/taskpane/components/SaveVersionForm.tsx
import * as React from "react";
import { useState } from "react";
import { Button, Input } from "@fluentui/react-components";
import { useAppStore } from "../../../state/appStore";

const SaveVersionForm: React.FC = () => {
  const [comment, setComment] = useState("");
  // Get state and actions directly from the store
  const { addVersion, isRestoring } = useAppStore();

  const handleSave = () => {
    addVersion(comment); // Call the action from the store
    setComment("");
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <Input
        placeholder="Describe your changes..."
        value={comment}
        onChange={(_e, data) => setComment(data.value)}
        style={{ width: "100%", marginBottom: "5px" }}
        disabled={isRestoring} // Use state from the store
      />
      <Button appearance="primary" onClick={handleSave} disabled={isRestoring}>
        Save New Version
      </Button>
    </div>
  );
};

export default SaveVersionForm;