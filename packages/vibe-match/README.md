# vibe-match

Semantic test matchers powered by LLMs. Test your AI outputs with fuzzy matching that understands meaning, not just exact text.

## Installation

```bash
npm install -D vibe-match
```

```bash
bun add -D vibe-match
```

```bash
yarn add -D vibe-match
```

## Quick Start

```typescript
import { vibeMatchers, type VibeMatchConfig } from "vibe-match";

const config: VibeMatchConfig = {
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
  },
  languageModel: "openai:gpt-4o-mini",
  embeddingModel: "openai:text-embedding-3-small",
};

expect.extend(vibeMatchers(config));

// Now you can use semantic matchers!
expect("Hello there!").toBeSimilarTo("Hi!");
```

### Provider Examples

**OpenAI:**

```typescript
const config: VibeMatchConfig = {
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
  },
  languageModel: "openai:gpt-4o-mini",
  embeddingModel: "openai:text-embedding-3-small",
};
```

**Anthropic** (use OpenAI for embeddings since Anthropic doesn't provide them):

```typescript
const config: VibeMatchConfig = {
  apiKeys: {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY, // Required for embeddings
  },
  languageModel: "anthropic:claude-sonnet-4-20250514",
  embeddingModel: "openai:text-embedding-3-small",
};
```

**Google (Gemini):**

```typescript
const config: VibeMatchConfig = {
  apiKeys: {
    google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  },
  languageModel: "google:gemini-2.0-flash",
  embeddingModel: "google:text-embedding-004",
};
```

**Mistral:**

```typescript
const config: VibeMatchConfig = {
  apiKeys: {
    mistral: process.env.MISTRAL_API_KEY,
  },
  languageModel: "mistral:mistral-small-latest",
  embeddingModel: "mistral:mistral-embed",
};
```

**Grok (xAI)** (use OpenAI for embeddings since xAI doesn't provide them):

```typescript
const config: VibeMatchConfig = {
  apiKeys: {
    xai: process.env.XAI_API_KEY,
    openai: process.env.OPENAI_API_KEY, // Required for embeddings
  },
  languageModel: "xai:grok-2-1212",
  embeddingModel: "openai:text-embedding-3-small",
};
```

### Custom Models

You can also pass custom AI SDK model instances directly. This is useful for:

- Using OpenAI-compatible APIs (OpenRouter, Together AI, Fireworks, etc.)
- Using providers not built into vibe-match
- Configuring models with custom options

**OpenRouter:**

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

**Together AI:**

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

**Any AI SDK Provider:**

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

## Matchers

### `toBeSimilarTo(expected, options?)`

Tests if two strings are semantically similar.

```typescript
expect("I love cheese pizza").toBeSimilarTo("Cheese pizza is my favorite", {
  level: "loose", // "loose" | "normal" | "strict"
  threshold: 0.75, // Percentage of samples that must pass
  samples: 5, // Number of LLM calls to make
});
```

### `toMention(concept, options?)`

Tests if a string mentions a concept (directly, by description, or by implication).

```typescript
expect("The red and yellow clown mascot").toMention("McDonald's", {
  threshold: 0.75,
  samples: 5,
});
```

### `toSatisfyCriteria(criteria, options?)`

Tests if text satisfies one or more criteria. Accepts either a single criterion string or an array of criteria.

```typescript
// Single criterion
expect("Hi John, here's how to reset your password...").toSatisfyCriteria(
  "Addresses the user by name",
);

// Multiple criteria
expect("Hi John, here's how to reset your password...").toSatisfyCriteria(
  ["Addresses the user by name", "Provides a specific solution"],
  {
    mode: "all", // "all" | "any" | "threshold"
    threshold: 0.75, // For "threshold" mode: percentage that must pass
    samples: 3, // Number of LLM calls per criterion
  },
);
```

### `toBeVectorSimilarTo(expected, options?)`

Tests semantic similarity using embedding vectors and cosine similarity.

```typescript
expect("A guide to baking bread").toBeVectorSimilarTo("Bread baking tutorial", {
  threshold: 0.85, // Minimum cosine similarity (0-1)
});
```

## Inline Model Overrides

You can override the language model or embedding model for individual matcher calls. This is useful when you want to use a different model for specific tests without changing your global configuration.

```typescript
import {
  vibeMatchers,
  type LanguageModelV1,
  type EmbeddingModel,
} from "vibe-match";
import { createOpenAI } from "@ai-sdk/openai";

// Configure with default models
const config: VibeMatchConfig = {
  apiKeys: { openai: process.env.OPENAI_API_KEY },
  languageModel: "openai:gpt-4o-mini",
  embeddingModel: "openai:text-embedding-3-small",
};

expect.extend(vibeMatchers(config));

// Create a more powerful model for specific tests
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const gpt4o = openai("gpt-4o");

// Use inline override for this specific assertion
expect(response).toBeSimilarTo(expected, {
  languageModel: gpt4o, // Use GPT-4o for this test only
});
```

### Language Model Overrides

The following matchers support the `languageModel` option:

- `toBeSimilarTo` — for semantic similarity checks
- `toMention` — for concept mention detection
- `toSatisfyCriteria` — for criteria evaluation

```typescript
// Use a stronger model for critical tests
expect(aiResponse).toSatisfyCriteria(
  ["Is factually accurate", "Cites sources"],
  {
    languageModel: gpt4o,
    mode: "all",
  },
);

expect(summary).toMention("quarterly revenue", {
  languageModel: gpt4o,
});
```

### Embedding Model Overrides

The `toBeVectorSimilarTo` matcher supports the `embeddingModel` option:

```typescript
const largeEmbedding = openai.embedding("text-embedding-3-large");

expect(document).toBeVectorSimilarTo(reference, {
  embeddingModel: largeEmbedding, // Use larger embedding model
  threshold: 0.9,
});
```

## Supported Providers

| Provider   | Language Models | Embedding Models |
| ---------- | --------------- | ---------------- |
| OpenAI     | ✅              | ✅               |
| Anthropic  | ✅              | ❌               |
| Google     | ✅              | ✅               |
| Mistral    | ✅              | ✅               |
| xAI (Grok) | ✅              | ❌               |

You can mix and match providers—use Anthropic for language models and OpenAI for embeddings, for example.
