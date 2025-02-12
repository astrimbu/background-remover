import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { EditorState, ProcessingOptions, AVAILABLE_MODELS, HistoryEntry } from '@/types/editor';

const initialSettings: ProcessingOptions = {
  model: 'u2net',
  foregroundThreshold: 50,
  erodeSize: 3
};

export const useEditorStore = create<EditorState>()(
  devtools(
    (set) => ({
      currentImage: null,
      processedImage: null,
      history: [],
      settings: initialSettings,
      maximizedView: null,
      actions: {
        setCurrentImage: (file) => set({ currentImage: file }),
        updateSettings: (settings) => 
          set((state) => ({ 
            settings: { ...state.settings, ...settings } 
          })),
        addToHistory: (imageUrl) =>
          set((state) => {
            const newEntry: HistoryEntry = {
              imageUrl,
              settings: { ...state.settings },
              timestamp: Date.now()
            };
            return {
              processedImage: imageUrl,
              history: [newEntry, ...state.history].slice(0, 10)  // Keep last 10 entries
            };
          }),
        restoreFromHistory: (entry) =>
          set((state) => ({
            settings: { ...entry.settings },
            processedImage: entry.imageUrl
          })),
        setMaximizedView: (view: 'original' | 'processed' | null) =>
          set({ maximizedView: view })
      }
    }),
    { name: 'editor-store' }
  )
); 