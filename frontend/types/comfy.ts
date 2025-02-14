export interface GenerationSettings {
  prompt: string;
  negativePrompt: string;
  batchSize: number;
  steps: number;
  cfg: number;
  checkpoint: string;
  width: number;
  height: number;
}

export interface GeneratedImage {
  url: string;
}

export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  prompt: "",
  negativePrompt: "",
  batchSize: 1,
  steps: 5,
  cfg: 4,
  checkpoint: "RealitiesEdgeXLLIGHTNING_TURBOV7.safetensors",
  width: 800,
  height: 800
};