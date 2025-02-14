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
  borderEnabled: boolean;  // Whether to apply border fitting
  borderSize: number;  // Border/padding size in percentage
  // Image resizing options
  targetWidth: number | null;  // Target width in pixels (null means auto)
  targetHeight: number | null;  // Target height in pixels (null means auto)
  maintainAspectRatio: boolean;  // Whether to maintain aspect ratio during resize
}

// Available background removal models
export const AVAILABLE_MODELS = {
  "u2net": "General Purpose (Balanced)",
  "u2net_human_seg": "Human/Portrait (Fast)",
  "isnet-general-use": "General Purpose (Fast)",
  "silueta": "General Purpose (Fastest)",
} as const;

export type ModelType = keyof typeof AVAILABLE_MODELS;

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
  };
}

// Default values for the editor store
export const DEFAULT_SETTINGS: ProcessingOptions = {
  model: "u2net",
  foregroundThreshold: 50,
  erodeSize: 3,
  borderEnabled: false,
  borderSize: 10,
  targetWidth: null,
  targetHeight: null,
  maintainAspectRatio: true
}; 