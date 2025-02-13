import { create } from 'zustand';
import { GeneratedImage, GenerationSettings, DEFAULT_GENERATION_SETTINGS } from '../types/comfy';

interface ComfyState {
  settings: GenerationSettings;
  generatedImages: GeneratedImage[];
  isGenerating: boolean;
  actions: {
    updateSettings: (settings: Partial<GenerationSettings>) => void;
    setGeneratedImages: (images: GeneratedImage[]) => void;
    setIsGenerating: (isGenerating: boolean) => void;
    resetSettings: () => void;
  };
}

export const useComfyStore = create<ComfyState>((set) => ({
  settings: DEFAULT_GENERATION_SETTINGS,
  generatedImages: [],
  isGenerating: false,
  actions: {
    updateSettings: (newSettings) => 
      set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
    setGeneratedImages: (images) => set({ generatedImages: images }),
    setIsGenerating: (isGenerating) => set({ isGenerating }),
    resetSettings: () => set({ settings: DEFAULT_GENERATION_SETTINGS }),
  },
})); 