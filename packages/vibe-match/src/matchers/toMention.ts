import { generateObject, type LanguageModelV1 } from "ai";
import { z } from "zod";
import type { VibeMatcher } from "../types";

const MentionResponse = z.object({
  pass: z.boolean(),
  explanation: z.string(),
});

export const DEFAULT_MENTION_PROMPT = `You have a singular task. You will be given a text and a concept, and you need to determine if the text mentions the concept.

A text "mentions" a concept if it:
- Directly references the concept by name
- Describes the concept without necessarily naming it
- Alludes to or implies the concept
- Contains synonyms or related terms for the concept

Examples that would PASS:
Text: "I love programming in JavaScript"
Concept: "JavaScript" → PASS (direct mention)

Text: "The cat sat on the mat"
Concept: "animals" → PASS (cat is an animal)

Text: "We need to optimize our database queries"
Concept: "performance" → PASS (optimization implies performance)

Text: "She was feeling blue today"
Concept: "sadness" → PASS (feeling blue implies sadness)

Examples that would FAIL:
Text: "I love programming in JavaScript"
Concept: "Python" → FAIL (different programming language, not mentioned)

Text: "The weather is nice today"
Concept: "sports" → FAIL (no connection to sports)

Be generous but accurate in your interpretation. The goal is to catch meaningful mentions for reliability testing purposes.`;

const checkMention = async (
  model: LanguageModelV1,
  actual: string,
  concept: string,
  systemPrompt: string,
) => {
  const { object } = await generateObject({
    model,
    schema: MentionResponse,
    system: systemPrompt,
    prompt: JSON.stringify({
      actual,
      concept,
    }),
  });

  return {
    message: () => object.explanation,
    pass: object.pass,
  };
};

export interface ToMentionOptions {
  threshold?: number;
  samples?: number;
  /**
   * Custom system prompt for the LLM. Overrides both the default prompt
   * and any global prompt set in vibeMatchers config.
   */
  systemPrompt?: string;
}

export const toMention: VibeMatcher<
  [concept: unknown, options?: ToMentionOptions]
> = (config) =>
  async function (actual, concept, options: ToMentionOptions = {}) {
    const { samples = 5, threshold = 0.75, systemPrompt } = options;

    // Layered prompt resolution: per-call > global config > default
    const resolvedPrompt =
      systemPrompt ?? config.prompts?.toMention ?? DEFAULT_MENTION_PROMPT;

    if (typeof actual !== "string" || typeof concept !== "string") {
      throw new Error("You must compare against a string");
    }

    const results = await Promise.all(
      Array.from({ length: samples }).map(async () => {
        return await checkMention(
          config.languageModel,
          actual,
          concept,
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
