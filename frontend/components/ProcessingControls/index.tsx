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
    <Stack spacing={1} sx={{ width: '100%', p: 2 }}>
      {/* Model Selection */}
      <FormControl fullWidth>
        <InputLabel id="model-select-label">Model</InputLabel>
        <Select
          labelId="model-select-label"
          value={settings.model}
          label="Model"
          onChange={handleModelChange}
          size="small"
          disabled={isProcessing}
        >
          {Object.entries(AVAILABLE_MODELS).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Divider sx={{ my: 1, p: 1 }} />

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
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
        
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" gutterBottom sx={{ mb: 1 }}>
              Edge Type
            </Typography>
            <ToggleButtonGroup
              value={settings.foregroundThreshold === 0 ? "hard" : "soft"}
              exclusive
              onChange={(_, value) => {
                if (value === "hard") {
                  updateSettings({ foregroundThreshold: 0 });
                } else if (value === "soft") {
                  updateSettings({ foregroundThreshold: 50 });
                }
              }}
              fullWidth
              size="small"
            >
              <ToggleButton value="hard">
                <CropFreeIcon sx={{ mr: 1 }} />
                HARD EDGES
              </ToggleButton>
              <ToggleButton value="soft">
                <BlurOnIcon sx={{ mr: 1 }} />
                SOFT EDGES
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box>
            <Typography variant="body2" gutterBottom sx={{ mb: 1 }}>
              Erode Size
            </Typography>
            <Slider
              value={localSettings.erodeSize}
              onChange={handleSliderChange('erodeSize')}
              onChangeCommitted={handleSliderChangeCommitted('erodeSize')}
              min={0}
              max={20}
              valueLabelDisplay="auto"
              marks
              disabled={isProcessing}
            />
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ my: 1 }} />

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Image Fitting
          </Typography>
          <Tooltip title="Reset fitting settings">
            <IconButton 
              onClick={handleResetFittingSettings}
              size="small"
              disabled={isProcessing}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2">Border</Typography>
            <Switch
              checked={settings.borderEnabled}
              onChange={handleBorderToggle}
              disabled={isProcessing}
            />
          </Box>

          {settings.borderEnabled && (
            <Box>
              <Typography variant="body2" gutterBottom sx={{ mb: 1 }}>
                Border Size
              </Typography>
              <Slider
                value={localSettings.borderSize}
                onChange={handleSliderChange('borderSize')}
                onChangeCommitted={handleSliderChangeCommitted('borderSize')}
                min={0}
                max={50}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
                marks
                disabled={isProcessing}
              />
            </Box>
          )}
        </Stack>
      </Box>

      <Divider sx={{ my: 1 }} />

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Image Resizing
          </Typography>
          <Tooltip title="Reset resizing settings">
            <IconButton 
              onClick={handleResetResizingSettings}
              size="small"
              disabled={isProcessing}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              label="Width"
              value={settings.targetWidth ?? ''}
              onChange={handleDimensionChange('targetWidth')}
              size="small"
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">px</InputAdornment>,
              }}
              disabled={isProcessing}
            />
            <TextField
              label="Height"
              value={settings.targetHeight ?? ''}
              onChange={handleDimensionChange('targetHeight')}
              size="small"
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">px</InputAdornment>,
              }}
              disabled={isProcessing}
            />
            <Tooltip title={settings.maintainAspectRatio ? "Aspect ratio locked" : "Aspect ratio unlocked"}>
              <IconButton onClick={handleAspectRatioToggle} size="small">
                {settings.maintainAspectRatio ? <LockIcon /> : <LockOpenIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Stack>
      </Box>
      
      <br />

      <Button
        variant="contained"
        onClick={handleSave}
        disabled={!processedImage || isProcessing}
        startIcon={isProcessing ? <CircularProgress size={20} /> : <SaveIcon />}
        fullWidth
      >
        Save
      </Button>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Stack>
  );
}