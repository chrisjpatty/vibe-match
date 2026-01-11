import { describe, it, expect, vi, beforeEach } from "vitest";
import { toBeVectorSimilarTo } from "../../src/matchers/toBeVectorSimilarTo";
import type { ResolvedVibeMatchConfig } from "../../src/types";
import {
  createMockLanguageModel,
  createMockEmbeddingModel,
  createMatcherContext,
  createEmbedManyResult,
} from "../mocks/ai";

// Mock AI SDK
vi.mock("ai", () => ({
  embedMany: vi.fn(),
  cosineSimilarity: vi.fn(),
}));

import { embedMany, cosineSimilarity } from "ai";

const createMockConfig = (): ResolvedVibeMatchConfig => ({
  languageModel: createMockLanguageModel(),
  embeddingModel: createMockEmbeddingModel(),
});

describe("toBeVectorSimilarTo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("input validation", () => {
    it("should throw when actual is not a string", async () => {
      const matcher = toBeVectorSimilarTo(createMockConfig());

      await expect(
        matcher.call(createMatcherContext(), 123, "expected"),
      ).rejects.toThrow("Both actual and expected must be strings");
    });

    it("should throw when expected is not a string", async () => {
      const matcher = toBeVectorSimilarTo(createMockConfig());

      await expect(
        matcher.call(createMatcherContext(), "actual", 456),
      ).rejects.toThrow("Both actual and expected must be strings");
    });

    it("should throw when embeddings fail to generate", async () => {
      vi.mocked(embedMany).mockResolvedValue(createEmbedManyResult([]));

      const matcher = toBeVectorSimilarTo(createMockConfig());

      await expect(
        matcher.call(createMatcherContext(), "actual", "expected"),
      ).rejects.toThrow("Failed to generate embeddings");
    });

    it("should throw when only one embedding is generated", async () => {
      vi.mocked(embedMany).mockResolvedValue(
        createEmbedManyResult([[0.1, 0.2, 0.3]]),
      );

      const matcher = toBeVectorSimilarTo(createMockConfig());

      await expect(
        matcher.call(createMatcherContext(), "actual", "expected"),
      ).rejects.toThrow("Failed to generate embeddings");
    });
  });

  describe("embedding behavior", () => {
    it("should batch both texts in a single embedMany call", async () => {
      vi.mocked(embedMany).mockResolvedValue(
        createEmbedManyResult([
          [0.1, 0.2, 0.3],
          [0.1, 0.2, 0.3],
        ]),
      );
      vi.mocked(cosineSimilarity).mockReturnValue(0.95);

      const config = createMockConfig();
      const matcher = toBeVectorSimilarTo(config);
      await matcher.call(
        createMatcherContext(),
        "actual text",
        "expected text",
      );

      expect(embedMany).toHaveBeenCalledTimes(1);
      expect(embedMany).toHaveBeenCalledWith({
        model: config.embeddingModel,
        values: ["actual text", "expected text"],
      });
    });
  });

  describe("threshold comparison", () => {
    it("should pass when similarity meets threshold", async () => {
      vi.mocked(embedMany).mockResolvedValue(
        createEmbedManyResult([
          [1, 0, 0],
          [0.9, 0.1, 0],
        ]),
      );
      vi.mocked(cosineSimilarity).mockReturnValue(0.9);

      const matcher = toBeVectorSimilarTo(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "bread baking",
        "baking bread",
        { threshold: 0.85 },
      );

      expect(result.pass).toBe(true);
    });

    it("should pass when similarity equals threshold exactly", async () => {
      vi.mocked(embedMany).mockResolvedValue(
        createEmbedManyResult([
          [1, 0, 0],
          [0.85, 0.15, 0],
        ]),
      );
      vi.mocked(cosineSimilarity).mockReturnValue(0.85);

      const matcher = toBeVectorSimilarTo(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "bread baking",
        "baking bread",
        { threshold: 0.85 },
      );

      expect(result.pass).toBe(true);
    });

    it("should fail when similarity is below threshold", async () => {
      vi.mocked(embedMany).mockResolvedValue(
        createEmbedManyResult([
          [1, 0, 0],
          [0, 1, 0],
        ]),
      );
      vi.mocked(cosineSimilarity).mockReturnValue(0.3);

      const matcher = toBeVectorSimilarTo(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "cats",
        "quantum physics",
        { threshold: 0.85 },
      );

      expect(result.pass).toBe(false);
    });

    it("should default to 0.85 threshold", async () => {
      vi.mocked(embedMany).mockResolvedValue(
        createEmbedManyResult([
          [1, 0, 0],
          [0.8, 0.2, 0],
        ]),
      );
      vi.mocked(cosineSimilarity).mockReturnValue(0.84);

      const matcher = toBeVectorSimilarTo(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "text a",
        "text b",
        // No threshold specified
      );

      expect(result.pass).toBe(false);
    });

    it("should respect custom threshold", async () => {
      vi.mocked(embedMany).mockResolvedValue(
        createEmbedManyResult([
          [1, 0, 0],
          [0.5, 0.5, 0],
        ]),
      );
      vi.mocked(cosineSimilarity).mockReturnValue(0.6);

      const matcher = toBeVectorSimilarTo(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "somewhat similar",
        "kind of related",
        { threshold: 0.5 },
      );

      expect(result.pass).toBe(true);
    });
  });

  describe("message formatting", () => {
    it("should include similarity score in pass message", async () => {
      vi.mocked(embedMany).mockResolvedValue(
        createEmbedManyResult([
          [1, 0, 0],
          [0.95, 0.05, 0],
        ]),
      );
      vi.mocked(cosineSimilarity).mockReturnValue(0.9523);

      const matcher = toBeVectorSimilarTo(createMockConfig());
      const result = await matcher.call(createMatcherContext(), "hello", "hi", {
        threshold: 0.85,
      });

      const message = result.message();
      expect(message).toContain("0.9523");
      expect(message).toContain("meets threshold");
      expect(message).toContain("0.85");
    });

    it("should include actual and expected in fail message", async () => {
      vi.mocked(embedMany).mockResolvedValue(
        createEmbedManyResult([
          [1, 0, 0],
          [0, 1, 0],
        ]),
      );
      vi.mocked(cosineSimilarity).mockReturnValue(0.25);

      const matcher = toBeVectorSimilarTo(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "cats are great",
        "quantum physics papers",
        { threshold: 0.85 },
      );

      const message = result.message();
      expect(message).toContain("below threshold");
      expect(message).toContain("cats are great");
      expect(message).toContain("quantum physics papers");
    });
  });

  describe("cosine similarity calculation", () => {
    it("should pass embeddings to cosineSimilarity function", async () => {
      const embedding1 = [0.1, 0.2, 0.3, 0.4];
      const embedding2 = [0.4, 0.3, 0.2, 0.1];

      vi.mocked(embedMany).mockResolvedValue(
        createEmbedManyResult([embedding1, embedding2]),
      );
      vi.mocked(cosineSimilarity).mockReturnValue(0.9);

      const matcher = toBeVectorSimilarTo(createMockConfig());
      await matcher.call(createMatcherContext(), "text a", "text b");

      expect(cosineSimilarity).toHaveBeenCalledWith(embedding1, embedding2);
    });
  });
});
