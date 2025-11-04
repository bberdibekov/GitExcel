// src/taskpane/features/comparison/hooks/useResizablePanels.ts

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * A custom hook to manage the state and logic for a vertically resizable two-panel layout.
 * @param initialWidth The initial percentage width of the left panel (default: 50).
 * @returns An object containing the necessary state, refs, and event handlers to be attached to the DOM.
 */
export const useResizablePanels = (initialWidth = 50) => {
    const [isResizing, setIsResizing] = useState(false);
    const [leftPanelWidth, setLeftPanelWidth] = useState<number>(initialWidth);

    const resizerRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null); // Renamed from gridsBodyRef for reusability

    const handleResizeMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing || !containerRef.current) return;
        
        const containerRect = containerRef.current.getBoundingClientRect();
        const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        
        // Clamp the width between a min and max percentage to prevent panels from disappearing
        const clampedWidth = Math.max(10, Math.min(newLeftWidth, 90));
        setLeftPanelWidth(clampedWidth);
    }, [isResizing]);

    const handleResizeMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleResizeMouseMove);
            window.addEventListener('mouseup', handleResizeMouseUp);
        } else {
            window.removeEventListener('mousemove', handleResizeMouseMove);
            window.removeEventListener('mouseup', handleResizeMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleResizeMouseMove);
            window.removeEventListener('mouseup', handleResizeMouseUp);
        };
    }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

    return {
        leftPanelWidth,
        resizerRef,
        containerRef,
        handleResizeMouseDown,
        isResizing
    };
};