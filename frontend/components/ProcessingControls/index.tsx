'use client';

import { useCallback, useState, useEffect } from 'react';
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

// Debounce helper function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export function ProcessingControls() {
  const settings = useEditorStore(state => state.settings);
  const currentImage = useEditorStore(state => state.currentImage);
  const processedImage = useEditorStore(state => state.processedImage);
  const originalDimensions = useEditorStore(state => state.originalDimensions);
  const shouldProcess = useEditorStore(state => state.shouldProcess);
  const { updateSettings, addToHistory, resetSettings, triggerBackgroundRemoval, updateProcessedImage } = useEditorStore(state => state.actions);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState(settings);
  const [openSection, setOpenSection] = useState<'background' | 'border' | 'resize' | null>(null);
  const [debouncedDimensions, setDebouncedDimensions] = useState({
    width: settings.targetWidth,
    height: settings.targetHeight
  });

  const handleModelChange = useCallback((event: SelectChangeEvent) => {
    const model = event.target.value as keyof typeof AVAILABLE_MODELS;
    updateSettings({ model });
  }, [updateSettings]);

  const handleSliderChange = useCallback((name: keyof typeof settings) => (_: Event, value: number | number[]) => {
    setLocalSettings(prev => ({
      ...prev,
      [name]: value as number
    }));
  }, []);

  const handleSliderChangeCommitted = useCallback((name: keyof typeof settings) => (_: Event | React.SyntheticEvent<Element, Event>, value: number | number[]) => {
    console.log(`Slider ${name} committed to:`, value);
    updateSettings({ [name]: value as number });
    
    // If this is a fitting setting and we have a processed image, apply the changes
    if ((name === 'borderSize' || name === 'targetWidth' || name === 'targetHeight') && processedImage) {
      handleImageFitting();
    }
  }, [updateSettings, processedImage]);

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

  // Debounced update function
  const debouncedUpdateDimensions = useCallback(
    debounce((newDimensions: { width: number | null, height: number | null }) => {
      if (settings.maintainAspectRatio && originalDimensions) {
        const aspectRatio = originalDimensions.width / originalDimensions.height;
        if (newDimensions.width !== null && newDimensions.width !== settings.targetWidth) {
          updateSettings({
            targetWidth: newDimensions.width,
            targetHeight: Math.round(newDimensions.width / aspectRatio)
          });
        } else if (newDimensions.height !== null && newDimensions.height !== settings.targetHeight) {
          updateSettings({
            targetHeight: newDimensions.height,
            targetWidth: Math.round(newDimensions.height * aspectRatio)
          });
        }
      } else {
        updateSettings({
          targetWidth: newDimensions.width,
          targetHeight: newDimensions.height
        });
      }
    }, 500),
    [settings.maintainAspectRatio, originalDimensions, updateSettings]
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
        const imageUrl = URL.createObjectURL(blob);
        addToHistory(imageUrl);
      } catch (error) {
        console.error('Error processing image:', error);
        setError(error instanceof Error ? error.message : 'Failed to process image');
      } finally {
        setIsProcessing(false);
      }
    };

    if (currentImage && shouldProcess) {
      processImage();
    }
  }, [currentImage, settings, addToHistory, shouldProcess]);

  // Handle image fitting operations
  const handleImageFitting = useCallback(async () => {
    if (!processedImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(processedImage);
      const imageBlob = await response.blob();
      const result = await imageApi.fitImage(imageBlob, {
        borderEnabled: settings.borderEnabled,
        borderSize: settings.borderSize,
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
  }, [processedImage, settings, updateProcessedImage]);

  const handleSave = useCallback(async () => {
    if (!processedImage) return;

    try {
      const response = await fetch(processedImage);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'processed-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error saving image:', error);
      setError('Failed to save image');
    }
  }, [processedImage]);

  const handleResetEdgeSettings = useCallback(() => {
    updateSettings({
      foregroundThreshold: DEFAULT_SETTINGS.foregroundThreshold,
      erodeSize: DEFAULT_SETTINGS.erodeSize
    });
  }, [updateSettings]);

  const handleBorderToggle = useCallback(() => {
    updateSettings({ borderEnabled: !settings.borderEnabled });
    if (processedImage) {
      handleImageFitting();
    }
  }, [settings.borderEnabled, updateSettings, processedImage, handleImageFitting]);

  const handleAspectRatioToggle = useCallback(() => {
    updateSettings({ maintainAspectRatio: !settings.maintainAspectRatio });
  }, [settings.maintainAspectRatio, updateSettings]);

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
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerBackgroundRemoval();
                }}
                disabled={!currentImage || isProcessing}
              >
                {isProcessing ? <CircularProgress size={20} /> : <ContentCutIcon />}
              </IconButton>
              {!currentImage && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Upload an image first
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
          if (settings.borderEnabled) {
            setOpenSection(openSection === 'border' ? null : 'border');
          }
        }}
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          cursor: settings.borderEnabled ? 'pointer' : 'default',
          '&:hover': {
            bgcolor: settings.borderEnabled ? 'rgba(0, 0, 0, 0.04)' : 'transparent'
          }
        }}
      >
        <ListItemText 
          primary={
            <Typography variant="subtitle1" sx={{ fontWeight: 500, color: 'text.primary' }}>
              Border
            </Typography>
          }
          secondaryTypographyProps={{ component: 'div' }}
          secondary={
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <IconButton 
                size="small" 
                color={settings.borderEnabled ? "primary" : "default"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleBorderToggle();
                }}
              >
                <BorderAllIcon />
              </IconButton>
              {!settings.borderEnabled && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Click icon to enable border
                </Typography>
              )}
            </Stack>
          }
        />
        {settings.borderEnabled && (openSection === 'border' ? <ExpandLess /> : <ExpandMore />)}
      </ListItem>
      {settings.borderEnabled && (
        <Collapse in={openSection === 'border'} timeout="auto" unmountOnExit>
          <Paper elevation={0} sx={{ mx: 2, my: 1, p: 2, bgcolor: 'background.paper' }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" sx={{ mb: 1, color: 'text.primary', display: 'block' }}>
                  Border Size (%)
                </Typography>
                <Slider
                  value={localSettings.borderSize}
                  onChange={handleSliderChange('borderSize')}
                  onChangeCommitted={handleSliderChangeCommitted('borderSize')}
                  min={0}
                  max={50}
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
                color={settings.maintainAspectRatio ? "primary" : "default"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAspectRatioToggle();
                }}
              >
                <CropIcon />
              </IconButton>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {settings.targetWidth || '–'} × {settings.targetHeight || '–'} px
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
                    onClick={handleAspectRatioToggle}
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
      {processedImage && (
        <ListItem 
          onClick={handleSave}
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
                Save Image
              </Typography>
            }
            secondaryTypographyProps={{ component: 'div' }}
            secondary={
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave();
                  }}
                >
                  <SaveIcon />
                </IconButton>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Save processed image
                </Typography>
              </Stack>
            }
          />
        </ListItem>
      )}

      {/* Error Message */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </List>
  );
}