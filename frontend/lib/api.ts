import axios from 'axios';
import { ProcessingOptions } from '@/types/editor';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});

export const imageApi = {
  removeBackground: async (file: File, options: ProcessingOptions) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('options', JSON.stringify(options));
    console.log('Sending options to backend:', options);  // Debug log
    
    const response = await api.post('/remove-background', formData, {
      responseType: 'arraybuffer'
    });
    return response.data;
  },
  
  // Get available models
  getModels: async () => {
    const response = await api.get('/models');
    return response.data;
  },

  // Process image with ComfyUI workflow
  processWithWorkflow: async (file: File, workflowId: string, params: Record<string, any>) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('workflow_id', workflowId);
    formData.append('params', JSON.stringify(params));

    const response = await api.post('/process-workflow', formData);
    return response.data;
  },

  // Save processed image
  saveImage: async (imageData: Blob, filename: string) => {
    const formData = new FormData();
    formData.append('image', imageData);
    formData.append('filename', filename);

    const response = await api.post('/save-image', formData);
    return response.data;
  }
}; 