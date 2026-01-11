import type { MatcherFunction } from "expect";
import type {
  VibeMatchConfig,
  VibeMatchStringConfig,
  VibeMatchCustomModelConfig,
  ResolvedVibeMatchConfig,
} from "./types";
import { resolveLanguageModel, resolveEmbeddingModel } from "./providers";
import { toBeSimilarTo } from "./matchers/toBeSimilarTo";
import { toBeVectorSimilarTo } from "./matchers/toBeVectorSimilarTo";
import { toMention } from "./matchers/toMention";
import { toSatisfyCriteria } from "./matchers/toSatisfyCriteria";

/**
 * Type guard to check if the config uses custom model instances.
 */
function isCustomModelConfig(
  config: VibeMatchConfig,
): config is VibeMatchCustomModelConfig {
  return (
    typeof config.languageModel === "object" &&
    config.languageModel !== null &&
    "doGenerate" in config.languageModel
  );
}

function resolveConfig(config: VibeMatchConfig): ResolvedVibeMatchConfig {
  if (isCustomModelConfig(config)) {
    // Custom model instances provided directly
    return {
      languageModel: config.languageModel,
      embeddingModel: config.embeddingModel,
      prompts: config.prompts,
    };
  }

  // String-based configuration with built-in providers
  const stringConfig = config as VibeMatchStringConfig;
  return {
    languageModel: resolveLanguageModel(
      stringConfig.languageModel,
      stringConfig.apiKeys,
    ),
    embeddingModel: resolveEmbeddingModel(
      stringConfig.embeddingModel,
      stringConfig.apiKeys,
    ),
    prompts: stringConfig.prompts,
  };
}

export const vibeMatchers = (config: VibeMatchConfig) => {
  const resolvedConfig = resolveConfig(config);

  return {
    toBeSimilarTo: toBeSimilarTo(resolvedConfig),
    toBeVectorSimilarTo: toBeVectorSimilarTo(resolvedConfig),
    toMention: toMention(resolvedConfig),
    toSatisfyCriteria: toSatisfyCriteria(resolvedConfig),
  };
};

// Extract the return type from the vibeMatchers function
type VibeMatchersReturnType = ReturnType<typeof vibeMatchers>;

// Convert vibeMatchers object to Jest interface
type VibeMatchersToJest<T, R> = {
  [K in keyof T]: T[K] extends MatcherFunction<infer Args>
    ? (...args: Args) => R
    : never;
};

// Globally patch the Jest interface
declare global {
  namespace jest {
    interface Matchers<R>
      extends VibeMatchersToJest<VibeMatchersReturnType, R> {}
  }
}
