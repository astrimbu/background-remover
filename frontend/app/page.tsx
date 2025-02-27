'use client';

import { useEditorStore } from '@/stores/editorStore';
import { ImageDropzone } from '@/components/ImageDropzone';
import { ProcessingControls } from '@/components/ProcessingControls';
import { Typography, IconButton, Tooltip, Button, AppBar, Toolbar, Box, Slider, Stack, TextField } from '@mui/material';
import { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { BackgroundToggle, BackgroundToggleButton } from '@/components/BackgroundToggle';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import BrushIcon from '@mui/icons-material/Brush';
import SaveIcon from '@mui/icons-material/Save';
import Link from 'next/link';
import { ImageCanvas, ImageCanvasRef } from '@/components/ImageCanvas';
import { HexColorPicker } from 'react-colorful';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';

type BackgroundType = 'transparent' | 'light' | 'dark';

export default function EditorPage() {
  const { currentImage, processedImage, canvasState } = useEditorStore();
  const { 
    setCurrentImage, 
    togglePenTool, 
    updatePenToolSettings,
    undoDrawing,
    redoDrawing,
    updateProcessedImage
  } = useEditorStore(state => state.actions);
  const [background, setBackground] = useState<BackgroundType>('transparent');
  const [zoomControls, setZoomControls] = useState<React.ReactNode>(null);
  const canvasRef = useRef<ImageCanvasRef>(null);
  
  const handleToggle = useCallback(() => {
    const sequence: BackgroundType[] = ['transparent', 'light', 'dark'];
    const currentIndex = sequence.indexOf(background);
    setBackground(sequence[(currentIndex + 1) % sequence.length]);
  }, [background]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setCurrentImage(file);
    }
  }, [setCurrentImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: false,
    noClick: true
  });

  // Handle save with drawings
  const handleSave = useCallback(() => {
    if (!canvasRef.current) return;
    
    const mergedCanvas = canvasRef.current.getMergedCanvas();
    if (!mergedCanvas) return;

    // Convert to blob and save
    mergedCanvas.toBlob((blob) => {
      if (!blob) return;
      
      // Create object URL and update processed image
      const url = URL.createObjectURL(blob);
      updateProcessedImage(url);

      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = 'edited-image.png';
      link.click();

      // Clean up
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, [updateProcessedImage]);

  return (
    <div {...getRootProps()} className="h-screen flex flex-col">
      <input {...getInputProps()} />
      
      {/* Top Bar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Image Studio
          </Typography>
          <div className="flex gap-2">
            <Link href="/generate" passHref>
              <Button
                variant="outlined"
                startIcon={<BrushIcon />}
                size="small"
              >
                AI Generate
              </Button>
            </Link>
          </div>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Toolbar */}
        <div className="w-64 border-r bg-gray-50">
          <ProcessingControls canvasRef={canvasRef} />
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-gray-100 flex flex-col">
          {/* Canvas */}
          <div className="flex-1 flex relative">
            <BackgroundToggle background={background} className="w-full">
              {/* Canvas Controls */}
              <div className="absolute top-2 right-2 z-10 flex items-center">
                {zoomControls}
                <BackgroundToggleButton 
                  onClick={handleToggle} 
                  background={background}
                />
              </div>
              
              <div className="flex items-center justify-center w-full h-full">
                {currentImage ? (
                  processedImage ? (
                    <ImageCanvas 
                      ref={canvasRef}
                      imageUrl={processedImage}
                      className="max-w-full"
                      onRenderControls={setZoomControls}
                    />
                  ) : (
                    <ImageCanvas 
                      ref={canvasRef}
                      imageUrl={URL.createObjectURL(currentImage)}
                      className="max-w-full"
                      onRenderControls={setZoomControls}
                    />
                  )
                ) : (
                  <ImageDropzone />
                )}
              </div>
            </BackgroundToggle>
          </div>
        </div>

        {/* Right Toolbar - Could be used for layers, history, etc. in the future */}
        <div className="w-64 border-l bg-gray-50 p-4">
          <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
            Drawing Tools
          </Typography>
          
          {/* Pen Tool Toggle */}
          <Stack spacing={2}>
            <Button
              variant={canvasState.penTool.isActive ? "contained" : "outlined"}
              startIcon={<BrushIcon />}
              onClick={togglePenTool}
              fullWidth
            >
              {canvasState.penTool.isActive ? "Disable Pen" : "Enable Pen"}
            </Button>

            {/* Pen Settings */}
            {canvasState.penTool.isActive && (
              <>
                {/* Undo/Redo Controls */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<UndoIcon />}
                    onClick={undoDrawing}
                    disabled={canvasState.penTool.history.length === 0}
                    sx={{ flex: 1 }}
                  >
                    Undo
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RedoIcon />}
                    onClick={redoDrawing}
                    disabled={canvasState.penTool.redoStack.length === 0}
                    sx={{ flex: 1 }}
                  >
                    Redo
                  </Button>
                </Box>

                {/* Color Picker */}
                <Box>
                  <Typography variant="subtitle2" sx={{ color: 'text.primary' }} gutterBottom>
                    Color
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        border: '2px solid rgba(0,0,0,0.1)',
                        backgroundColor: canvasState.penTool.color
                      }}
                    />
                    <TextField
                      size="small"
                      value={canvasState.penTool.color}
                      onChange={(e) => updatePenToolSettings({ color: e.target.value })}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <HexColorPicker
                      color={canvasState.penTool.color}
                      onChange={(color: string) => updatePenToolSettings({ color })}
                    />
                  </Box>
                </Box>

                {/* Size Slider */}
                <Box>
                  <Typography variant="subtitle2" sx={{ color: 'text.primary' }} gutterBottom>
                    Size
                  </Typography>
                  <Slider
                    value={canvasState.penTool.size}
                    onChange={(_, value) => updatePenToolSettings({ size: value as number })}
                    min={1}
                    max={50}
                    valueLabelDisplay="auto"
                  />
                </Box>

                {/* Opacity Slider */}
                <Box>
                  <Typography variant="subtitle2" sx={{ color: 'text.primary' }} gutterBottom>
                    Opacity
                  </Typography>
                  <Slider
                    value={canvasState.penTool.opacity}
                    onChange={(_, value) => updatePenToolSettings({ opacity: value as number })}
                    min={0}
                    max={1}
                    step={0.1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                  />
                </Box>
              </>
            )}
          </Stack>
        </div>
      </div>

      {isDragActive && (
        <div className="fixed inset-0 bg-blue-500/20 pointer-events-none flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <Typography variant="h5">
              Drop image here...
            </Typography>
          </div>
        </div>
      )}
    </div>
  );
}
