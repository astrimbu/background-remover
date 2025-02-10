'use client';

import { useCallback, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { AVAILABLE_MODELS } from '@/types/editor';
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
  ButtonGroup
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ImageIcon from '@mui/icons-material/Image';

export function ProcessingControls() {
  const settings = useEditorStore(state => state.settings);
  const currentImage = useEditorStore(state => state.currentImage);
  const processedImage = useEditorStore(state => state.processedImage);
  const { updateSettings, addToHistory } = useEditorStore(state => state.actions);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleModelChange = useCallback((event: SelectChangeEvent) => {
    const model = event.target.value as keyof typeof AVAILABLE_MODELS;
    updateSettings({ model });
  }, [updateSettings]);

  const handleSliderChange = useCallback((name: keyof typeof settings) => (_: Event, value: number | number[]) => {
    updateSettings({ [name]: value as number });
  }, [updateSettings]);

  const handleProcess = useCallback(async () => {
    if (!currentImage) return;

    setIsProcessing(true);
    setError(null);

    try {
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
  }, [currentImage, settings, addToHistory]);

  const handleSave = useCallback(async () => {
    if (!processedImage) return;

    try {
      // Fetch the image data from the blob URL
      const response = await fetch(processedImage);
      const blob = await response.blob();
      
      // Create a download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'processed-image.png';
      
      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error saving image:', error);
      setError('Failed to save image');
    }
  }, [processedImage]);

  return (
    <Stack spacing={3}>
      {/* Model Selection */}
      <FormControl>
        <InputLabel id="model-select-label" sx={{ color: 'text.primary' }}>Model</InputLabel>
        <Select
          labelId="model-select-label"
          value={settings.model}
          label="Model"
          onChange={handleModelChange}
          size="small"
          sx={{ color: 'text.primary' }}
        >
          {Object.entries(AVAILABLE_MODELS).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Divider />

      {/* Alpha Matting Settings */}
      <div>
        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 'medium', mb: 2 }}>
          Alpha Matting Settings
        </Typography>
        
        <Stack spacing={3}>
          <Box>
            <Typography variant="body2" gutterBottom color="text.primary" fontWeight="medium">
              Foreground Threshold
            </Typography>
            <Slider
              value={settings.foregroundThreshold}
              onChange={handleSliderChange('foregroundThreshold')}
              min={0}
              max={255}
              valueLabelDisplay="auto"
              size="small"
            />
          </Box>

          <Box>
            <Typography variant="body2" gutterBottom color="text.primary" fontWeight="medium">
              Background Threshold
            </Typography>
            <Slider
              value={settings.backgroundThreshold}
              onChange={handleSliderChange('backgroundThreshold')}
              min={0}
              max={255}
              valueLabelDisplay="auto"
              size="small"
            />
          </Box>

          <Box>
            <Typography variant="body2" gutterBottom color="text.primary" fontWeight="medium">
              Erode Size
            </Typography>
            <Slider
              value={settings.erodeSize}
              onChange={handleSliderChange('erodeSize')}
              min={0}
              max={10}
              step={1}
              marks
              valueLabelDisplay="auto"
              size="small"
            />
          </Box>

          <Box>
            <Typography variant="body2" gutterBottom color="text.primary" fontWeight="medium">
              Kernel Size
            </Typography>
            <Slider
              value={settings.kernelSize}
              onChange={handleSliderChange('kernelSize')}
              min={1}
              max={7}
              step={2}
              marks
              valueLabelDisplay="auto"
              size="small"
            />
          </Box>
        </Stack>
      </div>

      <Divider />

      {/* Action Buttons */}
      <ButtonGroup variant="contained" fullWidth>
        <Button
          onClick={handleProcess}
          disabled={!currentImage || isProcessing}
          startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : <ImageIcon />}
          sx={{ flex: 1 }}
        >
          Process
        </Button>
        <Button
          onClick={handleSave}
          disabled={!processedImage}
          startIcon={<SaveIcon />}
          sx={{ flex: 0.5 }}
        >
          Save
        </Button>
      </ButtonGroup>

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
    </Stack>
  );
}