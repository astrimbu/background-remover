'use client';

import { useCallback, useEffect, useRef, useState, WheelEvent, MouseEvent, KeyboardEvent } from 'react';
import { styled } from '@mui/material/styles';
import { useEditorStore } from '@/stores/editorStore';
import { IconButton, Typography } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { DrawingAction } from '@/types/editor';
import React from 'react';

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

const DrawingCanvas = styled('canvas')({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none', // Only enable when pen tool is active
});

export interface ImageCanvasRef {
  getMergedCanvas: () => HTMLCanvasElement | null;
}

interface ImageCanvasProps {
  imageUrl: string;
  className?: string;
  onRenderControls?: (controls: React.ReactNode) => void;
}

export const ImageCanvas = React.forwardRef<ImageCanvasRef, ImageCanvasProps>(
  ({ imageUrl, className, onRenderControls }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [initialScale, setInitialScale] = useState(1);
    
    const { scale, translate, penTool } = useEditorStore(state => state.canvasState);
    const { updateCanvasState, addDrawingAction, undoDrawing, redoDrawing } = useEditorStore(state => state.actions);

    // Expose methods through ref
    React.useImperativeHandle(ref, () => ({
      getMergedCanvas: () => {
        if (!imageRef.current || !canvasRef.current) return null;

        // Create a temporary canvas for merging
        const mergeCanvas = document.createElement('canvas');
        mergeCanvas.width = imageSize.width;
        mergeCanvas.height = imageSize.height;
        const ctx = mergeCanvas.getContext('2d');
        if (!ctx) return null;

        // Draw the image
        ctx.drawImage(imageRef.current, 0, 0, imageSize.width, imageSize.height);

        // Draw the canvas content (drawings) on top
        ctx.drawImage(canvasRef.current, 0, 0);

        return mergeCanvas;
      }
    }));

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

    // Handle keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          if (e.shiftKey) {
            redoDrawing();
          } else {
            undoDrawing();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown as any);
      return () => window.removeEventListener('keydown', handleKeyDown as any);
    }, [undoDrawing, redoDrawing]);

    // Initialize drawing context
    useEffect(() => {
      if (!canvasRef.current || !contentRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to match content
      canvas.width = contentRef.current.offsetWidth;
      canvas.height = contentRef.current.offsetHeight;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set up drawing styles
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Redraw all actions from history
      penTool.history.forEach(action => {
        ctx.strokeStyle = action.color;
        ctx.lineWidth = action.size * scale;
        ctx.globalAlpha = action.opacity;

        ctx.beginPath();
        const points = action.points;
        if (points.length > 0) {
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.stroke();
        }
      });

      // Set current styles
      ctx.strokeStyle = penTool.color;
      ctx.lineWidth = penTool.size * scale;
      ctx.globalAlpha = penTool.opacity;
    }, [penTool.color, penTool.size, penTool.opacity, scale, penTool.history]);

    // Handle drawing
    const draw = useCallback((e: MouseEvent) => {
      if (!canvasRef.current || !isDrawing || !penTool.isActive) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale - translate.x;
      const y = (e.clientY - rect.top) / scale - translate.y;

      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Update current path
      penTool.currentPath.push({ x, y });
      setStartPoint({ x, y });
    }, [isDrawing, penTool.isActive, scale, translate, startPoint, penTool.currentPath]);

    // Handle mouse events
    const handleMouseDown = useCallback((e: MouseEvent) => {
      e.preventDefault();
      
      if (penTool.isActive) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale - translate.x;
        const y = (e.clientY - rect.top) / scale - translate.y;
        
        setIsDrawing(true);
        setStartPoint({ x, y });
        penTool.currentPath = [{ x, y }];
      } else if (e.button === 0 || e.button === 1) {
        setIsPanning(true);
        setStartPoint({ x: e.clientX - translate.x, y: e.clientY - translate.y });
      }
    }, [penTool.isActive, scale, translate]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
      if (isDrawing && penTool.isActive) {
        draw(e);
      } else if (isPanning) {
        const newX = e.clientX - startPoint.x;
        const newY = e.clientY - startPoint.y;
        updateCanvasState({ translate: { x: newX, y: newY } });
      }
    }, [isDrawing, isPanning, penTool.isActive, startPoint, updateCanvasState, draw]);

    const handleMouseUp = useCallback(() => {
      if (isDrawing && penTool.currentPath.length > 1) {
        // Add the drawing action to history
        const action: DrawingAction = {
          type: 'draw',
          points: [...penTool.currentPath],
          color: penTool.color,
          size: penTool.size,
          opacity: penTool.opacity
        };
        addDrawingAction(action);
      }
      setIsPanning(false);
      setIsDrawing(false);
    }, [isDrawing, penTool, addDrawingAction]);

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
        style={{ cursor: penTool.isActive ? 'crosshair' : 'grab' }}
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
            ref={imageRef}
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
          <DrawingCanvas
            ref={canvasRef}
            style={{
              pointerEvents: penTool.isActive ? 'auto' : 'none'
            }}
          />
        </CanvasContent>
      </CanvasContainer>
    );
  }
); 