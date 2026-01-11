import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  toBeSimilarTo,
  DEFAULT_SIMILARITY_PROMPT,
} from "../../src/matchers/toBeSimilarTo";
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

describe("toBeSimilarTo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.log in tests
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("input validation", () => {
    it("should throw when actual is not a string", async () => {
      const matcher = toBeSimilarTo(createMockConfig());

      await expect(
        matcher.call(createMatcherContext(), 123, "expected"),
      ).rejects.toThrow("You must compare against a string");
    });

    it("should throw when expected is not a string", async () => {
      const matcher = toBeSimilarTo(createMockConfig());

      await expect(
        matcher.call(createMatcherContext(), "actual", 456),
      ).rejects.toThrow("You must compare against a string");
    });

    it("should throw when both are not strings", async () => {
      const matcher = toBeSimilarTo(createMockConfig());

      await expect(
        matcher.call(createMatcherContext(), null, undefined),
      ).rejects.toThrow("You must compare against a string");
    });
  });

  describe("sampling behavior", () => {
    it("should make 5 LLM calls by default", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Similar" },
      } as any);

      const matcher = toBeSimilarTo(createMockConfig());
      await matcher.call(createMatcherContext(), "hello", "hi");

      expect(generateObject).toHaveBeenCalledTimes(5);
    });

    it("should respect custom samples option", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Similar" },
      } as any);

      const matcher = toBeSimilarTo(createMockConfig());
      await matcher.call(createMatcherContext(), "hello", "hi", { samples: 3 });

      expect(generateObject).toHaveBeenCalledTimes(3);
    });

    it("should run samples in parallel", async () => {
      const callOrder: number[] = [];
      let callCount = 0;

      vi.mocked(generateObject).mockImplementation(async () => {
        const myCall = ++callCount;
        callOrder.push(myCall);
        // Small delay to simulate async
        await new Promise((r) => setTimeout(r, 10));
        return { object: { pass: true, explanation: "Similar" } } as any;
      });

      const matcher = toBeSimilarTo(createMockConfig());
      await matcher.call(createMatcherContext(), "hello", "hi", { samples: 3 });

      // All calls should start before any finish (parallel execution)
      expect(callOrder).toEqual([1, 2, 3]);
    });
  });

  describe("threshold calculation", () => {
    it("should pass when all samples pass (100% >= 75%)", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Similar" },
      } as any);

      const matcher = toBeSimilarTo(createMockConfig());
      const result = await matcher.call(createMatcherContext(), "hello", "hi", {
        samples: 5,
        threshold: 0.75,
      });

      expect(result.pass).toBe(true);
    });

    it("should pass when exactly at threshold (75% >= 75%)", async () => {
      // 4 out of 5 samples pass = 80%, but let's test 3 out of 4 = 75%
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
          object: { pass: false, explanation: "4" },
        } as any);

      const matcher = toBeSimilarTo(createMockConfig());
      const result = await matcher.call(createMatcherContext(), "hello", "hi", {
        samples: 4,
        threshold: 0.75,
      });

      expect(result.pass).toBe(true);
    });

    it("should fail when below threshold (60% < 75%)", async () => {
      // 3 out of 5 = 60%
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
          object: { pass: false, explanation: "4" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "5" },
        } as any);

      const matcher = toBeSimilarTo(createMockConfig());
      const result = await matcher.call(createMatcherContext(), "hello", "hi", {
        samples: 5,
        threshold: 0.75,
      });

      expect(result.pass).toBe(false);
    });

    it("should fail when all samples fail", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: false, explanation: "Not similar" },
      } as any);

      const matcher = toBeSimilarTo(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "hello",
        "quantum physics",
        {
          samples: 5,
          threshold: 0.75,
        },
      );

      expect(result.pass).toBe(false);
    });

    it("should respect custom threshold", async () => {
      // 2 out of 5 = 40%, threshold 0.3 should pass
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

      const matcher = toBeSimilarTo(createMockConfig());
      const result = await matcher.call(createMatcherContext(), "hello", "hi", {
        samples: 5,
        threshold: 0.3,
      });

      expect(result.pass).toBe(true);
    });
  });

  describe("similarity levels", () => {
    it("should pass level to LLM call", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Similar" },
      } as any);

      const matcher = toBeSimilarTo(createMockConfig());
      await matcher.call(createMatcherContext(), "hello", "hi", {
        level: "strict",
        samples: 1,
      });

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('"level":"strict"'),
        }),
      );
    });

    it("should default to normal level", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Similar" },
      } as any);

      const matcher = toBeSimilarTo(createMockConfig());
      await matcher.call(createMatcherContext(), "hello", "hi", { samples: 1 });

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('"level":"normal"'),
        }),
      );
    });

    it("should support loose level", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Similar" },
      } as any);

      const matcher = toBeSimilarTo(createMockConfig());
      await matcher.call(createMatcherContext(), "hello", "hi", {
        level: "loose",
        samples: 1,
      });

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('"level":"loose"'),
        }),
      );
    });
  });

  describe("prompt resolution", () => {
    it("should use default prompt when no overrides", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Similar" },
      } as any);

      const matcher = toBeSimilarTo(createMockConfig());
      await matcher.call(createMatcherContext(), "hello", "hi", { samples: 1 });

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          system: DEFAULT_SIMILARITY_PROMPT,
        }),
      );
    });

    it("should use global config prompt over default", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Similar" },
      } as any);

      const config = createMockConfig({
        toBeSimilarTo: "Global custom prompt",
      });
      const matcher = toBeSimilarTo(config);
      await matcher.call(createMatcherContext(), "hello", "hi", { samples: 1 });

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          system: "Global custom prompt",
        }),
      );
    });

    it("should use per-call prompt over global config", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Similar" },
      } as any);

      const config = createMockConfig({
        toBeSimilarTo: "Global custom prompt",
      });
      const matcher = toBeSimilarTo(config);
      await matcher.call(createMatcherContext(), "hello", "hi", {
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

  describe("message formatting", () => {
    it("should include pass percentage in message", async () => {
      // 3 out of 5 = 60%
      vi.mocked(generateObject)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "Yes 1" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "Yes 2" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "Yes 3" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "No 4" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "No 5" },
        } as any);

      const matcher = toBeSimilarTo(createMockConfig());
      const result = await matcher.call(createMatcherContext(), "hello", "hi", {
        samples: 5,
      });

      const message = result.message();
      expect(message).toContain("60%");
      expect(message).toContain("5 tests");
    });

    it("should include explanations in message", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "These are semantically similar" },
      } as any);

      const matcher = toBeSimilarTo(createMockConfig());
      const result = await matcher.call(createMatcherContext(), "hello", "hi", {
        samples: 1,
      });

      const message = result.message();
      expect(message).toContain("These are semantically similar");
    });
  });
});
