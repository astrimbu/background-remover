export interface ImageEditorProps {
  initialImage?: File;
  onProcessed?: (result: Blob) => void;
}

export interface HistoryEntry {
  imageUrl: string;
  settings: ProcessingOptions;
  timestamp: number;
}

export interface ProcessingOptions {
  model: keyof typeof AVAILABLE_MODELS;
  foregroundThreshold: number;  // Used for edge softness
  erodeSize: number;
  // Image fitting options
  paddingEnabled: boolean;  // Whether to apply padding
  paddingSize: number;  // Padding size in percentage (0 = full canvas, 50 = half size)
  // Image resizing options
  targetWidth: number | null;  // Target width in pixels (null means auto)
  targetHeight: number | null;  // Target height in pixels (null means auto)
  maintainAspectRatio: boolean;  // Whether to maintain aspect ratio during resize
  isResizeActive: boolean;  // Whether resize is currently active, independent of other processes
  // Background removal state
  backgroundRemoved: boolean;  // Whether the background is currently removed
}

// Available background removal models
export const AVAILABLE_MODELS = {
  "u2net": "General Purpose (Balanced)",
  "u2net_human_seg": "Human/Portrait (Fast)",
  "isnet-general-use": "General Purpose (Fast)",
  "silueta": "General Purpose (Fastest)",
} as const;

export type ModelType = keyof typeof AVAILABLE_MODELS;

export interface DrawingAction {
  type: 'draw';
  points: { x: number; y: number }[];
  color: string;
  size: number;
  opacity: number;
}

export interface PenToolState {
  isActive: boolean;
  color: string;
  size: number;
  opacity: number;
  history: DrawingAction[];
  redoStack: DrawingAction[];
  currentPath: { x: number; y: number }[];
}

export interface CanvasState {
  scale: number;
  translate: { x: number; y: number };
  penTool: PenToolState;
}

// Editor state types
export interface EditorState {
  currentImage: File | null;
  processedImage: string | null;
  originalDimensions: { width: number; height: number } | null;
  history: HistoryEntry[];
  isHistoryMinimized: boolean;
  settings: ProcessingOptions;
  maximizedView: 'original' | 'processed' | null;
  shouldProcess: boolean;
  canvasState: CanvasState;
  actions: {
    setCurrentImage: (file: File) => void;
    updateSettings: (settings: Partial<ProcessingOptions>) => void;
    setOriginalDimensions: (dimensions: { width: number; height: number } | null) => void;
    addToHistory: (imageUrl: string) => void;
    restoreFromHistory: (entry: HistoryEntry) => void;
    setMaximizedView: (view: 'original' | 'processed' | null) => void;
    resetSettings: () => void;
    toggleHistoryMinimized: () => void;
    clearHistory: () => void;
    triggerBackgroundRemoval: () => void;
    updateProcessedImage: (imageUrl: string) => void;
    updateCanvasState: (state: Partial<CanvasState>) => void;
    resetProcessingState: () => void;
    // Pen tool actions
    togglePenTool: () => void;
    updatePenToolSettings: (settings: Partial<PenToolState>) => void;
    // Drawing history actions
    addDrawingAction: (action: DrawingAction) => void;
    undoDrawing: () => void;
    redoDrawing: () => void;
    clearDrawing: () => void;
  };
}

// Default values for the editor store
export const DEFAULT_SETTINGS: ProcessingOptions = {
  model: "u2net",
  foregroundThreshold: 50,
  erodeSize: 3,
  paddingEnabled: false,
  paddingSize: 0,  // Default to no padding
  targetWidth: null,
  targetHeight: null,
  maintainAspectRatio: true,
  isResizeActive: false,
  backgroundRemoved: false
};

export const DEFAULT_PEN_TOOL_STATE: PenToolState = {
  isActive: false,
  color: '#000000',
  size: 5,
  opacity: 1,
  history: [],
  redoStack: [],
  currentPath: []
}; 