'use client';

import { useEditorStore } from '@/stores/editorStore';
import { ImageDropzone } from '@/components/ImageDropzone';
import { ProcessingControls } from '@/components/ProcessingControls';
import { Typography } from '@mui/material';

export default function EditorPage() {
  const { currentImage, processedImage } = useEditorStore();
  
  return (
    <main className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <Typography variant="h4" component="h1" sx={{ color: 'text.primary', mb: 4, fontWeight: 'bold' }}>
          Image Editor
        </Typography>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left panel - Tools and settings - Now sticky */}
          <div className="lg:sticky lg:top-8 lg:self-start h-fit">
            <div className="bg-white rounded-lg shadow p-6">
              <Typography variant="h6" sx={{ color: 'text.primary', mb: 3, fontWeight: 'bold' }}>
                Processing Options
              </Typography>
              <ProcessingControls />
            </div>
          </div>

          {/* Right panel - Main editor area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Original image */}
            <div className="bg-white rounded-lg shadow p-6">
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
            </div>

            {/* Processed image */}
            {processedImage && (
              <div className="bg-white rounded-lg shadow p-6">
                <Typography variant="h6" sx={{ color: 'text.primary', mb: 3, fontWeight: 'bold' }}>
                  Processed Image
                </Typography>
                <img 
                  src={processedImage} 
                  alt="Processed image"
                  className="max-h-[500px] max-w-full mx-auto object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
