import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { EditorState, ProcessingOptions, AVAILABLE_MODELS } from '@/types/editor';

const initialSettings: ProcessingOptions = {
  model: 'u2net',
  foregroundThreshold: 100,
  backgroundThreshold: 100,
  erodeSize: 3,
  kernelSize: 1
};

export const useEditorStore = create<EditorState>()(
  devtools(
    (set) => ({
      currentImage: null,
      processedImage: null,
      history: [],
      settings: initialSettings,
      actions: {
        setCurrentImage: (file) => set({ currentImage: file }),
        updateSettings: (settings) => 
          set((state) => ({ 
            settings: { ...state.settings, ...settings } 
          })),
        addToHistory: (imageUrl) =>
          set((state) => ({
            processedImage: imageUrl,
            history: [imageUrl, ...state.history].slice(0, 10)
          }))
      }
    }),
    { name: 'editor-store' }
  )
); 