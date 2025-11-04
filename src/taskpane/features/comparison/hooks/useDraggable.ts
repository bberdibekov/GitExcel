// src/taskpane/features/comparison/hooks/useDraggable.ts

import { useRef, useState, useCallback, useEffect, CSSProperties, MouseEvent } from 'react';

interface DraggableOptions {
    initialPosition?: { x: number; y: number };
    onDragEnd?: (position: { x: number; y: number }) => void;
}

export const useDraggable = (options: DraggableOptions = {}) => {
    const { initialPosition, onDragEnd } = options;
    
    const dragNodeRef = useRef<HTMLDivElement>(null);

    const [position, setPosition] = useState(initialPosition || { x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const hasSetInitialPositionRef = useRef(!!initialPosition);
    const offsetRef = useRef({ x: 0, y: 0 });

    // This effect handles the case where `initialPosition` is calculated asynchronously
    // by the parent component.
    useEffect(() => {
        // If we receive a valid `initialPosition` prop and we haven't set it yet,
        // update the hook's internal state to match.
        if (initialPosition && !hasSetInitialPositionRef.current) {
            setPosition(initialPosition);
            hasSetInitialPositionRef.current = true;
        }
    }, [initialPosition]);

    const onMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
        if (!dragNodeRef.current) return;
        isDraggingRef.current = true;
        
        offsetRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
        
        e.preventDefault();
    }, [position.x, position.y]);

    const onMouseMove = useCallback((e: globalThis.MouseEvent) => {
        if (!isDraggingRef.current) return;
        
        const newPos = {
            x: e.clientX - offsetRef.current.x,
            y: e.clientY - offsetRef.current.y,
        };
        setPosition(newPos);

    }, []);

    const onMouseUp = useCallback(() => {
        if (isDraggingRef.current && onDragEnd) {
            onDragEnd(position);
        }
        isDraggingRef.current = false;
    }, [onDragEnd, position]);

    useEffect(() => {
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [onMouseMove, onMouseUp]);

    const style: CSSProperties = {
        position: 'absolute',
        top: 0, 
        left: 0,
        transform: `translate(${position.x}px, ${position.y}px)`,
    };

    return { dragNodeRef, style, onMouseDown };
};