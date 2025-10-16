// src/taskpane/components/dialogs/DialogComparisonView.tsx

import * as React from "react";
import { useEffect } from "react";
import { IDiffResult, ISummaryResult } from "../../types/types";
import { Spinner } from "@fluentui/react-components";
import DiffViewer from "../DiffViewer";
import DiffFilterOptions from "../DiffFilterOptions";
import { generateSummary } from "../../services/summary.service";
import { crossWindowMessageBus } from "../../services/dialog/CrossWindowMessageBus";
import { MessageType, GridSelectionChangedPayload } from "../../types/messaging.types";
import { loggingService } from "../../services/LoggingService";

interface DialogComparisonViewProps {
  result: IDiffResult | null;
}

const DialogComparisonView: React.FC<DialogComparisonViewProps> = ({ result }) => {
  loggingService.log("[DialogComparisonView] Component rendered with props:", { result });

  // Gracefully handle the case where data is still loading or failed to load.
  if (!result) {
    loggingService.warn("[DialogComparisonView] 'result' prop is null or undefined. Rendering loading spinner.");
    return <Spinner label="Loading comparison data..." />;
  }

  const summary: ISummaryResult = generateSummary(result);
  const [activeFilters, setActiveFilters] = React.useState<Set<string>>(new Set());

  const handleFilterChange = (filterId: string) => {
    setActiveFilters(prevFilters => {
      const newFilters = new Set(prevFilters);
      if (newFilters.has(filterId)) {
        newFilters.delete(filterId);
      } else {
        newFilters.add(filterId);
      }
      return newFilters;
    });
  };

  // This effect is the core of the "two-way binding" for the dialog.
  useEffect(() => {
    loggingService.log("[DialogComparisonView] Setting up message bus listener for GRID_SELECTION_CHANGED.");
    const unsubscribe = crossWindowMessageBus.listen(
      MessageType.GRID_SELECTION_CHANGED,
      (payload: GridSelectionChangedPayload) => {
        loggingService.log(`[DialogComparisonView] Received GRID_SELECTION_CHANGED. Scrolling to element...`, payload);
        const elementId = `change-${payload.sheet}-${payload.address}`;
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          loggingService.warn(`[DialogComparisonView] Could not find element with ID: ${elementId}`);
        }
      }
    );
    return unsubscribe;
  }, []);

  const handleNavigate = (sheet: string, address: string) => {
    loggingService.log(`[DialogComparisonView] Broadcasting NAVIGATE_TO_CELL to task pane...`, { sheet, address });
    crossWindowMessageBus.broadcast({
      type: MessageType.NAVIGATE_TO_CELL,
      payload: { sheet, address },
    });
  };

  loggingService.log("[DialogComparisonView] Rendering DiffViewer with summary:", summary);

  return (
    <div>
      <DiffFilterOptions activeFilters={activeFilters} onFilterChange={handleFilterChange} />
      <DiffViewer summary={summary} onNavigate={handleNavigate} />
    </div>
  );
};

export default DialogComparisonView;