'use client';

import { useEditorStore } from '@/stores/editorStore';
import { ImageDropzone } from '@/components/ImageDropzone';
import { ProcessingControls } from '@/components/ProcessingControls';
import { Typography, IconButton, Tooltip, Button, AppBar, Toolbar, Box } from '@mui/material';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { BackgroundToggle, BackgroundToggleButton } from '@/components/BackgroundToggle';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import BrushIcon from '@mui/icons-material/Brush';
import SaveIcon from '@mui/icons-material/Save';
import Link from 'next/link';

type BackgroundType = 'transparent' | 'light' | 'dark';

export default function EditorPage() {
  const { currentImage, processedImage } = useEditorStore();
  const { setCurrentImage } = useEditorStore(state => state.actions);
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

  return (
    <div {...getRootProps()} className="h-screen flex flex-col">
      <input {...getInputProps()} />
      
      {/* Top Bar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Image Studio
          </Typography>
          <div className="flex gap-2">
            <Link href="/generate" passHref>
              <Button
                variant="outlined"
                startIcon={<BrushIcon />}
                size="small"
              >
                AI Generate
              </Button>
            </Link>
          </div>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Toolbar */}
        <div className="w-64 border-r bg-gray-50">
          <ProcessingControls />
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-gray-100 flex flex-col">
          {/* Canvas */}
          <div className="flex-1 flex relative">
            <BackgroundToggle background={background} className="w-full">
              {/* Canvas Controls */}
              <div className="absolute top-2 right-2 z-10">
                <BackgroundToggleButton 
                  onClick={handleToggle} 
                  background={background}
                />
              </div>
              
              <div className="flex items-center justify-center p-8 w-full h-full">
                {currentImage ? (
                  processedImage ? (
                    <img 
                      src={processedImage}
                      alt="Processed image"
                      className="max-w-full max-h-[calc(100vh-120px)] object-contain"
                    />
                  ) : (
                    <img 
                      src={URL.createObjectURL(currentImage)}
                      alt="Original image"
                      className="max-w-full max-h-[calc(100vh-120px)] object-contain"
                    />
                  )
                ) : (
                  <ImageDropzone />
                )}
              </div>
            </BackgroundToggle>
          </div>
        </div>

        {/* Right Toolbar - Could be used for layers, history, etc. in the future */}
        <div className="w-64 border-l bg-gray-50">
          {/* Future: Layers, History, etc. */}
        </div>
      </div>

      {isDragActive && (
        <div className="fixed inset-0 bg-blue-500/20 pointer-events-none flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <Typography variant="h5">
              Drop image here...
            </Typography>
          </div>
        </div>
      )}
    </div>
  );
}
