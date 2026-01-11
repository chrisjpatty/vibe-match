import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { xai } from "@ai-sdk/xai";
import { generateObject, type LanguageModelV1 } from "ai";
import { z } from "zod";
import type { VibeMatchConfig } from "vibe-match";

// Choose your provider: "openai" | "anthropic" | "google" | "mistral" | "xai"
const provider = (process.env.VIBE_PROVIDER ?? "openai") as
  | "openai"
  | "anthropic"
  | "google"
  | "mistral"
  | "xai";

// Language models by provider
const languageModels: Record<string, LanguageModelV1> = {
  openai: openai("gpt-4o-mini"),
  anthropic: anthropic("claude-sonnet-4-20250514"),
  google: google("gemini-2.0-flash"),
  mistral: mistral("mistral-small-latest"),
  xai: xai("grok-2-1212"),
};

export const languageModel = languageModels[provider]!;

// vibe-match configuration using string-based model references
const vibeConfigs: Record<string, VibeMatchConfig> = {
  openai: {
    apiKeys: {
      openai: process.env.OPENAI_API_KEY,
    },
    languageModel: "openai:gpt-4o-mini",
    embeddingModel: "openai:text-embedding-3-small",
  },
  anthropic: {
    apiKeys: {
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY, // For embeddings
    },
    languageModel: "anthropic:claude-sonnet-4-20250514",
    embeddingModel: "openai:text-embedding-3-small", // Anthropic doesn't have embeddings
  },
  google: {
    apiKeys: {
      google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    },
    languageModel: "google:gemini-2.0-flash",
    embeddingModel: "google:text-embedding-004",
  },
  mistral: {
    apiKeys: {
      mistral: process.env.MISTRAL_API_KEY,
    },
    languageModel: "mistral:mistral-small-latest",
    embeddingModel: "mistral:mistral-embed",
  },
  xai: {
    apiKeys: {
      xai: process.env.XAI_API_KEY,
      openai: process.env.OPENAI_API_KEY, // For embeddings
    },
    languageModel: "xai:grok-2-1212",
    embeddingModel: "openai:text-embedding-3-small", // xAI doesn't have embeddings
  },
};

// Export config for vibeMatchers
export const vibeConfig: VibeMatchConfig = vibeConfigs[provider]!;

const TitleGeneration = z.object({
  title: z.string(),
});

export const generateTitle = async (prompt: string) => {
  const { object } = await generateObject({
    model: languageModel,
    schema: TitleGeneration,
    system: `You are a helpful assistant that generates titles for blog posts. The title should be short and no more than 6 words. You will be given the article brief and you need to generate a title for the article. You should always try to infer brand names from the article brief even if they are not explicitly mentioned. You MUST ALWAYS mention at least one well known brand name in the title.`,
    prompt,
    temperature: 0.2,
  });

  return object.title;
};
