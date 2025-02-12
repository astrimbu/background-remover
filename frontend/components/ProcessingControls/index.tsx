'use client';

import { useCallback, useState, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { AVAILABLE_MODELS, DEFAULT_SETTINGS } from '@/types/editor';
import { imageApi } from '@/lib/api';
import { 
  FormControl,
  InputLabel,
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
  Divider,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  InputAdornment,
  Switch
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CropFreeIcon from '@mui/icons-material/CropFree';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';

export function ProcessingControls() {
  const settings = useEditorStore(state => state.settings);
  const currentImage = useEditorStore(state => state.currentImage);
  const processedImage = useEditorStore(state => state.processedImage);
  const originalDimensions = useEditorStore(state => state.originalDimensions);
  const { updateSettings, addToHistory, resetSettings } = useEditorStore(state => state.actions);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState(settings);
  const [shouldProcess, setShouldProcess] = useState(false);

  const handleModelChange = useCallback((event: SelectChangeEvent) => {
    const model = event.target.value as keyof typeof AVAILABLE_MODELS;
    updateSettings({ model });
  }, [updateSettings]);

  const handleSliderChange = useCallback((name: keyof typeof settings) => (_: Event, value: number | number[]) => {
    // Just update the local UI state
    setLocalSettings(prev => ({
      ...prev,
      [name]: value as number
    }));
  }, []);

  const handleSliderChangeCommitted = useCallback((name: keyof typeof settings) => (_: Event | React.SyntheticEvent<Element, Event>, value: number | number[]) => {
    console.log(`Slider ${name} committed to:`, value);
    // Update the store which will trigger processing
    updateSettings({ [name]: value as number });
  }, [updateSettings]);

  // Keep local settings in sync with store settings
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Process image whenever settings change or image changes
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

    // Only process if we have an image and either:
    // 1. This is the first load (shouldProcess is false)
    // 2. Settings were explicitly changed (not just component mount)
    if (currentImage && !shouldProcess) {
      setShouldProcess(true);
      processImage();
    } else if (shouldProcess) {
      processImage();
    }
  }, [currentImage, settings, addToHistory, shouldProcess]);

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

  const handleResetFittingSettings = useCallback(() => {
    updateSettings({
      borderEnabled: DEFAULT_SETTINGS.borderEnabled,
      borderSize: DEFAULT_SETTINGS.borderSize
    });
  }, [updateSettings]);

  const handleResetResizingSettings = useCallback(() => {
    updateSettings({
      targetWidth: originalDimensions?.width ?? null,
      targetHeight: originalDimensions?.height ?? null,
      maintainAspectRatio: DEFAULT_SETTINGS.maintainAspectRatio
    });
  }, [updateSettings, originalDimensions]);

  const handleResetAll = useCallback(() => {
    resetSettings();
  }, [resetSettings]);

  const handleAspectRatioToggle = useCallback(() => {
    updateSettings({ maintainAspectRatio: !settings.maintainAspectRatio });
  }, [settings.maintainAspectRatio, updateSettings]);

  const handleDimensionChange = useCallback((dimension: 'targetWidth' | 'targetHeight') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === '' ? null : Number(event.target.value);
    if (value === null || (value > 0 && value <= 10000)) {
      if (settings.maintainAspectRatio && currentImage) {
        const img = new Image();
        img.src = URL.createObjectURL(currentImage);
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          if (dimension === 'targetWidth' && value !== null) {
            updateSettings({
              targetWidth: value,
              targetHeight: Math.round(value / aspectRatio)
            });
          } else if (dimension === 'targetHeight' && value !== null) {
            updateSettings({
              targetHeight: value,
              targetWidth: Math.round(value * aspectRatio)
            });
          } else {
            updateSettings({
              [dimension]: value
            });
          }
        };
      } else {
        updateSettings({
          [dimension]: value
        });
      }
    }
  }, [settings.maintainAspectRatio, currentImage, updateSettings]);

  const handleBorderToggle = useCallback(() => {
    updateSettings({ borderEnabled: !settings.borderEnabled });
  }, [settings.borderEnabled, updateSettings]);

  return (
    <Stack spacing={2} sx={{ width: '100%', p: 2 }}>
      {/* Model Selection */}
      <FormControl>
        <InputLabel id="model-select-label" sx={{ color: 'text.primary' }}>Model</InputLabel>
        <Select
          labelId="model-select-label"
          value={settings.model}
          label="Model"
          onChange={handleModelChange}
          size="small"
          disabled={isProcessing}
          sx={{ color: 'text.primary' }}
        >
          {Object.entries(AVAILABLE_MODELS).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Reset All Settings
        </Typography>
        <Tooltip title="Reset all settings to defaults">
          <IconButton onClick={handleResetAll} size="small">
            <RestartAltIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider />

      {/* Edge Refinement */}
      <div>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 'medium' }}>
            Edge Refinement
          </Typography>
          <Tooltip title="Reset edge settings">
            <IconButton 
              onClick={handleResetEdgeSettings}
              size="small"
              disabled={isProcessing}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Stack spacing={3}>
          <Box>
            <Typography variant="body2" gutterBottom color="text.primary" fontWeight="medium">
              Edge Type
            </Typography>
            <ToggleButtonGroup
              value={localSettings.foregroundThreshold}
              exclusive
              fullWidth
              onChange={(_, value) => {
                if (value !== null) {
                  setLocalSettings(prev => ({
                    ...prev,
                    foregroundThreshold: value
                  }));
                  updateSettings({ foregroundThreshold: value });
                }
              }}
              disabled={isProcessing}
              size="small"
            >
              <ToggleButton value={0}>
                <CropFreeIcon sx={{ mr: 1 }} />
                Hard Edges
              </ToggleButton>
              <ToggleButton value={50}>
                <BlurOnIcon sx={{ mr: 1 }} />
                Soft Edges
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box>
            <Typography variant="body2" gutterBottom color="text.primary" fontWeight="medium">
              Erode Size
            </Typography>
            <Slider
              value={localSettings.erodeSize}
              onChange={handleSliderChange('erodeSize')}
              onChangeCommitted={handleSliderChangeCommitted('erodeSize')}
              min={0}
              max={10}
              step={1}
              marks
              valueLabelDisplay="auto"
              size="small"
              disabled={isProcessing}
            />
          </Box>
        </Stack>
      </div>

      <Divider />

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={!processedImage || isProcessing}
        startIcon={<SaveIcon />}
        variant="contained"
        fullWidth
      >
        Save
      </Button>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" variant="filled">
          {error}
        </Alert>
      </Snackbar>

      {isProcessing && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Image Fitting
        </Typography>
      </Divider>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography>
              Border Size
              <Tooltip title="Adds padding around the image content">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <FitScreenIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
            <Switch
              checked={settings.borderEnabled}
              onChange={handleBorderToggle}
              size="small"
              sx={{ ml: 1 }}
            />
          </Box>
          <Tooltip title="Reset border settings">
            <IconButton onClick={handleResetFittingSettings} size="small">
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Slider
          value={localSettings.borderSize}
          onChange={handleSliderChange('borderSize')}
          onChangeCommitted={handleSliderChangeCommitted('borderSize')}
          min={0}
          max={50}
          disabled={!settings.borderEnabled}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${value}%`}
        />
      </Box>

      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Image Resizing
        </Typography>
      </Divider>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">Dimensions</Typography>
          <Tooltip title="Reset to original dimensions">
            <IconButton onClick={handleResetResizingSettings} size="small">
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl fullWidth>
            <TextField
              label="Width"
              type="number"
              value={settings.targetWidth ?? ''}
              onChange={handleDimensionChange('targetWidth')}
              InputProps={{
                endAdornment: <InputAdornment position="end">px</InputAdornment>
              }}
            />
          </FormControl>

          <IconButton onClick={handleAspectRatioToggle}>
            {settings.maintainAspectRatio ? <LockIcon /> : <LockOpenIcon />}
          </IconButton>

          <FormControl fullWidth>
            <TextField
              label="Height"
              type="number"
              value={settings.targetHeight ?? ''}
              onChange={handleDimensionChange('targetHeight')}
              InputProps={{
                endAdornment: <InputAdornment position="end">px</InputAdornment>
              }}
            />
          </FormControl>
        </Stack>
      </Box>
    </Stack>
  );
}