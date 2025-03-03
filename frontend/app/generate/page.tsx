'use client';

import { 
  Container, 
  Paper, 
  Typography, 
  Button, 
  IconButton, 
  Tooltip, 
  TextField, 
  Grid, 
  FormControl, 
  Select, 
  MenuItem, 
  Stack, 
  AppBar, 
  Toolbar, 
  Collapse, 
  Box, 
  Divider, 
  Slider,
  Card,
  CardContent,
  ButtonGroup,
  Chip,
  Drawer
} from '@mui/material';
import Link from 'next/link';
import ImageIcon from '@mui/icons-material/Image';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useComfyStore } from '@/stores/comfyStore';
import { useEditorStore } from '@/stores/editorStore';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect, useRef } from 'react';
import { CircularProgress } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import StopIcon from '@mui/icons-material/Stop';
import CloseIcon from '@mui/icons-material/Close';

export default function GeneratePage() {
  const { generatedImages, settings, actions, isGenerating, checkpoints } = useComfyStore();
  const { actions: { setCurrentImage, addToHistory } } = useEditorStore();
  const router = useRouter();
  const [maximizedImage, setMaximizedImage] = useState<number | null>(null);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Auto-focus the modal when it opens
  useEffect(() => {
    if (maximizedImage !== null && modalRef.current) {
      modalRef.current.focus();
    }
  }, [maximizedImage]);

  // Load checkpoints when the page mounts
  useEffect(() => {
    actions.loadCheckpoints();
  }, [actions]);

  // Set up the callback to handle image changes
  useEffect(() => {
    actions.setOnBeforeImagesChange((newImages) => {
      // If we're maximized and the new images would make the index invalid,
      // reset the maximized state before the images update
      if (maximizedImage !== null && maximizedImage >= newImages.length) {
        setMaximizedImage(null);
      }
    });

    // Cleanup
    return () => {
      actions.setOnBeforeImagesChange(null);
    };
  }, [actions, maximizedImage]);

  const handleImageEdit = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'generated-image.png', { type: 'image/png' });
      setCurrentImage(file);
      router.push('/');
    } catch (error) {
      console.error('Error preparing image for editor:', error);
    }
  };

  const handleMaximize = useCallback((index: number | null) => {
    setMaximizedImage(index);
  }, []);

  const handlePrevImage = useCallback(() => {
    if (maximizedImage === null || generatedImages.length === 0) return;
    setMaximizedImage((maximizedImage - 1 + generatedImages.length) % generatedImages.length);
  }, [maximizedImage, generatedImages.length]);

  const handleNextImage = useCallback(() => {
    if (maximizedImage === null || generatedImages.length === 0) return;
    setMaximizedImage((maximizedImage + 1) % generatedImages.length);
  }, [maximizedImage, generatedImages.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (maximizedImage === null) return;
      
      if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'Escape') {
        handleMaximize(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maximizedImage, handlePrevImage, handleNextImage, handleMaximize]);

  // Handle maximized state
  useEffect(() => {
    // Reset maximized state when:
    // 1. There are no images
    // 2. Current index is invalid
    if (generatedImages.length === 0 || (maximizedImage !== null && maximizedImage >= generatedImages.length)) {
      handleMaximize(null);
      return;
    }
  }, [generatedImages, settings.batchSize, maximizedImage, isGenerating, handleMaximize]);
  
  // Utility function for step controls
  const handleStepChange = useCallback((type: 'batchSize' | 'steps' | 'cfg', increment: boolean) => {
    if (isGenerating) return;
    
    const min = type === 'batchSize' ? 1 : type === 'steps' ? 5 : 1;
    const max = type === 'batchSize' ? 4 : type === 'steps' ? 50 : 10;
    const step = type === 'batchSize' ? 1 : type === 'steps' ? 5 : 0.5;
    
    let current = settings[type];
    let newValue = increment ? current + step : current - step;
    
    // Ensure we stay within bounds
    newValue = Math.max(min, Math.min(max, newValue));
    
    actions.updateSettings({ [type]: newValue });
  }, [settings, actions, isGenerating]);
  
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl" className="py-6" sx={{ bgcolor: 'background.default' }}>
        <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 3, bgcolor: 'background.default' }}>
          <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
            <Link href="/" passHref>
              <Button 
                startIcon={<ImageIcon />} 
                sx={{ textTransform: 'none', fontWeight: 'bold', color: 'primary.main' }}
              >
                Image Studio
              </Button>
            </Link>
            <div className="flex-grow"></div>
            <Tooltip title="Settings">
              <IconButton 
                color="primary"
                onClick={() => setAdvancedSettingsOpen(!advancedSettingsOpen)}
                sx={{ mr: 2 }}
              >
                <TuneIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* Main Content - Vertical Layout */}
        <Box sx={{ 
          maxWidth: '900px',
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* Generated Images - Top */}
          <Box sx={{ 
            width: '100%',
            minHeight: '400px',
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {generatedImages.length === 0 ? (
              <Box sx={{ 
                width: '100%',
                height: '100%',
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 2,
                bgcolor: 'rgba(0,0,0,0.02)'
              }}>
                <Box sx={{ textAlign: 'center', p: 3 }}>
                  <AutoFixHighIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Enter a prompt and click Generate
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ width: '100%' }}>
                <div className="flex justify-center flex-wrap gap-3">
                  {generatedImages.map((image, index) => (
                    <div 
                      key={index} 
                      className="aspect-square relative group flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden shadow-sm"
                      style={{ width: 'min(calc((100% - 2rem) / 3), 280px)' }}
                    >
                      <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip title="Edit in Image Editor">
                          <IconButton
                            onClick={() => handleImageEdit(image.url)}
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.9)',
                              '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
                            }}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Fullscreen">
                          <IconButton
                            onClick={() => handleMaximize(index)}
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.9)',
                              '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
                            }}
                            size="small"
                          >
                            <FullscreenIcon />
                          </IconButton>
                        </Tooltip>
                      </div>
                      <img
                        src={image.url}
                        alt={`Generated ${index + 1}`}
                        className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => handleMaximize(index)}
                      />
                    </div>
                  ))}
                </div>
              </Box>
            )}
          </Box>
          
          {/* Prompt Inputs - Middle */}
          <Box sx={{ width: '100%', maxWidth: '700px', mb: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Describe what you want to see in the image..."
              value={settings.prompt}
              onChange={(e) => actions.updateSettings({ prompt: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isGenerating && settings.prompt.trim()) {
                  e.preventDefault();
                  actions.generateImages();
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'success.light',
                    borderWidth: 1,
                    opacity: 0.5,
                  },
                  '&:hover fieldset': {
                    borderColor: 'success.main',
                    borderWidth: 2,
                    opacity: 1,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'success.main',
                    borderWidth: 2,
                    opacity: 1,
                  },
                },
                '& .MuiInputBase-root': {
                  resize: 'vertical',
                  minHeight: '100px',
                  bgcolor: 'background.default',
                },
              }}
            />
            
            {/* Negative Prompt */}
            <TextField
              fullWidth
              multiline
              rows={1}
              placeholder="Describe what you don't want to see in the image..."
              value={settings.negativePrompt}
              onChange={(e) => actions.updateSettings({ negativePrompt: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isGenerating && settings.prompt.trim()) {
                    actions.generateImages();
                  }
                }
              }}
              sx={{
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'error.light',
                    borderWidth: 1,
                    opacity: 0.5,
                  },
                  '&:hover fieldset': {
                    borderColor: 'error.main',
                    borderWidth: 2,
                    opacity: 1,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'error.main',
                    borderWidth: 2,
                    opacity: 1,
                  },
                },
                '& .MuiInputBase-root': {
                  resize: 'vertical',
                  minHeight: '56px',
                  bgcolor: 'background.default',
                },
              }}
            />
          </Box>
            
          {/* Quick Batch Size Control + Generate Button */}
          <Box sx={{ 
            width: '100%', 
            maxWidth: '700px', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}>
            {/* Batch Size Control */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mr: 1 }}>
                Batch Size: 
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton 
                  size="small" 
                  onClick={() => handleStepChange('batchSize', false)}
                  disabled={isGenerating || settings.batchSize <= 1}
                  sx={{ color: 'primary.main' }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>−</Typography>
                </IconButton>
                <Typography variant="h6" sx={{ mx: 1, fontWeight: '500', color: 'primary.main' }}>
                  {settings.batchSize}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => handleStepChange('batchSize', true)}
                  disabled={isGenerating || settings.batchSize >= 4}
                  sx={{ color: 'primary.main' }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>+</Typography>
                </IconButton>
              </Box>
            </Box>
            
            {/* Generate Button */}
            <Box sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: '400px' } }}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                onClick={() => {
                  if (settings.prompt.trim()) {
                    actions.generateImages();
                  }
                }}
                disabled={isGenerating || !settings.prompt.trim()}
                startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <AutoFixHighIcon />}
                sx={{ 
                  width: isGenerating ? 'calc(100% - 56px)' : '100%',
                  height: '46px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  fontSize: '1rem',
                  boxShadow: 'none',
                  textTransform: 'none',
                  '&:hover': {
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }
                }}
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
              {isGenerating && (
                <IconButton
                  color="error"
                  onClick={actions.interruptGeneration}
                  sx={{ 
                    ml: 1,
                    width: '46px', 
                    height: '46px', 
                    borderRadius: '8px',
                    bgcolor: 'error.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'error.dark',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <StopIcon />
                </IconButton>
              )}
            </Box>
          </Box>
        </Box>
      </Container>

      {/* Settings Drawer */}
      <Drawer
        anchor="right"
        open={advancedSettingsOpen}
        onClose={() => setAdvancedSettingsOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: '400px' },
            p: 3,
            bgcolor: 'background.default'
          }
        }}
      >
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Settings</Typography>
            <IconButton onClick={() => setAdvancedSettingsOpen(false)}>
              <Tooltip title="Close">
                <CloseIcon />
              </Tooltip>
            </IconButton>
          </Box>
          
          <Stack spacing={3}>
            {/* CFG Scale Control */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mr: 1 }}>
                CFG:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton 
                  onClick={() => handleStepChange('cfg', false)}
                  disabled={isGenerating || settings.cfg <= 1}
                  sx={{ color: 'primary.main', p: 0.5 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>−</Typography>
                </IconButton>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mx: 1, 
                    fontWeight: '500',
                    color: 'primary.main',
                    userSelect: 'none'
                  }}
                >
                  {settings.cfg % 1 === 0 ? settings.cfg.toFixed(0) : settings.cfg.toFixed(1)}
                </Typography>
                <IconButton 
                  onClick={() => handleStepChange('cfg', true)}
                  disabled={isGenerating || settings.cfg >= 10}
                  sx={{ color: 'primary.main', p: 0.5 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>+</Typography>
                </IconButton>
              </Box>
            </Box>

            {/* Steps Control */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mr: 1 }}>
                Steps:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton 
                  onClick={() => handleStepChange('steps', false)}
                  disabled={isGenerating || settings.steps <= 5}
                  sx={{ color: 'primary.main', p: 0.5 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>−</Typography>
                </IconButton>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mx: 1, 
                    fontWeight: '500',
                    color: 'primary.main',
                    userSelect: 'none'
                  }}
                >
                  {settings.steps}
                </Typography>
                <IconButton 
                  onClick={() => handleStepChange('steps', true)}
                  disabled={isGenerating || settings.steps >= 50}
                  sx={{ color: 'primary.main', p: 0.5 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>+</Typography>
                </IconButton>
              </Box>
            </Box>
            
            {/* Model Checkpoint Selection */}
            <FormControl size="small">
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontWeight: 500 }}>
                Model Checkpoint
              </Typography>
              <Select
                value={settings.checkpoint}
                onChange={(e) => actions.updateSettings({ checkpoint: e.target.value })}
                disabled={isGenerating}
                size="small"
                sx={{ bgcolor: 'background.paper' }}
              >
                {checkpoints.map((checkpoint) => (
                  <MenuItem key={checkpoint} value={checkpoint}>
                    {checkpoint.replace(/\.[^/.]+$/, "")}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Canvas Size */}
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontWeight: 500 }}>
                Canvas Size
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  label="W"
                  type="number"
                  value={settings.width}
                  onChange={(e) => actions.updateSettings({ width: Number(e.target.value) })}
                  disabled={isGenerating}
                  size="small"
                  inputProps={{ min: 512, max: 1024, step: 64 }}
                  sx={{ 
                    width: '100%',
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                    }
                  }}
                />
                <TextField
                  label="H"
                  type="number"
                  value={settings.height}
                  onChange={(e) => actions.updateSettings({ height: Number(e.target.value) })}
                  disabled={isGenerating}
                  size="small"
                  inputProps={{ min: 512, max: 1024, step: 64 }}
                  sx={{ 
                    width: '100%',
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                    }
                  }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.7rem' }}>
                512-1024 pixels
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Drawer>

      {/* Fullscreen Modal for maximized image */}
      {maximizedImage !== null && generatedImages.length > 0 && (
        <div 
          className="fixed top-0 left-0 w-screen h-screen bg-black/90 z-50 flex items-center justify-center"
          onClick={() => handleMaximize(null)}
          tabIndex={0}
          ref={modalRef}
        >
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Tooltip title="Edit in Image Editor">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  if (maximizedImage !== null) {
                    handleImageEdit(generatedImages[maximizedImage].url);
                  }
                }}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.9)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s'
                }}
                size="medium"
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleMaximize(null);
                }}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.9)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s'
                }}
                size="medium"
              >
                <FullscreenExitIcon />
              </IconButton>
            </Tooltip>
          </div>
          
          {/* Navigation buttons */}
          {maximizedImage !== null && maximizedImage > 0 && (
            <div 
              className="absolute left-4 inset-y-0 flex items-center z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <Tooltip title="Previous Image (Left Arrow)">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  sx={{
                    bgcolor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.8)',
                    },
                    width: 48,
                    height: 48,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s'
                  }}
                >
                  <ArrowBackIcon />
                </IconButton>
              </Tooltip>
            </div>
          )}
          
          {maximizedImage !== null && maximizedImage < generatedImages.length - 1 && (
            <div 
              className="absolute right-4 inset-y-0 flex items-center z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <Tooltip title="Next Image (Right Arrow)">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  sx={{
                    bgcolor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.8)',
                    },
                    width: 48,
                    height: 48,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s'
                  }}
                >
                  <ArrowForwardIcon />
                </IconButton>
              </Tooltip>
            </div>
          )}

          {maximizedImage !== null && (
            <div className="relative p-4">
              <img
                src={generatedImages[maximizedImage].url}
                alt={`Generated ${maximizedImage + 1}`}
                className="max-w-[90%] max-h-[90vh] object-contain cursor-pointer rounded-md shadow-xl"
                onClick={(e) => e.stopPropagation()}
              />
              
              <Box 
                sx={{ 
                  position: 'absolute', 
                  bottom: '5px', 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  px: 2,
                  py: 0.5,
                  borderRadius: '4px',
                  fontSize: '0.8rem'
                }}
              >
                {maximizedImage + 1} of {generatedImages.length}
              </Box>
            </div>
          )}
        </div>
      )}
    </Box>
  );
} 