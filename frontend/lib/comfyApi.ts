import { GeneratedImage, GenerationSettings } from '../types/comfy';

export async function fetchBaseImages() {
  const response = await fetch('/base-images');
  if (!response.ok) {
    throw new Error('Failed to fetch base images');
  }
  const data = await response.json();
  return data.images;
}

async function pollStatus(promptId: string): Promise<GeneratedImage[]> {
  // Poll for up to 5 minutes
  for (let i = 0; i < 300; i++) {
    try {
      const response = await fetch(`/check-status/${promptId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to check status');
      }
      
      const data = await response.json();
      
      if (data.status === 'completed' && Array.isArray(data.images)) {
        return data.images.map((url: string) => ({ url }));
      } else if (data.status === 'error') {
        throw new Error(data.error || 'Generation failed');
      } else if (data.status === 'processing') {
        console.log('Still processing...');
      }
      
      // Wait 1 second between checks
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error checking status:', error);
      throw error;
    }
  }
  
  throw new Error('Generation timed out');
}

export async function generateImages(settings: GenerationSettings): Promise<GeneratedImage[]> {
  const formData = new FormData();
  
  // Required parameters from workflow
  formData.append('prompt', settings.prompt);
  formData.append('negative_prompt', settings.negativePrompt);
  formData.append('batch_size', settings.batchSize.toString());
  formData.append('steps', settings.steps.toString());
  formData.append('cfg', '4');
  formData.append('sampler_name', 'dpmpp_sde');
  formData.append('scheduler', 'normal');
  formData.append('denoise', '1');

  const response = await fetch('/comfyui-generate', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to start generation');
  }

  const data = await response.json();
  
  if (!data.prompt_id) {
    throw new Error('No prompt ID received');
  }

  return pollStatus(data.prompt_id);
}

export async function saveTempImage(imageUrl: string): Promise<string> {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error('Failed to fetch generated image');
  const imageBlob = await imageResponse.blob();

  const formData = new FormData();
  formData.append('image', imageBlob, 'generated.png');

  const saveResponse = await fetch('/save-temp-image', {
    method: 'POST',
    body: formData,
  });

  if (!saveResponse.ok) throw new Error('Failed to save temporary image');
  const { tempUrl } = await saveResponse.json();
  return tempUrl;
} 