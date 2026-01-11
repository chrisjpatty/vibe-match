import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  toMention,
  DEFAULT_MENTION_PROMPT,
} from "../../src/matchers/toMention";
import type { ResolvedVibeMatchConfig } from "../../src/types";
import {
  createMockLanguageModel,
  createMockEmbeddingModel,
  createMatcherContext,
} from "../mocks/ai";

// Mock generateObject from AI SDK
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

import { generateObject } from "ai";

const createMockConfig = (
  prompts?: ResolvedVibeMatchConfig["prompts"],
): ResolvedVibeMatchConfig => ({
  languageModel: createMockLanguageModel(),
  embeddingModel: createMockEmbeddingModel(),
  prompts,
});

describe("toMention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("input validation", () => {
    it("should throw when actual is not a string", async () => {
      const matcher = toMention(createMockConfig());

      await expect(
        matcher.call(createMatcherContext(), 123, "concept"),
      ).rejects.toThrow("You must compare against a string");
    });

    it("should throw when concept is not a string", async () => {
      const matcher = toMention(createMockConfig());

      await expect(
        matcher.call(createMatcherContext(), "text", { concept: "obj" }),
      ).rejects.toThrow("You must compare against a string");
    });
  });

  describe("sampling behavior", () => {
    it("should make 5 LLM calls by default", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Mentions it" },
      } as any);

      const matcher = toMention(createMockConfig());
      await matcher.call(
        createMatcherContext(),
        "The red clown mascot",
        "McDonald's",
      );

      expect(generateObject).toHaveBeenCalledTimes(5);
    });

    it("should respect custom samples option", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Mentions it" },
      } as any);

      const matcher = toMention(createMockConfig());
      await matcher.call(createMatcherContext(), "text", "concept", {
        samples: 7,
      });

      expect(generateObject).toHaveBeenCalledTimes(7);
    });
  });

  describe("threshold calculation", () => {
    it("should pass when threshold is met", async () => {
      // 4 out of 5 = 80%
      vi.mocked(generateObject)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "1" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "2" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "3" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "4" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "5" },
        } as any);

      const matcher = toMention(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "The golden arches",
        "McDonald's",
        { samples: 5, threshold: 0.75 },
      );

      expect(result.pass).toBe(true);
    });

    it("should fail when below threshold", async () => {
      // 2 out of 5 = 40%
      vi.mocked(generateObject)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "1" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "2" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "3" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "4" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "5" },
        } as any);

      const matcher = toMention(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "Some text",
        "Unrelated concept",
        { samples: 5, threshold: 0.75 },
      );

      expect(result.pass).toBe(false);
    });
  });

  describe("prompt resolution", () => {
    it("should use default prompt when no overrides", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Mentions it" },
      } as any);

      const matcher = toMention(createMockConfig());
      await matcher.call(createMatcherContext(), "text", "concept", {
        samples: 1,
      });

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          system: DEFAULT_MENTION_PROMPT,
        }),
      );
    });

    it("should use global config prompt over default", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Mentions it" },
      } as any);

      const config = createMockConfig({ toMention: "Custom mention prompt" });
      const matcher = toMention(config);
      await matcher.call(createMatcherContext(), "text", "concept", {
        samples: 1,
      });

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          system: "Custom mention prompt",
        }),
      );
    });

    it("should use per-call prompt over global config", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Mentions it" },
      } as any);

      const config = createMockConfig({ toMention: "Global prompt" });
      const matcher = toMention(config);
      await matcher.call(createMatcherContext(), "text", "concept", {
        samples: 1,
        systemPrompt: "Per-call prompt",
      });

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          system: "Per-call prompt",
        }),
      );
    });
  });

  describe("LLM call format", () => {
    it("should send actual and concept in prompt", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Mentions it" },
      } as any);

      const matcher = toMention(createMockConfig());
      await matcher.call(
        createMatcherContext(),
        "The red clown",
        "McDonald's",
        {
          samples: 1,
        },
      );

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("The red clown"),
        }),
      );
      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("McDonald's"),
        }),
      );
    });
  });

  describe("message formatting", () => {
    it("should include pass percentage and sample count", async () => {
      vi.mocked(generateObject)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "Yes" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "Yes" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "No" },
        } as any);

      const matcher = toMention(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "text",
        "concept",
        {
          samples: 3,
        },
      );

      const message = result.message();
      // 2 out of 3 ≈ 66.67%
      expect(message).toMatch(/66\.?\d*%/);
      expect(message).toContain("3 tests");
    });
  });
});
