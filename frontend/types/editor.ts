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
  history: HistoryEntry[];
  settings: ProcessingOptions;
  actions: {
    setCurrentImage: (file: File) => void;
    updateSettings: (settings: Partial<ProcessingOptions>) => void;
    addToHistory: (imageUrl: string) => void;
    restoreFromHistory: (entry: HistoryEntry) => void;
  };
} 