// src/taskpane/features/restore/components/SaveVersionForm.tsx
import * as React from "react";
import { useState } from "react";
import { Button, Input } from "@fluentui/react-components";
import { useAppStore } from "../../../state/appStore";

interface SaveVersionFormProps {
  disabled?: boolean;
}

const SaveVersionForm: React.FC<SaveVersionFormProps> = ({ disabled }) => {
  const [comment, setComment] = useState("");
  // Get state and actions directly from the store
  const { addVersion, isRestoring } = useAppStore();

  const handleSave = () => {
    addVersion(comment);
    setComment("");
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <Input
        placeholder="Describe your changes..."
        value={comment}
        onChange={(_e, data) => setComment(data.value)}
        style={{ width: "100%", marginBottom: "5px" }}
        disabled={isRestoring || disabled}
      />
      <Button 
        appearance="primary" 
        onClick={handleSave} 
        disabled={isRestoring || disabled}
      >
        Save New Version
      </Button>
    </div>
  );
};

export default SaveVersionForm;