import type { MatcherFunction } from "expect";
import type { LanguageModelV1, EmbeddingModel } from "ai";
import type { LanguageModelString, EmbeddingModelString } from "./providers";

/**
 * Prompt configuration for customizing LLM behavior.
 * Each matcher can have its default prompt overridden globally here,
 * and can be further overridden per-call via matcher options.
 */
export interface VibeMatchPrompts {
  /**
   * System prompt for the toBeSimilarTo matcher.
   * Receives: actual, similarTo, level
   */
  toBeSimilarTo?: string;

  /**
   * System prompt for the toMention matcher.
   * Receives: actual, concept
   */
  toMention?: string;

  /**
   * System prompt for the toSatisfyCriteria matcher.
   * Receives: text, criterion
   */
  toSatisfyCriteria?: string;
}

/**
 * API keys for each provider.
 * Only provide keys for the providers you intend to use.
 */
export interface VibeMatchApiKeys {
  /**
   * OpenAI API key.
   * Required if using openai models.
   */
  openai?: string;

  /**
   * Anthropic API key.
   * Required if using anthropic models.
   */
  anthropic?: string;

  /**
   * Google Generative AI API key.
   * Required if using google models.
   */
  google?: string;

  /**
   * Mistral API key.
   * Required if using mistral models.
   */
  mistral?: string;

  /**
   * xAI API key.
   * Required if using xai models.
   */
  xai?: string;
}

/**
 * Configuration for vibe-match
 *
 * Models are specified as strings in the format "provider:model-name".
 *
 * @example
 * ```typescript
 * const config: VibeMatchConfig = {
 *   apiKeys: {
 *     openai: process.env.OPENAI_API_KEY,
 *   },
 *   languageModel: "openai:gpt-4o-mini",
 *   embeddingModel: "openai:text-embedding-3-small",
 * };
 * ```
 */
export interface VibeMatchStringConfig {
  /**
   * API keys for each provider.
   * Only provide keys for the providers you intend to use.
   */
  apiKeys: VibeMatchApiKeys;
  /**
   * The language model to use for semantic matching.
   *
   * Format: "provider:model-name"
   *
   * Supported providers: openai, anthropic, google, mistral, xai
   *
   * @example "openai:gpt-4o-mini"
   * @example "anthropic:claude-sonnet-4-20250514"
   * @example "google:gemini-2.0-flash"
   */
  languageModel: LanguageModelString;

  /**
   * The embedding model to use for vector similarity.
   *
   * Format: "provider:model-name"
   *
   * Supported providers: openai, google, mistral
   * (anthropic and xai do not provide embedding models)
   *
   * @example "openai:text-embedding-3-small"
   * @example "google:text-embedding-004"
   */
  embeddingModel: EmbeddingModelString;

  /**
   * Optional prompt overrides for each matcher.
   * These serve as defaults that can be further overridden per-call.
   */
  prompts?: VibeMatchPrompts;
}

/**
 * Configuration for vibe-match using custom AI SDK model instances.
 *
 * Use this when you need to use a custom provider, OpenAI-compatible API,
 * or configure models with custom options.
 *
 * @example
 * ```typescript
 * import { createOpenAI } from "@ai-sdk/openai";
 *
 * // Use OpenRouter with custom models
 * const openrouter = createOpenAI({
 *   baseURL: "https://openrouter.ai/api/v1",
 *   apiKey: process.env.OPENROUTER_API_KEY,
 * });
 *
 * const config: VibeMatchConfig = {
 *   languageModel: openrouter("anthropic/claude-sonnet-4"),
 *   embeddingModel: openrouter.embedding("openai/text-embedding-3-small"),
 * };
 * ```
 */
export interface VibeMatchCustomModelConfig {
  /**
   * A custom language model instance from the AI SDK.
   *
   * Create using any AI SDK provider (built-in or custom).
   *
   * @example
   * ```typescript
   * import { createOpenAI } from "@ai-sdk/openai";
   * const openai = createOpenAI({ apiKey: "..." });
   * const languageModel = openai("gpt-4o-mini");
   * ```
   */
  languageModel: LanguageModelV1;

  /**
   * A custom embedding model instance from the AI SDK.
   *
   * Create using any AI SDK provider that supports embeddings.
   *
   * @example
   * ```typescript
   * import { createOpenAI } from "@ai-sdk/openai";
   * const openai = createOpenAI({ apiKey: "..." });
   * const embeddingModel = openai.embedding("text-embedding-3-small");
   * ```
   */
  embeddingModel: EmbeddingModel<string>;

  /**
   * Optional prompt overrides for each matcher.
   * These serve as defaults that can be further overridden per-call.
   */
  prompts?: VibeMatchPrompts;
}

/**
 * Configuration for vibe-match.
 *
 * Supports two configuration styles:
 *
 * 1. **String-based** (built-in providers): Use model strings like "openai:gpt-4o-mini"
 *    with API keys for automatic model resolution.
 *
 * 2. **Custom models**: Pass AI SDK model instances directly for custom providers,
 *    OpenAI-compatible APIs (OpenRouter, Together AI, etc.), or advanced configuration.
 *
 * @example String-based configuration
 * ```typescript
 * const config: VibeMatchConfig = {
 *   apiKeys: { openai: process.env.OPENAI_API_KEY },
 *   languageModel: "openai:gpt-4o-mini",
 *   embeddingModel: "openai:text-embedding-3-small",
 * };
 * ```
 *
 * @example Custom model configuration
 * ```typescript
 * import { createOpenAI } from "@ai-sdk/openai";
 *
 * const openrouter = createOpenAI({
 *   baseURL: "https://openrouter.ai/api/v1",
 *   apiKey: process.env.OPENROUTER_API_KEY,
 * });
 *
 * const config: VibeMatchConfig = {
 *   languageModel: openrouter("anthropic/claude-sonnet-4"),
 *   embeddingModel: openrouter.embedding("openai/text-embedding-3-small"),
 * };
 * ```
 */
export type VibeMatchConfig =
  | VibeMatchStringConfig
  | VibeMatchCustomModelConfig;

/**
 * Internal resolved configuration with actual model instances.
 * Used by matchers after string configs are resolved.
 */
export interface ResolvedVibeMatchConfig {
  languageModel: LanguageModelV1;
  embeddingModel: EmbeddingModel<string>;
  prompts?: VibeMatchPrompts;
}

export type VibeMatcher<T extends any[]> = (
  config: ResolvedVibeMatchConfig,
) => MatcherFunction<T>;
