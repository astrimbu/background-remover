import { ChangeEvent, useState } from 'react';
import {
  TextField,
  Slider,
  Typography,
  Button,
  Box,
  Paper,
  Alert,
  Snackbar,
} from '@mui/material';
import { useComfyStore } from '@/stores/comfyStore';
import { generateImages, saveTempImage } from '@/lib/comfyApi';
import { useRouter } from 'next/navigation';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

export default function ComfySettings() {
  const { settings, isGenerating, actions } = useComfyStore();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

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
      <Alert severity="info">
        Enter a prompt to generate an image. Be as descriptive as possible for best results.
      </Alert>

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
          label="Generation Prompt"
          value={settings.prompt}
          onChange={(e) => actions.updateSettings({ prompt: e.target.value })}
          helperText="Describe the image you want to generate. Press Enter to generate, Shift+Enter for new line"
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
          <div>
            <Typography variant="subtitle1" gutterBottom>
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

          <div>
            <Typography variant="subtitle1" gutterBottom>
              Steps
            </Typography>
            <Slider
              value={settings.steps}
              onChange={(_, value) => 
                actions.updateSettings({ steps: value as number })
              }
              min={5}
              max={20}
              step={1}
              marks={[
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 15, label: '15' },
                { value: 20, label: '20' },
              ]}
              valueLabelDisplay="auto"
            />
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