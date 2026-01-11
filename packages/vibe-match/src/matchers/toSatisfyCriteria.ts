import { generateObject, type LanguageModelV1 } from "ai";
import { z } from "zod";
import type { VibeMatcher } from "../types";

const CriterionResponse = z.object({
  pass: z.boolean(),
  explanation: z.string(),
});

export const DEFAULT_SATISFY_CRITERIA_PROMPT = `You have a singular task. You will be given a text and a criterion, and you must determine if the text satisfies the criterion.

Your job is to make a binary YES/NO decision:
- YES (pass: true): The text clearly meets the criterion
- NO (pass: false): The text does not meet the criterion or it's ambiguous

Be strict but fair. The criterion must be clearly satisfied, not just partially or arguably met.

Examples:

Text: "Hi John, I understand you're having trouble with your login. Here's how to reset your password: go to Settings > Security > Reset Password."
Criterion: "Addresses the user by name"
→ PASS (the text says "Hi John")

Text: "Hi John, I understand you're having trouble with your login. Here's how to reset your password: go to Settings > Security > Reset Password."
Criterion: "Provides a specific solution"
→ PASS (gives clear steps to reset password)

Text: "I'm sorry you're having issues. Let me know if you need help."
Criterion: "Provides a specific solution"
→ FAIL (no specific solution is offered, just a vague offer to help)

Text: "Thanks for reaching out! We'll look into this."
Criterion: "Acknowledges the specific issue reported"
→ FAIL (generic acknowledgment, doesn't reference the specific issue)

Provide a brief explanation for your decision.`;

const checkCriterion = async (
  model: LanguageModelV1,
  text: string,
  criterion: string,
  systemPrompt: string,
) => {
  const { object } = await generateObject({
    model,
    schema: CriterionResponse,
    system: systemPrompt,
    prompt: JSON.stringify({
      text,
      criterion,
    }),
  });

  return {
    criterion,
    pass: object.pass,
    explanation: object.explanation,
  };
};

interface CriterionResult {
  criterion: string;
  pass: boolean;
  explanation: string;
  sampleResults?: boolean[];
}

export interface ToSatisfyCriteriaOptions {
  /**
   * How to aggregate results across criteria (only applies when multiple criteria are provided).
   * - "all": Every criterion must pass (default)
   * - "any": At least one criterion must pass
   * - "threshold": A percentage of criteria must pass
   */
  mode?: "all" | "any" | "threshold";

  /**
   * For "threshold" mode: the minimum percentage of criteria that must pass (0-1).
   * @default 0.75
   */
  threshold?: number;

  /**
   * Number of times to evaluate each criterion for reliability.
   * The criterion passes if the majority of samples pass.
   * @default 3
   */
  samples?: number;

  /**
   * Custom system prompt for the LLM. Overrides both the default prompt
   * and any global prompt set in vibeMatchers config.
   */
  systemPrompt?: string;
}

export const toSatisfyCriteria: VibeMatcher<
  [criteria: unknown, options?: ToSatisfyCriteriaOptions]
> = (config) =>
  async function (actual, criteria, options: ToSatisfyCriteriaOptions = {}) {
    const {
      mode = "all",
      threshold = 0.75,
      samples = 3,
      systemPrompt,
    } = options;

    // Layered prompt resolution: per-call > global config > default
    const resolvedPrompt =
      systemPrompt ??
      config.prompts?.toSatisfyCriteria ??
      DEFAULT_SATISFY_CRITERIA_PROMPT;

    if (typeof actual !== "string") {
      throw new Error("The value being tested must be a string");
    }

    // Normalize criteria to an array
    let criteriaArray: string[];
    if (typeof criteria === "string") {
      criteriaArray = [criteria];
    } else if (
      Array.isArray(criteria) &&
      criteria.every((c) => typeof c === "string")
    ) {
      criteriaArray = criteria;
    } else {
      throw new Error("Criteria must be a string or an array of strings");
    }

    if (criteriaArray.length === 0) {
      throw new Error("At least one criterion must be provided");
    }

    // Evaluate each criterion with multiple samples
    const criteriaResults: CriterionResult[] = await Promise.all(
      criteriaArray.map(async (criterion: string) => {
        // Run multiple samples for each criterion
        const sampleResults = await Promise.all(
          Array.from({ length: samples }).map(() =>
            checkCriterion(
              config.languageModel,
              actual,
              criterion,
              resolvedPrompt,
            ),
          ),
        );

        // Criterion passes if majority of samples pass
        const passCount = sampleResults.filter((r) => r.pass).length;
        const majorityPass = passCount > samples / 2;

        // Collect explanations (prefer failing explanations if it failed)
        const relevantResult = majorityPass
          ? sampleResults.find((r) => r.pass) || sampleResults[0]
          : sampleResults.find((r) => !r.pass) || sampleResults[0];

        return {
          criterion,
          pass: majorityPass,
          explanation: relevantResult?.explanation ?? "",
          sampleResults: sampleResults.map((r) => r.pass),
        };
      }),
    );

    // Calculate overall pass based on mode
    const passedCount = criteriaResults.filter((r) => r.pass).length;
    const passPercentage = passedCount / criteriaArray.length;

    let overallPass: boolean;
    switch (mode) {
      case "all":
        overallPass = passedCount === criteriaArray.length;
        break;
      case "any":
        overallPass = passedCount > 0;
        break;
      case "threshold":
        overallPass = passPercentage >= threshold;
        break;
    }

    // Build detailed message
    const message = () => {
      const lines: string[] = [];

      // Summary line
      lines.push(
        `${passedCount}/${criteriaArray.length} criteria satisfied (${(passPercentage * 100).toFixed(0)}%)`,
      );
      lines.push("");

      // Individual criterion results
      for (const result of criteriaResults) {
        const icon = result.pass ? "✓" : "✗";
        const sampleInfo = result.sampleResults
          ? ` [${result.sampleResults.filter(Boolean).length}/${samples} samples]`
          : "";
        lines.push(`${icon} ${result.criterion}${sampleInfo}`);
        lines.push(`  ${result.explanation}`);
      }

      return lines.join("\n");
    };

    return {
      message,
      pass: overallPass,
    };
  };
