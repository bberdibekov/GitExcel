// src/taskpane/components/SaveVersionForm.tsx

import * as React from "react";
import { useState } from "react";
import { Button, Input } from "@fluentui/react-components";

interface SaveVersionFormProps {
  onSave: (comment: string) => void;
}

const SaveVersionForm: React.FC<SaveVersionFormProps> = ({ onSave }) => {
  const [comment, setComment] = useState("");

  const handleSave = () => {
    onSave(comment);
    setComment("");
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <Input
        placeholder="Describe your changes..."
        value={comment}
        onChange={(_e, data) => setComment(data.value)}
        style={{ width: "100%", marginBottom: "5px" }}
      />
      <Button appearance="primary" onClick={handleSave}>
        Save New Version
      </Button>
    </div>
  );
};

export default SaveVersionForm;