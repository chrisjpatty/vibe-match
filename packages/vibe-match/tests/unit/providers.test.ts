import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveLanguageModel,
  resolveEmbeddingModel,
} from "../../src/providers";
import type { VibeMatchApiKeys } from "../../src/types";

// Mock all the AI SDK provider packages
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() =>
    Object.assign(
      vi.fn(() => ({ provider: "openai", modelId: "test" })),
      {
        embedding: vi.fn(() => ({
          provider: "openai",
          modelId: "test-embedding",
        })),
      },
    ),
  ),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() =>
    vi.fn(() => ({ provider: "anthropic", modelId: "test" })),
  ),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() =>
    Object.assign(
      vi.fn(() => ({ provider: "google", modelId: "test" })),
      {
        textEmbeddingModel: vi.fn(() => ({
          provider: "google",
          modelId: "test-embedding",
        })),
      },
    ),
  ),
}));

vi.mock("@ai-sdk/mistral", () => ({
  createMistral: vi.fn(() =>
    Object.assign(
      vi.fn(() => ({ provider: "mistral", modelId: "test" })),
      {
        textEmbeddingModel: vi.fn(() => ({
          provider: "mistral",
          modelId: "test-embedding",
        })),
      },
    ),
  ),
}));

vi.mock("@ai-sdk/xai", () => ({
  createXai: vi.fn(() => vi.fn(() => ({ provider: "xai", modelId: "test" }))),
}));

describe("providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveLanguageModel", () => {
    describe("model string parsing", () => {
      it("should throw for invalid model string without colon", () => {
        const apiKeys: VibeMatchApiKeys = { openai: "test-key" };

        expect(() => resolveLanguageModel("invalid" as any, apiKeys)).toThrow(
          'Invalid model string "invalid". Expected format: "provider:model"',
        );
      });

      it("should throw for unknown provider", () => {
        const apiKeys: VibeMatchApiKeys = {};

        expect(() =>
          resolveLanguageModel("unknown:model" as any, apiKeys),
        ).toThrow('Unknown provider "unknown"');
      });

      it("should correctly parse provider and model name", async () => {
        const { createOpenAI } = await import("@ai-sdk/openai");
        const apiKeys: VibeMatchApiKeys = { openai: "test-key" };

        resolveLanguageModel("openai:gpt-4o-mini", apiKeys);

        expect(createOpenAI).toHaveBeenCalledWith({ apiKey: "test-key" });
        const mockOpenAI = vi.mocked(createOpenAI).mock.results[0]?.value;
        expect(mockOpenAI).toHaveBeenCalledWith("gpt-4o-mini");
      });

      it("should handle model names with colons", async () => {
        const { createOpenAI } = await import("@ai-sdk/openai");
        const apiKeys: VibeMatchApiKeys = { openai: "test-key" };

        // Model names could theoretically contain colons
        resolveLanguageModel("openai:gpt-4:custom-version" as any, apiKeys);

        const mockOpenAI = vi.mocked(createOpenAI).mock.results[0]?.value;
        expect(mockOpenAI).toHaveBeenCalledWith("gpt-4:custom-version");
      });
    });

    describe("OpenAI provider", () => {
      it("should throw when OpenAI API key is missing", () => {
        const apiKeys: VibeMatchApiKeys = {};

        expect(() =>
          resolveLanguageModel("openai:gpt-4o-mini", apiKeys),
        ).toThrow("OpenAI API key is required");
      });

      it("should create OpenAI model with valid key", async () => {
        const { createOpenAI } = await import("@ai-sdk/openai");
        const apiKeys: VibeMatchApiKeys = { openai: "sk-test-key" };

        const result = resolveLanguageModel("openai:gpt-4o-mini", apiKeys);

        expect(createOpenAI).toHaveBeenCalledWith({ apiKey: "sk-test-key" });
        expect(result).toHaveProperty("provider", "openai");
      });
    });

    describe("Anthropic provider", () => {
      it("should throw when Anthropic API key is missing", () => {
        const apiKeys: VibeMatchApiKeys = {};

        expect(() =>
          resolveLanguageModel("anthropic:claude-sonnet-4-20250514", apiKeys),
        ).toThrow("Anthropic API key is required");
      });

      it("should create Anthropic model with valid key", async () => {
        const { createAnthropic } = await import("@ai-sdk/anthropic");
        const apiKeys: VibeMatchApiKeys = { anthropic: "sk-ant-test" };

        const result = resolveLanguageModel(
          "anthropic:claude-sonnet-4-20250514",
          apiKeys,
        );

        expect(createAnthropic).toHaveBeenCalledWith({ apiKey: "sk-ant-test" });
        expect(result).toHaveProperty("provider", "anthropic");
      });
    });

    describe("Google provider", () => {
      it("should throw when Google API key is missing", () => {
        const apiKeys: VibeMatchApiKeys = {};

        expect(() =>
          resolveLanguageModel("google:gemini-2.0-flash", apiKeys),
        ).toThrow("Google API key is required");
      });

      it("should create Google model with valid key", async () => {
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
        const apiKeys: VibeMatchApiKeys = { google: "google-key" };

        const result = resolveLanguageModel("google:gemini-2.0-flash", apiKeys);

        expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
          apiKey: "google-key",
        });
        expect(result).toHaveProperty("provider", "google");
      });
    });

    describe("Mistral provider", () => {
      it("should throw when Mistral API key is missing", () => {
        const apiKeys: VibeMatchApiKeys = {};

        expect(() =>
          resolveLanguageModel("mistral:mistral-small-latest", apiKeys),
        ).toThrow("Mistral API key is required");
      });

      it("should create Mistral model with valid key", async () => {
        const { createMistral } = await import("@ai-sdk/mistral");
        const apiKeys: VibeMatchApiKeys = { mistral: "mistral-key" };

        const result = resolveLanguageModel(
          "mistral:mistral-small-latest",
          apiKeys,
        );

        expect(createMistral).toHaveBeenCalledWith({ apiKey: "mistral-key" });
        expect(result).toHaveProperty("provider", "mistral");
      });
    });

    describe("xAI provider", () => {
      it("should throw when xAI API key is missing", () => {
        const apiKeys: VibeMatchApiKeys = {};

        expect(() => resolveLanguageModel("xai:grok-2-1212", apiKeys)).toThrow(
          "xAI API key is required",
        );
      });

      it("should create xAI model with valid key", async () => {
        const { createXai } = await import("@ai-sdk/xai");
        const apiKeys: VibeMatchApiKeys = { xai: "xai-key" };

        const result = resolveLanguageModel("xai:grok-2-1212", apiKeys);

        expect(createXai).toHaveBeenCalledWith({ apiKey: "xai-key" });
        expect(result).toHaveProperty("provider", "xai");
      });
    });
  });

  describe("resolveEmbeddingModel", () => {
    describe("model string parsing", () => {
      it("should throw for unsupported embedding providers", () => {
        const apiKeys: VibeMatchApiKeys = { anthropic: "key" };

        // Anthropic doesn't support embeddings
        expect(() =>
          resolveEmbeddingModel("anthropic:model" as any, apiKeys),
        ).toThrow('Unknown provider "anthropic"');
      });

      it("should throw for xAI (no embedding support)", () => {
        const apiKeys: VibeMatchApiKeys = { xai: "key" };

        expect(() =>
          resolveEmbeddingModel("xai:model" as any, apiKeys),
        ).toThrow('Unknown provider "xai"');
      });
    });

    describe("OpenAI embeddings", () => {
      it("should throw when OpenAI API key is missing", () => {
        const apiKeys: VibeMatchApiKeys = {};

        expect(() =>
          resolveEmbeddingModel("openai:text-embedding-3-small", apiKeys),
        ).toThrow("OpenAI API key is required");
      });

      it("should create OpenAI embedding model with valid key", async () => {
        const { createOpenAI } = await import("@ai-sdk/openai");
        const apiKeys: VibeMatchApiKeys = { openai: "sk-test" };

        const result = resolveEmbeddingModel(
          "openai:text-embedding-3-small",
          apiKeys,
        );

        expect(createOpenAI).toHaveBeenCalledWith({ apiKey: "sk-test" });
        expect(result).toHaveProperty("provider", "openai");
      });
    });

    describe("Google embeddings", () => {
      it("should throw when Google API key is missing", () => {
        const apiKeys: VibeMatchApiKeys = {};

        expect(() =>
          resolveEmbeddingModel("google:text-embedding-004", apiKeys),
        ).toThrow("Google API key is required");
      });

      it("should create Google embedding model with valid key", async () => {
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
        const apiKeys: VibeMatchApiKeys = { google: "google-key" };

        const result = resolveEmbeddingModel(
          "google:text-embedding-004",
          apiKeys,
        );

        expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
          apiKey: "google-key",
        });
        expect(result).toHaveProperty("provider", "google");
      });
    });

    describe("Mistral embeddings", () => {
      it("should throw when Mistral API key is missing", () => {
        const apiKeys: VibeMatchApiKeys = {};

        expect(() =>
          resolveEmbeddingModel("mistral:mistral-embed", apiKeys),
        ).toThrow("Mistral API key is required");
      });

      it("should create Mistral embedding model with valid key", async () => {
        const { createMistral } = await import("@ai-sdk/mistral");
        const apiKeys: VibeMatchApiKeys = { mistral: "mistral-key" };

        const result = resolveEmbeddingModel("mistral:mistral-embed", apiKeys);

        expect(createMistral).toHaveBeenCalledWith({ apiKey: "mistral-key" });
        expect(result).toHaveProperty("provider", "mistral");
      });
    });
  });
});
