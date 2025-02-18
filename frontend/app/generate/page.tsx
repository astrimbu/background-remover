'use client';

import { Container, Paper, Typography, Button, IconButton, Tooltip } from '@mui/material';
import ComfySettings from '@/components/ComfySettings';
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

export default function GeneratePage() {
  const { generatedImages, settings } = useComfyStore();
  const { actions: { setCurrentImage, addToHistory } } = useEditorStore();
  const router = useRouter();
  const [maximizedImage, setMaximizedImage] = useState<number | null>(null);

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

  // Auto-maximize when batch size is 1 and there is a generated image
  useEffect(() => {
    if (settings.batchSize === 1 && generatedImages.length === 1 && maximizedImage === null) {
      handleMaximize(0);
    }
  }, [generatedImages, settings.batchSize, handleMaximize, maximizedImage]);
  
  return (
    <main className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-4">
          <Typography variant="h4" component="h1" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
            Generate Image
          </Typography>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:sticky lg:top-8 lg:self-start h-fit">
            <Paper className="p-6">
              <Typography variant="h6" component="h2" sx={{ color: 'text.primary', mb: 3, fontWeight: 'bold' }}>
                Processing Options
              </Typography>
              <ComfySettings />
            </Paper>
          </div>

          <div className="lg:col-span-2">
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
                        className="aspect-square relative group flex items-center justify-center"
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