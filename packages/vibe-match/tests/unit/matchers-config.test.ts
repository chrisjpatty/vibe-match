import { describe, it, expect, vi, beforeEach } from "vitest";
import { vibeMatchers } from "../../src/matchers";
import type { VibeMatchConfig, VibeMatchStringConfig } from "../../src/types";
import { createMockLanguageModel, createMockEmbeddingModel } from "../mocks/ai";

// Mock the provider resolution
vi.mock("../../src/providers", () => ({
  resolveLanguageModel: vi.fn(() => createMockLanguageModel()),
  resolveEmbeddingModel: vi.fn(() => createMockEmbeddingModel()),
}));

// Mock the individual matchers to avoid their dependencies
vi.mock("../../src/matchers/toBeSimilarTo", () => ({
  toBeSimilarTo: vi.fn(() => vi.fn()),
}));
vi.mock("../../src/matchers/toBeVectorSimilarTo", () => ({
  toBeVectorSimilarTo: vi.fn(() => vi.fn()),
}));
vi.mock("../../src/matchers/toMention", () => ({
  toMention: vi.fn(() => vi.fn()),
}));
vi.mock("../../src/matchers/toSatisfyCriteria", () => ({
  toSatisfyCriteria: vi.fn(() => vi.fn()),
}));

describe("vibeMatchers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("return value", () => {
    it("should return an object with all matchers", () => {
      const config: VibeMatchConfig = {
        languageModel: createMockLanguageModel(),
        embeddingModel: createMockEmbeddingModel(),
      };

      const matchers = vibeMatchers(config);

      expect(matchers).toHaveProperty("toBeSimilarTo");
      expect(matchers).toHaveProperty("toBeVectorSimilarTo");
      expect(matchers).toHaveProperty("toMention");
      expect(matchers).toHaveProperty("toSatisfyCriteria");
    });

    it("should return functions for each matcher", () => {
      const config: VibeMatchConfig = {
        languageModel: createMockLanguageModel(),
        embeddingModel: createMockEmbeddingModel(),
      };

      const matchers = vibeMatchers(config);

      expect(typeof matchers.toBeSimilarTo).toBe("function");
      expect(typeof matchers.toBeVectorSimilarTo).toBe("function");
      expect(typeof matchers.toMention).toBe("function");
      expect(typeof matchers.toSatisfyCriteria).toBe("function");
    });
  });

  describe("config resolution", () => {
    it("should resolve string-based config using providers", async () => {
      const { resolveLanguageModel, resolveEmbeddingModel } = await import(
        "../../src/providers"
      );

      const stringConfig: VibeMatchStringConfig = {
        apiKeys: { openai: "test-key" },
        languageModel: "openai:gpt-4o-mini",
        embeddingModel: "openai:text-embedding-3-small",
      };

      vibeMatchers(stringConfig);

      expect(resolveLanguageModel).toHaveBeenCalledWith("openai:gpt-4o-mini", {
        openai: "test-key",
      });
      expect(resolveEmbeddingModel).toHaveBeenCalledWith(
        "openai:text-embedding-3-small",
        { openai: "test-key" },
      );
    });

    it("should use custom model instances directly without resolving", async () => {
      const { resolveLanguageModel, resolveEmbeddingModel } = await import(
        "../../src/providers"
      );

      const customConfig: VibeMatchConfig = {
        languageModel: createMockLanguageModel(),
        embeddingModel: createMockEmbeddingModel(),
      };

      vibeMatchers(customConfig);

      expect(resolveLanguageModel).not.toHaveBeenCalled();
      expect(resolveEmbeddingModel).not.toHaveBeenCalled();
    });

    it("should pass prompts through to matchers", async () => {
      const { toBeSimilarTo } = await import(
        "../../src/matchers/toBeSimilarTo"
      );
      const { toMention } = await import("../../src/matchers/toMention");
      const { toSatisfyCriteria } = await import(
        "../../src/matchers/toSatisfyCriteria"
      );

      const config: VibeMatchConfig = {
        languageModel: createMockLanguageModel(),
        embeddingModel: createMockEmbeddingModel(),
        prompts: {
          toBeSimilarTo: "Custom similarity prompt",
          toMention: "Custom mention prompt",
          toSatisfyCriteria: "Custom criteria prompt",
        },
      };

      vibeMatchers(config);

      // Each matcher should receive the resolved config with prompts
      expect(toBeSimilarTo).toHaveBeenCalledWith(
        expect.objectContaining({
          prompts: expect.objectContaining({
            toBeSimilarTo: "Custom similarity prompt",
          }),
        }),
      );
      expect(toMention).toHaveBeenCalledWith(
        expect.objectContaining({
          prompts: expect.objectContaining({
            toMention: "Custom mention prompt",
          }),
        }),
      );
      expect(toSatisfyCriteria).toHaveBeenCalledWith(
        expect.objectContaining({
          prompts: expect.objectContaining({
            toSatisfyCriteria: "Custom criteria prompt",
          }),
        }),
      );
    });
  });
});
