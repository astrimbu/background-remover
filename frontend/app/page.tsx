'use client';

import { useEditorStore } from '@/stores/editorStore';
import { ImageDropzone } from '@/components/ImageDropzone';
import { ProcessingControls } from '@/components/ProcessingControls';
import { Typography, Box, Paper, IconButton, Tooltip, Button } from '@mui/material';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import RestoreIcon from '@mui/icons-material/Restore';
import { BackgroundToggle, BackgroundToggleButton } from '@/components/BackgroundToggle';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Link from 'next/link';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

type BackgroundType = 'transparent' | 'light' | 'dark';

export default function EditorPage() {
  const { currentImage, processedImage, history, maximizedView, isHistoryMinimized } = useEditorStore();
  const { setCurrentImage, restoreFromHistory, setMaximizedView, toggleHistoryMinimized, clearHistory } = useEditorStore(state => state.actions);
  const [background, setBackground] = useState<BackgroundType>('transparent');
  
  const handleToggle = useCallback(() => {
    const sequence: BackgroundType[] = ['transparent', 'light', 'dark'];
    const currentIndex = sequence.indexOf(background);
    setBackground(sequence[(currentIndex + 1) % sequence.length]);
  }, [background]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setCurrentImage(file);
    }
  }, [setCurrentImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: false,
    noClick: true
  });

  const handleMaximize = useCallback((view: 'original' | 'processed') => {
    setMaximizedView(maximizedView === view ? null : view);
  }, [maximizedView, setMaximizedView]);

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <main className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Typography variant="h4" component="h1" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
              Image Editor
            </Typography>
            <Link href="/generate" passHref>
              <Button
                variant="outlined"
                startIcon={<AddPhotoAlternateIcon />}
                size="small"
              >
                Generate Image
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left panel - Tools and settings */}
            <div className="lg:sticky lg:top-8 lg:self-start h-fit">
              <Paper className="p-6">
                <Typography variant="h6" sx={{ color: 'text.primary', mb: 3, fontWeight: 'bold' }}>
                  Processing Options
                </Typography>
                <ProcessingControls />
              </Paper>

              {/* History Panel */}
              {history.length > 0 && (
                <Paper className="mt-4 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                      History
                    </Typography>
                    <div className="flex items-center gap-2">
                      <Tooltip title="Clear history">
                        <IconButton onClick={clearHistory} size="small">
                          <RestartAltIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={isHistoryMinimized ? "Expand history" : "Minimize history"}>
                        <IconButton onClick={toggleHistoryMinimized} size="small">
                          {isHistoryMinimized ? <FullscreenIcon /> : <FullscreenExitIcon />}
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>
                  {!isHistoryMinimized && (
                    <div className="grid grid-cols-2 gap-2">
                      {history.map((entry, index) => (
                        <Box
                          key={entry.timestamp}
                          sx={{
                            position: 'relative',
                            '&:hover .restore-button': {
                              opacity: 1
                            }
                          }}
                        >
                          <img
                            src={entry.imageUrl}
                            alt={`History ${index + 1}`}
                            className="w-full h-auto rounded-lg cursor-pointer"
                            onClick={() => restoreFromHistory(entry)}
                          />
                          <Tooltip title="Restore these settings">
                            <IconButton
                              className="restore-button"
                              onClick={() => restoreFromHistory(entry)}
                              sx={{
                                position: 'absolute',
                                right: 4,
                                top: 4,
                                opacity: 0,
                                transition: 'opacity 0.2s',
                                bgcolor: 'rgba(255,255,255,0.9)',
                                '&:hover': {
                                  bgcolor: 'rgba(255,255,255,1)'
                                }
                              }}
                              size="small"
                            >
                              <RestoreIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ))}
                    </div>
                  )}
                </Paper>
              )}
            </div>

            {/* Right panel - Main editor area */}
            <div className={`lg:col-span-2 ${maximizedView ? 'grid grid-cols-1' : 'grid grid-cols-1 md:grid-cols-2'} gap-8 content-start`}>
              {/* Original image */}
              {(!maximizedView || maximizedView === 'original') && (
                <Paper className={`p-6 h-fit ${maximizedView === 'original' ? 'md:col-span-2' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                      Original Image
                    </Typography>
                    {currentImage && (
                      <Tooltip title={maximizedView === 'original' ? "Exit Fullscreen" : "Fullscreen"}>
                        <IconButton onClick={() => handleMaximize('original')} size="small">
                          {maximizedView === 'original' ? <FullscreenExitIcon /> : <FullscreenIcon />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </div>
                  {currentImage ? (
                    <img 
                      src={URL.createObjectURL(currentImage)} 
                      alt="Original image"
                      className={`mx-auto object-contain rounded-lg overflow-hidden ${maximizedView === 'original' ? 'max-h-[800px]' : 'max-h-[500px]'} max-w-full cursor-pointer`}
                      onClick={() => handleMaximize('original')}
                    />
                  ) : (
                    <ImageDropzone />
                  )}
                </Paper>
              )}

              {/* Processed image */}
              {processedImage && (!maximizedView || maximizedView === 'processed') && (
                <Paper className={`p-6 h-fit ${maximizedView === 'processed' ? 'md:col-span-2' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                      Processed Image
                    </Typography>
                    <div className="flex items-center gap-2">
                      <Tooltip title={maximizedView === 'processed' ? "Exit Fullscreen" : "Fullscreen"}>
                        <IconButton onClick={() => handleMaximize('processed')} size="small">
                          {maximizedView === 'processed' ? <FullscreenExitIcon /> : <FullscreenIcon />}
                        </IconButton>
                      </Tooltip>
                      <BackgroundToggleButton 
                        onClick={handleToggle} 
                        background={background}
                      />
                    </div>
                  </div>
                  <BackgroundToggle background={background}>
                    <img 
                      src={processedImage} 
                      alt="Processed image"
                      className={`mx-auto object-contain rounded-lg overflow-hidden ${maximizedView === 'processed' ? 'max-h-[800px]' : 'max-h-[500px]'} max-w-full cursor-pointer`}
                      onClick={() => handleMaximize('processed')}
                    />
                  </BackgroundToggle>
                </Paper>
              )}
            </div>
          </div>
        </div>
      </main>
      {isDragActive && (
        <div className="fixed inset-0 bg-blue-500/20 pointer-events-none flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <Typography variant="h5" sx={{ color: 'text.primary' }}>
              Drop image here...
            </Typography>
          </div>
        </div>
      )}
    </div>
  );
}
