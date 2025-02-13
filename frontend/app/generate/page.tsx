'use client';

import { Container, Paper, Typography, Button } from '@mui/material';
import ComfySettings from '@/components/ComfySettings';
import Link from 'next/link';
import ImageIcon from '@mui/icons-material/Image';
import { useComfyStore } from '@/stores/comfyStore';

export default function GeneratePage() {
  const { generatedImages } = useComfyStore();
  
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
                <div className="grid grid-cols-2 gap-4">
                  {generatedImages.map((image, index) => (
                    <div key={index} className="aspect-square relative flex items-center justify-center">
                      <img
                        src={image.url}
                        alt={`Generated ${index + 1}`}
                        className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    </div>
                  ))}
                </div>
              )}
            </Paper>
          </div>
        </div>
      </div>
    </main>
  );
} 