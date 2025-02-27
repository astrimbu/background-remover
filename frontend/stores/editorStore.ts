import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  EditorState, 
  ProcessingOptions, 
  AVAILABLE_MODELS, 
  HistoryEntry, 
  DEFAULT_SETTINGS, 
  DEFAULT_PEN_TOOL_STATE,
  PenToolState,
  DrawingAction
} from '@/types/editor';

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
        translate: { x: 0, y: 0 },
        penTool: DEFAULT_PEN_TOOL_STATE
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
            canvasState: { 
              ...prev.canvasState,
              ...state,
              penTool: {
                ...prev.canvasState.penTool,
                ...(state.penTool || {})
              }
            }
          })),
        // New action to reset processing state
        resetProcessingState: () =>
          set({ shouldProcess: false }),
        // Pen tool specific actions
        togglePenTool: () =>
          set((prev) => ({
            canvasState: {
              ...prev.canvasState,
              penTool: {
                ...prev.canvasState.penTool,
                isActive: !prev.canvasState.penTool.isActive
              }
            }
          })),
        updatePenToolSettings: (settings: Partial<PenToolState>) =>
          set((prev) => ({
            canvasState: {
              ...prev.canvasState,
              penTool: {
                ...prev.canvasState.penTool,
                ...settings
              }
            }
          })),
        // Drawing history actions
        addDrawingAction: (action: DrawingAction) =>
          set((prev) => ({
            canvasState: {
              ...prev.canvasState,
              penTool: {
                ...prev.canvasState.penTool,
                history: [...prev.canvasState.penTool.history, action],
                redoStack: [], // Clear redo stack when new action is added
                currentPath: [] // Clear current path
              }
            }
          })),
        undoDrawing: () =>
          set((prev) => {
            const lastAction = prev.canvasState.penTool.history[prev.canvasState.penTool.history.length - 1];
            if (!lastAction) return prev;

            return {
              canvasState: {
                ...prev.canvasState,
                penTool: {
                  ...prev.canvasState.penTool,
                  history: prev.canvasState.penTool.history.slice(0, -1),
                  redoStack: [...prev.canvasState.penTool.redoStack, lastAction]
                }
              }
            };
          }),
        redoDrawing: () =>
          set((prev) => {
            const nextAction = prev.canvasState.penTool.redoStack[prev.canvasState.penTool.redoStack.length - 1];
            if (!nextAction) return prev;

            return {
              canvasState: {
                ...prev.canvasState,
                penTool: {
                  ...prev.canvasState.penTool,
                  history: [...prev.canvasState.penTool.history, nextAction],
                  redoStack: prev.canvasState.penTool.redoStack.slice(0, -1)
                }
              }
            };
          }),
        clearDrawing: () =>
          set((prev) => ({
            canvasState: {
              ...prev.canvasState,
              penTool: {
                ...prev.canvasState.penTool,
                history: [],
                redoStack: [],
                currentPath: []
              }
            }
          })),
        updateDrawingCoordinates: (transform) =>
          set((prev) => ({
            canvasState: {
              ...prev.canvasState,
              penTool: {
                ...prev.canvasState.penTool,
                history: prev.canvasState.penTool.history.map(action => ({
                  ...action,
                  points: action.points.map(transform)
                })),
                redoStack: prev.canvasState.penTool.redoStack.map(action => ({
                  ...action,
                  points: action.points.map(transform)
                })),
                currentPath: prev.canvasState.penTool.currentPath.map(transform)
              }
            }
          })),
      }
    }),
    { name: 'editor-store' }
  )
); 