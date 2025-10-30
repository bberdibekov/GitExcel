// src/taskpane/features/comparison/components/ComparisonDialogPlaceholder.tsx

import * as React from 'react';
import { Text } from '@fluentui/react-components';
import { WindowMultiple20Regular } from '@fluentui/react-icons';

const ComparisonDialogPlaceholder: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        textAlign: 'center',
        gap: '16px',
        padding: '24px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
      }}
    >
      <WindowMultiple20Regular style={{ fontSize: '48px', color: '#616161' }} />
      <div>
        <Text weight="semibold" size={400} block>
          Comparison In Progress
        </Text>
        <Text size={300} block style={{ marginTop: '4px', color: '#424242' }}>
          Please see the separate dialog window for the detailed, side-by-side comparison.
        </Text>
      </div>
    </div>
  );
};

export default ComparisonDialogPlaceholder;