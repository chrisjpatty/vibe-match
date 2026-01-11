import { generateObject, type LanguageModelV1 } from "ai";
import { z } from "zod";
import type { VibeMatcher } from "../types";

/** Re-export for inline model overrides */
export type { LanguageModelV1 };

const SimilarityResponse = z.object({
  pass: z.boolean(),
  explanation: z.string(),
});

export const DEFAULT_SIMILARITY_PROMPT = `You have a singular task. You will be given two strings of text and you need to make a determination if they are meaningfully semantically similar. There are 3 levels of similarity: loose, normal, and strict.

## Loose Matches:
The strings mean roughly the same thing. As long as the main idea gets across, it's a loose match.

Example of a loose match that should pass:
Actual: "I enjoy eating pizza with cheese"
Passing:
- "Cheese pizza is my preference personally"
- "I like pizza with cheese"
- "I love cheese pizza!"
- "Pizza with cheese is my favorite"

Not Passing:
- "Pizza with tomatoes are my favorite" // Doesn't match the original meaning
- "I HATE cheese pizza" // Not the same meaning
- "Cheese pizza" // Not enough information

## Normal Matches:
The strings are more meaningfully similar than loose however there may be some small ambiguities.

Example of a normal match that should pass:
Actual: "There are 1000 people in the room"
Passing:
- "There are one thousand folks in the room"
- "There's 1000 people here"

Not Passing:
- "There are 500 people in the room" // Wrong number
- "There's not 1000 people in the room" // Inverted logic
- "Why are there 1000 people in the room?" // Doesn't match the original meaning

## Strict Matches:
The strings are functionally identical. They do not need to be word for word the same but the meaning should be unambiguously the same and in the same order.

Example of a strict match that should pass:
Actual: "Hi, how are you?"

Passing:
- "Hello, how are you?"
- "Hi, how are you?"
- "Hi, how are you doing?"

Not Passing:
- "Hello sir, what's up?" // Doesn't match the tone
- "Hi" // Too short
- "How are you hello?" // Wrong order

The user will provide the two strings and the level of similarity they want to test. You will use that level of similarity to determine if the two strings pass or fail.`;

const checkSimilarity = async (
  model: LanguageModelV1,
  actual: string,
  similarTo: string,
  level: "loose" | "normal" | "strict",
  systemPrompt: string,
) => {
  const { object } = await generateObject({
    model,
    schema: SimilarityResponse,
    system: systemPrompt,
    prompt: JSON.stringify({
      actual,
      similarTo,
      level,
    }),
  });

  return {
    message: () => object.explanation,
    pass: object.pass,
  };
};

export interface ToBeSimilarToOptions {
  level?: "loose" | "normal" | "strict";
  threshold?: number;
  samples?: number;
  /**
   * Custom system prompt for the LLM. Overrides both the default prompt
   * and any global prompt set in vibeMatchers config.
   */
  systemPrompt?: string;
  /**
   * Override the language model for this specific matcher call.
   * If not provided, uses the model from vibeMatchers config.
   */
  languageModel?: LanguageModelV1;
}

export const toBeSimilarTo: VibeMatcher<
  [similarTo: unknown, options?: ToBeSimilarToOptions]
> = (config) =>
  async function (actual, similarTo, options: ToBeSimilarToOptions = {}) {
    const {
      samples = 5,
      level = "normal",
      threshold = 0.75,
      systemPrompt,
      languageModel,
    } = options;

    // Layered prompt resolution: per-call > global config > default
    const resolvedPrompt =
      systemPrompt ??
      config.prompts?.toBeSimilarTo ??
      DEFAULT_SIMILARITY_PROMPT;

    // Use inline model override if provided, otherwise fall back to config
    const resolvedModel = languageModel ?? config.languageModel;

    if (typeof actual !== "string" || typeof similarTo !== "string") {
      throw new Error("You must compare against a string");
    }

    const results = await Promise.all(
      Array.from({ length: samples }).map(async () => {
        return await checkSimilarity(
          resolvedModel,
          actual,
          similarTo,
          level,
          resolvedPrompt,
        );
      }),
    );

    const numPassing = results.filter((r) => r.pass).length;
    const passRatio = numPassing / samples;
    const passPercentage = passRatio * 100;

    return {
      message: () =>
        `${passPercentage}% of ${samples} tests passed. ${results.map((r) => r.message()).join("\n")}`,
      pass: passRatio >= threshold,
    };
  };
