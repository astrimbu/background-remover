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
      canvasState: {
        scale: 1,
        translate: { x: 0, y: 0 }
      },
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
                ...DEFAULT_SETTINGS, // Reset to default settings
                targetWidth: state.settings.targetWidth ?? img.width,
                targetHeight: state.settings.targetHeight ?? img.height
              },
              // Clear processed image when new image is uploaded
              processedImage: null,
              // Don't trigger automatic processing
              shouldProcess: false
            }));
          };
          img.src = URL.createObjectURL(file);
        },
        updateSettings: (settings) => 
          set((state) => ({ 
            settings: { ...state.settings, ...settings }
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
              shouldProcess: false  // Reset processing state after adding to history
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
              targetWidth: state.originalDimensions?.width ?? null,
              targetHeight: state.originalDimensions?.height ?? null
            }
          })),
        toggleHistoryMinimized: () =>
          set((state) => ({
            isHistoryMinimized: !state.isHistoryMinimized
          })),
        clearHistory: () =>
          set({ history: [] }),
        // Action to trigger background removal
        triggerBackgroundRemoval: () =>
          set({ shouldProcess: true }),
        // Action to update processed image directly (for non-background-removal operations)
        updateProcessedImage: (imageUrl: string) =>
          set((state) => {
            const newEntry: HistoryEntry = {
              imageUrl,
              settings: { ...state.settings },
              timestamp: Date.now()
            };
            return {
              processedImage: imageUrl,
              history: [newEntry, ...state.history].slice(0, 10)
            };
          }),
        updateCanvasState: (state) =>
          set((prev) => ({
            canvasState: { ...prev.canvasState, ...state }
          })),
        // New action to reset processing state
        resetProcessingState: () =>
          set({ shouldProcess: false })
      }
    }),
    { name: 'editor-store' }
  )
); 