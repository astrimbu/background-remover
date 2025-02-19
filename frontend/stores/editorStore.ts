import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { EditorState, ProcessingOptions, AVAILABLE_MODELS, HistoryEntry, DEFAULT_SETTINGS } from '@/types/editor';

export const useEditorStore = create<EditorState>()(
  devtools(
    (set) => ({
      currentImage: null,
      processedImage: null,
      originalDimensions: null,
      history: [],
      isHistoryMinimized: false,
      settings: DEFAULT_SETTINGS,
      maximizedView: null,
      shouldProcess: false,
      actions: {
        setCurrentImage: (file) => {
          // When setting a new image, read its dimensions
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(img.src);
            set((state) => ({
              currentImage: file,
              originalDimensions: { width: img.width, height: img.height },
              // Only update dimensions if they haven't been set by the user
              settings: {
                ...state.settings,
                targetWidth: state.settings.targetWidth ?? img.width,
                targetHeight: state.settings.targetHeight ?? img.height
              },
              shouldProcess: true // Set shouldProcess when setting a new image
            }));
          };
          img.src = URL.createObjectURL(file);
        },
        updateSettings: (settings) => 
          set((state) => ({ 
            settings: { ...state.settings, ...settings },
            shouldProcess: true // Set shouldProcess when settings change
          })),
        setOriginalDimensions: (dimensions) =>
          set({ originalDimensions: dimensions }),
        addToHistory: (imageUrl) =>
          set((state) => {
            const newEntry: HistoryEntry = {
              imageUrl,
              settings: { ...state.settings },
              timestamp: Date.now()
            };
            return {
              processedImage: imageUrl,
              history: [newEntry, ...state.history].slice(0, 10),  // Keep last 10 entries
              shouldProcess: false // Reset shouldProcess after processing
            };
          }),
        restoreFromHistory: (entry) =>
          set((state) => ({
            settings: { ...entry.settings },
            processedImage: entry.imageUrl
          })),
        setMaximizedView: (view: 'original' | 'processed' | null) =>
          set({ maximizedView: view }),
        resetSettings: () =>
          set((state) => ({
            settings: {
              ...DEFAULT_SETTINGS,
              // If we have original dimensions, use them for target dimensions
              targetWidth: state.originalDimensions?.width ?? null,
              targetHeight: state.originalDimensions?.height ?? null
            },
            shouldProcess: true // Set shouldProcess when resetting settings
          })),
        toggleHistoryMinimized: () =>
          set((state) => ({
            isHistoryMinimized: !state.isHistoryMinimized
          })),
        clearHistory: () =>
          set({ history: [] })
      }
    }),
    { name: 'editor-store' }
  )
); 