export const AI_MODELS = {
  'gpt-3.5-turbo': {
    label: 'GPT-3.5 Turbo',
    maxTokens: 4096,
    defaultTemperature: 0.7,
    description: 'Fast and cost-effective for most tasks'
  },
  'gpt-4': {
    label: 'GPT-4',
    maxTokens: 8192,
    defaultTemperature: 0.7,
    description: 'Most capable model for complex tasks'
  },
  'gpt-4-turbo': {
    label: 'GPT-4 Turbo',
    maxTokens: 128000,
    defaultTemperature: 0.7,
    description: 'Latest GPT-4 with larger context window'
  },
  'gpt-4o-mini': {
    label: 'GPT-4o Mini',
    maxTokens: 4096,
    defaultTemperature: 0.7,
    description: 'Optimized version for quick responses'
  }
} as const;

export type AIModel = keyof typeof AI_MODELS;
export const DEFAULT_MODEL: AIModel = 'gpt-3.5-turbo';