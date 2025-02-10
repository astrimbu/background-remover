export interface ImageEditorProps {
  initialImage?: File;
  onProcessed?: (result: Blob) => void;
}

export interface ProcessingOptions {
  model: keyof typeof AVAILABLE_MODELS;
  foregroundThreshold: number;
  backgroundThreshold: number;
  erodeSize: number;
  kernelSize: number;
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
  history: string[];
  settings: ProcessingOptions;
  actions: {
    setCurrentImage: (file: File) => void;
    updateSettings: (settings: Partial<ProcessingOptions>) => void;
    addToHistory: (imageUrl: string) => void;
  };
} 