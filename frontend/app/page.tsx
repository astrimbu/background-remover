'use client';

import { useEditorStore } from '@/stores/editorStore';
import { ImageDropzone } from '@/components/ImageDropzone';
import { ProcessingControls } from '@/components/ProcessingControls';
import { Typography, Box, Paper, IconButton, Tooltip } from '@mui/material';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import RestoreIcon from '@mui/icons-material/Restore';

export default function EditorPage() {
  const { currentImage, processedImage, history } = useEditorStore();
  const { setCurrentImage, restoreFromHistory } = useEditorStore(state => state.actions);
  
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

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <main className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <Typography variant="h4" component="h1" sx={{ color: 'text.primary', mb: 4, fontWeight: 'bold' }}>
            Image Editor
          </Typography>
          
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
                  <Typography variant="h6" sx={{ color: 'text.primary', mb: 3, fontWeight: 'bold' }}>
                    History
                  </Typography>
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
                          className="w-full h-auto rounded cursor-pointer"
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
                </Paper>
              )}
            </div>

            {/* Right panel - Main editor area */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Original image */}
                <Paper className="p-6">
                  <Typography variant="h6" sx={{ color: 'text.primary', mb: 3, fontWeight: 'bold' }}>
                    Original Image
                  </Typography>
                  {currentImage ? (
                    <img 
                      src={URL.createObjectURL(currentImage)} 
                      alt="Original image"
                      className="max-h-[500px] max-w-full mx-auto object-contain"
                    />
                  ) : (
                    <ImageDropzone />
                  )}
                </Paper>

                {/* Processed image */}
                {processedImage && (
                  <Paper className="p-6">
                    <Typography variant="h6" sx={{ color: 'text.primary', mb: 3, fontWeight: 'bold' }}>
                      Processed Image
                    </Typography>
                    <img 
                      src={processedImage} 
                      alt="Processed image"
                      className="max-h-[500px] max-w-full mx-auto object-contain"
                    />
                  </Paper>
                )}
              </div>
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
