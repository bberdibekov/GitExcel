// src/taskpane/features/comparison/hooks/useDraggable.ts
import { useState, useRef, useEffect, useCallback } from 'react';

export const useDraggable = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    
    const dragNodeRef = useRef<HTMLDivElement | null>(null);
    const initialMousePosRef = useRef({ x: 0, y: 0 });
    const initialNodePosRef = useRef({ x: 0, y: 0 });

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!dragNodeRef.current) return;
        
        setIsDragging(true);
        initialMousePosRef.current = { x: e.clientX, y: e.clientY };
        initialNodePosRef.current = { ...position };

        // Prevent default text selection behavior
        e.preventDefault();
    }, [position]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;

        const deltaX = e.clientX - initialMousePosRef.current.x;
        const deltaY = e.clientY - initialMousePosRef.current.y;
        
        setPosition({
            x: initialNodePosRef.current.x + deltaX,
            y: initialNodePosRef.current.y + deltaY,
        });
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const style: React.CSSProperties = {
        transform: `translate(${position.x}px, ${position.y}px)`,
    };

    return {
        dragNodeRef,
        style,
        onMouseDown: handleMouseDown,
    };
};