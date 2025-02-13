export interface GenerationSettings {
  prompt: string;
  negativePrompt: string;
  batchSize: number;
  steps: number;
}

export interface GeneratedImage {
  url: string;
}

export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  prompt: "",
  negativePrompt: "",
  batchSize: 1,
  steps: 5
};