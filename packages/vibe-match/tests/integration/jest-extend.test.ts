import { describe, it, expect, vi, beforeEach } from "vitest";
import { vibeMatchers } from "../../src/matchers";
import type { VibeMatchConfig } from "../../src/types";
import { createMockLanguageModel, createMockEmbeddingModel } from "../mocks/ai";

// Mock the AI SDK to avoid real API calls
vi.mock("ai", () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: { pass: true, explanation: "Mock pass" },
  }),
  embedMany: vi.fn().mockResolvedValue({
    embeddings: [
      [1, 0, 0],
      [0.95, 0.05, 0],
    ],
  }),
  cosineSimilarity: vi.fn().mockReturnValue(0.95),
}));

describe("Jest Integration", () => {
  const mockConfig: VibeMatchConfig = {
    languageModel: createMockLanguageModel(),
    embeddingModel: createMockEmbeddingModel(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("vibeMatchers return structure", () => {
    it("should return an object suitable for expect.extend", () => {
      const matchers = vibeMatchers(mockConfig);

      // Should be a plain object with function values
      expect(typeof matchers).toBe("object");
      expect(matchers).not.toBeNull();

      // Each matcher should be a function
      expect(typeof matchers.toBeSimilarTo).toBe("function");
      expect(typeof matchers.toMention).toBe("function");
      expect(typeof matchers.toSatisfyCriteria).toBe("function");
      expect(typeof matchers.toBeVectorSimilarTo).toBe("function");
    });

    it("should have matchers that return the correct shape", async () => {
      const matchers = vibeMatchers(mockConfig);

      // Call a matcher directly (simulating what Jest does)
      const result = await matchers.toBeSimilarTo.call(
        { isNot: false, promise: "" } as any,
        "hello",
        "hi",
        { samples: 1 },
      );

      // Jest expects { pass: boolean, message: () => string }
      expect(result).toHaveProperty("pass");
      expect(typeof result.pass).toBe("boolean");
      expect(result).toHaveProperty("message");
      expect(typeof result.message).toBe("function");
      expect(typeof result.message()).toBe("string");
    });
  });

  describe("matcher behavior for Jest", () => {
    it("toBeSimilarTo should be callable as Jest matcher", async () => {
      const matchers = vibeMatchers(mockConfig);

      const result = await matchers.toBeSimilarTo.call(
        { isNot: false, promise: "" } as any,
        "I love pizza",
        "Pizza is my favorite",
        { samples: 1 },
      );

      expect(result).toMatchObject({
        pass: expect.any(Boolean),
        message: expect.any(Function),
      });
    });

    it("toMention should be callable as Jest matcher", async () => {
      const matchers = vibeMatchers(mockConfig);

      const result = await matchers.toMention.call(
        { isNot: false, promise: "" } as any,
        "The golden arches restaurant",
        "McDonald's",
        { samples: 1 },
      );

      expect(result).toMatchObject({
        pass: expect.any(Boolean),
        message: expect.any(Function),
      });
    });

    it("toSatisfyCriteria should be callable as Jest matcher", async () => {
      const matchers = vibeMatchers(mockConfig);

      const result = await matchers.toSatisfyCriteria.call(
        { isNot: false, promise: "" } as any,
        "Hi John, here is your answer.",
        "Addresses user by name",
        { samples: 1 },
      );

      expect(result).toMatchObject({
        pass: expect.any(Boolean),
        message: expect.any(Function),
      });
    });

    it("toBeVectorSimilarTo should be callable as Jest matcher", async () => {
      const matchers = vibeMatchers(mockConfig);

      const result = await matchers.toBeVectorSimilarTo.call(
        { isNot: false, promise: "" } as any,
        "bread baking guide",
        "tutorial on baking bread",
      );

      expect(result).toMatchObject({
        pass: expect.any(Boolean),
        message: expect.any(Function),
      });
    });
  });

  describe(".not modifier support", () => {
    it("matchers should work with isNot context", async () => {
      const matchers = vibeMatchers(mockConfig);

      // When isNot is true, Jest inverts the result
      // The matcher itself doesn't need to handle .not,
      // it just needs to return the correct pass value
      const resultWithNot = await matchers.toBeSimilarTo.call(
        { isNot: true, promise: "" } as any,
        "hello",
        "hi",
        { samples: 1 },
      );

      const resultWithoutNot = await matchers.toBeSimilarTo.call(
        { isNot: false, promise: "" } as any,
        "hello",
        "hi",
        { samples: 1 },
      );

      // Both should return valid results
      // Jest handles the inversion based on isNot
      expect(resultWithNot).toHaveProperty("pass");
      expect(resultWithNot).toHaveProperty("message");
      expect(resultWithoutNot).toHaveProperty("pass");
      expect(resultWithoutNot).toHaveProperty("message");
    });
  });

  describe("async matcher support", () => {
    it("matchers should return promises", () => {
      const matchers = vibeMatchers(mockConfig);

      const result = matchers.toBeSimilarTo.call(
        { isNot: false, promise: "" } as any,
        "hello",
        "hi",
        { samples: 1 },
      );

      // Should be a promise
      expect(result).toBeInstanceOf(Promise);
    });

    it("matchers should be awaitable", async () => {
      const matchers = vibeMatchers(mockConfig);

      // This should not throw
      const result = await matchers.toBeSimilarTo.call(
        { isNot: false, promise: "" } as any,
        "hello",
        "hi",
        { samples: 1 },
      );

      expect(result.pass).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("should throw synchronously for invalid input types", async () => {
      const matchers = vibeMatchers(mockConfig);

      // Invalid input should throw
      await expect(
        matchers.toBeSimilarTo.call(
          { isNot: false, promise: "" } as any,
          123, // not a string
          "hello",
        ),
      ).rejects.toThrow();
    });

    it("should propagate errors from matchers", async () => {
      const matchers = vibeMatchers(mockConfig);

      await expect(
        matchers.toSatisfyCriteria.call(
          { isNot: false, promise: "" } as any,
          "text",
          [], // empty criteria array
        ),
      ).rejects.toThrow("At least one criterion must be provided");
    });
  });

  describe("options handling", () => {
    it("should accept options as third parameter", async () => {
      const matchers = vibeMatchers(mockConfig);

      // Should not throw when options are provided
      const result = await matchers.toBeSimilarTo.call(
        { isNot: false, promise: "" } as any,
        "hello",
        "hi",
        {
          level: "strict",
          threshold: 0.9,
          samples: 3,
        },
      );

      expect(result).toHaveProperty("pass");
    });

    it("should work without options (use defaults)", async () => {
      const matchers = vibeMatchers(mockConfig);

      // Should not throw when no options provided
      const result = await matchers.toBeSimilarTo.call(
        { isNot: false, promise: "" } as any,
        "hello",
        "hi",
      );

      expect(result).toHaveProperty("pass");
    });
  });
});

