import { ChangeEvent, useState, useEffect } from 'react';
import {
  TextField,
  Slider,
  Typography,
  Button,
  Box,
  Paper,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useComfyStore } from '@/stores/comfyStore';
import { generateImages, saveTempImage, fetchCheckpoints } from '@/lib/comfyApi';
import { useRouter } from 'next/navigation';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

export default function ComfySettings() {
  const { settings, isGenerating, actions } = useComfyStore();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<string[]>([]);

  useEffect(() => {
    // Fetch available checkpoints on component mount
    const loadCheckpoints = async () => {
      try {
        const availableCheckpoints = await fetchCheckpoints();
        setCheckpoints(availableCheckpoints);
      } catch (error) {
        console.error('Failed to fetch checkpoints:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch checkpoints');
      }
    };
    loadCheckpoints();
  }, []);

  const handleGenerate = async () => {
    try {
      setError(null);
      actions.setIsGenerating(true);
      const images = await generateImages(settings);
      actions.setGeneratedImages(images);
    } catch (error) {
      console.error('Failed to generate images:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      actions.setIsGenerating(false);
    }
  };

  const handleImageClick = async (imageUrl: string) => {
    try {
      setError(null);
      const tempUrl = await saveTempImage(imageUrl);
      sessionStorage.setItem('pendingImageUrl', tempUrl);
      router.push('/');
    } catch (error) {
      console.error('Error processing image:', error);
      setError(error instanceof Error ? error.message : 'Failed to process image');
    }
  };

  return (
    <div className="space-y-6 max-w-sm">
      <FormControl fullWidth>
        <InputLabel>Model Checkpoint</InputLabel>
        <Select
          value={settings.checkpoint}
          label="Model Checkpoint"
          onChange={(e) => actions.updateSettings({ checkpoint: e.target.value })}
        >
          {checkpoints.length > 0 ? (
            checkpoints.map((checkpoint) => (
              <MenuItem key={checkpoint} value={checkpoint}>
                {checkpoint}
              </MenuItem>
            ))
          ) : (
            <MenuItem value={settings.checkpoint}>
              {settings.checkpoint}
            </MenuItem>
          )}
        </Select>
      </FormControl>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="space-y-6">
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Positive Prompt"
          value={settings.prompt}
          onChange={(e) => actions.updateSettings({ prompt: e.target.value })}
          helperText="Describe the image you want to generate"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (!e.shiftKey) {
                e.preventDefault();
                if (!isGenerating && settings.prompt.trim()) {
                  handleGenerate();
                }
              }
            }
          }}
        />

        <TextField
          fullWidth
          label="Negative Prompt"
          value={settings.negativePrompt}
          onChange={(e) => actions.updateSettings({ negativePrompt: e.target.value })}
          helperText="Describe what you don't want in the image"
        />

        <div className="space-y-4">
          

          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" style={{ minWidth: '100px' }}>
              Batch Size
            </Typography>
            <Slider
              value={settings.batchSize}
              onChange={(_, value) => 
                actions.updateSettings({ batchSize: value as number })
              }
              min={1}
              max={4}
              step={1}
              marks={[
                { value: 1, label: '1' },
                { value: 2, label: '2' },
                { value: 3, label: '3' },
                { value: 4, label: '4' }
              ]}
              valueLabelDisplay="auto"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" style={{ minWidth: '100px' }}>
              Steps
            </Typography>
            <Slider
              value={settings.steps}
              onChange={(_, value) => 
                actions.updateSettings({ steps: value as number })
              }
              min={5}
              max={50}
              step={1}
              marks={[
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 20, label: '20' },
                { value: 50, label: '50' },
              ]}
              valueLabelDisplay="auto"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" style={{ minWidth: '100px' }}>
              CFG
            </Typography>
            <Slider
              value={settings.cfg}
              onChange={(_, value) => 
                actions.updateSettings({ cfg: value as number })
              }
              min={1}
              max={10}
              step={0.5}
              marks={[
                { value: 1, label: '1' },
                { value: 5, label: '5' },
                { value: 10, label: '10' },
              ]}
              valueLabelDisplay="auto"
            />
          </div>

          <div>
            <Typography variant="subtitle1" gutterBottom>
              Canvas Size
            </Typography>
            <div className="grid grid-cols-2 gap-4">
              <TextField
                type="number"
                label="Width"
                value={settings.width}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    actions.updateSettings({ width: value });
                  }
                }}
                inputProps={{ min: 480, max: 1024, step: 64 }}
                helperText="480-1024 pixels"
              />
              <TextField
                type="number"
                label="Height"
                value={settings.height}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    actions.updateSettings({ height: value });
                  }
                }}
                inputProps={{ min: 480, max: 1024, step: 64 }}
                helperText="480-1024 pixels"
              />
            </div>
          </div>
        </div>

        <Button
          variant="contained"
          fullWidth
          onClick={handleGenerate}
          disabled={isGenerating || !settings.prompt.trim()}
          startIcon={<AutoFixHighIcon />}
          size="large"
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
      </div>
    </div>
  );
} 