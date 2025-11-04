// src/taskpane/features/comparison/hooks/useSyncedGrids.ts

import { useState, useRef, useEffect } from 'react';
import { type GridImperativeAPI } from 'react-window';
import { VisiblePanel } from '../../../types/types';

/**
 * A custom hook to manage the state and logic for two synchronized virtualized grids.
 * It handles synchronized scrolling and calculates the viewport dimensions for a minimap.
 * @param visiblePanel The currently visible panel, used to determine which container to observe for resizing.
 * @returns An object containing the necessary refs, state, and event handlers for the grids.
 */
export const useSyncedGrids = (visiblePanel: VisiblePanel) => {
    const gridStartRef = useRef<GridImperativeAPI | null>(null);
    const gridEndRef = useRef<GridImperativeAPI | null>(null);
    const leftGridContainerRef = useRef<HTMLDivElement | null>(null);
    const rightGridContainerRef = useRef<HTMLDivElement | null>(null);

    const isScrolling = useRef(false);

    const [viewport, setViewport] = useState({
        scrollTop: 0,
        scrollLeft: 0,
        viewportWidth: 1,
        viewportHeight: 1,
    });

    useEffect(() => {
        let container: HTMLDivElement | null = null;
        if (visiblePanel === 'start') {
            container = leftGridContainerRef.current;
        } else {
            container = rightGridContainerRef.current;
        }

        if (!container) {
            return () => {};
        }

        const resizeObserver = new ResizeObserver(() => {
            const { width, height } = container.getBoundingClientRect();
            const trueViewportWidth = width - 50;
            const trueViewportHeight = height - 22;

            setViewport(prev => ({
                ...prev,
                viewportWidth: trueViewportWidth > 0 ? trueViewportWidth : 1,
                viewportHeight: trueViewportHeight > 0 ? trueViewportHeight : 1,
            }));
        });

        resizeObserver.observe(container);

        // This path also returns a cleanup function, so the types now match.
        return () => {
            resizeObserver.disconnect();
        };
    }, [visiblePanel]);

    const onScrollStart = (scrollTop: number, scrollLeft: number) => {
        setViewport(prev => ({ ...prev, scrollTop, scrollLeft }));
        if (isScrolling.current) return;
        isScrolling.current = true;

        const targetElement = gridEndRef.current?.element;
        if (targetElement) {
            targetElement.scrollTop = scrollTop;
            targetElement.scrollLeft = scrollLeft;
        }

        requestAnimationFrame(() => { isScrolling.current = false; });
    };

    const onScrollEnd = (scrollTop: number, scrollLeft: number) => {
        setViewport(prev => ({ ...prev, scrollTop, scrollLeft }));
        if (isScrolling.current) return;
        isScrolling.current = true;

        const targetElement = gridStartRef.current?.element;
        if (targetElement) {
            targetElement.scrollTop = scrollTop;
            targetElement.scrollLeft = scrollLeft;
        }

        requestAnimationFrame(() => { isScrolling.current = false; });
    };

    const handleMinimapNavigate = (scrollTop: number, scrollLeft: number) => {
        const startElement = gridStartRef.current?.element;
        if (startElement) {
            startElement.scrollTop = scrollTop;
            startElement.scrollLeft = scrollLeft;
        }
        const endElement = gridEndRef.current?.element;
        if (endElement) {
            endElement.scrollTop = scrollTop;
            endElement.scrollLeft = scrollLeft;
        }
    };

    return {
        gridStartRef,
        gridEndRef,
        leftGridContainerRef,
        rightGridContainerRef,
        viewport,
        onScrollStart,
        onScrollEnd,
        handleMinimapNavigate
    };
};