import { embedMany, cosineSimilarity } from "ai";
import type { VibeMatcher } from "../types";

export interface VectorSimilarityOptions {
  /**
   * The minimum cosine similarity score required to pass (0-1).
   * @default 0.85
   */
  threshold?: number;
}

export const toBeVectorSimilarTo: VibeMatcher<
  [expected: unknown, options?: VectorSimilarityOptions]
> = (config) =>
  async function (actual, expected, options: VectorSimilarityOptions = {}) {
    const { threshold = 0.85 } = options;

    if (typeof actual !== "string" || typeof expected !== "string") {
      throw new Error("Both actual and expected must be strings");
    }

    // Fetch both embeddings in a single batch for efficiency
    const { embeddings } = await embedMany({
      model: config.embeddingModel,
      values: [actual, expected],
    });

    const [actualEmbedding, expectedEmbedding] = embeddings;
    if (!actualEmbedding || !expectedEmbedding) {
      throw new Error("Failed to generate embeddings");
    }

    const similarity = cosineSimilarity(actualEmbedding, expectedEmbedding);
    const pass = similarity >= threshold;

    return {
      message: () =>
        pass
          ? `Cosine similarity ${similarity.toFixed(4)} meets threshold ${threshold}`
          : `Cosine similarity ${similarity.toFixed(4)} is below threshold ${threshold}\n\nActual: "${actual}"\nExpected: "${expected}"`,
      pass,
    };
  };
