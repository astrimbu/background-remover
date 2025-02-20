import { ProcessingOptions } from '@/types/editor';

interface ImageFittingOptions {
  borderEnabled: boolean;
  borderSize: number;
  targetWidth: number | null;
  targetHeight: number | null;
  maintainAspectRatio: boolean;
}

export const imageApi = {
  removeBackground: async (file: File, options: ProcessingOptions) => {
    const formData = new FormData();
    formData.append('image', file);
    
    // Convert camelCase to snake_case for backend compatibility
    const backendSettings = {
      foreground_threshold: options.foregroundThreshold,
      erode_size: options.erodeSize,
      model: options.model,
      border_enabled: options.borderEnabled,
      border_size: options.borderSize,
      target_width: options.targetWidth,
      target_height: options.targetHeight,
      maintain_aspect_ratio: options.maintainAspectRatio
    };
    
    formData.append('settings', JSON.stringify(backendSettings));
    console.log('Sending settings to backend:', backendSettings);  // Debug log
    
    const response = await fetch('/remove-background', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove background');
    }
    
    return response.arrayBuffer();
  },
  
  fitImage: async (image: Blob, options: ImageFittingOptions) => {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('border', options.borderSize.toString());
    
    const response = await fetch('/fit-to-canvas', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to fit image');
    }
    
    return response.arrayBuffer();
  },
  
  // Get available models
  getModels: async () => {
    const response = await fetch('/models');
    if (!response.ok) {
      throw new Error('Failed to get models');
    }
    return response.json();
  },

  // Process image with ComfyUI workflow
  processWithWorkflow: async (file: File, workflowId: string, params: Record<string, any>) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('workflow_id', workflowId);
    formData.append('params', JSON.stringify(params));

    const response = await fetch('/process-workflow', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to process workflow');
    }
    
    return response.json();
  },

  // Save processed image
  saveImage: async (imageData: Blob, filename: string) => {
    const formData = new FormData();
    formData.append('image', imageData);
    formData.append('filename', filename);

    const response = await fetch('/save-image', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to save image');
    }
    
    return response.json();
  }
}; 