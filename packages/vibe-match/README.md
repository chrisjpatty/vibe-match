# vibe-match

**Deterministic tests for non-deterministic AI outputs.**

Testing AI agents, LLM responses, and generated content is hard—outputs vary every time. vibe-match solves this by using LLMs and embeddings to evaluate _meaning_, not exact text. Write assertions that ask "does this response mention the right topic?" or "is this answer semantically equivalent?" and get consistent, reliable test results.

```typescript
// Instead of brittle exact matching...
expect(response).toBe("The capital of France is Paris."); // ❌ Breaks on minor variations

// ...use semantic matching that understands meaning
await expect(response).toBeSimilarTo("Paris is France's capital"); // ✅ Works!
```

---

## Table of Contents

- [Quick Start](#quick-start)
- [Why vibe-match?](#why-vibe-match)
- [Installation](#installation)
- [Matchers](#matchers)
  - [toBeSimilarTo](#tobesimilartoexpected-options)
  - [toMention](#tomentionconcept-options)
  - [toSatisfyCriteria](#tosatisfycriteriacriteria-options)
  - [toBeVectorSimilarTo](#tobevectorsimilartoexpected-options)
- [Configuration](#configuration)
- [Advanced Configuration](#advanced-configuration)
- [Test Setup](#test-setup)
- [API Reference](#api-reference)
- [Reliability & Sampling](#reliability--sampling)

---

## Quick Start

```bash
npm install -D vibe-match
```

```typescript
import { vibeMatchers, type VibeMatchConfig } from "vibe-match";

const config: VibeMatchConfig = {
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
  },
  languageModel: "openai:gpt-4o-mini",
  embeddingModel: "openai:text-embedding-3-small",
};

// Extend expect with semantic matchers (works with Vitest, Bun Test, and any Jest-compatible testing framework)
expect.extend(vibeMatchers(config));

// Now use them in your tests!
test("AI response is semantically correct", async () => {
  const response = await myAgent.ask("What's the capital of France?");

  await expect(response).toBeSimilarTo("Paris is the capital of France");
});
```

---

## Why vibe-match?

AI outputs are inherently non-deterministic. The same prompt can produce different phrasings, structures, and word choices. Traditional testing approaches fail because:

vibe-match introduces **semantic assertions** that evaluate meaning rather than syntax:

| Approach          | `"The capital of France is Paris"` vs `"Paris is France's capital"` |
| ----------------- | ------------------------------------------------------------------- |
| `toBe()`          | ❌ Fails                                                            |
| `toMatch()`       | ❌ Fails                                                            |
| `toBeSimilarTo()` | ✅ Passes                                                           |

---

## Installation

**1. Install the package:**

```bash
# npm
npm install -D vibe-match

# bun
bun add -D vibe-match

# yarn
yarn add -D vibe-match

# pnpm
pnpm add -D vibe-match
```

**2. Import and extend expect:**

vibe-match provides custom matchers that need to be registered with your test framework. Add this to your test setup file:

```typescript
import { vibeMatchers, type VibeMatchConfig } from "vibe-match";

const config: VibeMatchConfig = {
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
    // Add other providers as needed
  },
  languageModel: "openai:gpt-4o-mini", // The default llm model unless overridden by a test
  embeddingModel: "openai:text-embedding-3-small", // The default embedding model unless overridden by a test
};

// Register the semantic matchers with expect
expect.extend(vibeMatchers(config));
```

**3. Configure your test framework to use the setup file:**

For Vitest, add to `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
  },
});
```

For Jest, add to `jest.config.js`:

```javascript
module.exports = {
  setupFilesAfterEnv: ["./jest.setup.ts"],
};
```

---

## Matchers

### `toBeSimilarTo(expected, options?)`

Tests if two strings are semantically similar. Uses an LLM to evaluate whether the texts convey the same meaning.

```typescript
await expect("I love cheese pizza").toBeSimilarTo(
  "Cheese pizza is my favorite",
);
```

**Options:**

| Option          | Type                                  | Default    | Description                                |
| --------------- | ------------------------------------- | ---------- | ------------------------------------------ |
| `level`         | `"loose"` \| `"normal"` \| `"strict"` | `"normal"` | How strictly to judge similarity           |
| `threshold`     | `number`                              | `0.75`     | Percentage of samples that must pass (0–1) |
| `samples`       | `number`                              | `5`        | Number of LLM evaluations to run           |
| `systemPrompt`  | `string`                              | —          | Override the default prompt                |
| `languageModel` | `LanguageModelV1`                     | —          | Override the configured model              |

**Similarity Levels:**

- **`loose`** — The core meaning is the same. Minor differences in detail are acceptable.
- **`normal`** — Meaningfully similar with only small ambiguities allowed.
- **`strict`** — Functionally identical. Same meaning, same intent, same structure.

```typescript
// Loose: "roughly the same idea"
await expect("The meeting is at 3pm").toBeSimilarTo("We meet at three", {
  level: "loose",
});

// Strict: "functionally identical"
await expect("Error: File not found").toBeSimilarTo("Error: File not found", {
  level: "strict",
});
```

---

### `toMention(concept, options?)`

Tests if text mentions a concept—directly, by description, or by implication.

```typescript
await expect("The red and yellow clown mascot smiled at customers").toMention(
  "McDonald's",
);
// ✅ Passes — describes Ronald McDonald
```

**Options:**

| Option          | Type              | Default | Description                                |
| --------------- | ----------------- | ------- | ------------------------------------------ |
| `threshold`     | `number`          | `0.75`  | Percentage of samples that must pass (0–1) |
| `samples`       | `number`          | `5`     | Number of LLM evaluations to run           |
| `systemPrompt`  | `string`          | —       | Override the default prompt                |
| `languageModel` | `LanguageModelV1` | —       | Override the configured model              |

**What counts as "mentioning":**

- Direct reference: `"I use JavaScript daily"` mentions **JavaScript**
- Category membership: `"The cat sat on the mat"` mentions **animals**
- Implication: `"We need to optimize queries"` mentions **performance**
- Synonyms: `"She was feeling blue"` mentions **sadness**

```typescript
await expect(summary).toMention("quarterly revenue");
await expect(response).toMention("customer satisfaction");
await expect(article).toMention("climate change");
```

---

### `toSatisfyCriteria(criteria, options?)`

Tests if text satisfies one or more natural language criteria. Perfect for evaluating quality, tone, completeness, or any custom requirements.

```typescript
// Single criterion
await expect(response).toSatisfyCriteria("Addresses the user by name");

// Multiple criteria
await expect(response).toSatisfyCriteria([
  "Addresses the user by name",
  "Provides a specific solution",
  "Maintains a professional tone",
]);
```

**Options:**

| Option          | Type                                | Default | Description                                             |
| --------------- | ----------------------------------- | ------- | ------------------------------------------------------- |
| `mode`          | `"all"` \| `"any"` \| `"threshold"` | `"all"` | How to aggregate multiple criteria                      |
| `threshold`     | `number`                            | `0.75`  | For `"threshold"` mode: percentage that must pass (0–1) |
| `samples`       | `number`                            | `3`     | LLM evaluations per criterion                           |
| `systemPrompt`  | `string`                            | —       | Override the default prompt                             |
| `languageModel` | `LanguageModelV1`                   | —       | Override the configured model                           |

**Aggregation Modes:**

- **`all`** — Every criterion must pass (logical AND)
- **`any`** — At least one criterion must pass (logical OR)
- **`threshold`** — A percentage of criteria must pass

```typescript
// All criteria must pass
await expect(email).toSatisfyCriteria(
  [
    "Has a clear subject line",
    "Includes a call to action",
    "Contains contact information",
  ],
  { mode: "all" },
);

// At least 80% of criteria must pass
await expect(report).toSatisfyCriteria(
  [
    "Includes executive summary",
    "Contains data visualizations",
    "Cites sources",
    "Has recommendations section",
  ],
  { mode: "threshold", threshold: 0.8 },
);
```

---

### `toBeVectorSimilarTo(expected, options?)`

Tests semantic similarity using embedding vectors and cosine similarity. Faster and cheaper than LLM-based matchers, but less nuanced.

```typescript
await expect("A guide to baking bread").toBeVectorSimilarTo(
  "Bread baking tutorial",
);
```

**Options:**

| Option           | Type             | Default | Description                     |
| ---------------- | ---------------- | ------- | ------------------------------- |
| `threshold`      | `number`         | `0.85`  | Minimum cosine similarity (0–1) |
| `embeddingModel` | `EmbeddingModel` | —       | Override the configured model   |

**When to use vector similarity:**

- ✅ High-volume testing where cost matters
- ✅ Comparing longer documents
- ✅ Quick semantic similarity checks
- ❌ Nuanced meaning comparison (use `toBeSimilarTo`)
- ❌ Detecting implications or indirect mentions

```typescript
// Compare document similarity
await expect(generatedDoc).toBeVectorSimilarTo(referenceDoc, {
  threshold: 0.9,
});
```

---

## Configuration

### Provider Setup

vibe-match supports multiple AI providers. Configure with a simple string format: `"provider:model-name"`.

#### OpenAI

```typescript
const config: VibeMatchConfig = {
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
  },
  languageModel: "openai:gpt-4o-mini",
  embeddingModel: "openai:text-embedding-3-small",
};
```

#### Anthropic

Anthropic doesn't provide embedding models, so pair with OpenAI for embeddings:

```typescript
const config: VibeMatchConfig = {
  apiKeys: {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  },
  languageModel: "anthropic:claude-sonnet-4-20250514",
  embeddingModel: "openai:text-embedding-3-small",
};
```

#### Google (Gemini)

```typescript
const config: VibeMatchConfig = {
  apiKeys: {
    google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  },
  languageModel: "google:gemini-2.0-flash",
  embeddingModel: "google:text-embedding-004",
};
```

#### Mistral

```typescript
const config: VibeMatchConfig = {
  apiKeys: {
    mistral: process.env.MISTRAL_API_KEY,
  },
  languageModel: "mistral:mistral-small-latest",
  embeddingModel: "mistral:mistral-embed",
};
```

#### xAI (Grok)

xAI doesn't provide embedding models, so pair with OpenAI for embeddings:

```typescript
const config: VibeMatchConfig = {
  apiKeys: {
    xai: process.env.XAI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  },
  languageModel: "xai:grok-2-1212",
  embeddingModel: "openai:text-embedding-3-small",
};
```

### Provider Capabilities

| Provider   | Language Models | Embedding Models |
| ---------- | --------------- | ---------------- |
| OpenAI     | ✅              | ✅               |
| Anthropic  | ✅              | ❌               |
| Google     | ✅              | ✅               |
| Mistral    | ✅              | ✅               |
| xAI (Grok) | ✅              | ❌               |

---

## Advanced Configuration

### Custom AI SDK Models

For OpenAI-compatible APIs (OpenRouter, Together AI, Fireworks, etc.) or advanced configuration, pass AI SDK model instances directly:

#### OpenRouter

```typescript
import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const config: VibeMatchConfig = {
  languageModel: openrouter("anthropic/claude-sonnet-4"),
  embeddingModel: openrouter.embedding("openai/text-embedding-3-small"),
};
```

#### Together AI

```typescript
import { createOpenAI } from "@ai-sdk/openai";

const together = createOpenAI({
  baseURL: "https://api.together.xyz/v1",
  apiKey: process.env.TOGETHER_API_KEY,
});

const config: VibeMatchConfig = {
  languageModel: together("meta-llama/Llama-3.3-70B-Instruct-Turbo"),
  embeddingModel: together.embedding(
    "togethercomputer/m2-bert-80M-8k-retrieval",
  ),
};
```

#### Azure OpenAI

```typescript
import { createAzure } from "@ai-sdk/azure";
import { createOpenAI } from "@ai-sdk/openai";

const azure = createAzure({
  resourceName: "my-resource",
  apiKey: process.env.AZURE_API_KEY,
});

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const config: VibeMatchConfig = {
  languageModel: azure("my-gpt-4-deployment"),
  embeddingModel: openai.embedding("text-embedding-3-small"),
};
```

### Per-Test Model Overrides

Override the model for specific assertions without changing global configuration:

```typescript
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const gpt4o = openai("gpt-4o"); // More powerful model

// Use GPT-4o for this critical test only
await expect(response).toSatisfyCriteria(
  ["Is factually accurate", "Cites sources"],
  { languageModel: gpt4o },
);

// Use a larger embedding model for higher precision
const largeEmbedding = openai.embedding("text-embedding-3-large");
await expect(document).toBeVectorSimilarTo(reference, {
  embeddingModel: largeEmbedding,
  threshold: 0.95,
});
```

### Custom Prompts

Override the default LLM prompts globally or per-assertion:

```typescript
// Global prompt override
const config: VibeMatchConfig = {
  apiKeys: { openai: process.env.OPENAI_API_KEY },
  languageModel: "openai:gpt-4o-mini",
  embeddingModel: "openai:text-embedding-3-small",
  prompts: {
    toBeSimilarTo: "Your custom similarity prompt...",
    toMention: "Your custom mention detection prompt...",
    toSatisfyCriteria: "Your custom criteria evaluation prompt...",
  },
};

// Per-assertion prompt override
await expect(response).toBeSimilarTo(expected, {
  systemPrompt: "Be extra strict about numerical accuracy...",
});
```

---

## Test Setup

### Vitest

```typescript
// tests/setup.ts
import { vibeMatchers, type VibeMatchConfig } from "vibe-match";

const config: VibeMatchConfig = {
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
  },
  languageModel: "openai:gpt-4o-mini",
  embeddingModel: "openai:text-embedding-3-small",
};

expect.extend(vibeMatchers(config));
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
  },
});
```

### Jest

```typescript
// jest.setup.ts
import { vibeMatchers, type VibeMatchConfig } from "vibe-match";

const config: VibeMatchConfig = {
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
  },
  languageModel: "openai:gpt-4o-mini",
  embeddingModel: "openai:text-embedding-3-small",
};

expect.extend(vibeMatchers(config));
```

```javascript
// jest.config.js
module.exports = {
  setupFilesAfterEnv: ["./jest.setup.ts"],
};
```

### TypeScript Support

For full type inference on custom matchers, add to your test setup:

```typescript
// tests/setup.ts
import { vibeMatchers } from "vibe-match";

interface VibeMatchers<R = unknown> {
  toBeSimilarTo(
    expected: string,
    options?: import("vibe-match").ToBeSimilarToOptions,
  ): Promise<R>;
  toMention(
    concept: string,
    options?: import("vibe-match").ToMentionOptions,
  ): Promise<R>;
  toSatisfyCriteria(
    criteria: string | string[],
    options?: import("vibe-match").ToSatisfyCriteriaOptions,
  ): Promise<R>;
  toBeVectorSimilarTo(
    expected: string,
    options?: import("vibe-match").VectorSimilarityOptions,
  ): Promise<R>;
}

declare module "vitest" {
  interface Assertion<T = any> extends VibeMatchers<T> {}
  interface AsymmetricMatchersContaining extends VibeMatchers {}
}

// For Jest
declare global {
  namespace jest {
    interface Matchers<R> extends VibeMatchers<R> {}
  }
}
```

---

## API Reference

### `vibeMatchers(config)`

Creates the matcher functions to extend `expect`.

```typescript
import { vibeMatchers, type VibeMatchConfig } from "vibe-match";

expect.extend(vibeMatchers(config));
```

### Configuration Types

#### `VibeMatchConfig`

```typescript
type VibeMatchConfig = VibeMatchStringConfig | VibeMatchCustomModelConfig;
```

#### `VibeMatchStringConfig`

For built-in providers with string-based model selection:

```typescript
interface VibeMatchStringConfig {
  apiKeys: {
    openai?: string;
    anthropic?: string;
    google?: string;
    mistral?: string;
    xai?: string;
  };
  languageModel: LanguageModelString; // e.g., "openai:gpt-4o-mini"
  embeddingModel: EmbeddingModelString; // e.g., "openai:text-embedding-3-small"
  prompts?: VibeMatchPrompts;
}
```

#### `VibeMatchCustomModelConfig`

For custom AI SDK model instances:

```typescript
interface VibeMatchCustomModelConfig {
  languageModel: LanguageModelV1;
  embeddingModel: EmbeddingModel<string>;
  prompts?: VibeMatchPrompts;
}
```

### Exported Types

```typescript
import type {
  VibeMatchConfig,
  VibeMatchStringConfig,
  VibeMatchCustomModelConfig,
  VibeMatchPrompts,
  VibeMatchApiKeys,
  LanguageModelString,
  EmbeddingModelString,
  ToBeSimilarToOptions,
  ToMentionOptions,
  ToSatisfyCriteriaOptions,
  VectorSimilarityOptions,
  // AI SDK types for model overrides
  LanguageModelV1,
  EmbeddingModel,
} from "vibe-match";
```

### Default Prompts

Export default prompts for reference or extension:

```typescript
import {
  DEFAULT_SIMILARITY_PROMPT,
  DEFAULT_MENTION_PROMPT,
  DEFAULT_SATISFY_CRITERIA_PROMPT,
} from "vibe-match";
```

---

## Reliability & Sampling

LLMs can give inconsistent answers. vibe-match addresses this with **multi-sample evaluation**:

1. Each assertion runs multiple LLM calls (configurable via `samples`)
2. Results are aggregated using a threshold (configurable via `threshold`)
3. The assertion passes if enough samples agree

```typescript
// Run 7 evaluations, pass if 6+ agree (≥85%)
await expect(response).toBeSimilarTo(expected, {
  samples: 7,
  threshold: 0.85,
});
```

For `toSatisfyCriteria` with multiple criteria, sampling works per-criterion:

```typescript
await expect(response).toSatisfyCriteria(
  ["Criterion A", "Criterion B", "Criterion C"],
  {
    samples: 5, // 5 evaluations per criterion
    mode: "all", // All criteria must pass
  },
);
// Total LLM calls: 3 criteria × 5 samples = 15
```

---

## License

MIT
