// src/taskpane/features/comparison/components/dialog/Minimap.tsx
import React, { useRef, useEffect } from 'react';
import { useMinimapStyles } from './Styles/Minimap.styles';
import { tokens } from '@fluentui/react-components';

interface MinimapProps {
    totalRowCount: number;
    totalColumnCount: number;
    changeCoordinates: Array<{ rowIndex: number; colIndex: number }>;
    viewport: {
        scrollTop: number;
        scrollLeft: number;
        viewportHeight: number;
        viewportWidth: number;
    };
    onNavigate: (newScrollTop: number, newScrollLeft: number) => void;
    gridPixelWidth: number;
    gridPixelHeight: number;
}

const MINIMAP_WIDTH = 150;
const MINIMAP_HEIGHT = 180;

export const Minimap: React.FC<MinimapProps> = (props) => {
    const { 
        totalRowCount, 
        totalColumnCount, 
        changeCoordinates, 
        viewport, 
        onNavigate,
        gridPixelWidth,
        gridPixelHeight
    } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const styles = useMinimapStyles();
    
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const initialScroll = useRef({ top: 0, left: 0 });

    const scaleX = MINIMAP_WIDTH / gridPixelWidth;
    const scaleY = MINIMAP_HEIGHT / gridPixelHeight;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);
        if (totalRowCount === 0 || totalColumnCount === 0 || gridPixelWidth <= 0 || gridPixelHeight <= 0) return;

        ctx.fillStyle = '#ff0000';
        const avgColWidth = gridPixelWidth / totalColumnCount;
        const avgRowHeight = gridPixelHeight / totalRowCount;

        for (const change of changeCoordinates) {
            const x = change.colIndex * avgColWidth * scaleX;
            const y = change.rowIndex * avgRowHeight * scaleY;
            // DRAW THE DOTS
            ctx.fillRect(x, y, 2, 2);
        }

        // 2. Draw the viewport rectangle
        const viewportX = viewport.scrollLeft * scaleX;
        const viewportY = viewport.scrollTop * scaleY;
        const viewportRectWidth = viewport.viewportWidth * scaleX;
        const viewportRectHeight = viewport.viewportHeight * scaleY;
        
        // SET THE STYLE FOR THE VIEWPORT
        ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.35)';
        ctx.lineWidth = 1;
        
        // DRAW THE VIEWPORT
        ctx.fillRect(viewportX, viewportY, viewportRectWidth, viewportRectHeight);
        ctx.strokeRect(viewportX, viewportY, viewportRectWidth, viewportRectHeight);


    }, [changeCoordinates, viewport, totalRowCount, totalColumnCount, gridPixelWidth, gridPixelHeight, scaleX, scaleY]);

    const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = event.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const viewportX = viewport.scrollLeft * scaleX;
        const viewportY = viewport.scrollTop * scaleY;
        const viewportRectWidth = viewport.viewportWidth * scaleX;
        const viewportRectHeight = viewport.viewportHeight * scaleY;

        if (mouseX >= viewportX && mouseX <= viewportX + viewportRectWidth &&
            mouseY >= viewportY && mouseY <= viewportY + viewportRectHeight) {
            
            isDragging.current = true;
            dragStart.current = { x: mouseX, y: mouseY };
            initialScroll.current = { top: viewport.scrollTop, left: viewport.scrollLeft };

            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            const targetScrollLeft = (mouseX / MINIMAP_WIDTH) * gridPixelWidth - (viewport.viewportWidth / 2);
            const targetScrollTop = (mouseY / MINIMAP_HEIGHT) * gridPixelHeight - (viewport.viewportHeight / 2);
            navigateTo(targetScrollTop, targetScrollLeft);
        }
    };

    const handleMouseMove = (event: MouseEvent) => {
        if (!isDragging.current) return;
        event.preventDefault();

        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;

        const deltaX = event.clientX - canvasRect.left - dragStart.current.x;
        const deltaY = event.clientY - canvasRect.top - dragStart.current.y;

        const newScrollLeft = initialScroll.current.left + (deltaX / scaleX);
        const newScrollTop = initialScroll.current.top + (deltaY / scaleY);
        
        navigateTo(newScrollTop, newScrollLeft);
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    const navigateTo = (top: number, left: number) => {
        const clampedScrollLeft = Math.max(0, Math.min(left, gridPixelWidth - viewport.viewportWidth));
        const clampedScrollTop = Math.max(0, Math.min(top, gridPixelHeight - viewport.viewportHeight));
        onNavigate(clampedScrollTop, clampedScrollLeft);
    };

    return (
        <div className={styles.minimapContainer}>
            <canvas
                ref={canvasRef}
                width={MINIMAP_WIDTH}
                height={MINIMAP_HEIGHT}
                onMouseDown={handleMouseDown}
                className={styles.minimapCanvas}
                style={{ cursor: isDragging.current ? 'grabbing' : 'pointer' }}
            />
        </div>
    );
};