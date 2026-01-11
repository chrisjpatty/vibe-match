import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  toSatisfyCriteria,
  DEFAULT_SATISFY_CRITERIA_PROMPT,
} from "../../src/matchers/toSatisfyCriteria";
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

describe("toSatisfyCriteria", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("input validation", () => {
    it("should throw when actual is not a string", async () => {
      const matcher = toSatisfyCriteria(createMockConfig());

      await expect(
        matcher.call(createMatcherContext(), 123, "criterion"),
      ).rejects.toThrow("The value being tested must be a string");
    });

    it("should throw when criteria is not a string or array", async () => {
      const matcher = toSatisfyCriteria(createMockConfig());

      await expect(
        matcher.call(createMatcherContext(), "text", { criterion: "obj" }),
      ).rejects.toThrow("Criteria must be a string or an array of strings");
    });

    it("should throw when criteria array contains non-strings", async () => {
      const matcher = toSatisfyCriteria(createMockConfig());

      await expect(
        matcher.call(createMatcherContext(), "text", ["valid", 123]),
      ).rejects.toThrow("Criteria must be a string or an array of strings");
    });

    it("should throw when criteria array is empty", async () => {
      const matcher = toSatisfyCriteria(createMockConfig());

      await expect(
        matcher.call(createMatcherContext(), "text", []),
      ).rejects.toThrow("At least one criterion must be provided");
    });
  });

  describe("single criterion", () => {
    it("should accept a single criterion string", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Satisfies" },
      } as any);

      const matcher = toSatisfyCriteria(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "Hi John, here is your answer.",
        "Addresses user by name",
        { samples: 1 },
      );

      expect(result.pass).toBe(true);
    });

    it("should use majority voting with samples", async () => {
      // 2 out of 3 pass = majority passes
      vi.mocked(generateObject)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "1" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "2" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "3" },
        } as any);

      const matcher = toSatisfyCriteria(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "Hi John",
        "Addresses user by name",
        { samples: 3 },
      );

      expect(result.pass).toBe(true);
    });

    it("should fail when minority of samples pass", async () => {
      // 1 out of 3 pass = majority fails
      vi.mocked(generateObject)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "1" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "2" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "3" },
        } as any);

      const matcher = toSatisfyCriteria(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "Hello",
        "Addresses user by name",
        { samples: 3 },
      );

      expect(result.pass).toBe(false);
    });
  });

  describe("multiple criteria with mode: all", () => {
    it("should pass when all criteria pass", async () => {
      // 2 criteria, 3 samples each = 6 calls
      // All return true
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Pass" },
      } as any);

      const matcher = toSatisfyCriteria(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "Hi John, here is the solution.",
        ["Addresses user by name", "Provides a solution"],
        { mode: "all", samples: 3 },
      );

      expect(result.pass).toBe(true);
      // 2 criteria × 3 samples = 6 calls
      expect(generateObject).toHaveBeenCalledTimes(6);
    });

    it("should fail when any criterion fails", async () => {
      // First criterion passes (3 true), second fails (3 false)
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
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "6" },
        } as any);

      const matcher = toSatisfyCriteria(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "Hello, here is a vague response.",
        ["Greets the user", "Provides specific solution"],
        { mode: "all", samples: 3 },
      );

      expect(result.pass).toBe(false);
    });
  });

  describe("multiple criteria with mode: any", () => {
    it("should pass when at least one criterion passes", async () => {
      // First criterion fails, second passes
      vi.mocked(generateObject)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "1" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "2" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "3" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "4" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "5" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "6" },
        } as any);

      const matcher = toSatisfyCriteria(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "Here is the specific solution.",
        ["Addresses user by name", "Provides solution"],
        { mode: "any", samples: 3 },
      );

      expect(result.pass).toBe(true);
    });

    it("should fail when no criteria pass", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: false, explanation: "Fail" },
      } as any);

      const matcher = toSatisfyCriteria(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "Generic response",
        ["Addresses user by name", "Provides solution"],
        { mode: "any", samples: 3 },
      );

      expect(result.pass).toBe(false);
    });
  });

  describe("multiple criteria with mode: threshold", () => {
    it("should pass when threshold percentage of criteria pass", async () => {
      // 2 out of 3 criteria pass = 66.7%, threshold 0.5 should pass
      vi.mocked(generateObject)
        // Criterion 1: passes
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "1" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "2" },
        } as any)
        // Criterion 2: passes
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "3" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "4" },
        } as any)
        // Criterion 3: fails
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "5" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "6" },
        } as any);

      const matcher = toSatisfyCriteria(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "Hi John, here is your password reset.",
        ["Greets user", "Provides solution", "Includes emoji"],
        { mode: "threshold", threshold: 0.5, samples: 2 },
      );

      expect(result.pass).toBe(true);
    });

    it("should fail when below threshold", async () => {
      // 1 out of 3 criteria pass = 33%, threshold 0.5 should fail
      vi.mocked(generateObject)
        // Criterion 1: passes
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "1" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "2" },
        } as any)
        // Criterion 2: fails
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "3" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "4" },
        } as any)
        // Criterion 3: fails
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "5" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "6" },
        } as any);

      const matcher = toSatisfyCriteria(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "Generic response",
        ["Greets user", "Provides solution", "Includes emoji"],
        { mode: "threshold", threshold: 0.5, samples: 2 },
      );

      expect(result.pass).toBe(false);
    });
  });

  describe("default options", () => {
    it("should default to mode: all", async () => {
      // One criterion passes, one fails -> should fail with mode: all
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
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "6" },
        } as any);

      const matcher = toSatisfyCriteria(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "Hi John",
        ["Criterion A", "Criterion B"],
        // No mode specified
      );

      expect(result.pass).toBe(false);
    });

    it("should default to 3 samples", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Pass" },
      } as any);

      const matcher = toSatisfyCriteria(createMockConfig());
      await matcher.call(createMatcherContext(), "text", "criterion");

      // 1 criterion × 3 samples = 3 calls
      expect(generateObject).toHaveBeenCalledTimes(3);
    });
  });

  describe("prompt resolution", () => {
    it("should use default prompt when no overrides", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Pass" },
      } as any);

      const matcher = toSatisfyCriteria(createMockConfig());
      await matcher.call(createMatcherContext(), "text", "criterion", {
        samples: 1,
      });

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          system: DEFAULT_SATISFY_CRITERIA_PROMPT,
        }),
      );
    });

    it("should use global config prompt over default", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Pass" },
      } as any);

      const config = createMockConfig({
        toSatisfyCriteria: "Custom criteria prompt",
      });
      const matcher = toSatisfyCriteria(config);
      await matcher.call(createMatcherContext(), "text", "criterion", {
        samples: 1,
      });

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          system: "Custom criteria prompt",
        }),
      );
    });

    it("should use per-call prompt over global config", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: { pass: true, explanation: "Pass" },
      } as any);

      const config = createMockConfig({
        toSatisfyCriteria: "Global prompt",
      });
      const matcher = toSatisfyCriteria(config);
      await matcher.call(createMatcherContext(), "text", "criterion", {
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
    it("should show criteria count and percentage", async () => {
      vi.mocked(generateObject)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "Good" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "Bad" },
        } as any);

      const matcher = toSatisfyCriteria(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "text",
        ["Criterion A", "Criterion B"],
        { samples: 1 },
      );

      const message = result.message();
      expect(message).toContain("1/2 criteria satisfied");
      expect(message).toContain("50%");
    });

    it("should show individual criterion results with icons", async () => {
      vi.mocked(generateObject)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "Passed!" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "Failed!" },
        } as any);

      const matcher = toSatisfyCriteria(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "text",
        ["Criterion A", "Criterion B"],
        { samples: 1 },
      );

      const message = result.message();
      expect(message).toContain("✓ Criterion A");
      expect(message).toContain("✗ Criterion B");
    });

    it("should show sample counts for each criterion", async () => {
      // 2 out of 3 samples pass for criterion
      vi.mocked(generateObject)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "1" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: true, explanation: "2" },
        } as any)
        .mockResolvedValueOnce({
          object: { pass: false, explanation: "3" },
        } as any);

      const matcher = toSatisfyCriteria(createMockConfig());
      const result = await matcher.call(
        createMatcherContext(),
        "text",
        "Single criterion",
        { samples: 3 },
      );

      const message = result.message();
      expect(message).toContain("[2/3 samples]");
    });
  });
});
