export { vibeMatchers } from "./matchers";
export type {
  VibeMatchConfig,
  VibeMatchStringConfig,
  VibeMatchCustomModelConfig,
  VibeMatchPrompts,
  VibeMatchApiKeys,
} from "./types";
export type { LanguageModelString, EmbeddingModelString } from "./providers";

// Export matcher option types
export type { ToBeSimilarToOptions } from "./matchers/toBeSimilarTo";
export type { ToMentionOptions } from "./matchers/toMention";
export type { ToSatisfyCriteriaOptions } from "./matchers/toSatisfyCriteria";
export type { VectorSimilarityOptions } from "./matchers/toBeVectorSimilarTo";

// Export default prompts for reference/extension
export { DEFAULT_SIMILARITY_PROMPT } from "./matchers/toBeSimilarTo";
export { DEFAULT_MENTION_PROMPT } from "./matchers/toMention";
export { DEFAULT_SATISFY_CRITERIA_PROMPT } from "./matchers/toSatisfyCriteria";
