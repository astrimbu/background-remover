'use client';

import { useCallback, useEffect, useRef, useState, WheelEvent, MouseEvent } from 'react';
import { styled } from '@mui/material/styles';
import { useEditorStore } from '@/stores/editorStore';
import { IconButton, Typography } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

const CanvasContainer = styled('div')({
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  position: 'relative',
  cursor: 'grab',
  '&:active': {
    cursor: 'grabbing'
  }
});

const CanvasContent = styled('div')({
  position: 'absolute',
  transformOrigin: '50% 50%',
  left: '50%',
  top: '50%',
});

const ZoomControls = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '6px',
  background: '#fff',
  borderRadius: '4px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
  marginRight: '8px',
  height: '32px', // Match MUI small button height
  '& .MuiTypography-root': {
    fontSize: '0.875rem',
    lineHeight: 1,
    minWidth: '48px',
    textAlign: 'center'
  },
  '& .MuiIconButton-root': {
    padding: 4,
    marginLeft: -2
  }
});

interface ImageCanvasProps {
  imageUrl: string;
  className?: string;
  onRenderControls?: (controls: React.ReactNode) => void;
}

export function ImageCanvas({ imageUrl, className, onRenderControls }: ImageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [initialScale, setInitialScale] = useState(1);
  
  const { scale, translate } = useEditorStore(state => state.canvasState);
  const { updateCanvasState } = useEditorStore(state => state.actions);

  // Handle reset view
  const handleReset = useCallback(() => {
    updateCanvasState({
      scale: initialScale,
      translate: { x: 0, y: 0 }
    });
  }, [initialScale, updateCanvasState]);

  // Calculate zoom percentage
  const zoomPercentage = Math.round((scale / initialScale) * 100);

  // Create zoom controls element
  const zoomControls = (
    <ZoomControls>
      <Typography variant="body2">
        {zoomPercentage}%
      </Typography>
      <IconButton 
        size="small"
        onClick={handleReset}
        title="Reset View"
        sx={{ color: 'action.active' }}
      >
        <RestartAltIcon fontSize="small" />
      </IconButton>
    </ZoomControls>
  );

  // Pass zoom controls to parent
  useEffect(() => {
    onRenderControls?.(zoomControls);
  }, [onRenderControls, zoomPercentage]);

  // Initialize image position
  useEffect(() => {
    if (!containerRef.current) return;
    
    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newScale = Math.min(
        containerRect.width / image.width,
        containerRect.height / image.height
      ) * 0.9;
      
      setImageSize({ width: image.width, height: image.height });
      setInitialScale(newScale);
      
      // Only set initial scale and translation if they haven't been set before
      if (scale === 1 && translate.x === 0 && translate.y === 0) {
        updateCanvasState({ scale: newScale, translate: { x: 0, y: 0 } });
      }
    };
  }, [imageUrl, scale, translate.x, translate.y, updateCanvasState]);

  // Handle mouse down for panning
  const handleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault(); // Prevent image dragging
    if (e.button !== 0 && e.button !== 1) return; // Handle left and middle click
    
    setIsPanning(true);
    setStartPoint({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  }, [translate]);

  // Handle mouse move for panning
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning) return;

    const newX = e.clientX - startPoint.x;
    const newY = e.clientY - startPoint.y;
    updateCanvasState({ translate: { x: newX, y: newY } });
  }, [isPanning, startPoint, updateCanvasState]);

  // Handle mouse up to stop panning
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle zoom with mouse wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current || !contentRef.current) return;

    const container = containerRef.current;
    const content = contentRef.current;
    const containerRect = container.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();

    // Get the cursor position relative to the container
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    // Calculate the cursor position relative to the content's center
    const contentCenterX = contentRect.left + contentRect.width / 2 - containerRect.left;
    const contentCenterY = contentRect.top + contentRect.height / 2 - containerRect.top;
    
    // Get the cursor offset from content center in screen space
    const offsetX = mouseX - contentCenterX;
    const offsetY = mouseY - contentCenterY;

    // Convert the offset to content space (before scale)
    const contentOffsetX = offsetX / scale;
    const contentOffsetY = offsetY / scale;

    // Calculate new scale
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, scale * delta));

    // Calculate how the content offset will change with the new scale
    const newOffsetX = contentOffsetX * newScale;
    const newOffsetY = contentOffsetY * newScale;

    // Calculate the required translation to keep the point under cursor
    const newTranslate = {
      x: translate.x + (offsetX - newOffsetX),
      y: translate.y + (offsetY - newOffsetY)
    };

    updateCanvasState({
      scale: newScale,
      translate: newTranslate
    });
  }, [scale, translate, updateCanvasState]);

  return (
    <CanvasContainer
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className={className}
    >
      <CanvasContent
        ref={contentRef}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          width: imageSize.width,
          height: imageSize.height,
          marginLeft: -imageSize.width / 2,
          marginTop: -imageSize.height / 2,
          border: '2px solid rgba(0, 0, 0, 0.2)',
        }}
      >
        <img
          src={imageUrl}
          alt="Canvas content"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'none'
          }}
          draggable={false}
        />
      </CanvasContent>
    </CanvasContainer>
  );
} 