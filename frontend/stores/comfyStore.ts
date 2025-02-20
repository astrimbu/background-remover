import { create } from 'zustand';
import { GeneratedImage, GenerationSettings, DEFAULT_GENERATION_SETTINGS } from '../types/comfy';
import { generateImages as apiGenerateImages, fetchCheckpoints as apiFetchCheckpoints } from '../lib/comfyApi';

interface ComfyState {
  settings: GenerationSettings;
  generatedImages: GeneratedImage[];
  isGenerating: boolean;
  checkpoints: string[];
  actions: {
    updateSettings: (settings: Partial<GenerationSettings>) => void;
    setGeneratedImages: (images: GeneratedImage[]) => void;
    setIsGenerating: (isGenerating: boolean) => void;
    resetSettings: () => void;
    generateImages: () => Promise<void>;
    loadCheckpoints: () => Promise<void>;
  };
}

export const useComfyStore = create<ComfyState>((set, get) => ({
  settings: DEFAULT_GENERATION_SETTINGS,
  generatedImages: [],
  isGenerating: false,
  checkpoints: [],
  actions: {
    updateSettings: (newSettings) => 
      set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
    setGeneratedImages: (images) => set({ generatedImages: images }),
    setIsGenerating: (isGenerating) => set({ isGenerating }),
    resetSettings: () => set({ settings: DEFAULT_GENERATION_SETTINGS }),
    generateImages: async () => {
      try {
        set({ isGenerating: true });
        const { settings } = get();
        const images = await apiGenerateImages(settings);
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
        // If current checkpoint is not in the list, set to first available
        const { settings, checkpoints: newCheckpoints } = get();
        if (!newCheckpoints.includes(settings.checkpoint) && newCheckpoints.length > 0) {
          set((state) => ({
            settings: { ...state.settings, checkpoint: newCheckpoints[0] }
          }));
        }
      } catch (error) {
        console.error('Failed to load checkpoints:', error);
      }
    }
  },
})); 