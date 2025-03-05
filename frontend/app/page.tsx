'use client';

import { useEditorStore } from '@/stores/editorStore';
import { ImageDropzone } from '@/components/ImageDropzone';
import { ProcessingControls } from '@/components/ProcessingControls';
import { Typography, IconButton, Tooltip, Button, AppBar, Toolbar, Box, Slider, Stack, TextField, Popover, Container } from '@mui/material';
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
import ImageIcon from '@mui/icons-material/Image';

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
  const [colorPickerAnchor, setColorPickerAnchor] = useState<{
    element: HTMLElement | null;
    isSecondary: boolean;
  }>({ element: null, isSecondary: false });
  
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

  const handleColorBoxClick = (event: React.MouseEvent<HTMLElement>, isSecondary: boolean) => {
    setColorPickerAnchor({ element: event.currentTarget, isSecondary });
  };

  const handleColorPickerClose = () => {
    setColorPickerAnchor({ element: null, isSecondary: false });
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }} {...getRootProps()}>
      <input {...getInputProps()} />
      <Container maxWidth="xl" className="py-6" sx={{ bgcolor: 'background.default', height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 3, bgcolor: 'background.default' }}>
          <Toolbar sx={{ px: { xs: 1, sm: 2 }, display: 'flex', alignItems: 'center' }}>
            <Link href="/generate" passHref>
              <Button
                startIcon={<BrushIcon />}
                sx={{ textTransform: 'none', fontWeight: 'bold', color: 'primary.main' }}
              >
                AI Generate
              </Button>
            </Link>
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <Typography variant="h6" component="h1" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                Image Studio
              </Typography>
            </Box>
            <Box sx={{ width: '100px' }} /> {/* Spacer to balance the left button */}
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Toolbar */}
          <div className="w-64 border-r bg-gray-50">
            <ProcessingControls canvasRef={canvasRef} />
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-gray-100 flex flex-col min-h-0">
            {/* Canvas */}
            <div className="flex-1 flex relative min-h-0">
              <BackgroundToggle background={background} className="w-full h-full">
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
                        className="max-w-full max-h-full"
                        onRenderControls={setZoomControls}
                      />
                    ) : (
                      <ImageCanvas 
                        ref={canvasRef}
                        imageUrl={URL.createObjectURL(currentImage)}
                        className="max-w-full max-h-full"
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

          {/* Right Toolbar */}
          <div className="w-64 border-l bg-gray-50">
            <div className="p-4">
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
                        Colors
                      </Typography>
                      <Stack spacing={2}>
                        {/* Primary Color (Left Click) */}
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }} gutterBottom>
                            Left Click Color
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
                              onClick={(e) => handleColorBoxClick(e, false)}
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 1,
                                border: '2px solid rgba(0,0,0,0.1)',
                                backgroundColor: canvasState.penTool.color,
                                cursor: 'pointer',
                                transition: 'border-color 0.2s',
                                '&:hover': {
                                  borderColor: 'rgba(0,0,0,0.3)'
                                }
                              }}
                            />
                            <TextField
                              size="small"
                              value={canvasState.penTool.color}
                              onChange={(e) => updatePenToolSettings({ color: e.target.value })}
                              sx={{ flex: 1 }}
                            />
                          </Box>
                        </Box>

                        {/* Secondary Color (Right Click) */}
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }} gutterBottom>
                            Right Click Color
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
                              onClick={(e) => handleColorBoxClick(e, true)}
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 1,
                                border: '2px solid rgba(0,0,0,0.1)',
                                backgroundColor: canvasState.penTool.secondaryColor,
                                cursor: 'pointer',
                                transition: 'border-color 0.2s',
                                '&:hover': {
                                  borderColor: 'rgba(0,0,0,0.3)'
                                }
                              }}
                            />
                            <TextField
                              size="small"
                              value={canvasState.penTool.secondaryColor}
                              onChange={(e) => updatePenToolSettings({ secondaryColor: e.target.value })}
                              sx={{ flex: 1 }}
                            />
                          </Box>
                        </Box>
                      </Stack>
                    </Box>

                    {/* Color Picker Popovers */}
                    <Popover
                      open={Boolean(colorPickerAnchor.element)}
                      anchorEl={colorPickerAnchor.element}
                      onClose={handleColorPickerClose}
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                      }}
                      sx={{
                        '& .MuiPopover-paper': {
                          p: 1,
                          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                        }
                      }}
                    >
                      <HexColorPicker
                        color={colorPickerAnchor.isSecondary ? canvasState.penTool.secondaryColor : canvasState.penTool.color}
                        onChange={(color: string) => {
                          updatePenToolSettings(
                            colorPickerAnchor.isSecondary ? { secondaryColor: color } : { color }
                          );
                        }}
                      />
                    </Popover>

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
      </Container>
    </Box>
  );
}
