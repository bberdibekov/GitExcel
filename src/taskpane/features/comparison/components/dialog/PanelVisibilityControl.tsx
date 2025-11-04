// src/taskpane/features/comparison/components/dialog/PanelVisibilityControl.tsx

import * as React from 'react';
import { Button, Tooltip } from '@fluentui/react-components';
import {
  PanelLeft24Regular,
  PanelRight24Regular,
  Eye24Regular,
} from '@fluentui/react-icons';
import { usePanelVisibilityControlStyles } from './Styles/PanelVisibilityControl.styles';
import { VisiblePanel } from '../../../../types/types';

interface PanelVisibilityControlProps {
  visiblePanel: VisiblePanel;
  onVisibilityChange: (panel: VisiblePanel) => void;
}

const PanelVisibilityControl: React.FC<PanelVisibilityControlProps> = ({ visiblePanel, onVisibilityChange }) => {
  const styles = usePanelVisibilityControlStyles();

  return (
    <div className={styles.controlContainer}>
      <Tooltip content="Show only left panel" relationship="label">
        <Button
          icon={<PanelLeft24Regular />}
          onClick={() => onVisibilityChange('start')}
          appearance={visiblePanel === 'start' ? 'primary' : 'subtle'}
          shape="circular"
        />
      </Tooltip>
      <Tooltip content="Show both panels" relationship="label">
        <Button
          icon={<Eye24Regular />}
          onClick={() => onVisibilityChange('both')}
          appearance={visiblePanel === 'both' ? 'primary' : 'subtle'}
          shape="circular"
        />
      </Tooltip>
      <Tooltip content="Show only right panel" relationship="label">
        <Button
          icon={<PanelRight24Regular />}
          onClick={() => onVisibilityChange('end')}
          appearance={visiblePanel === 'end' ? 'primary' : 'subtle'}
          shape="circular"
        />
      </Tooltip>
    </div>
  );
};

export default PanelVisibilityControl;