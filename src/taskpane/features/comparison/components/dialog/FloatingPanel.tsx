// src/taskpane/features/comparison/components/dialog/FloatingPanel.tsx

import * as React from 'react';
import { Button, Subtitle2 } from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { useFloatingPanelStyles } from './Styles/FloatingPanel.styles';
import { useDraggable } from '../../hooks/useDraggable';

interface FloatingPanelProps {
  title: string;
  children: React.ReactNode;
  initialPosition: { x: number; y: number };
  onMove: (position: { x: number; y: number }) => void;
  onClose: () => void;
}

const FloatingPanel: React.FC<FloatingPanelProps> = (props) => {
  const { title, children, initialPosition, onMove, onClose } = props;
  const styles = useFloatingPanelStyles();

  // Here is the correct usage of our new, more powerful hook.
  const { dragNodeRef, style, onMouseDown } = useDraggable({
    initialPosition: initialPosition,
    onDragEnd: onMove,
  });

  return (
    <div ref={dragNodeRef} style={style} className={styles.panelContainer}>
      <div className={styles.header} onMouseDown={onMouseDown}>
        <Subtitle2 className={styles.title}>{title}</Subtitle2>
        <Button
          icon={<Dismiss24Regular />}
          appearance="subtle"
          onClick={onClose}
        />
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
};

export default FloatingPanel;