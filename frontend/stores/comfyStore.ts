import { create } from 'zustand';
import { GeneratedImage, GenerationSettings, DEFAULT_GENERATION_SETTINGS } from '../types/comfy';
import { generateImages as apiGenerateImages, fetchCheckpoints as apiFetchCheckpoints, interruptGeneration as apiInterruptGeneration } from '../lib/comfyApi';

interface ComfyState {
  settings: GenerationSettings;
  generatedImages: GeneratedImage[];
  isGenerating: boolean;
  checkpoints: string[];
  onBeforeImagesChange?: ((newImages: GeneratedImage[]) => void) | null;
  actions: {
    updateSettings: (settings: Partial<GenerationSettings>) => void;
    setGeneratedImages: (images: GeneratedImage[]) => void;
    setIsGenerating: (isGenerating: boolean) => void;
    resetSettings: () => void;
    generateImages: () => Promise<void>;
    loadCheckpoints: () => Promise<void>;
    interruptGeneration: () => Promise<void>;
    setOnBeforeImagesChange: (callback: ((newImages: GeneratedImage[]) => void) | null) => void;
  };
}

export const useComfyStore = create<ComfyState>((set, get) => ({
  settings: DEFAULT_GENERATION_SETTINGS,
  generatedImages: [],
  isGenerating: false,
  checkpoints: [],
  onBeforeImagesChange: null,
  actions: {
    updateSettings: (newSettings) => 
      set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
    setGeneratedImages: (images) => {
      const { onBeforeImagesChange } = get();
      if (onBeforeImagesChange) {
        onBeforeImagesChange(images);
      }
      set({ generatedImages: images });
    },
    setIsGenerating: (isGenerating) => set({ isGenerating }),
    resetSettings: () => set({ settings: DEFAULT_GENERATION_SETTINGS }),
    generateImages: async () => {
      try {
        set({ isGenerating: true });
        const { settings } = get();
        const images = await apiGenerateImages(settings);
        const { onBeforeImagesChange } = get();
        if (onBeforeImagesChange) {
          onBeforeImagesChange(images);
        }
        set({ generatedImages: images, isGenerating: false });
      } catch (error) {
        console.error('Failed to generate images:', error);
        set({ isGenerating: false });
      }
    },
    loadCheckpoints: async () => {
      try {
        const checkpoints = await apiFetchCheckpoints();
        set({ checkpoints });
        
        // If current checkpoint is empty or not in the list, set to first available
        const { settings, checkpoints: newCheckpoints } = get();
        if ((!settings.checkpoint || !newCheckpoints.includes(settings.checkpoint)) && newCheckpoints.length > 0) {
          set((state) => ({
            settings: { ...state.settings, checkpoint: newCheckpoints[0] }
          }));
        }
      } catch (error) {
        console.error('Failed to load checkpoints:', error);
        set({ checkpoints: [] });
      }
    },
    interruptGeneration: async () => {
      try {
        await apiInterruptGeneration();
        set({ isGenerating: false });
      } catch (error) {
        console.error('Failed to interrupt generation:', error);
      }
    },
    setOnBeforeImagesChange: (callback) => set({ onBeforeImagesChange: callback })
  },
})); 