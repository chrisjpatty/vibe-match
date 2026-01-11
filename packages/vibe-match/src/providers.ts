import type { LanguageModelV1, EmbeddingModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { createXai } from "@ai-sdk/xai";
import type { VibeMatchApiKeys } from "./types";

/**
 * Providers supported by vibe-match for language models.
 */
type LanguageProvider = "openai" | "anthropic" | "google" | "mistral" | "xai";

/**
 * Providers that support embedding models.
 * Note: Anthropic and xAI do not provide embedding models.
 */
type EmbeddingProvider = "openai" | "google" | "mistral";

/**
 * Language model string in the format "provider:model-name".
 *
 * The model name is validated at runtime by the AI SDK provider.
 *
 * @example "openai:gpt-4o-mini"
 * @example "anthropic:claude-sonnet-4-20250514"
 * @example "google:gemini-2.0-flash"
 * @example "mistral:mistral-small-latest"
 * @example "xai:grok-2-1212"
 */
export type LanguageModelString = `${LanguageProvider}:${string}`;

/**
 * Embedding model string in the format "provider:model-name".
 *
 * The model name is validated at runtime by the AI SDK provider.
 * Only openai, google, and mistral support embedding models.
 *
 * @example "openai:text-embedding-3-small"
 * @example "google:text-embedding-004"
 * @example "mistral:mistral-embed"
 */
export type EmbeddingModelString = `${EmbeddingProvider}:${string}`;

function parseModelString<P extends string>(
  modelString: string,
  validProviders: readonly P[],
): { provider: P; model: string } {
  const colonIndex = modelString.indexOf(":");
  if (colonIndex === -1) {
    throw new Error(
      `Invalid model string "${modelString}". Expected format: "provider:model" (e.g., "openai:gpt-4o-mini")`,
    );
  }

  const provider = modelString.slice(0, colonIndex) as P;
  const model = modelString.slice(colonIndex + 1);

  if (!validProviders.includes(provider)) {
    throw new Error(
      `Unknown provider "${provider}". Supported providers: ${validProviders.join(", ")}`,
    );
  }

  return { provider, model };
}

const LANGUAGE_PROVIDERS = [
  "openai",
  "anthropic",
  "google",
  "mistral",
  "xai",
] as const;
const EMBEDDING_PROVIDERS = ["openai", "google", "mistral"] as const;

export function resolveLanguageModel(
  modelString: LanguageModelString,
  apiKeys: VibeMatchApiKeys,
): LanguageModelV1 {
  const { provider, model } = parseModelString(modelString, LANGUAGE_PROVIDERS);

  switch (provider) {
    case "openai": {
      if (!apiKeys.openai) {
        throw new Error(
          "OpenAI API key is required. Provide it in config.apiKeys.openai",
        );
      }
      const openai = createOpenAI({ apiKey: apiKeys.openai });
      return openai(model);
    }
    case "anthropic": {
      if (!apiKeys.anthropic) {
        throw new Error(
          "Anthropic API key is required. Provide it in config.apiKeys.anthropic",
        );
      }
      const anthropic = createAnthropic({ apiKey: apiKeys.anthropic });
      return anthropic(model);
    }
    case "google": {
      if (!apiKeys.google) {
        throw new Error(
          "Google API key is required. Provide it in config.apiKeys.google",
        );
      }
      const google = createGoogleGenerativeAI({ apiKey: apiKeys.google });
      return google(model);
    }
    case "mistral": {
      if (!apiKeys.mistral) {
        throw new Error(
          "Mistral API key is required. Provide it in config.apiKeys.mistral",
        );
      }
      const mistral = createMistral({ apiKey: apiKeys.mistral });
      return mistral(model);
    }
    case "xai": {
      if (!apiKeys.xai) {
        throw new Error(
          "xAI API key is required. Provide it in config.apiKeys.xai",
        );
      }
      const xai = createXai({ apiKey: apiKeys.xai });
      return xai(model);
    }
  }
}

export function resolveEmbeddingModel(
  modelString: EmbeddingModelString,
  apiKeys: VibeMatchApiKeys,
): EmbeddingModel<string> {
  const { provider, model } = parseModelString(
    modelString,
    EMBEDDING_PROVIDERS,
  );

  switch (provider) {
    case "openai": {
      if (!apiKeys.openai) {
        throw new Error(
          "OpenAI API key is required. Provide it in config.apiKeys.openai",
        );
      }
      const openai = createOpenAI({ apiKey: apiKeys.openai });
      return openai.embedding(model);
    }
    case "google": {
      if (!apiKeys.google) {
        throw new Error(
          "Google API key is required. Provide it in config.apiKeys.google",
        );
      }
      const google = createGoogleGenerativeAI({ apiKey: apiKeys.google });
      return google.textEmbeddingModel(model);
    }
    case "mistral": {
      if (!apiKeys.mistral) {
        throw new Error(
          "Mistral API key is required. Provide it in config.apiKeys.mistral",
        );
      }
      const mistral = createMistral({ apiKey: apiKeys.mistral });
      return mistral.textEmbeddingModel(model);
    }
  }
}
