'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { AVAILABLE_MODELS, DEFAULT_SETTINGS } from '@/types/editor';
import { imageApi } from '@/lib/api';
import { 
  FormControl,
  Select,
  MenuItem,
  Slider,
  Button,
  Stack,
  Typography,
  Box,
  CircularProgress,
  SelectChangeEvent,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Paper
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import BorderAllIcon from '@mui/icons-material/BorderAll';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import CropIcon from '@mui/icons-material/Crop';
import { ImageCanvasRef } from '@/components/ImageCanvas';

// Debounce helper function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

interface ProcessingControlsProps {
  canvasRef: React.RefObject<ImageCanvasRef | null>;
}

export function ProcessingControls({ canvasRef }: ProcessingControlsProps) {
  const settings = useEditorStore(state => state.settings);
  const currentImage = useEditorStore(state => state.currentImage);
  const processedImage = useEditorStore(state => state.processedImage);
  const originalDimensions = useEditorStore(state => state.originalDimensions);
  const shouldProcess = useEditorStore(state => state.shouldProcess);
  const { updateSettings, addToHistory, resetSettings, triggerBackgroundRemoval, updateProcessedImage, resetProcessingState } = useEditorStore(state => state.actions);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState(settings);
  const [openSection, setOpenSection] = useState<'background' | 'border' | 'resize' | 'padding' | null>(null);
  const [debouncedDimensions, setDebouncedDimensions] = useState({
    width: settings.targetWidth,
    height: settings.targetHeight
  });
  const [originalProcessedImage, setOriginalProcessedImage] = useState<string | null>(null);

  // Handle image fitting operations
  const handleImageFitting = useCallback(async (sourceImageUrl: string) => {
    if (!sourceImageUrl) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(sourceImageUrl);
      const imageBlob = await response.blob();
      const result = await imageApi.fitImage(imageBlob, {
        paddingEnabled: settings.paddingEnabled,
        paddingSize: settings.paddingSize,
        targetWidth: settings.targetWidth,
        targetHeight: settings.targetHeight,
        maintainAspectRatio: settings.maintainAspectRatio
      });
      const imageUrl = URL.createObjectURL(new Blob([result], { type: 'image/png' }));
      updateProcessedImage(imageUrl);
    } catch (error) {
      console.error('Error fitting image:', error);
      setError(error instanceof Error ? error.message : 'Failed to fit image');
    } finally {
      setIsProcessing(false);
    }
  }, [settings, updateProcessedImage, setIsProcessing, setError]);

  // Add debounced padding update function
  const debouncedPaddingUpdate = useCallback(
    debounce(async (paddingSize: number) => {
      if (!currentImage) return;
      
      try {
        // Always use the original image (either current image or background-removed image)
        const imageBlob = settings.backgroundRemoved && originalProcessedImage ? 
          await fetch(originalProcessedImage).then(r => r.blob()) : 
          currentImage.slice();

        const result = await imageApi.fitImage(imageBlob, {
          paddingEnabled: settings.paddingEnabled,
          paddingSize: paddingSize,
          targetWidth: settings.targetWidth,
          targetHeight: settings.targetHeight,
          maintainAspectRatio: settings.maintainAspectRatio
        });
        const imageUrl = URL.createObjectURL(new Blob([result], { type: 'image/png' }));
        updateProcessedImage(imageUrl);
      } catch (error) {
        console.error('Error updating padding:', error);
        setError(error instanceof Error ? error.message : 'Failed to update padding');
      }
    }, 100),
    [currentImage, originalProcessedImage, settings, updateProcessedImage]
  );

  const handleSliderChange = useCallback((name: keyof typeof settings) => (_: Event, value: number | number[]) => {
    setLocalSettings(prev => ({
      ...prev,
      [name]: value as number
    }));
    
    // Don't trigger immediate updates for padding size changes
    if (name !== 'paddingSize') {
      updateSettings({ [name]: value as number });
    }
  }, [updateSettings]);

  const handleSliderChangeCommitted = useCallback((name: keyof typeof settings) => (_: Event | React.SyntheticEvent<Element, Event>, value: number | number[]) => {
    console.log(`Slider ${name} committed to:`, value);
    updateSettings({ [name]: value as number });
    
    // For padding size, trigger the update on commit
    if (name === 'paddingSize' && settings.paddingEnabled) {
      debouncedPaddingUpdate(value as number);
    }
    // If this is a background removal setting and background is removed, trigger reprocessing
    else if ((name === 'foregroundThreshold' || name === 'erodeSize') && settings.backgroundRemoved) {
      triggerBackgroundRemoval();
    }
  }, [updateSettings, settings.backgroundRemoved, settings.paddingEnabled, debouncedPaddingUpdate, triggerBackgroundRemoval]);

  const handleModelChange = useCallback((event: SelectChangeEvent) => {
    const model = event.target.value as keyof typeof AVAILABLE_MODELS;
    updateSettings({ model });
    // If background is currently removed, trigger reprocessing
    if (settings.backgroundRemoved) {
      triggerBackgroundRemoval();
    }
  }, [updateSettings, settings.backgroundRemoved, triggerBackgroundRemoval]);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Update local dimensions when settings change
  useEffect(() => {
    setDebouncedDimensions({
      width: settings.targetWidth,
      height: settings.targetHeight
    });
  }, [settings.targetWidth, settings.targetHeight]);

  // Update the debouncedUpdateDimensions function to apply resize when active
  const debouncedUpdateDimensions = useCallback(
    debounce(async (newDimensions: { width: number | null, height: number | null }) => {
      // Calculate new dimensions based on aspect ratio if needed
      let updatedWidth = newDimensions.width;
      let updatedHeight = newDimensions.height;
      
      if (settings.maintainAspectRatio && originalDimensions) {
        const aspectRatio = originalDimensions.width / originalDimensions.height;
        if (newDimensions.width !== null && newDimensions.width !== settings.targetWidth) {
          updatedWidth = newDimensions.width;
          updatedHeight = Math.round(newDimensions.width / aspectRatio);
        } else if (newDimensions.height !== null && newDimensions.height !== settings.targetHeight) {
          updatedHeight = newDimensions.height;
          updatedWidth = Math.round(newDimensions.height * aspectRatio);
        }
      } else {
        updatedWidth = newDimensions.width;
        updatedHeight = newDimensions.height;
      }
      
      // Update the settings with the new dimensions
      updateSettings({
        targetWidth: updatedWidth,
        targetHeight: updatedHeight
      });
      
      // If resize is active, apply the resize immediately
      if (settings.isResizeActive && currentImage) {
        try {
          setIsProcessing(true);
          
          // Determine the source image (original or background-removed)
          const sourceImage = settings.backgroundRemoved && processedImage
            ? await fetch(processedImage).then(r => r.blob())
            : currentImage;
          
          // Apply the resize
          const result = await imageApi.resizeImage(
            sourceImage,
            updatedWidth,
            updatedHeight,
            settings.maintainAspectRatio
          );
          
          const imageUrl = URL.createObjectURL(new Blob([result], { type: 'image/png' }));
          updateProcessedImage(imageUrl);
        } catch (error) {
          console.error('Error applying resize:', error);
          setError(error instanceof Error ? error.message : 'Failed to apply resize');
        } finally {
          setIsProcessing(false);
        }
      }
    }, 500),
    [settings.maintainAspectRatio, settings.isResizeActive, originalDimensions, currentImage, processedImage, updateSettings, updateProcessedImage]
  );

  // Background removal processing
  useEffect(() => {
    const processImage = async () => {
      if (!currentImage) return;

      setIsProcessing(true);
      setError(null);

      try {
        console.log('Processing with settings:', settings);
        const response = await imageApi.removeBackground(currentImage, settings);
        const blob = new Blob([response], { type: 'image/png' });
        let imageUrl = URL.createObjectURL(blob);
        setOriginalProcessedImage(imageUrl); // Store the original processed image
        
        // If padding is enabled, apply it to the newly processed image
        if (settings.paddingEnabled && settings.paddingSize > 0) {
          const paddedResult = await imageApi.fitImage(blob, {
            paddingEnabled: true,
            paddingSize: settings.paddingSize,
            targetWidth: settings.targetWidth,
            targetHeight: settings.targetHeight,
            maintainAspectRatio: settings.maintainAspectRatio
          });
          imageUrl = URL.createObjectURL(new Blob([paddedResult], { type: 'image/png' }));
        }
        
        // If resize is active, apply resize to the processed image
        if (settings.isResizeActive) {
          const sourceBlob = settings.paddingEnabled && settings.paddingSize > 0 ? 
            await fetch(imageUrl).then(r => r.blob()) : blob;
          
          const resizedResult = await imageApi.resizeImage(
            sourceBlob,
            settings.targetWidth,
            settings.targetHeight,
            settings.maintainAspectRatio
          );
          
          imageUrl = URL.createObjectURL(new Blob([resizedResult], { type: 'image/png' }));
        }
        
        updateProcessedImage(imageUrl);
        addToHistory(imageUrl);
        // Ensure the backgroundRemoved state is set to true after successful processing
        updateSettings({ backgroundRemoved: true });
      } catch (error) {
        console.error('Error processing image:', error);
        setError(error instanceof Error ? error.message : 'Failed to process image');
        // Reset the backgroundRemoved state if processing fails
        updateSettings({ backgroundRemoved: false });
      } finally {
        setIsProcessing(false);
        resetProcessingState();
      }
    };

    if (currentImage && shouldProcess) {
      processImage();
    }
  }, [currentImage, settings, addToHistory, shouldProcess, updateSettings]);

  const handleSave = useCallback(async () => {
    if (!processedImage && !currentImage) return;

    try {
      // If we have a canvas ref, use the merged canvas
      if (canvasRef?.current) {
        const mergedCanvas = canvasRef.current.getMergedCanvas();
        if (mergedCanvas) {
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
          return;
        }
      }

      // Fallback to original save behavior if no canvas ref or merge fails
      const imageToSave = processedImage || (currentImage ? URL.createObjectURL(currentImage) : null);
      if (!imageToSave) return;

      const response = await fetch(imageToSave);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error saving image:', error);
      setError('Failed to save image');
    }
  }, [processedImage, currentImage, updateProcessedImage]);

  const handleResetEdgeSettings = useCallback(() => {
    // Only trigger reprocessing if the settings actually changed
    const settingsChanged = 
      settings.foregroundThreshold !== DEFAULT_SETTINGS.foregroundThreshold ||
      settings.erodeSize !== DEFAULT_SETTINGS.erodeSize;

    updateSettings({
      foregroundThreshold: DEFAULT_SETTINGS.foregroundThreshold,
      erodeSize: DEFAULT_SETTINGS.erodeSize
    });

    // If background is removed and settings changed, trigger reprocessing
    if (settings.backgroundRemoved && settingsChanged) {
      triggerBackgroundRemoval();
    }
  }, [settings.backgroundRemoved, settings.foregroundThreshold, settings.erodeSize, updateSettings, triggerBackgroundRemoval]);

  const handlePaddingToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPaddingEnabled = !settings.paddingEnabled;
    
    if (!currentImage) return;
    
    // Apply or remove padding based on the new state
    if (newPaddingEnabled) {
      // When enabling padding, start with 25% padding and apply immediately
      const initialPaddingSize = 25;
      setIsProcessing(true);
      
      try {
        // Always use the original image (either current image or background-removed image)
        const imageBlob = settings.backgroundRemoved && originalProcessedImage ? 
          await fetch(originalProcessedImage).then(r => r.blob()) : 
          currentImage.slice();

        const result = await imageApi.fitImage(imageBlob, {
          paddingEnabled: true,
          paddingSize: initialPaddingSize,
          targetWidth: settings.targetWidth,
          targetHeight: settings.targetHeight,
          maintainAspectRatio: settings.maintainAspectRatio
        });
        const imageUrl = URL.createObjectURL(new Blob([result], { type: 'image/png' }));
        
        // Update all the states after successful processing
        updateSettings({ 
          paddingEnabled: true,
          paddingSize: initialPaddingSize 
        });
        setLocalSettings(prev => ({ 
          ...prev, 
          paddingEnabled: true,
          paddingSize: initialPaddingSize 
        }));
        updateProcessedImage(imageUrl);
      } catch (error) {
        console.error('Error applying padding:', error);
        setError(error instanceof Error ? error.message : 'Failed to apply padding');
      } finally {
        setIsProcessing(false);
      }
    } else {
      // If disabling padding, restore the original image
      updateSettings({ paddingEnabled: false, paddingSize: 0 });
      setLocalSettings(prev => ({ ...prev, paddingEnabled: false, paddingSize: 0 }));
      const imageUrl = settings.backgroundRemoved && originalProcessedImage ? 
        originalProcessedImage : 
        URL.createObjectURL(currentImage);
      updateProcessedImage(imageUrl);
    }
  }, [
    settings.paddingEnabled,
    settings.backgroundRemoved,
    settings.targetWidth,
    settings.targetHeight,
    settings.maintainAspectRatio,
    currentImage,
    originalProcessedImage,
    updateSettings,
    updateProcessedImage
  ]);

  const handleAspectRatioToggle = useCallback(() => {
    updateSettings({ maintainAspectRatio: !settings.maintainAspectRatio });
  }, [settings.maintainAspectRatio, updateSettings]);

  const handleResizeToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (settings.isResizeActive) {
        // If resize is active, revert to the original image or current processed state
        if (settings.backgroundRemoved && originalProcessedImage) {
          // If background is removed, use that as the base
          const result = await fetch(originalProcessedImage).then(r => r.blob());
          const imageUrl = URL.createObjectURL(result);
          updateProcessedImage(imageUrl);
        } else {
          // Otherwise use the original image
          const imageUrl = URL.createObjectURL(currentImage);
          updateProcessedImage(imageUrl);
        }
        updateSettings({ isResizeActive: false });
      } else {
        // If resize is not active, apply resize to the current image
        const sourceImage = settings.backgroundRemoved && processedImage
          ? await fetch(processedImage).then(r => r.blob())
          : currentImage;

        const result = await imageApi.resizeImage(
          sourceImage,
          settings.targetWidth,
          settings.targetHeight,
          settings.maintainAspectRatio
        );
        
        const imageUrl = URL.createObjectURL(new Blob([result], { type: 'image/png' }));
        updateProcessedImage(imageUrl);
        updateSettings({ isResizeActive: true });
      }
    } catch (error) {
      console.error('Error toggling resize:', error);
      setError(error instanceof Error ? error.message : 'Failed to toggle resize');
    } finally {
      setIsProcessing(false);
    }
  }, [currentImage, settings, processedImage, originalProcessedImage, updateSettings, updateProcessedImage]);

  // Handle dimension input changes
  const handleDimensionChange = useCallback((dimension: 'width' | 'height') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === '' ? null : Number(event.target.value);
    if (value === null || (value > 0 && value <= 10000)) {
      setDebouncedDimensions(prev => ({
        ...prev,
        [dimension]: value
      }));
      debouncedUpdateDimensions({
        width: dimension === 'width' ? value : debouncedDimensions.width,
        height: dimension === 'height' ? value : debouncedDimensions.height
      });
    }
  }, [debouncedDimensions, debouncedUpdateDimensions]);

  const handleBackgroundToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (settings.backgroundRemoved) {
      // If background is removed, restore original image
      if (currentImage) {
        // If resize is active, we need to apply resize to the original image
        if (settings.isResizeActive) {
          // First update the settings to indicate background is no longer removed
          updateSettings({ backgroundRemoved: false });
          
          // Then trigger a resize operation on the original image
          const sourceImage = currentImage;
          setTimeout(async () => {
            try {
              setIsProcessing(true);
              const result = await imageApi.resizeImage(
                sourceImage,
                settings.targetWidth,
                settings.targetHeight,
                settings.maintainAspectRatio
              );
              const imageUrl = URL.createObjectURL(new Blob([result], { type: 'image/png' }));
              updateProcessedImage(imageUrl);
            } catch (error) {
              console.error('Error resizing original image:', error);
              setError(error instanceof Error ? error.message : 'Failed to resize original image');
              // Just show the original image if resize fails
              const imageUrl = URL.createObjectURL(currentImage);
              updateProcessedImage(imageUrl);
            } finally {
              setIsProcessing(false);
            }
          }, 0);
        } else {
          // No resize active, just show the original image
          const imageUrl = URL.createObjectURL(currentImage);
          updateProcessedImage(imageUrl);
          updateSettings({ backgroundRemoved: false });
        }
      }
    } else {
      // If background is not removed, trigger removal with resize if active
      updateSettings({ backgroundRemoved: true });
      triggerBackgroundRemoval();
      // The background removal process will handle resize if it's active
    }
  }, [currentImage, settings, triggerBackgroundRemoval, updateProcessedImage, updateSettings, imageApi]);

  return (
    <List component="nav" sx={{ p: 0 }}>
      {/* Background Removal Section */}
      <ListItem 
        onClick={() => setOpenSection(openSection === 'background' ? null : 'background')}
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          cursor: 'pointer',
          '&:hover': {
            bgcolor: 'rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <ListItemText 
          primary={
            <Typography variant="subtitle1" sx={{ fontWeight: 500, color: 'text.primary' }}>
              Background Removal
            </Typography>
          }
          secondaryTypographyProps={{ component: 'div' }}
          secondary={
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <Tooltip title={settings.backgroundRemoved ? "Restore Background" : "Remove Background"}>
                <IconButton
                  size="small"
                  color={settings.backgroundRemoved ? "primary" : "default"}
                  onClick={handleBackgroundToggle}
                  disabled={!currentImage || isProcessing}
                >
                  {isProcessing ? <CircularProgress size={20} /> : <ContentCutIcon />}
                </IconButton>
              </Tooltip>
              {!currentImage ? (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Upload an image first
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {settings.backgroundRemoved ? "Click to restore background" : "Click to remove background"}
                </Typography>
              )}
            </Stack>
          }
        />
        {openSection === 'background' ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <Collapse in={openSection === 'background'} timeout="auto" unmountOnExit>
        <Paper elevation={0} sx={{ mx: 2, my: 1, p: 2, bgcolor: 'background.paper' }}>
          <Stack spacing={3}>
            <FormControl size="small" fullWidth>
              <Typography variant="caption" sx={{ mb: 1, color: 'text.primary' }}>Model</Typography>
              <Select
                value={settings.model}
                onChange={handleModelChange}
                disabled={isProcessing}
                size="small"
              >
                {Object.entries(AVAILABLE_MODELS).map(([id, name]) => (
                  <MenuItem key={id} value={id}>{name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <Typography variant="caption" sx={{ mb: 1, color: 'text.primary', display: 'block' }}>
                Edge Softness
              </Typography>
              <Slider
                value={localSettings.foregroundThreshold}
                onChange={handleSliderChange('foregroundThreshold')}
                onChangeCommitted={handleSliderChangeCommitted('foregroundThreshold')}
                min={0}
                max={100}
                disabled={isProcessing}
                size="small"
              />
            </Box>

            <Box>
              <Typography variant="caption" sx={{ mb: 1, color: 'text.primary', display: 'block' }}>
                Edge Erosion
              </Typography>
              <Slider
                value={localSettings.erodeSize}
                onChange={handleSliderChange('erodeSize')}
                onChangeCommitted={handleSliderChangeCommitted('erodeSize')}
                min={0}
                max={10}
                disabled={isProcessing}
                size="small"
              />
            </Box>

            <Button
              variant="outlined"
              onClick={handleResetEdgeSettings}
              disabled={isProcessing}
              startIcon={<RestartAltIcon />}
              size="small"
            >
              Reset Settings
            </Button>
          </Stack>
        </Paper>
      </Collapse>

      {/* Border Section */}
      <ListItem 
        onClick={() => {
          if (settings.paddingEnabled) {
            setOpenSection(openSection === 'padding' ? null : 'padding');
          }
        }}
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          cursor: settings.paddingEnabled ? 'pointer' : 'default',
          '&:hover': {
            bgcolor: settings.paddingEnabled ? 'rgba(0, 0, 0, 0.04)' : 'transparent'
          }
        }}
      >
        <ListItemText 
          primary={
            <Typography variant="subtitle1" sx={{ fontWeight: 500, color: 'text.primary' }}>
              Padding
            </Typography>
          }
          secondaryTypographyProps={{ component: 'div' }}
          secondary={
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <IconButton 
                size="small" 
                color={settings.paddingEnabled ? "primary" : "default"}
                onClick={handlePaddingToggle}
              >
                <BorderAllIcon />
              </IconButton>
              {!settings.paddingEnabled && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Click icon to enable padding
                </Typography>
              )}
            </Stack>
          }
        />
        {settings.paddingEnabled && (openSection === 'padding' ? <ExpandLess /> : <ExpandMore />)}
      </ListItem>
      {settings.paddingEnabled && (
        <Collapse in={openSection === 'padding'} timeout="auto" unmountOnExit>
          <Paper elevation={0} sx={{ mx: 2, my: 1, p: 2, bgcolor: 'background.paper' }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" sx={{ mb: 1, color: 'text.primary', display: 'block' }}>
                  Padding Size (%)
                </Typography>
                <Slider
                  value={localSettings.paddingSize}
                  onChange={handleSliderChange('paddingSize')}
                  onChangeCommitted={handleSliderChangeCommitted('paddingSize')}
                  min={0}
                  max={50}
                  step={1}
                  marks={[
                    { value: 0, label: 'None' },
                    { value: 25, label: '25%' },
                    { value: 50, label: '50%' }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}%`}
                  disabled={isProcessing}
                  size="small"
                />
              </Box>
            </Stack>
          </Paper>
        </Collapse>
      )}

      {/* Resize Section */}
      <ListItem 
        onClick={() => setOpenSection(openSection === 'resize' ? null : 'resize')}
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          cursor: 'pointer',
          '&:hover': {
            bgcolor: 'rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <ListItemText 
          primary={
            <Typography variant="subtitle1" sx={{ fontWeight: 500, color: 'text.primary' }}>
              Resize
            </Typography>
          }
          secondaryTypographyProps={{ component: 'div' }}
          secondary={
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <IconButton 
                size="small"
                color={settings.isResizeActive ? "primary" : "default"}
                onClick={handleResizeToggle}
                disabled={!currentImage || isProcessing}
              >
                {isProcessing ? <CircularProgress size={20} /> : <CropIcon />}
              </IconButton>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {settings.isResizeActive ? 
                  `Resized to ${settings.targetWidth || '–'} × ${settings.targetHeight || '–'} px` : 
                  (currentImage ? 'Click to resize' : 'Upload an image first')}
              </Typography>
            </Stack>
          }
        />
        {openSection === 'resize' ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <Collapse in={openSection === 'resize'} timeout="auto" unmountOnExit>
        <Paper elevation={0} sx={{ mx: 2, my: 1, p: 2, bgcolor: 'background.paper' }}>
          <Stack spacing={2}>
            <Box>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.primary' }}>
                  Dimensions
                </Typography>
                <Tooltip title={settings.maintainAspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}>
                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAspectRatioToggle();
                      
                      // Apply resize immediately if resize is active
                      if (settings.isResizeActive && currentImage) {
                        // Toggle will update the maintainAspectRatio setting, so use the opposite of current value
                        const newAspectRatioSetting = !settings.maintainAspectRatio;
                        
                        // Calculate the new height if aspect ratio is being enabled
                        let updatedWidth = settings.targetWidth;
                        let updatedHeight = settings.targetHeight;
                        
                        if (newAspectRatioSetting && originalDimensions && updatedWidth && updatedHeight) {
                          const aspectRatio = originalDimensions.width / originalDimensions.height;
                          updatedHeight = Math.round(updatedWidth / aspectRatio);
                          
                          // Update dimensions in settings
                          updateSettings({ targetHeight: updatedHeight });
                        }
                        
                        // Trigger resize to apply the new aspect ratio
                        setTimeout(() => {
                          handleResizeToggle(e);
                        }, 0);
                      }
                    }}
                    color={settings.maintainAspectRatio ? "primary" : "default"}
                  >
                    {settings.maintainAspectRatio ? <LockIcon /> : <LockOpenIcon />}
                  </IconButton>
                </Tooltip>
              </Stack>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Width"
                  value={debouncedDimensions.width ?? ''}
                  onChange={handleDimensionChange('width')}
                  type="number"
                  size="small"
                  disabled={isProcessing}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">px</InputAdornment>,
                  }}
                />
                <TextField
                  fullWidth
                  label="Height"
                  value={debouncedDimensions.height ?? ''}
                  onChange={handleDimensionChange('height')}
                  type="number"
                  size="small"
                  disabled={isProcessing}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">px</InputAdornment>,
                  }}
                />
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Collapse>

      {/* Save Button */}
      <ListItem 
        onClick={currentImage || processedImage ? handleSave : undefined}
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          cursor: (currentImage || processedImage) ? 'pointer' : 'default',
          '&:hover': {
            bgcolor: (currentImage || processedImage) ? 'rgba(0, 0, 0, 0.04)' : 'transparent'
          }
        }}
      >
        <ListItemText 
          primary={
            <Typography variant="subtitle1" sx={{ fontWeight: 500, color: 'text.primary' }}>
              Save Image
            </Typography>
          }
          secondaryTypographyProps={{ component: 'div' }}
          secondary={
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <IconButton
                size="small"
                color="primary"
                disabled={!currentImage && !processedImage}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
              >
                <SaveIcon />
              </IconButton>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {!currentImage ? 'Upload an image first' : 'Save image'}
              </Typography>
            </Stack>
          }
        />
      </ListItem>

      {/* Error Message */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </List>
  );
}