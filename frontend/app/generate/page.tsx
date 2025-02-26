'use client';

import { Container, Paper, Typography, Button, IconButton, Tooltip, TextField, Grid, FormControl, Select, MenuItem, Stack, AppBar, Toolbar } from '@mui/material';
import Link from 'next/link';
import ImageIcon from '@mui/icons-material/Image';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useComfyStore } from '@/stores/comfyStore';
import { useEditorStore } from '@/stores/editorStore';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { CircularProgress } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import StopIcon from '@mui/icons-material/Stop';

export default function GeneratePage() {
  const { generatedImages, settings, actions, isGenerating, checkpoints } = useComfyStore();
  const { actions: { setCurrentImage, addToHistory } } = useEditorStore();
  const router = useRouter();
  const [maximizedImage, setMaximizedImage] = useState<number | null>(null);

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
    // 3. New images have arrived
    if (generatedImages.length === 0 || (maximizedImage !== null && maximizedImage >= generatedImages.length)) {
      handleMaximize(null);
      return;
    }

    // Auto-maximize single images only after generation is complete
    if (!isGenerating && settings.batchSize === 1 && generatedImages.length === 1 && maximizedImage === null) {
      handleMaximize(0);
    }
  }, [generatedImages, settings.batchSize, maximizedImage, isGenerating, handleMaximize]);
  
  return (
    <main className="min-h-screen bg-gray-100">
      {/* Top Bar */}
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar variant="dense">
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Image Studio
          </Typography>
          <div className="flex gap-2">
            <Link href="/" passHref>
              <Button
                variant="outlined"
                startIcon={<ImageIcon />}
                size="small"
              >
                Image Editor
              </Button>
            </Link>
          </div>
        </Toolbar>
      </AppBar>

      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column - Prompts */}
          <div className="lg:col-span-2">
            <Paper className="p-6 mb-6">
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Describe what you want to see in the image..."
                value={settings.prompt}
                onChange={(e) => actions.updateSettings({ prompt: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isGenerating && settings.prompt.trim()) {
                      actions.generateImages();
                    }
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
                  },
                }}
              />
            </Paper>

            <Paper className="p-6 mb-6">
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
                  },
                }}
              />
            </Paper>

            <Paper className="p-6">
              <Grid container spacing={3}>
                {/* Model Selection */}
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary', fontWeight: 500 }}>
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
                </Grid>

                {/* Canvas Size */}
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary', fontWeight: 500, display: 'block' }}>
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
                </Grid>

                {/* Generation Controls */}
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ mb: 2, color: 'text.secondary', fontWeight: 500, display: 'block' }}>
                    Generation Controls
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <TextField
                        label="Batch Size"
                        type="number"
                        value={settings.batchSize}
                        onChange={(e) => actions.updateSettings({ batchSize: Number(e.target.value) })}
                        disabled={isGenerating}
                        size="small"
                        inputProps={{ min: 1, max: 4, step: 1 }}
                        sx={{ 
                          width: '100%',
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'background.paper',
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        label="Steps"
                        type="number"
                        value={settings.steps}
                        onChange={(e) => actions.updateSettings({ steps: Number(e.target.value) })}
                        disabled={isGenerating}
                        size="small"
                        inputProps={{ min: 5, max: 50, step: 5 }}
                        sx={{ 
                          width: '100%',
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'background.paper',
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        label="CFG Scale"
                        type="number"
                        value={settings.cfg}
                        onChange={(e) => actions.updateSettings({ cfg: Number(e.target.value) })}
                        disabled={isGenerating}
                        size="small"
                        inputProps={{ min: 1, max: 10, step: 0.5 }}
                        sx={{ 
                          width: '100%',
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'background.paper',
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontSize: '0.7rem' }}>
                    Batch: 1-4 • Steps: 5-50 • CFG: 1-10
              </Typography>
                </Grid>

                {/* Generate Button */}
                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={() => {
                      if (settings.prompt.trim()) {
                        actions.generateImages();
                      }
                    }}
                    disabled={isGenerating || !settings.prompt.trim()}
                    startIcon={isGenerating ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
                    sx={{ 
                      width: isGenerating ? '50%' : '100%',
                    }}
                  >
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </Button>
                  {isGenerating && (
                    <Button
                      variant="contained"
                      color="error"
                      size="large"
                      onClick={actions.interruptGeneration}
                      startIcon={<StopIcon />}
                      sx={{ width: '50%' }}
                    >
                      Cancel
                    </Button>
                  )}
                </Grid>
              </Grid>
            </Paper>
          </div>

          {/* Right Column - Generated Images */}
          <div className="lg:col-span-3">
            <Paper className="p-6">
              <Typography variant="h6" component="h2" sx={{ color: 'text.primary', mb: 3, fontWeight: 'bold' }}>
                Generated Images
              </Typography>
              {generatedImages.length === 0 ? (
                <div className="min-h-[400px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <Typography variant="body1" color="text.secondary">
                    Generated images will appear here
                  </Typography>
                </div>
              ) : (
                <div className={`grid ${maximizedImage === null ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                  {maximizedImage !== null ? (
                    <div 
                      className="relative group"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMaximize(null);
                      }}
                    >
                      <div className="absolute top-2 right-2 z-10 flex gap-2">
                        <Tooltip title="Edit in Image Editor">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageEdit(generatedImages[maximizedImage].url);
                            }}
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.9)',
                              '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
                            }}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Exit Fullscreen">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMaximize(null);
                            }}
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.9)',
                              '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
                            }}
                            size="small"
                          >
                            <FullscreenExitIcon />
                          </IconButton>
                        </Tooltip>
                      </div>
                      
                      {/* Navigation buttons */}
                      {maximizedImage > 0 && (
                        <div 
                          className="absolute left-4 inset-y-0 flex items-center z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Tooltip title="Previous Image (Left Arrow)">
                            <div>
                              <IconButton
                                onClick={handlePrevImage}
                                sx={{
                                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                                  },
                                  width: 48,
                                  height: 48,
                                }}
                                size="large"
                              >
                                <ArrowBackIcon sx={{ fontSize: 32 }} />
                              </IconButton>
                            </div>
                          </Tooltip>
                        </div>
                      )}
                      {maximizedImage < generatedImages.length - 1 && (
                        <div 
                          className="absolute right-4 inset-y-0 flex items-center z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Tooltip title="Next Image (Right Arrow)">
                            <div>
                              <IconButton
                                onClick={handleNextImage}
                                sx={{
                                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                                  },
                                  width: 48,
                                  height: 48,
                                }}
                                size="large"
                              >
                                <ArrowForwardIcon sx={{ fontSize: 32 }} />
                              </IconButton>
                            </div>
                          </Tooltip>
                        </div>
                      )}

                      <img
                        src={generatedImages[maximizedImage].url}
                        alt={`Generated ${maximizedImage + 1}`}
                        className="w-full max-h-[800px] object-contain rounded-lg cursor-pointer"
                      />
                    </div>
                  ) : (
                    generatedImages.map((image, index) => (
                      <div 
                        key={index} 
                        className="aspect-square relative group flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden"
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
                    ))
                  )}
                </div>
              )}
            </Paper>
          </div>
        </div>
      </div>
    </main>
  );
} 